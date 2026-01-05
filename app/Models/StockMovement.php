<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasFactory;

    // Pastikan semua kolom ini ada di database dan diizinkan di fillable
    protected $fillable = [
        'product_id',
        'user_id',
        'type',
        'qty',
        'price',
        'reference',
    ];

    public function product() {
        return $this->belongsTo(Product::class);
    }

    public function user() {
        return $this->belongsTo(User::class);
    }
}