<?php

use App\Http\Controllers\Apps\CategoryController;
use App\Http\Controllers\Apps\CustomerController;
use App\Http\Controllers\Apps\PaymentSettingController;
use App\Http\Controllers\Apps\ProductController;
use App\Http\Controllers\Apps\TransactionController;
use App\Http\Controllers\Apps\ProductReportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\Apps\ProfileController;
use App\Http\Controllers\Reports\ProfitReportController;
use App\Http\Controllers\Reports\SalesReportController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ShiftController; 
use App\Http\Controllers\Apps\StockOpnameController;
use App\Http\Controllers\Apps\ExpiredProductController; // Import Controller Expired
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// =============================================================
// RUTE PUBLIK (Bisa diakses tanpa login)
// =============================================================

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin'       => Route::has('login'),
        'canRegister'    => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion'     => PHP_VERSION,
    ]);
});

Route::get('/share/invoice/{invoice}', [TransactionController::class, 'shareInvoice'])->name('transactions.share');


// =============================================================
// RUTE PRIVATE (Wajib Login)
// =============================================================

Route::group(['prefix' => 'dashboard', 'middleware' => ['auth']], function () {
    
    // [0] DASHBOARD UTAMA
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // [0.1] SHIFT KASIR
    Route::group(['middleware' => ['permission:transactions-access']], function () {
        Route::get('/shifts', [ShiftController::class, 'index'])->name('shifts.index'); 
        Route::post('/shifts', [ShiftController::class, 'store'])->name('shifts.store');
        Route::put('/shifts/{shift}', [ShiftController::class, 'update'])->name('shifts.update');
        Route::get('/shifts/{shift}/print', [ShiftController::class, 'print'])->name('shifts.print');
    });

    // [1] KHUSUS ADMIN/OWNER (Manajemen Sistem)
    Route::group(['middleware' => ['permission:dashboard-access']], function () {
        Route::get('/permissions', [PermissionController::class, 'index'])->name('permissions.index');
        Route::resource('/roles', RoleController::class)->except(['create', 'edit', 'show']);
        Route::resource('/users', UserController::class)->except('show');

        // Settings
        Route::get('/settings/payments', [PaymentSettingController::class, 'edit'])->name('settings.payments.edit');
        Route::put('/settings/payments', [PaymentSettingController::class, 'update'])->name('settings.payments.update');
        Route::get('/settings/receipt', [\App\Http\Controllers\Apps\ReceiptSettingController::class, 'index'])->name('settings.receipt.index');
        Route::post('/settings/receipt', [\App\Http\Controllers\Apps\ReceiptSettingController::class, 'update'])->name('settings.receipt.update');

        // Discounts
        Route::resource('/discounts', \App\Http\Controllers\Apps\DiscountController::class)->except(['show', 'edit', 'update']);
    });

    // [2] TRANSAKSI & POS
    Route::group(['middleware' => ['permission:transactions-access']], function () {
        Route::get('/transactions', [TransactionController::class, 'index'])->name('transactions.index');
        Route::post('/transactions/searchProduct', [TransactionController::class, 'searchProduct'])->name('transactions.searchProduct');
        Route::post('/transactions/addToCart', [TransactionController::class, 'addToCart'])->name('transactions.addToCart');
        Route::delete('/transactions/{cart_id}/destroyCart', [TransactionController::class, 'destroyCart'])->name('transactions.destroyCart');
        Route::patch('/transactions/{cart_id}/updateCart', [TransactionController::class, 'updateCart'])->name('transactions.updateCart');
        Route::post('/transactions/store', [TransactionController::class, 'store'])->name('transactions.store');
        Route::get('/transactions/history', [TransactionController::class, 'history'])->name('transactions.history');
        
        // POS Features
        Route::post('/transactions/hold', [TransactionController::class, 'holdCart'])->name('transactions.hold');
        Route::post('/transactions/{holdId}/resume', [TransactionController::class, 'resumeCart'])->name('transactions.resume');
        Route::delete('/transactions/{holdId}/clearHold', [TransactionController::class, 'clearHold'])->name('transactions.clearHold');
        Route::get('/transactions/held', [TransactionController::class, 'getHeldCarts'])->name('transactions.held');
        Route::get('/transactions/{invoice}/print', [TransactionController::class, 'print'])->name('transactions.print');
        Route::post('/transactions/{transaction}/refund', [TransactionController::class, 'refund'])->name('transactions.refund');
        
        Route::delete('/transactions/reset', [TransactionController::class, 'destroyAll'])
            ->middleware(['role:super-admin']) 
            ->name('transactions.reset');
    });

    // [3] MASTER DATA & INVENTORY
    Route::group(['middleware' => ['permission:products-access']], function () {
        Route::resource('categories', CategoryController::class)->middleware('permission:categories-access');
        
        Route::get('/products/template', [ProductController::class, 'template'])->name('products.template');
        Route::post('/products/import', [ProductController::class, 'import'])->name('products.import');
        Route::resource('products', ProductController::class);

        // --- STOCK OPNAME ---
        Route::group(['middleware' => ['permission:stock_opnames.index']], function () {
            Route::get('/stock-opnames', [StockOpnameController::class, 'index'])->name('stock_opnames.index');
            Route::post('/stock-opnames', [StockOpnameController::class, 'store'])->name('stock_opnames.store');
            Route::delete('/stock-opnames/{stock_opname}', [StockOpnameController::class, 'destroy'])->name('stock_opnames.destroy');
            
            Route::get('/stock-opnames-export', [StockOpnameController::class, 'export'])->name('stock_opnames.export');
            Route::post('/stock-opnames-import', [StockOpnameController::class, 'import'])->name('stock_opnames.import');
        });
    });
    
    Route::resource('customers', CustomerController::class);
    Route::post('/customers/store-ajax', [CustomerController::class, 'storeAjax'])->name('customers.storeAjax');
    Route::get('/customers/{customer}/history', [CustomerController::class, 'getHistory'])->name('customers.history');

    // [4] REPORTS
    Route::group(['middleware' => ['permission:reports-access']], function () {
        Route::get('/reports/sales', [SalesReportController::class, 'index'])->name('reports.sales.index');
        Route::get('/reports/profits', [ProfitReportController::class, 'index'])->middleware('permission:profits-access')->name('reports.profits.index');
        Route::get('/reports/refund', [\App\Http\Controllers\Reports\RefundReportController::class, 'index'])->name('reports.refund');
        Route::get('/reports/products', [ProductReportController::class, 'index'])->name('reports.products.index');
        Route::get('/reports/products/export', [ProductReportController::class, 'export'])->name('reports.products.export');
        Route::get('/reports/shifts', [ShiftController::class, 'index'])->name('reports.shifts.index');

        // --- UPDATE: LAPORAN PRODUK EXPIRED DENGAN EXPORT ---
        Route::get('/reports/expired', [ExpiredProductController::class, 'index'])->name('reports.expired.index');
        Route::get('/reports/expired/pdf', [ExpiredProductController::class, 'exportPdf'])->name('reports.expired.pdf');
        Route::get('/reports/expired/excel', [ExpiredProductController::class, 'exportExcel'])->name('reports.expired.excel');
    });

    Route::post('/products/bulk-destroy', [\App\Http\Controllers\Apps\ProductController::class, 'bulkDestroy'])->name('products.bulk_destroy');

    // [5] USER PROFILE
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__ . '/auth.php';