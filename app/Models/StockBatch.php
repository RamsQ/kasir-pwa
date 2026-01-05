<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockBatch extends Model
{
    use HasFactory;

    /**
     * Properti fillable untuk mengizinkan penyimpanan data secara massal.
     * Pastikan kolom ini sesuai dengan database Anda.
     */
    protected $fillable = [
        'product_id',
        'qty_in',        // Stok awal masuk
        'qty_remaining', // Stok yang tersisa setelah dipotong transaksi (Penting untuk COGS)
        'buy_price',     // Harga modal per kedatangan ini
        'serial_number', // Nomor Batch / Referensi
    ];

    /**
     * Casting tipe data agar lebih konsisten saat digunakan di Frontend/JS.
     */
    protected $casts = [
        'qty_in'        => 'float',
        'qty_remaining' => 'float',
        'buy_price'     => 'float',
        'created_at'    => 'datetime',
        'updated_at'    => 'datetime',
    ];

    /**
     * Relasi Balik ke Model Product.
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Scope untuk mengambil batch yang masih memiliki sisa stok.
     * Digunakan untuk memotong stok saat penjualan (FIFO/LIFO).
     */
    public function scopeAvailable($query)
    {
        return $query->where('qty_remaining', '>', 0);
    }

    /**
     * Scope untuk urutan FIFO (First In First Out)
     * Batch paling lama akan diambil lebih dulu.
     */
    public function scopeFifo($query)
    {
        return $query->orderBy('created_at', 'asc');
    }

    /**
     * Scope untuk urutan LIFO (Last In First Out)
     * Batch paling baru akan diambil lebih dulu.
     */
    public function scopeLifo($query)
    {
        return $query->orderBy('created_at', 'desc');
    }
}