<?php

namespace App\Imports;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class ProductsImport implements ToCollection
{
    public function collection(Collection $rows)
    {
        // Hapus baris pertama (Judul Kolom / Header)
        $rows->shift();

        foreach ($rows as $index => $row) {
            // Urutan kolom: 0:barcode, 1:title, 2:category, 3:description, 4:buy, 5:sell, 6:stock, 7:expired
            
            $barcode   = $row[0]; 
            $title     = $row[1]; 
            $catName   = $row[2]; 
            $desc      = $row[3]; 
            $buyPrice  = $row[4]; 
            $sellPrice = $row[5]; 
            $stock     = $row[6]; 
            $rawDate   = $row[7]; 

            // 1. Validasi: Jika Nama Produk kosong, lewati baris ini
            if (!$title) {
                continue;
            }

            // 2. Logic Kategori
            $finalCategoryName = $catName ? $catName : 'Umum';
            $category = Category::firstOrCreate(
                ['name' => $finalCategoryName]
            );

            // 3. Logic Expired Date
            $expiredDate = null;
            if ($rawDate) {
                try {
                    $expiredDate = is_numeric($rawDate) 
                        ? Date::excelToDateTimeObject($rawDate)->format('Y-m-d') 
                        : Carbon::parse($rawDate)->format('Y-m-d');
                } catch (\Exception $e) { $expiredDate = null; }
            }

            // 4. Simpan ke Database
            try {
                // Gunakan updateOrCreate berdasarkan Barcode
                Product::updateOrCreate(
                    ['barcode' => $barcode ?? 'AUTO-' . rand(100000, 999999)], 
                    [
                        'title'        => $title,
                        'description'  => $desc ?? '-',
                        'buy_price'    => $buyPrice ?? 0,
                        'sell_price'   => $sellPrice ?? 0,
                        'stock'        => $stock ?? 0,
                        'category_id'  => $category->id,
                        'expired_date' => $expiredDate,
                        'image'        => null,
                        
                        // --- TAMBAHKAN TIPE DISINI ---
                        'type'         => 'single', // Import selalu dianggap produk satuan (bukan paket)
                        // -----------------------------
                    ]
                );
            } catch (\Exception $e) {
                // Log error jika perlu: \Log::error($e->getMessage());
            }
        }
    }
}