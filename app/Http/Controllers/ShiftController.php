<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Models\Transaction;
use App\Models\ReceiptSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShiftController extends Controller
{
    /**
     * Halaman untuk input modal awal
     */
    public function create()
    {
        return Inertia::render('Dashboard/Shifts/Create');
    }

    /**
     * Fungsi Buka Shift (Simpan modal awal)
     */
    public function store(Request $request)
    {
        $request->validate([
            'starting_cash' => 'required|numeric|min:0',
        ]);

        // Proteksi: Cek apakah kasir masih punya shift yang aktif
        $existingShift = Shift::where('user_id', auth()->id())
            ->where('status', 'open')
            ->first();

        if ($existingShift) {
            return redirect()->route('transactions.index')->with('error', 'Anda masih memiliki shift yang aktif!');
        }

        Shift::create([
            'user_id'       => auth()->id(),
            'starting_cash' => $request->starting_cash,
            'opened_at'     => now(),
            'status'        => 'open'
        ]);

        return redirect()->route('transactions.index')->with('success', 'Shift berhasil dibuka!');
    }

    /**
     * Fungsi Tutup Shift (Audit & Audit)
     */
    public function update(Request $request, Shift $shift)
    {
        $request->validate([
            'total_cash_actual' => 'required|numeric|min:0',
        ]);

        // 1. Hitung Penjualan TUNAI selama shift ini
        $totalCashSales = Transaction::where('shift_id', $shift->id)
                            ->where('payment_method', 'cash') 
                            ->where('payment_status', 'paid')
                            ->sum('grand_total');

        // 2. Hitung Penjualan QRIS selama shift ini
        $totalQrisSales = Transaction::where('shift_id', $shift->id)
                            ->where('payment_method', 'qris') 
                            ->where('payment_status', 'paid')
                            ->sum('grand_total');

        // 3. Kalkulasi ekspektasi saldo tunai (Modal Awal + Hasil Penjualan Tunai)
        $expected = $shift->starting_cash + $totalCashSales;
        $actual = $request->total_cash_actual;

        // 4. Update data shift ke database
        $shift->update([
            'total_cash_expected' => $expected,
            'total_cash_actual'   => $actual,
            'difference'          => $actual - $expected,
            'status'              => 'closed',
            'closed_at'           => now(),
        ]);

        // 5. Alirkan ke halaman khusus print/review laporan shift
        return redirect()->route('shifts.print', $shift->id);
    }

    /**
     * Halaman Khusus Review & Cetak Laporan Shift (Mirip Print Invoice)
     */
    public function print(Shift $shift)
    {
        // Hitung ulang data untuk tampilan laporan
        $totalCashSales = Transaction::where('shift_id', $shift->id)
            ->where('payment_method', 'cash')
            ->where('payment_status', 'paid')
            ->sum('grand_total');

        $totalQrisSales = Transaction::where('shift_id', $shift->id)
            ->where('payment_method', 'qris')
            ->where('payment_status', 'paid')
            ->sum('grand_total');

        $shift->load('user');
        $shift->total_qris_sales = $totalQrisSales;
        $shift->total_cash_sales = $totalCashSales;

        return Inertia::render('Dashboard/Shifts/Print', [
            'shift'          => $shift,
            'receiptSetting' => ReceiptSetting::first(),
        ]);
    }

    /**
     * Riwayat Shift (Laporan Shift)
     */
    public function index(Request $request)
    {
        $shifts = Shift::with('user:id,name')
            // Menghitung total Tunai per baris laporan
            ->withSum(['transactions as total_cash_sales' => function($query) {
                $query->where('payment_method', 'cash')->where('payment_status', 'paid');
            }], 'grand_total')
            // Menghitung total QRIS per baris laporan
            ->withSum(['transactions as total_qris_sales' => function($query) {
                $query->where('payment_method', 'qris')->where('payment_status', 'paid');
            }], 'grand_total')
            ->when($request->date, fn($q, $date) => $q->whereDate('opened_at', $date))
            ->orderBy('id', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Dashboard/Shifts/Index', [
            'shifts'  => $shifts,
            'filters' => $request->all(['date'])
        ]);
    }
}