<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Models\Transaction;
use App\Models\ReceiptSetting;
use App\Models\Expense; // Import Model Expense
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
     * Fungsi Tutup Shift (Audit & Perhitungan Selisih)
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

        // 2. Hitung Penjualan QRIS selama shift ini (Opsional untuk info laporan)
        $totalQrisSales = Transaction::where('shift_id', $shift->id)
                            ->where('payment_method', 'qris') 
                            ->where('payment_status', 'paid')
                            ->sum('grand_total');

        // 3. BARU: Hitung Pengeluaran Kasir (Kas Keluar) selama shift ini
        // Kita mengambil pengeluaran dari laci (Kas Kecil) yang dicatat sejak shift dibuka
        $totalPettyCashOut = Expense::where('category', 'Kas Kecil')
                            ->whereBetween('created_at', [$shift->opened_at, now()])
                            ->sum('amount');

        // 4. Kalkulasi ekspektasi saldo tunai (Modal Awal + Jual Tunai - Kas Keluar)
        // Sesuai studi kasus: (100rb + 7rb) - 10rb = 97rb
        $expected = ($shift->starting_cash + $totalCashSales) - $totalPettyCashOut;
        $actual = $request->total_cash_actual;

        // 5. Update data shift ke database
        $shift->update([
            'total_cash_expected' => $expected,
            'total_cash_actual'   => $actual,
            'difference'          => $actual - $expected,
            'status'              => 'closed',
            'closed_at'           => now(),
        ]);

        // 6. Alirkan ke halaman khusus print/review laporan shift
        return redirect()->route('shifts.print', $shift->id);
    }

    /**
     * Halaman Khusus Review & Cetak Laporan Shift
     */
    public function print(Shift $shift)
    {
        // Hitung ulang data untuk tampilan laporan agar rinciannya lengkap
        $totalCashSales = Transaction::where('shift_id', $shift->id)
            ->where('payment_method', 'cash')
            ->where('payment_status', 'paid')
            ->sum('grand_total');

        $totalQrisSales = Transaction::where('shift_id', $shift->id)
            ->where('payment_method', 'qris')
            ->where('payment_status', 'paid')
            ->sum('grand_total');

        // Ambil rincian pengeluaran kasir untuk ditampilkan di struk shift
        $pettyCashOut = Expense::where('category', 'Kas Kecil')
            ->whereBetween('created_at', [$shift->opened_at, $shift->closed_at ?? now()])
            ->get();

        $shift->load('user');
        $shift->total_qris_sales = $totalQrisSales;
        $shift->total_cash_sales = $totalCashSales;
        $shift->petty_cash_out = $pettyCashOut->sum('amount');
        $shift->expense_details = $pettyCashOut; // Kirim rincian (beli lampu, dll) ke UI

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