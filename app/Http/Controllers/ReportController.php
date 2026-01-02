<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\CarbonPeriod;

class ReportController extends Controller
{
    public function finance(Request $request)
    {
        // 1. Tentukan Range Tanggal & Filter Petugas
        $start  = $request->start_date ?? now()->subDays(6)->format('Y-m-d'); // Default 7 hari terakhir
        $end    = $request->end_date ?? now()->format('Y-m-d');
        $userId = $request->user_id;

        // 2. HITUNG OMZET (Total Jual)
        $revenue = DB::table('transactions')
            ->whereBetween('created_at', [$start . ' 00:00:00', $end . ' 23:59:59'])
            ->where('payment_status', 'paid')
            ->sum('grand_total');

        // 3. HITUNG HPP (MODAL) SECARA LIVE & AKURAT
        $totalHpp = DB::table('transaction_details')
            ->join('transactions', 'transactions.id', '=', 'transaction_details.transaction_id')
            ->join('products', 'products.id', '=', 'transaction_details.product_id')
            ->leftJoin('product_units', 'product_units.id', '=', 'transaction_details.product_unit_id')
            ->whereBetween('transactions.created_at', [$start . ' 00:00:00', $end . ' 23:59:59'])
            ->where('transactions.payment_status', 'paid')
            ->select(DB::raw('SUM(
                products.buy_price * transaction_details.qty * COALESCE(product_units.conversion, 1)
            ) as real_hpp'))
            ->first()->real_hpp ?? 0;

        // 4. AMBIL LIST PENGELUARAN (Expenses)
        $expensesQuery = Expense::with('user:id,name')
            ->whereBetween('date', [$start, $end]);

        if ($userId) {
            $expensesQuery->where('user_id', $userId);
        }

        $expenses = $expensesQuery->latest()->get();
        $totalExpenses = $expenses->sum('amount');

        // 5. DATA UNTUK CHART (Harian)
        $chartData = [];
        $period = CarbonPeriod::create($start, $end);

        foreach ($period as $date) {
            $d = $date->format('Y-m-d');
            
            $dayRevenue = DB::table('transactions')
                ->whereDate('created_at', $d)
                ->where('payment_status', 'paid')
                ->sum('grand_total');

            $dayExpense = DB::table('expenses')
                ->whereDate('date', $d)
                ->sum('amount');

            $chartData[] = [
                'label'   => $date->format('d M'),
                'revenue' => (int)$dayRevenue,
                'expense' => (int)$dayExpense
            ];
        }

        // 6. DATA TAMBAHAN
        $totalInitialCash = DB::table('shifts')
            ->whereBetween('opened_at', [$start . ' 00:00:00', $end . ' 23:59:59'])
            ->sum('starting_cash');

        $staffList = User::select('id', 'name')->orderBy('name')->get();

        // 7. KALKULASI FINAL
        $grossProfit = $revenue - $totalHpp;
        $netProfit   = $grossProfit - $totalExpenses;
        $cashInDrawer = ($totalInitialCash + $revenue) - $totalExpenses;

        return Inertia::render('Dashboard/Reports/Finance', [
            'report' => [
                'revenue'        => (int)$revenue,
                'hpp'            => (int)$totalHpp,
                'grossProfit'    => (int)$grossProfit,
                'expenses'       => (int)$totalExpenses,
                'netProfit'      => (int)$netProfit,
                'cash_in_drawer' => (int)$cashInDrawer,
                'expenseList'    => $expenses,
                'staffList'      => $staffList,
                'chartData'      => $chartData, // Kirim data grafik
                'filter' => [
                    'start'   => $start,
                    'end'     => $end,
                    'user_id' => $userId
                ]
            ]
        ]);
    }
}