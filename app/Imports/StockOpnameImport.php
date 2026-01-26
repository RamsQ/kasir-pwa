<?php

namespace App\Imports;

use App\Models\Product;
use App\Models\StockOpname;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class StockOpnameImport implements ToModel, WithHeadingRow
{
    public function model(array $row)
    {
        // Skip jika kolom Stok Fisik kosong
        if (!isset($row['stok_fisik_isi_disini']) || $row['stok_fisik_isi_disini'] === null) {
            return null;
        }

        return DB::transaction(function () use ($row) {
            $product = Product::lockForUpdate()->find($row['id']);
            
            if ($product) {
                $stockSystem = $product->stock;
                $stockActual = $row['stok_fisik_isi_disini'];
                
                // 1. Simpan Log
                StockOpname::create([
                    'product_id'   => $product->id,
                    'user_id'      => auth()->id(),
                    'stock_system' => $stockSystem,
                    'stock_actual' => $stockActual,
                    'difference'   => $stockActual - $stockSystem,
                    'reason'       => $row['keterangan'] ?? 'Import Excel',
                ]);

                // 2. Update Stok Produk
                $product->update(['stock' => $stockActual]);
            }
            return null; // Kita tidak membuat model baru lewat return ini
        });
    }
}
