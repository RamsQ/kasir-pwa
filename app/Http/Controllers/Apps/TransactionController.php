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
use App\Models\Table; // Import Model Table
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

        // 2. Data Keranjang Aktif
        $carts = Cart::with(['product.units', 'product.bundle_items', 'unit'])
            ->where('cashier_id', $userId)
            ->active()
            ->latest()
            ->get();

        // 3. Holds (Data Orderan Meja/Antrean)
        $holds = Hold::with('table')->where('user_id', $userId)->latest()->get();

        // 4. Data Meja dari Template Admin
        $tables = Table::orderBy('name')->get();

        // 5. Query Produk dengan Filter stok dan Bundle
        $productsQuery = Product::with(['category:id,name', 'bundle_items', 'units'])
            ->select('id', 'barcode', 'title', 'description', 'image', 'buy_price', 'sell_price', 'stock', 'category_id', 'type', 'unit')
            ->where(function ($query) {
                $query->where(function($q) {
                    $q->where('type', '!=', 'bundle')->where('stock', '>', 0);
                })
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
                if ($catId !== 'all' && $catId) {
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
            'tables'                => $tables,
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
     * Simpan Transaksi Final (Pembayaran Lunas)
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

                // [FIX] Alur Antrean Otomatis: Cek frontend -> Cek Hold -> Jika kosong (Bayar Langsung) buat baru
                $queueNumber = $request->queue_number;
                if (!$queueNumber) {
                    if ($request->hold_id) {
                        $backupHold = Hold::find($request->hold_id);
                        $queueNumber = $backupHold ? $backupHold->queue_number : null;
                    }
                    
                    if (!$queueNumber) {
                        $todayTrxCount = Transaction::whereDate('created_at', now())->count();
                        $todayHoldCount = Hold::whereDate('created_at', now())->count();
                        $queueNumber = 'Q-' . str_pad($todayTrxCount + $todayHoldCount + 1, 3, '0', STR_PAD_LEFT);
                    }
                }

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
                    'table_name'     => $request->table_name ?: 'BAWA PULANG', 
                    'queue_number'   => $queueNumber, 
                ]);

                foreach ($cartItems as $cart) {
                    $unitPrice = $cart->product_unit_id 
                        ? ($cart->product->units->where('id', $cart->product_unit_id)->first()->sell_price ?? $cart->product->sell_price)
                        : $cart->product->sell_price;
                    
                    $totalItemSellingPrice = $unitPrice * $cart->qty;
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

                    $transaction->profits()->create(['total' => (float)$totalItemSellingPrice - (float)$totalItemCost]);
                }

                if ($request->hold_id) {
                    $hold = Hold::find($request->hold_id);
                    if ($hold && $hold->table_id) {
                        Table::where('id', $hold->table_id)->update(['status' => 'available']);
                        if (Str::contains($hold->ref_number, '[Merged ')) {
                             $parts = explode('[Merged ', $hold->ref_number);
                             $mergedTableName = rtrim($parts[1], ']');
                             Table::where('name', $mergedTableName)->update(['status' => 'available']);
                        }
                    }
                    if($hold) $hold->delete();
                }

                Cart::where('cashier_id', auth()->user()->id)->delete();
                return $transaction;
            });

            $transaction->load(['details.product', 'details.product_unit', 'cashier', 'customer']);

            return to_route('transactions.print', $transaction->invoice)
                ->with('auto_print', true)
                ->with('print_invoice', $transaction);

        } catch (\Exception $e) {
            return back()->with('error', 'Transaksi Gagal: ' . $e->getMessage());
        }
    }

    /**
     * Simpan Order (Hold) ke Meja atau Antrean
     */
    public function holdCart(Request $request)
    {
        $request->validate(['cart_items' => 'required', 'total' => 'required']);

        if ($request->table_id) {
            $table = Table::find($request->table_id);
            if ($table && $table->status === 'occupied') {
                return back()->with('error', 'Meja ini sedang digunakan. Silakan pilih meja lain.');
            }
        }

        // [FIX] Buat queue_number saat Save pesanan agar bisa tampil di Cart & Bill Sementara
        $todayTrxCount = Transaction::whereDate('created_at', now())->count();
        $todayHoldCount = Hold::whereDate('created_at', now())->count();
        $queueNumber = 'Q-' . str_pad($todayTrxCount + $todayHoldCount + 1, 3, '0', STR_PAD_LEFT);

        Hold::create([
            'ref_number'    => $request->ref_number ?? $queueNumber,
            'queue_number'  => $queueNumber,
            'customer_name' => $request->customer_name,
            'table_id'      => $request->table_id,
            'cart_data'     => $request->cart_items, 
            'total'         => $request->total, 
            'user_id'       => auth()->id()
        ]);

        if ($request->table_id) {
            Table::where('id', $request->table_id)->update(['status' => 'occupied']);
        }

        Cart::where('cashier_id', auth()->id())->delete();
        return back()->with('success', 'Pesanan disimpan.');
    }

    /**
     * sisanya tetap sama (History, Seach, dsb)
     */
    public function destroyHold($id)
    {
        $hold = Hold::findOrFail($id);

        if ($hold->table_id) {
            Table::where('id', $hold->table_id)->update(['status' => 'available']);
            if (Str::contains($hold->ref_number, '[Merged ')) {
                $parts = explode('[Merged ', $hold->ref_number);
                $mergedTableName = rtrim($parts[1], ']');
                Table::where('name', $mergedTableName)->update(['status' => 'available']);
            }
        }

        $hold->delete();
        return back()->with('success', 'Antrean dihapus.');
    }

    public function moveTable(Request $request, $holdId)
    {
        $request->validate(['new_table_id' => 'required|exists:tables,id']);

        $hold = Hold::findOrFail($holdId);
        $oldTableId = $hold->table_id;

        $newTable = Table::findOrFail($request->new_table_id);
        if ($newTable->status === 'occupied') {
            return back()->with('error', 'Meja tujuan sudah terisi!');
        }

        if ($oldTableId) {
            Table::where('id', $oldTableId)->update(['status' => 'available']);
        }

        $hold->update(['table_id' => $request->new_table_id]);
        $newTable->update(['status' => 'occupied']);

        return back()->with('success', 'Berhasil pindah meja.');
    }

    public function mergeTable(Request $request)
    {
        $request->validate([
            'source_hold_id' => 'required',
            'target_hold_id' => 'required'
        ]);

        $source = Hold::with('table')->findOrFail($request->source_hold_id);
        $target = Hold::with('table')->findOrFail($request->target_hold_id);

        $mergedCart = array_merge($target->cart_data, $source->cart_data);
        
        $sourceLabel = $source->table ? $source->table->name : $source->ref_number;
        $newLabel = $target->ref_number . " [Merged " . $sourceLabel . "]";

        $target->update([
            'cart_data'  => $mergedCart,
            'total'      => (float)$target->total + (float)$source->total,
            'ref_number' => $newLabel
        ]);

        $source->delete();

        return back()->with('success', 'Meja berhasil digabungkan.');
    }

    public function resumeCart($holdId)
    {
        $hold = Hold::findOrFail($holdId);
        Cart::where('cashier_id', auth()->id())->delete();

        foreach ($hold->cart_data as $item) {
            Cart::create([
                'cashier_id'      => auth()->id(), 
                'product_id'      => $item['product_id'], 
                'product_unit_id' => $item['product_unit_id'] ?? null,
                'qty'             => $item['qty'], 
                'price'           => $item['price']
            ]);
        }

        return back()->with('success', 'Data pesanan dipulihkan.');
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

    public function destroyAll(Request $request) 
    {
        if (!auth()->user()->hasRole('super-admin')) return back()->with('error', 'Akses ditolak!');
        if (!Hash::check($request->password, auth()->user()->password)) return back()->with('error', 'Password salah!');

        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');

            DB::table('transaction_details')->truncate(); 
            DB::table('transactions')->truncate(); 
            DB::table('profits')->truncate();
            DB::table('expenses')->truncate();
            DB::table('shifts')->truncate();
            DB::table('carts')->truncate();
            DB::table('holds')->truncate();

            if (Schema::hasTable('stock_movements')) {
                DB::table('stock_movements')->truncate();
            }
            DB::table('stock_batches')->truncate();
            if (Schema::hasTable('stock_ins')) {
                DB::table('stock_ins')->truncate();
            }
            if (Schema::hasTable('stock_opnames')) {
                DB::table('stock_opnames')->truncate();
            }

            DB::table('products')->update(['stock' => 0]);
            DB::table('tables')->update(['status' => 'available']);

            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            
            return back()->with('success', 'Sistem berhasil di-reset total.');
        } catch (\Exception $e) {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            return back()->with('error', 'Gagal reset data: ' . $e->getMessage());
        }
    }
}