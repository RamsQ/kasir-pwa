<?php

use App\Http\Controllers\Apps\CategoryController;
use App\Http\Controllers\Apps\CustomerController;
use App\Http\Controllers\Apps\PaymentSettingController;
use App\Http\Controllers\Apps\ProductController;
use App\Http\Controllers\Apps\TransactionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Reports\ProfitReportController;
use App\Http\Controllers\Reports\SalesReportController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// =============================================================
// RUTEL PUBLIK (Bisa diakses tanpa login)
// =============================================================

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin'       => Route::has('login'),
        'canRegister'    => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion'     => PHP_VERSION,
    ]);
});

/**
 * Tautan Struk Digital untuk Pelanggan (WA)
 * Diletakkan di luar grup 'auth' agar pelanggan bisa melihat invoice mereka.
 */
Route::get('/share/invoice/{invoice}', [TransactionController::class, 'shareInvoice'])->name('transactions.share');


// =============================================================
// RUTE PRIVATE (Wajib Login)
// =============================================================

Route::group(['prefix' => 'dashboard', 'middleware' => ['auth']], function () {
    
    // [1] KHUSUS ADMIN (Hanya yang punya 'dashboard-access')
    Route::group(['middleware' => ['permission:dashboard-access']], function () {
        
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/permissions', [PermissionController::class, 'index'])->name('permissions.index');

        // Roles & Users
        Route::resource('/roles', RoleController::class)->except(['create', 'edit', 'show']);
        Route::resource('/users', UserController::class)->except('show');

        // Settings
        Route::get('/settings/payments', [PaymentSettingController::class, 'edit'])->name('settings.payments.edit');
        Route::put('/settings/payments', [PaymentSettingController::class, 'update'])->name('settings.payments.update');
        Route::get('/settings/receipt', [\App\Http\Controllers\Apps\ReceiptSettingController::class, 'index'])->name('settings.receipt.index');
        Route::post('/settings/receipt', [\App\Http\Controllers\Apps\ReceiptSettingController::class, 'update'])->name('settings.receipt.update');

        // Discounts
        Route::resource('/discounts', \App\Http\Controllers\Apps\DiscountController::class)
            ->except(['show', 'edit', 'update'])
            ->middlewareFor('index', 'permission:discounts-access')
            ->middlewareFor('store', 'permission:discounts-create')
            ->middlewareFor('destroy', 'permission:discounts-delete');
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
        
        // RESET DATA (HANYA SUPER ADMIN)
        Route::delete('/transactions/reset', [TransactionController::class, 'destroyAll'])
            ->middleware(['role:super-admin']) 
            ->name('transactions.reset');
    });

    // [3] MASTER DATA
    Route::resource('categories', CategoryController::class)->middleware('permission:categories-access');
    
    Route::get('/products/template', [ProductController::class, 'template'])->name('products.template');
    Route::post('/products/import', [ProductController::class, 'import'])->name('products.import');
    Route::resource('products', ProductController::class)->middleware('permission:products-access');
    
    Route::resource('customers', CustomerController::class);
    Route::post('/customers/store-ajax', [CustomerController::class, 'storeAjax'])->name('customers.storeAjax');
    Route::get('/customers/{customer}/history', [CustomerController::class, 'getHistory'])->name('customers.history');

    // [4] REPORTS
    Route::group(['middleware' => ['permission:reports-access']], function () {
        Route::get('/reports/sales', [SalesReportController::class, 'index'])->name('reports.sales.index');
        Route::get('/reports/profits', [ProfitReportController::class, 'index'])->middleware('permission:profits-access')->name('reports.profits.index');
        Route::get('/reports/refund', [\App\Http\Controllers\Reports\RefundReportController::class, 'index'])->name('reports.refund');
    });

    // Bulk Actions
    Route::post('/products/bulk-destroy', [\App\Http\Controllers\Apps\ProductController::class, 'bulkDestroy'])->name('products.bulk_destroy');

    // [5] USER PROFILE
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__ . '/auth.php';