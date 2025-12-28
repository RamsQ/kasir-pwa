<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;

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
        'expired_date',
        'type',
    ];

    protected $casts = [
        'expired_date' => 'date',
    ];

    /**
     * Relasi ke Category
     */
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Relasi ke TransactionDetail
     * Digunakan untuk menghitung akumulasi penjualan (total_sold) dan omzet (total_revenue)
     */
    public function details()
    {
        return $this->hasMany(TransactionDetail::class, 'product_id');
    }

    /**
     * Accessor untuk URL Image
     *
     * @return Attribute
     */
    protected function image(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                // Jika ada value di database, return url storage
                if ($value) {
                    return asset('/storage/products/' . $value);
                }
                // Jika null, return null
                return null;
            }
        );
    }

    /**
     * Relasi: Produk ini sebagai Paket (Bundle), punya banyak item didalamnya
     */
    public function bundle_items()
    {
        return $this->belongsToMany(Product::class, 'product_bundles', 'product_id', 'item_id')
                ->withPivot('qty');
    }

    /**
     * Relasi kebalikannya: Produk ini menjadi bagian dari paket (bundle) apa saja
     */
    public function bundles()
    {
        return $this->belongsToMany(Product::class, 'product_bundles', 'item_id', 'product_id');
    }
}