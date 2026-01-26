<?php

namespace App\Http\Controllers\Apps;

use App\Exceptions\PaymentGatewayException;
use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Discount;
use App\Models\PaymentSetting;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\ReceiptSetting;
use App\Models\Transaction;
use App\Models\Shift;
use App\Models\Hold;
use App\Models\Expense;
use App\Models\Setting;
use App\Models\StockBatch;
use App\Services\CogsService;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;

class TransactionController extends Controller
{
    protected $cogsService;

    public function __construct(CogsService $cogsService)
    {
        $this->cogsService = $cogsService;
    }

    /**
     * Tampilan Utama Kasir
     */
    public function index(Request $request)
    {
        $userId = auth()->user()->id;

        // 1. CEK SHIFT AKTIF
        $activeShift = Shift::where('user_id', $userId)->where('status', 'open')->first();

        // 2. Data Keranjang
        $carts = Cart::with(['product.units', 'product.bundle_items', 'unit'])
            ->where('cashier_id', $userId)
            ->active()
            ->latest()
            ->get();

        // 3. Holds
        $holds = Hold::where('user_id', $userId)->latest()->get();

        // 4. Query Produk dengan Filter & Pagination (FIX BUG BUNDLE STOCK)
        $productsQuery = Product::with(['category:id,name', 'bundle_items', 'units'])
            ->select('id', 'barcode', 'title', 'description', 'image', 'buy_price', 'sell_price', 'stock', 'category_id', 'type', 'unit')
            ->where(function ($query) {
                // Jika produk biasa, pastikan stok > 0
                $query->where(function($q) {
                    $q->where('type', '!=', 'bundle')
                      ->where('stock', '>', 0);
                })
                // Jika produk bundle, pastikan SEMUA item komponen di dalamnya punya stok > 0
                ->orWhere(function($q) {
                    $q->where('type', 'bundle')
                      ->whereHas('bundle_items', function($sub) {
                          $sub->where('stock', '>', 0);
                      });
                });
            })
            ->when($request->search, function($query, $search) {
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', '%'.$search.'%')
                      ->orWhere('barcode', 'like', '%'.$search.'%');
                });
            })
            ->when($request->category_id, function($query, $catId) {
                if ($catId !== 'all') {
                    $query->where('category_id', $catId);
                }
            })
            ->orderBy('title');

        if ($request->wantsJson()) {
            return response()->json($productsQuery->paginate(15)->withQueryString());
        }

        return Inertia::render('Dashboard/Transactions/Index', [
            'carts'                 => $carts,
            'carts_total'           => (int) $carts->sum('price'),
            'holds'                 => $holds,
            'customers'             => Customer::select('id', 'name', 'phone')->latest()->get(),
            'products'              => $productsQuery->paginate(15)->withQueryString(), 
            'categories'            => Category::select('id', 'name', 'image')->orderBy('name')->get(),
            'discounts'             => Discount::active()->with('product:id,title')->get(),
            'paymentSetting'        => PaymentSetting::first(),
            'activeShift'           => $activeShift,
            'receiptSetting'        => ReceiptSetting::first(),
            'filters'               => $request->all(['search', 'category_id']),
        ]);
    }

    /**
     * Simpan Transaksi Baru
     */
    public function store(Request $request, PaymentGatewayManager $paymentGatewayManager)
    {
        $activeShift = Shift::where('user_id', auth()->id())->where('status', 'open')->first();
        if (!$activeShift) {
            return back()->withErrors(['error' => 'Anda harus membuka shift terlebih dahulu!']);
        }

        $cogsMethod = Setting::first()->cogs_method ?? 'AVERAGE';
        $paymentGateway = strtolower($request->input('payment_gateway', 'cash'));
        $invoice = 'TRX-' . Str::upper(Str::random(10));
        
        $isManualPayment = in_array($paymentGateway, ['cash', 'qris', '']);
        $cashAmount   = $isManualPayment ? $request->cash : $request->grand_total;
        $changeAmount = $isManualPayment ? $request->change : 0;

        try {
            $transaction = DB::transaction(function () use ($request, $invoice, $cashAmount, $changeAmount, $paymentGateway, $isManualPayment, $activeShift, $cogsMethod) {
                
                $cartItems = Cart::with(['product.bundle_items', 'product.units'])->where('cashier_id', auth()->user()->id)->get();
                if ($cartItems->isEmpty()) { throw new \Exception('Keranjang kosong'); }

                // Lock for update to prevent race conditions
                $productIds = $cartItems->pluck('product_id')->toArray();
                foreach ($cartItems as $c) {
                    if ($c->product->type === 'bundle') {
                        $productIds = array_merge($productIds, $c->product->bundle_items->pluck('id')->toArray());
                    }
                }
                Product::whereIn('id', array_unique($productIds))->lockForUpdate()->get();

                $transaction = Transaction::create([
                    'cashier_id'     => auth()->user()->id,
                    'customer_id'    => $request->customer_id,
                    'shift_id'       => $activeShift->id,
                    'invoice'        => $invoice,
                    'cash'           => $cashAmount,
                    'change'         => $changeAmount,
                    'discount'       => $request->discount ?? 0,
                    'grand_total'    => $request->grand_total,
                    'payment_method' => $paymentGateway ?: 'cash',
                    'payment_status' => $isManualPayment ? 'paid' : 'pending',
                ]);

                foreach ($cartItems as $cart) {
                    $unitPrice = $cart->product_unit_id 
                        ? ($cart->product->units->where('id', $cart->product_unit_id)->first()->sell_price ?? $cart->product->sell_price)
                        : $cart->product->sell_price;
                    
                    $totalItemSellingPrice = $unitPrice * $cart->qty;

                    // Perhitungan COGS & Laba
                    $totalItemCost = 0;
                    if ($cart->product->type === 'bundle') {
                        foreach ($cart->product->bundle_items as $item) {
                            $qtyInRecipe = $item->pivot->qty;
                            $bundleConversion = $item->pivot->product_unit_id ? (ProductUnit::find($item->pivot->product_unit_id)->conversion ?? 1) : 1;
                            $totalItemCost += $this->cogsService->calculate($item->id, $cart->qty * $qtyInRecipe * $bundleConversion, $cogsMethod);
                        }
                    } else {
                        $conversionValue = $cart->product_unit_id ? (ProductUnit::find($cart->product_unit_id)->conversion ?? 1) : 1;
                        $totalItemCost = $this->cogsService->calculate($cart->product_id, $cart->qty * $conversionValue, $cogsMethod);
                    }

                    $transaction->details()->create([
                        'product_id'      => $cart->product_id,
                        'qty'             => $cart->qty,
                        'price'           => $totalItemSellingPrice, 
                        'buy_price'       => $cart->qty > 0 ? ($totalItemCost / $cart->qty) : 0, 
                        'unit'            => $cart->unit->unit_name ?? $cart->product->unit ?? 'Pcs',
                        'product_unit_id' => $cart->product_unit_id,
                    ]);

                    $transaction->profits()->create([
                        'total' => (float)$totalItemSellingPrice - (float)$totalItemCost
                    ]);
                }

                Cart::where('cashier_id', auth()->user()->id)->delete();
                return $transaction;
            });
        } catch (\Exception $e) {
            return back()->with('error', 'Transaksi Gagal: ' . $e->getMessage());
        }

        return to_route('transactions.print', $transaction->invoice)->with('auto_print', true);
    }

    /**
     * Riwayat Transaksi
     */
    public function history(Request $request)
    {
        $query = Transaction::query()->with(['cashier:id,name', 'customer:id,name'])
            ->withSum('details as total_items', 'qty')
            ->withSum('profits as total_profit', 'total') 
            ->orderByDesc('created_at');
            
        if (!auth()->user()->hasRole('super-admin')) {
            $query->where('cashier_id', auth()->id());
        }
        
        $transactions = $query->when($request->invoice, fn($q, $inv) => $q->where('invoice', 'like', "%$inv%"))
            ->when($request->start_date, fn($q, $date) => $q->whereDate('created_at', '>=', $date))
            ->when($request->end_date, fn($q, $date) => $q->whereDate('created_at', '<=', $date))
            ->paginate(10)->withQueryString();
            
        return Inertia::render('Dashboard/Transactions/History', [
            'transactions' => $transactions, 
            'filters' => $request->all(['invoice', 'start_date', 'end_date'])
        ]);
    }

    /**
     * Kas Keluar
     */
    public function storeExpense(Request $request)
    {
        $request->validate(['name' => 'required|string', 'amount' => 'required|numeric|min:0']);
        $activeShift = Shift::where('user_id', auth()->id())->where('status', 'open')->first();
        
        if (!$activeShift) return back()->with('error', 'Shift belum dibuka!');
        
        Expense::create([
            'user_id' => auth()->id(),
            'name' => '[KASIR] ' . $request->name,
            'amount' => $request->amount,
            'date' => now()->format('Y-m-d'),
            'category' => 'Kas Kecil',
            'note' => 'Shift #' . $activeShift->id,
        ]);
        
        return back()->with('success', 'Kas keluar dicatat.');
    }

    /**
     * RESET DATA TOTAL (CLEAN STOCK MOVEMENTS & INVENTORY)
     */
    public function destroyAll(Request $request) 
    {
        if (!auth()->user()->hasRole('super-admin')) return back()->with('error', 'Akses ditolak!');
        if (!Hash::check($request->password, auth()->user()->password)) return back()->with('error', 'Password salah!');

        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');

            // 1. Reset Penjualan
            DB::table('transaction_details')->truncate(); 
            DB::table('transactions')->truncate(); 
            DB::table('profits')->truncate();
            DB::table('expenses')->truncate();

            // 2. Reset Operasional
            DB::table('shifts')->truncate();
            DB::table('carts')->truncate();
            DB::table('holds')->truncate();

            // 3. Reset Inventory (SUPER CLEAN)
            // Menghapus riwayat log masuk barang (StockMovement)
            if (Schema::hasTable('stock_movements')) {
                DB::table('stock_movements')->truncate();
            }
            // Menghapus riwayat batch teknis
            DB::table('stock_batches')->truncate();
            // Menghapus riwayat nota masuk jika ada
            if (Schema::hasTable('stock_ins')) {
                DB::table('stock_ins')->truncate();
            }

            // 4. Reset Stock Opname
            if (Schema::hasTable('stock_opnames')) {
                DB::table('stock_opnames')->truncate();
            }

            // 5. RESET STOK MASTER PRODUK
            DB::table('products')->update(['stock' => 0]);

            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            
            return back()->with('success', 'RESET BERHASIL: Semua riwayat transaksi, laporan shift, dan riwayat masuk barang telah dibersihkan.');
        } catch (\Exception $e) {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            return back()->with('error', 'Gagal reset data: ' . $e->getMessage());
        }
    }

    /**
     * Fitur Hold/Resume
     */
    public function holdCart(Request $request)
    {
        $request->validate(['ref_number'=>'required','cart_items'=>'required','total'=>'required']);
        Hold::create(['ref_number' => $request->ref_number, 'cart_data' => $request->cart_items, 'total' => $request->total, 'user_id' => auth()->id()]);
        Cart::where('cashier_id', auth()->id())->delete();
        return back()->with('success', 'Transaksi ditunda.');
    }

    public function resumeCart($holdId)
    {
        $hold = Hold::findOrFail($holdId);
        Cart::where('cashier_id', auth()->id())->delete();
        foreach ($hold->cart_data as $item) {
            Cart::create([
                'cashier_id' => auth()->id(), 
                'product_id' => $item['product_id'], 
                'product_unit_id' => $item['product_unit_id'] ?? null,
                'qty' => $item['qty'], 
                'price' => $item['price']
            ]);
        }
        $hold->delete();
        return back()->with('success', 'Transaksi dipulihkan.');
    }

    public function addToCart(Request $request)
    {
        $product = Product::find($request->product_id);
        $unitId = $request->product_unit_id ?? null;
        $unitPrice = $unitId ? (ProductUnit::find($unitId)->sell_price ?? $product->sell_price) : $product->sell_price;

        $cart = Cart::where(['product_id' => $request->product_id, 'product_unit_id' => $unitId, 'cashier_id' => auth()->id()])->first();

        if ($cart) {
            $cart->increment('qty', 1);
            $cart->update(['price' => $unitPrice * $cart->qty]);
        } else {
            Cart::create(['cashier_id' => auth()->id(), 'product_id' => $request->product_id, 'product_unit_id' => $unitId, 'qty' => 1, 'price' => $unitPrice]);
        }
        return back();
    }

    public function updateCart(Request $request, $cart_id)
    {
        $cart = Cart::with('product')->whereId($cart_id)->firstOrFail();
        $unitId = $request->product_unit_id ?? $cart->product_unit_id;
        $unitPrice = $unitId ? (ProductUnit::find($unitId)->sell_price ?? $cart->product->sell_price) : $cart->product->sell_price;
        $cart->update(['qty' => $request->qty, 'product_unit_id' => $unitId, 'price' => $unitPrice * $request->qty]);
        return back();
    }

    public function destroyCart($cart_id)
    {
        Cart::whereId($cart_id)->delete();
        return back();
    }

    public function print($invoice)
    {
        $transaction = Transaction::with(['details.product.bundle_items.units', 'details.product_unit', 'cashier', 'customer'])
            ->where('invoice', $invoice)->firstOrFail();

        return Inertia::render('Dashboard/Transactions/Print', [
            'transaction' => $transaction, 
            'receiptSetting' => ReceiptSetting::first(), 
            'isPublic' => false,
            'autoPrint' => session('auto_print')
        ]);
    }
}