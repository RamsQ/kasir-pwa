<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Exports\StockInHistoryExport;
use App\Exports\ProductTemplateExport;
use Maatwebsite\Excel\Facades\Excel;

class StockInController extends Controller
{
    /**
     * Menampilkan halaman Stock In dan Riwayat
     */
    public function index(Request $request)
    {
        // 1. Ambil data produk untuk tabel input
        $products = Product::when($request->search, function($query, $search) {
                $query->where('title', 'like', '%'. $search . '%')
                      ->orWhere('barcode', 'like', '%'. $search . '%');
            })
            ->select('id', 'title', 'barcode', 'stock', 'buy_price')
            ->latest()
            ->paginate(10)
            ->withQueryString();

        // 2. Ambil data Riwayat Stock In (tabel bawah)
        $history = StockMovement::with(['product', 'user'])
            ->where('type', 'in')
            ->when($request->start_date, function($query, $start_date) {
                $query->whereDate('created_at', '>=', $start_date);
            })
            ->when($request->end_date, function($query, $end_date) {
                $query->whereDate('created_at', '<=', $end_date);
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Dashboard/Inventory/StockIn', [
            'auth' => [
                'user' => $request->user(),
                'permissions' => $request->user() ? $request->user()->getPermissionArray() : [],
            ],
            'products' => $products,
            'history'  => $history,
            'filters'  => $request->only(['search', 'start_date', 'end_date']),
            // Menangkap data hasil parse excel dari session flash
            'excel_data' => session('excel_data'),
        ]);
    }

    /**
     * Menyimpan data Stock In, Riwayat, dan Batch Modal (Metode Average)
     */
    public function store(Request $request)
    {
        $request->validate([
            'entries' => 'required|array|min:1',
            'entries.*.product_id' => 'required|exists:products,id',
            'entries.*.qty_in'     => 'required|numeric|min:0.01',
            'entries.*.buy_price'  => 'required|numeric|min:0',
        ]);

        try {
            DB::transaction(function () use ($request) {
                foreach ($request->entries as $entry) {
                    $productId = $entry['product_id'];
                    $qtyIn     = (float) $entry['qty_in'];
                    $priceIn   = (float) $entry['buy_price'];
                    $reference = 'IN-' . strtoupper(uniqid());

                    $product = Product::lockForUpdate()->findOrFail($productId);

                    // --- LOGIKA PERHITUNGAN AVERAGE COST ---
                    $currentStock = (float) $product->stock;
                    $currentPrice = (float) $product->buy_price;

                    // Rumus: ((Stok Lama * Harga Lama) + (Stok Baru * Harga Baru)) / Total Stok
                    if ($currentStock + $qtyIn > 0) {
                        $newAveragePrice = (($currentStock * $currentPrice) + ($qtyIn * $priceIn)) / ($currentStock + $qtyIn);
                    } else {
                        $newAveragePrice = $priceIn;
                    }

                    // 1. Simpan ke Riwayat (StockMovements)
                    StockMovement::create([
                        'product_id' => $productId,
                        'user_id'    => auth()->id(),
                        'type'       => 'in',
                        'qty'        => $qtyIn,
                        'price'      => $priceIn, // Tetap catat harga beli asli saat itu
                        'reference'  => $reference,
                    ]);

                    // 2. Simpan ke StockBatch (Penting untuk data audit kedatangan)
                    StockBatch::create([
                        'product_id'    => $productId,
                        'serial_number' => $reference,
                        'qty_in'        => $qtyIn,
                        'qty_remaining' => $qtyIn,
                        'buy_price'     => $priceIn,
                    ]);

                    // 3. Update Stok Utama & Harga Average di Tabel Produk
                    $product->update([
                        'stock'      => $currentStock + $qtyIn,
                        'buy_price'  => $newAveragePrice,
                        'updated_at' => now()
                    ]);
                }
            });

            return redirect()->route('stock_in.index')->with('success', 'Stok dan Harga Rata-rata Berhasil Diperbarui!');

        } catch (\Exception $e) {
            \Log::error("Gagal Simpan Stock In: " . $e->getMessage());
            return redirect()->back()->with('error', 'Terjadi kesalahan: ' . $e->getMessage());
        }
    }

    /**
     * Export Riwayat Stock In ke Excel
     */
    public function export()
    {
        return Excel::download(new StockInHistoryExport, 'History_Stock_In.xlsx');
    }

    /**
     * Membaca file Excel (Bulk Update) dan mengembalikan data ke Frontend
     */
    public function parseExcel(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:2048'
        ]);

        try {
            $file = $request->file('file');
            $data = Excel::toArray([], $file);

            if (empty($data[0])) {
                return redirect()->back()->with('error', 'File Excel kosong atau format tidak sesuai.');
            }

            // Mapping Data Excel Sesuai urutan ProductTemplateExport
            // A(0): Barcode, D(3): Harga Modal Baru, E(4): Jumlah Tambah
            $rows = collect($data[0])->skip(1)->map(function ($row) {
                return [
                    'barcode' => isset($row[0]) ? (string) $row[0] : null,
                    'price'   => isset($row[3]) ? (float) $row[3] : 0,
                    'qty'     => isset($row[4]) ? (float) $row[4] : 0,
                ];
            })->filter(fn($r) => !empty($r['barcode']) && $r['qty'] > 0)->values();

            return redirect()->back()->with('excel_data', $rows);

        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal membaca file: ' . $e->getMessage());
        }
    }

    /**
     * Mengunduh Template Seluruh Produk untuk Update Massal
     */
    public function exportTemplate()
    {
        return Excel::download(new ProductTemplateExport, 'Template_Mass_Stock_Update.xlsx');
    }
}