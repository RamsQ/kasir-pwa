<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Expense extends Model
{
    use HasFactory;

    // Tambahkan user_id agar bisa disimpan dan dimanipulasi
    protected $fillable = ['user_id', 'name', 'category', 'amount', 'date', 'image', 'note'];

    protected $casts = [
        'amount' => 'integer',
        'date'   => 'date:Y-m-d',
    ];

    // Otomatis buat URL lengkap untuk gambar
    protected $appends = ['image_url'];

    /**
     * Relasi ke model User
     * Ini yang akan memperbaiki error RelationNotFoundException
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Accessor untuk mendapatkan URL lengkap gambar nota
     */
    public function getImageUrlAttribute()
    {
        if (!$this->image) return null;
        
        // Pastikan path sesuai dengan folder penyimpanan di Controller
        return asset('storage/expenses/' . $this->image);
    }
}