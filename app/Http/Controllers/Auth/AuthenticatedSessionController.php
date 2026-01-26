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

        /** @var \App\Models\User $user */
        $user = $request->user();

        // --- LOGIKA PENGALIHAN BERDASARKAN ROLE (PRIORITAS DASHBOARD) ---

        // 1. Jika user adalah pimpinan (Owner, Admin, atau Super-Admin), langsung ke Dashboard
        // Ini memastikan pimpinan selalu melihat statistik/laporan pertama kali.
        if ($user->hasAnyRole(['admin', 'owner', 'super-admin'])) {
            return redirect()->intended(route('dashboard', absolute: false));
        }

        // 2. Jika user memiliki role 'cashier', langsung arahkan ke halaman POS/Transaksi
        // Mempercepat proses kerja kasir tanpa harus melewati dashboard.
        if ($user->hasRole('cashier')) {
            return redirect()->route('transactions.index');
        }

        // 3. Default Fallback: Jika role tidak spesifik, arahkan ke Dashboard atau tujuan awal
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

        // Diarahkan kembali ke halaman login utama
        return redirect()->route('login');
    }
}