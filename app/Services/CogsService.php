<?php

namespace App\Services;

use App\Models\StockBatch;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class CogsService
{
    /**
     * Menghitung total HPP berdasarkan metode yang dipilih
     */
    public function calculate($productId, $qtySold, $method, $scannedSerial = null)
    {
        $totalHpp = 0;
        $remainingToReduce = $qtySold;

        switch ($method) {
            case 'FIFO':
            case 'LIFO':
                $direction = ($method === 'FIFO') ? 'asc' : 'desc';
                
                $batches = StockBatch::where('product_id', $productId)
                            ->where('qty_remaining', '>', 0)
                            ->orderBy('created_at', $direction)
                            ->get();

                foreach ($batches as $batch) {
                    if ($remainingToReduce <= 0) break;

                    $take = min($batch->qty_remaining, $remainingToReduce);
                    $totalHpp += $take * $batch->buy_price;

                    // Kurangi sisa stok di batch tersebut
                    $batch->decrement('qty_remaining', $take);
                    $remainingToReduce -= $take;
                }
                break;

            case 'SPECIFIC':
                $batch = StockBatch::where('product_id', $productId)
                            ->where('serial_number', $scannedSerial)
                            ->first();

                if ($batch) {
                    $totalHpp = $qtySold * $batch->buy_price;
                    $batch->decrement('qty_remaining', $qtySold);
                    $remainingToReduce -= $qtySold;
                } else {
                    $product = Product::find($productId);
                    $totalHpp = $qtySold * $product->buy_price;
                    $remainingToReduce -= $qtySold;
                }
                break;

            case 'AVERAGE':
                // HITUNG RATA-RATA DARI SEMUA BATCH YANG TERSEDIA
                $batchData = StockBatch::where('product_id', $productId)
                                ->where('qty_remaining', '>', 0)
                                ->select(
                                    DB::raw('SUM(qty_remaining * buy_price) as total_value'),
                                    DB::raw('SUM(qty_remaining) as total_qty')
                                )->first();

                if ($batchData && $batchData->total_qty > 0) {
                    $averagePrice = $batchData->total_value / $batchData->total_qty;
                    $totalHpp = $qtySold * $averagePrice;
                } else {
                    // Fallback ke harga produk jika tidak ada batch
                    $product = Product::find($productId);
                    $totalHpp = $qtySold * ($product->buy_price ?? 0);
                }

                // Tetap kurangi qty di batch (FIFO style) agar stok fisik berkurang
                $batchesToReduce = StockBatch::where('product_id', $productId)
                                    ->where('qty_remaining', '>', 0)
                                    ->orderBy('created_at', 'asc')
                                    ->get();

                foreach ($batchesToReduce as $b) {
                    if ($remainingToReduce <= 0) break;
                    $take = min($b->qty_remaining, $remainingToReduce);
                    $b->decrement('qty_remaining', $take);
                    $remainingToReduce -= $take;
                }
                break;

            default:
                $product = Product::find($productId);
                $totalHpp = $qtySold * ($product->buy_price ?? 0);
                break;
        }

        // Update stok utama di tabel products agar selalu sinkron
        Product::where('id', $productId)->decrement('stock', $qtySold);

        return $totalHpp;
    }
}