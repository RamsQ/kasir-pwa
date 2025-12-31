<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\ExpiredProductsExport;

class ExpiredProductController extends Controller
{
    /**
     * Menampilkan halaman laporan expired
     */
    public function index(Request $request)
    {
        // Default filter: Hari ini sampai 30 hari ke depan
        $startDate = $request->start_date ?? Carbon::now()->format('Y-m-d');
        $endDate   = $request->end_date   ?? Carbon::now()->addDays(30)->format('Y-m-d');

        $products = Product::with('category')
            ->whereNotNull('expired_date')
            ->whereBetween('expired_date', [$startDate, $endDate])
            ->orderBy('expired_date', 'asc')
            ->get();

        return Inertia::render('Dashboard/Reports/Expired', [
            'products'   => $products,
            'filter'     => [
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ]
        ]);
    }

    /**
     * Export ke PDF
     */
    public function exportPdf(Request $request)
    {
        // Gunakan default tanggal jika request kosong untuk mencegah error Undefined
        $startDate = $request->start_date ?? Carbon::now()->format('Y-m-d');
        $endDate   = $request->end_date   ?? Carbon::now()->addDays(30)->format('Y-m-d');

        $products = Product::whereBetween('expired_date', [$startDate, $endDate])
            ->orderBy('expired_date', 'asc')
            ->get();

        // Load view blade dengan data yang diperlukan
        $pdf = Pdf::loadView('exports.expired_pdf', compact('products', 'startDate', 'endDate'));
        
        // Atur ukuran kertas ke A4 Portrait
        $pdf->setPaper('a4', 'portrait');

        return $pdf->download("laporan-expired-{$startDate}-to-{$endDate}.pdf");
    }

    /**
     * Export ke Excel
     */
    public function exportExcel(Request $request)
    {
        // Gunakan default tanggal jika request kosong
        $startDate = $request->start_date ?? Carbon::now()->format('Y-m-d');
        $endDate   = $request->end_date   ?? Carbon::now()->addDays(30)->format('Y-m-d');

        return Excel::download(
            new ExpiredProductsExport($startDate, $endDate), 
            "laporan-expired-{$startDate}-to-{$endDate}.xlsx"
        );
    }
}