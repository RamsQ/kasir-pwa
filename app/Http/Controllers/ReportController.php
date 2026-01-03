<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\User;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\CarbonPeriod;

class ReportController extends Controller
{
    public function finance(Request $request)
    {
        // 1. Tentukan Range Tanggal & Filter Petugas
        $start  = $request->start_date ?? now()->subDays(6)->format('Y-m-d'); 
        $end    = $request->end_date ?? now()->format('Y-m-d');
        $userId = $request->user_id;

        // 2. HITUNG OMZET (Total Penjualan)
        $revenue = DB::table('transactions')
            ->where('payment_status', 'paid')
            ->whereDate('created_at', '>=', $start)
            ->whereDate('created_at', '<=', $end)
            ->sum('grand_total');

        // 3. HITUNG HPP (MODAL BARANG) - VERSI FIX 
        // Menggunakan SUM dari (buy_price * qty) yang tersimpan di transaction_details
        $totalHpp = DB::table('transaction_details')
            ->join('transactions', 'transactions.id', '=', 'transaction_details.transaction_id')
            ->where('transactions.payment_status', 'paid')
            ->whereDate('transactions.created_at', '>=', $start)
            ->whereDate('transactions.created_at', '<=', $end)
            ->select(DB::raw('SUM(transaction_details.buy_price * transaction_details.qty) as real_hpp'))
            ->first()->real_hpp ?? 0;

        // 4. AMBIL LIST PENGELUARAN (Expenses) & FILTER SUMBER DANA
        $expensesQuery = Expense::with('user:id,name')
            ->whereBetween('date', [$start, $end]);

        if ($userId) {
            $expensesQuery->where('user_id', $userId);
        }

        $expenses = $expensesQuery->latest()->get();
        
        // Pemisahan pengeluaran berdasarkan sumber dana
        $expenseFromCash    = $expenses->where('source', 'Kas Laci')->sum('amount');
        $expenseFromCapital = $expenses->where('source', 'Modal Luar')->sum('amount');
        $expenseFromDebt    = $expenses->where('source', 'Hutang Dagang')->sum('amount');
        
        $totalDebtRepayment = $expenses->where('category', 'Pelunasan Hutang')->sum('amount');
        
        // Total Biaya Operasional Riil (Tanpa pelunasan hutang)
        $operationalExpenses = $expenses->where('category', '!=', 'Pelunasan Hutang')->sum('amount');

        // 5. DATA UNTUK CHART (Trend Omzet vs Pengeluaran Harian)
        $chartData = [];
        $period = CarbonPeriod::create($start, $end);
        foreach ($period as $date) {
            $d = $date->format('Y-m-d');
            $dayRevenue = DB::table('transactions')->whereDate('created_at', $d)->where('payment_status', 'paid')->sum('grand_total');
            $dayExpense = DB::table('expenses')->whereDate('date', $d)->sum('amount');

            $chartData[] = [
                'label'   => $date->format('d M'),
                'revenue' => (int)$dayRevenue,
                'expense' => (int)$dayExpense
            ];
        }

        // 6. LOGIKA NERACA (BALANCE SHEET)
        // A. Nilai Persediaan (Estimasi: Stok Master x Harga Beli Master)
        $inventoryValue = DB::table('products')
            ->where('type', 'single')
            ->select(DB::raw('SUM(stock * buy_price) as total_value'))
            ->first()->total_value ?? 0;

        // B. Top 10 Barang dengan Nilai Aset Terbesar
        $topAssets = DB::table('products')
            ->where('type', 'single')
            ->where('stock', '>', 0)
            ->select('title', 'stock', 'buy_price', DB::raw('(stock * buy_price) as total_asset_value'))
            ->orderByDesc('total_asset_value')
            ->limit(10)
            ->get();

        // C. Modal Luar (External Capital)
        $rawExternalCapital = DB::table('capitals')->sum('amount') ?? 0;
        $currentExternalCapital = $rawExternalCapital - $expenseFromCapital;

        // D. Saldo Kasir (Estimasi Kas Laci)
        $totalInitialCash = DB::table('shifts')
            ->whereDate('opened_at', '>=', $start)
            ->whereDate('opened_at', '<=', $end)
            ->sum('starting_cash');
        
        $cashInDrawer = ($totalInitialCash + $revenue) - $expenseFromCash;

        // E. Sisa Hutang Dagang
        $historyTotalDebt = DB::table('expenses')->where('source', 'Hutang Dagang')->sum('amount');
        $historyTotalRepayment = DB::table('expenses')->where('category', 'Pelunasan Hutang')->sum('amount');
        $remainingDebt = $historyTotalDebt - $historyTotalRepayment;

        // 7. KALKULASI FINAL LABA RUGI
        $grossProfit = (float)$revenue - (float)$totalHpp;
        $netProfit   = $grossProfit - (float)$operationalExpenses; 
        $staffList   = User::select('id', 'name')->orderBy('name')->get();

        return Inertia::render('Dashboard/Reports/Finance', [
            'report' => [
                'revenue'            => (int)$revenue,
                'hpp'                => (int)$totalHpp,
                'grossProfit'        => (int)$grossProfit,
                'expenses'           => (int)$operationalExpenses,
                'expenseFromCash'    => (int)$expenseFromCash,
                'expenseFromCapital' => (int)$expenseFromCapital,
                'expenseFromDebt'    => (int)$expenseFromDebt,
                'debtRepayment'      => (int)$totalDebtRepayment,
                'netProfit'          => (int)$netProfit,
                'expenseList'        => $expenses,
                'chartData'          => $chartData,
                'topAssets'          => $topAssets,
                'balanceSheet' => [
                    'cash_in_drawer'   => (int)$cashInDrawer,
                    'external_capital' => (int)$currentExternalCapital,
                    'inventory_value'  => (int)$inventoryValue,
                    'accounts_payable' => (int)$remainingDebt,
                    'total_assets'     => (int)($cashInDrawer + $currentExternalCapital + $inventoryValue),
                    'retained_earnings'=> (int)$netProfit,
                ],
                'staffList'          => $staffList,
                'filter' => [
                    'start'   => $start,
                    'end'     => $end,
                    'user_id' => $userId
                ]
            ]
        ]);
    }
}