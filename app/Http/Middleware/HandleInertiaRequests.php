<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        // Debugging Sederhana
        $lowStock = 0;
        $expired = 0;

        if ($request->user()) {
            // Gunakan DB langsung untuk menghindari masalah Model Namespace jika ada
            $lowStock = DB::table('products')->where('stock', '<=', 5)->count();
            
            // Cek apakah kolom expired_date ada
            if (\Illuminate\Support\Facades\Schema::hasColumn('products', 'expired_date')) {
                $expired = DB::table('products')
                    ->whereNotNull('expired_date')
                    ->whereDate('expired_date', '<=', now()->addDays(7))
                    ->count();
            }
        }

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user(),
                'permissions' => $request->user() ? $request->user()->getPermissions() : [],
                'super' => $request->user() ? $request->user()->isSuperAdmin() : false,
            ],

            // PASTIKAN KEY INI ADA
            'notifications' => [
                'low_stock_count' => (int) $lowStock,
                'expired_count'   => (int) $expired,
            ],

            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
        ]);
    }
}