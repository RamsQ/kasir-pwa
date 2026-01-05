<?php

namespace App\Exports;

use App\Models\Product;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ProductTemplateExport implements FromCollection, WithHeadings, WithMapping
{
    public function collection()
    {
        return Product::select('barcode', 'title', 'stock', 'buy_price')->get();
    }

    public function headings(): array
    {
        // Header ini harus sama dengan yang dibaca saat Import nanti
        return ['Barcode', 'Nama Produk', 'Stok_Saat_Ini', 'Harga_Modal_Baru', 'Jumlah_Tambah_Stok'];
    }

    public function map($product): array
    {
        return [
            $product->barcode,
            $product->title,
            $product->stock,
            $product->buy_price, // Default harga lama
            0, // Kolom kosong untuk diisi user (Jumlah Tambah)
        ];
    }
}