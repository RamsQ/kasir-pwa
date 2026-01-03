<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockBatch extends Model
{
    use HasFactory;

    /**
     * Properti fillable untuk mengizinkan penyimpanan data secara massal.
     */
    protected $fillable = [
        'product_id',
        'qty_in',
        'qty_remaining',
        'buy_price',
        'serial_number',
    ];

    /**
     * Casting tipe data agar lebih konsisten saat digunakan di Frontend/JS.
     * Menggunakan float untuk stok agar mendukung timbangan/desimal.
     */
    protected $casts = [
        'qty_in'        => 'float',
        'qty_remaining' => 'float',
        'buy_price'     => 'float',
        'created_at'    => 'datetime',
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
     * Digunakan dalam CogsService untuk memotong stok.
     */
    public function scopeAvailable($query)
    {
        return $query->where('qty_remaining', '>', 0);
    }

    /**
     * Scope untuk urutan FIFO (First In First Out)
     */
    public function scopeFifo($query)
    {
        return $query->orderBy('created_at', 'asc');
    }

    /**
     * Scope untuk urutan LIFO (Last In First Out)
     */
    public function scopeLifo($query)
    {
        return $query->orderBy('created_at', 'desc');
    }
}