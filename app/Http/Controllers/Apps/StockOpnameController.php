<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockOpname;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
// Import tambahan untuk Excel
use App\Exports\StockOpnameExport;
use App\Imports\StockOpnameImport;
use Maatwebsite\Excel\Facades\Excel;

class StockOpnameController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // [1] Ambil data produk untuk tabel input masal
        $products = Product::where('type', 'single')
            ->select('id', 'title', 'stock', 'barcode')
            ->when($request->search, function($query, $search) {
                $query->where('title', 'like', '%' . $search . '%')
                      ->orWhere('barcode', 'like', '%' . $search . '%');
            })
            ->orderBy('title', 'asc')
            ->paginate(10, ['*'], 'products_page')
            ->withQueryString();

        /**
         * [2] Ambil data riwayat (Laporan) dengan filter tanggal
         * Menggunakan with(['user' => fn($q) => $q->withTrashed()]) 
         * agar petugas yang sudah dihapus (Soft Delete) tetap muncul namanya.
         */
        $history = StockOpname::with([
                'product', 
                'user' => function($query) {
                    $query->withTrashed();
                }
            ])
            ->when($request->start_date, function($query, $start_date) {
                $query->whereDate('created_at', '>=', $start_date);
            })
            ->when($request->end_date, function($query, $end_date) {
                $query->whereDate('created_at', '<=', $end_date);
            })
            ->latest()
            ->paginate(10, ['*'], 'history_page')
            ->withQueryString();

        return Inertia::render('Dashboard/StockOpname/Index', [
            'products' => $products,
            'history'  => $history,
            'filters'  => $request->all(['search', 'start_date', 'end_date']),
        ]);
    }

    /**
     * Store a newly created resource in storage (Bulk Update dari Tabel).
     */
    public function store(Request $request)
    {
        // Validasi array adjustments
        $request->validate([
            'adjustments' => 'required|array',
            'adjustments.*.product_id' => 'required|exists:products,id',
            'adjustments.*.stock_actual' => 'nullable|integer|min:0',
            'adjustments.*.reason' => 'nullable|string|max:255',
        ]);

        // Gunakan Database Transaction agar data aman
        DB::transaction(function () use ($request) {
            foreach ($request->adjustments as $item) {
                // Hanya eksekusi jika stock_actual diisi (tidak null atau kosong)
                if (isset($item['stock_actual']) && $item['stock_actual'] !== '') {
                    
                    $product = Product::lockForUpdate()->findOrFail($item['product_id']);
                    
                    $stockSystem = $product->stock;
                    $stockActual = (int)$item['stock_actual'];
                    $difference  = $stockActual - $stockSystem;

                    // Skip jika tidak ada perubahan angka sama sekali
                    if ($difference === 0) continue;

                    // 1. Simpan Riwayat Stock Opname per item
                    StockOpname::create([
                        'product_id'   => $product->id,
                        'user_id'      => auth()->id(),
                        'stock_system' => $stockSystem,
                        'stock_actual' => $stockActual,
                        'difference'   => $difference,
                        'reason'       => $item['reason'] ?? 'Bulk Opname (Tabel)',
                    ]);

                    // 2. Update Stok Produk ke angka fisik terbaru
                    $product->update([
                        'stock' => $stockActual
                    ]);
                }
            }
        });

        return redirect()->route('stock_opnames.index')->with('success', 'Stok produk berhasil diperbarui dan dicatat dalam riwayat!');
    }

    /**
     * Export data ke Excel format .xlsx
     */
    public function export()
    {
        return Excel::download(new StockOpnameExport, 'Format-Opname-'.date('Y-m-d').'.xlsx');
    }

    /**
     * Import data dari Excel
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:2048'
        ]);

        Excel::import(new StockOpnameImport, $request->file('file'));

        return redirect()->route('stock_opnames.index')->with('success', 'Import selesai! Stok telah disesuaikan berdasarkan file Excel.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(StockOpname $stock_opname)
    {
        $stock_opname->delete();
        return redirect()->route('stock_opnames.index')->with('success', 'Riwayat opname berhasil dihapus!');
    }
}