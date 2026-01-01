<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Menampilkan halaman login.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Menangani permintaan autentikasi masuk.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        // --- CEK ROLE USER SETELAH LOGIN ---
        
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Jika user memiliki role 'cashier', langsung arahkan ke halaman POS/Transaksi
        if ($user->hasRole('cashier')) {
            return redirect()->route('transactions.index');
        }

        // Jika bukan kasir (misal: admin), arahkan ke Dashboard atau tujuan awal
        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Menghancurkan sesi autentikasi (Logout).
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        // --- PERUBAHAN DISINI: DIARAHKAN KE HALAMAN LOGIN ---
        return redirect()->route('login');
    }
}