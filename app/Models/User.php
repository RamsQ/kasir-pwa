<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes; // Tambahkan ini
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /**
     * SoftDeletes: Memungkinkan penghapusan akun sementara (mengisi deleted_at)
     * HasRoles: Integrasi dengan Spatie Permission
     */
    use HasFactory, Notifiable, HasRoles, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar', 
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Relasi ke StockOpname
     * Seorang user bisa melakukan banyak stock opname
     */
    public function stockOpnames()
    {
        return $this->hasMany(StockOpname::class);
    }

    /**
     * get all permissions users
     * Digunakan oleh helper Permission.jsx di frontend
     */
    public function getPermissions()
    {
        return $this->getAllPermissions()->mapWithKeys(function ($permission) {
            return [
                $permission['name'] => true
            ];
        });
    }

    /**
     * check role isSuperAdmin
     */
    public function isSuperAdmin()
    {
        return $this->hasRole('super-admin');
    }
}