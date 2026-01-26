<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockOpname;
use App\Models\Expense; // Import model Expense
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
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
        $products = Product::where('type', 'single')
            ->select('id', 'title', 'stock', 'barcode', 'buy_price')
            ->when($request->search, function($query, $search) {
                $query->where('title', 'like', '%' . $search . '%')
                      ->orWhere('barcode', 'like', '%' . $search . '%');
            })
            ->orderBy('title', 'asc')
            ->paginate(10, ['*'], 'products_page')
            ->withQueryString();

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
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'adjustments' => 'required|array',
            'adjustments.*.product_id' => 'required|exists:products,id',
            'adjustments.*.stock_actual' => 'nullable|integer|min:0',
            'adjustments.*.reason' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($request) {
            foreach ($request->adjustments as $item) {
                if (isset($item['stock_actual']) && $item['stock_actual'] !== '') {
                    
                    $product = Product::lockForUpdate()->findOrFail($item['product_id']);
                    
                    $stockSystem = $product->stock;
                    $stockActual = (int)$item['stock_actual'];
                    $difference  = $stockActual - $stockSystem;

                    if ($difference === 0) continue;

                    // 1. Simpan Riwayat Stock Opname
                    StockOpname::create([
                        'product_id'   => $product->id,
                        'user_id'      => auth()->id(),
                        'stock_system' => $stockSystem,
                        'stock_actual' => $stockActual,
                        'difference'   => $difference,
                        'reason'       => $item['reason'] ?? 'Bulk Opname (Tabel)',
                    ]);

                    // [OTOMATISASI KEUANGAN]
                    if ($difference < 0) {
                        $qtyLost = abs($difference);
                        $totalLoss = $product->buy_price * $qtyLost;

                        Expense::create([
                            'name'         => "Penyusutan Stok (Opname)", // Menambah field 'name' agar tidak error
                            'account_name' => 'Beban Penurunan Nilai Persediaan',
                            'category'     => 'Kerugian Stok',
                            'amount'       => $totalLoss,
                            'description'  => "Otomatis (Opname): Penyusutan {$product->title} sebanyak {$qtyLost} pcs. Alasan: " . ($item['reason'] ?? 'Tidak ada keterangan'),
                            'date'         => now(),
                            'user_id'      => auth()->id(),
                        ]);
                    }

                    // 2. Update Stok Produk
                    $product->update([
                        'stock' => $stockActual
                    ]);
                }
            }
        });

        return redirect()->route('stock_opnames.index')->with('success', 'Stok berhasil disesuaikan dan kerugian otomatis dicatat di keuangan!');
    }

    public function export()
    {
        return Excel::download(new StockOpnameExport, 'Format-Opname-'.date('Y-m-d').'.xlsx');
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:2048'
        ]);

        Excel::import(new StockOpnameImport, $request->file('file'));

        return redirect()->route('stock_opnames.index')->with('success', 'Import selesai!');
    }

    public function destroy(StockOpname $stock_opname)
    {
        $stock_opname->delete();
        return redirect()->route('stock_opnames.index')->with('success', 'Riwayat opname berhasil dihapus!');
    }
}