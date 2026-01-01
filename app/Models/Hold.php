<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Hold extends Model
{
    protected $fillable = ['ref_number', 'cart_data', 'total', 'user_id'];

    protected $casts = [
    'cart_data' => 'array', // Casting JSON ke Array otomatis
    ];

    public function user() {
    return $this->belongsTo(User::class);
    }
}
