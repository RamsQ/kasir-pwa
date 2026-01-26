<?php

namespace App\Exports;

use App\Models\Product;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class StockOpnameExport implements FromCollection, WithHeadings
{
    public function collection()
    {
        return Product::where('type', 'single')
            ->select('id', 'barcode', 'title', 'stock')
            ->get();
    }

    public function headings(): array
    {
        return ['ID', 'Barcode', 'Nama Produk', 'Stok Sistem', 'Stok Fisik (Isi Disini)', 'Keterangan'];
    }
}
