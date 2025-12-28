<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Discount extends Model
{
    use HasFactory;

    // Menggunakan guarded kosong agar semua field bisa diisi (termasuk product_id dan type)
    protected $guarded = [];

    /**
     * Relasi ke Model Product
     * Jika product_id bernilai null, maka diskon dianggap Global.
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Scope untuk mengambil diskon yang valid hari ini
     * Memastikan diskon aktif dan berada dalam rentang tanggal yang sesuai.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
                     ->whereDate('start_date', '<=', now())
                     ->whereDate('end_date', '>=', now());
    }

    /**
     * Helper untuk mengecek apakah diskon ini spesifik per produk
     */
    public function isProductSpecific()
    {
        return !is_null($this->product_id);
    }
}