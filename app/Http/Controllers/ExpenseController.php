<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ExpenseController extends Controller
{
    /**
     * Menyimpan pengeluaran baru dari halaman Laporan Keuangan
     */
    public function store(Request $request)
    {
        // 1. Validasi Input
        $request->validate([
            'name'   => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'date'   => 'required|date',
            'image'  => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048', // Max 2MB
        ]);

        // 2. Proses Upload Foto Nota (jika ada)
        $imagePath = null;
        if ($request->hasFile('image')) {
            // Pastikan folder public/expenses sudah ada
            $path = $request->file('image')->store('public/expenses');
            $imagePath = basename($path);
        }

        // 3. Simpan ke Database
        Expense::create([
            'user_id'  => auth()->id(), // TAMBAHKAN INI: Mencatat petugas yang login
            'name'     => $request->name,
            'category' => $request->category ?? 'Operasional',
            'amount'   => $request->amount,
            'date'     => $request->date,
            'image'    => $imagePath,
            'note'     => $request->note,
        ]);

        // 4. Redirect balik dengan pesan sukses
        return redirect()->back()->with('success', 'Pengeluaran berhasil dicatat!');
    }
}