<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon; // Wajib diimport untuk perhitungan tanggal

class Product extends Model
{
    use HasFactory, SoftDeletes;
    
    protected $fillable = [
        'image', 
        'barcode', 
        'title', 
        'description', 
        'buy_price', 
        'sell_price', 
        'category_id', 
        'stock',
        'unit', 
        'expired_date',
        'type',
    ];

    protected $casts = [
        'expired_date' => 'date',
    ];

    /**
     * Mendaftarkan atribut virtual agar muncul saat data dipanggil ke Frontend/Inertia
     */
    protected $appends = ['days_until_expired'];

    /**
     * Accessor: Menghitung sisa hari menjelang expired secara real-time
     * Menghasilkan angka: 
     * (+) Positif jika belum expired (contoh: 15 hari lagi)
     * (0) Nol jika hari ini adalah tanggal expired
     * (-) Negatif jika sudah lewat expired (contoh: -2 hari yang lalu)
     */
    protected function daysUntilExpired(): Attribute
    {
        return Attribute::make(
            get: function () {
                if (!$this->expired_date) return null;
                
                $now = Carbon::now()->startOfDay();
                $expiry = Carbon::parse($this->expired_date)->startOfDay();
                
                // Menghitung selisih hari (false agar menghasilkan angka negatif jika sudah lewat)
                return (int) $now->diffInDays($expiry, false);
            }
        );
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function details()
    {
        return $this->hasMany(TransactionDetail::class, 'product_id');
    }

    /**
     * Accessor untuk URL Image
     */
    protected function image(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) return null;
                if (filter_var($value, FILTER_VALIDATE_URL)) return $value;

                return asset('/storage/products/' . $value);
            }
        );
    }

    public function bundle_items()
    {
        return $this->belongsToMany(Product::class, 'product_bundles', 'product_id', 'item_id')
                ->withPivot('qty', 'product_unit_id')
                ->with(['units']);
    }

    public function bundles()
    {
        return $this->belongsToMany(Product::class, 'product_bundles', 'item_id', 'product_id');
    }

    public function units()
    {
        return $this->hasMany(ProductUnit::class);
    }

    public function stock_opnames()
    {
        return $this->hasMany(StockOpname::class);
    }
}