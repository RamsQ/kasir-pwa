<?php

namespace App\Http\Controllers\Apps;

use App\Exceptions\PaymentGatewayException;
use App\Http\Controllers\Controller;
use App\Models\Cart;
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
use App\Models\StockOpname;
use App\Services\CogsService;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class TransactionController extends Controller
{
    protected $cogsService;

    public function __construct(CogsService $cogsService)
    {
        $this->cogsService = $cogsService;
    }

    public function index()
    {
        $userId = auth()->user()->id;

        $activeShift = Shift::where('user_id', $userId)
            ->where('status', 'open')
            ->first();

        $carts = Cart::with(['product.units', 'product.bundle_items', 'unit'])
            ->where('cashier_id', $userId)
            ->active()
            ->latest()
            ->get();

        $holds = Hold::where('user_id', $userId)
            ->latest()
            ->get();

        $heldCarts = Cart::with('product:id,title,sell_price,image')
            ->where('cashier_id', $userId)
            ->held()
            ->get()
            ->groupBy('hold_id')
            ->map(function ($items, $holdId) {
                $first = $items->first();
                return [
                    'hold_id'     => $holdId,
                    'label'       => $first->hold_label,
                    'held_at'     => $first->held_at?->toISOString(),
                    'items_count' => $items->sum('qty'),
                    'total'       => $items->sum('price'),
                ];
            })
            ->values();

        $customers = Customer::latest()->get();

        $products = Product::with(['category:id,name', 'bundle_items', 'units'])
            ->select('id', 'barcode', 'title', 'description', 'image', 'buy_price', 'sell_price', 'stock', 'category_id', 'type', 'unit')
            ->where(function ($query) {
                $query->where('stock', '>', 0)
                      ->orWhere('type', 'bundle');
            })
            ->orderBy('title')
            ->get();

        $categories = \App\Models\Category::select('id', 'name', 'image')
            ->orderBy('name')
            ->get();

        $activeDiscounts = Discount::active()->with('product:id,title')->get();
        
        $paymentSetting = PaymentSetting::first();
        $carts_total = $carts->sum('price');

        $defaultGateway = $paymentSetting?->default_gateway ?? 'cash';
        if ($defaultGateway !== 'cash' && (!$paymentSetting || !$paymentSetting->isGatewayReady($defaultGateway))) {
            $defaultGateway = 'cash';
        }

        return Inertia::render('Dashboard/Transactions/Index', [
            'carts'                 => $carts,
            'carts_total'           => (int) $carts_total,
            'heldCarts'             => $heldCarts,
            'holds'                 => $holds,
            'customers'             => $customers,
            'products'              => $products,
            'categories'            => $categories,
            'paymentGateways'       => $paymentSetting?->enabledGateways() ?? [],
            'defaultPaymentGateway' => $defaultGateway,
            'discounts'             => $activeDiscounts,
            'paymentSetting'        => $paymentSetting,
            'activeShift'           => $activeShift,
        ]);
    }

    public function store(Request $request, PaymentGatewayManager $paymentGatewayManager)
    {
        $activeShift = Shift::where('user_id', auth()->id())
            ->where('status', 'open')
            ->first();

        if (!$activeShift) {
            return back()->withErrors(['error' => 'Anda harus membuka shift terlebih dahulu!']);
        }

        $cogsMethod = Setting::first()->cogs_method ?? 'AVERAGE';
        $paymentGateway = strtolower($request->input('payment_gateway', 'cash'));
        $invoice = 'TRX-' . Str::upper(Str::random(10));
        
        $isManualPayment = ($paymentGateway === 'cash' || $paymentGateway === 'qris' || empty($paymentGateway));
        $cashAmount   = $isManualPayment ? $request->cash : $request->grand_total;
        $changeAmount = $isManualPayment ? $request->change : 0;

        $transaction = DB::transaction(function () use ($request, $invoice, $cashAmount, $changeAmount, $paymentGateway, $isManualPayment, $activeShift, $cogsMethod) {
            
            $transaction = Transaction::create([
                'cashier_id'     => auth()->user()->id,
                'customer_id'    => $request->customer_id,
                'shift_id'       => $activeShift->id, 
                'invoice'        => $invoice,
                'cash'           => $cashAmount,
                'change'         => $changeAmount,
                'discount'       => $request->discount,
                'grand_total'    => $request->grand_total,
                'payment_method' => $paymentGateway ?: 'cash',
                'payment_status' => $isManualPayment ? 'paid' : 'pending',
            ]);

            $carts = Cart::with(['product.units', 'product.bundle_items', 'unit'])->where('cashier_id', auth()->user()->id)->get();
            $discounts = Discount::active()->get();

            foreach ($carts as $cart) {
                $unitName = $cart->unit ? $cart->unit->unit_name : $cart->product->unit;
                $unitPrice = $cart->unit ? $cart->unit->sell_price : $cart->product->sell_price;
                
                $prodDiscount = $discounts->where('product_id', $cart->product_id)->first();
                if ($prodDiscount) {
                    if ($prodDiscount->type === 'percentage') {
                        $unitPrice -= ($unitPrice * ($prodDiscount->value / 100));
                    } else {
                        $unitPrice -= $prodDiscount->value;
                    }
                }
                
                $finalSellingPrice = max(0, $unitPrice) * $cart->qty;
                $current_total_buy_price = 0;

                // --- PROSES COGS & UPDATE STOK OTOMATIS VIA SERVICE ---
                if ($cart->product->type === 'bundle') {
                    foreach ($cart->product->bundle_items as $item) {
                        $qtyInRecipe = $item->pivot->qty;
                        $bundleItemUnitId = $item->pivot->product_unit_id;
                        $bundleConversion = 1;

                        if($bundleItemUnitId) {
                            $unitData = ProductUnit::find($bundleItemUnitId);
                            $bundleConversion = $unitData ? $unitData->conversion : 1;
                        }

                        $totalToDecrement = $cart->qty * $qtyInRecipe * $bundleConversion;
                        // Service ini sudah memotong stok di Product & StockBatch
                        $itemHpp = $this->cogsService->calculate($item->id, $totalToDecrement, $cogsMethod);
                        $current_total_buy_price += $itemHpp;
                    }
                } else {
                    $conversionValue = $cart->unit ? $cart->unit->conversion : 1;
                    $totalBaseQty = $cart->qty * $conversionValue;
                    
                    // Service ini sudah memotong stok di Product & StockBatch
                    $current_total_buy_price = $this->cogsService->calculate(
                        $cart->product_id, 
                        $totalBaseQty, 
                        $cogsMethod, 
                        $request->serial_numbers[$cart->product_id] ?? null 
                    );
                }

                // Simpan Detail Transaksi
                $transaction->details()->create([
                    'product_id'      => $cart->product_id,
                    'qty'             => $cart->qty,
                    'price'           => $finalSellingPrice, 
                    'buy_price'       => $cart->qty > 0 ? ($current_total_buy_price / $cart->qty) : 0, 
                    'unit'            => $unitName ?? 'Pcs',
                    'product_unit_id' => $cart->product_unit_id,
                ]);

                // Simpan Profit
                $transaction->profits()->create([
                    'total' => $finalSellingPrice - $current_total_buy_price,
                ]);
            }

            Cart::where('cashier_id', auth()->user()->id)->delete();
            return $transaction;
        });

        if ($paymentGateway === 'midtrans' || $paymentGateway === 'xendit') {
            try {
                $paymentSetting = PaymentSetting::first();
                $paymentResponse = $paymentGatewayManager->createPayment($transaction, $paymentGateway, $paymentSetting);
                $transaction->update([
                    'payment_reference' => $paymentResponse['reference'] ?? null,
                    'payment_url'       => $paymentResponse['payment_url'] ?? null,
                ]);
            } catch (PaymentGatewayException $exception) {
                return redirect()->route('transactions.print', $transaction->invoice)->with('error', $exception->getMessage());
            }
        }

        return to_route('transactions.print', $transaction->invoice);
    }

    // Fitur lainnya tetap sama...
    public function storeExpense(Request $request)
    {
        $request->validate(['name' => 'required|string|max:255', 'amount' => 'required|numeric|min:0']);
        $activeShift = Shift::where('user_id', auth()->id())->where('status', 'open')->first();
        if (!$activeShift) return back()->with('error', 'Anda harus membuka shift sebelum mencatat kas keluar!');
        Expense::create([
            'user_id' => auth()->id(),
            'name' => '[KASIR] ' . $request->name,
            'amount' => $request->amount,
            'date' => now()->format('Y-m-d'),
            'category' => 'Kas Kecil',
            'note' => 'Diambil dari laci kasir pada shift #' . $activeShift->id,
        ]);
        return back()->with('success', 'Kas keluar berhasil dicatat.');
    }

    public function holdCart(Request $request)
    {
        $request->validate(['ref_number' => 'required|string', 'cart_items' => 'required|array', 'total' => 'required|numeric']);
        Hold::create(['ref_number' => $request->ref_number, 'cart_data' => $request->cart_items, 'total' => $request->total, 'user_id' => auth()->id()]);
        Cart::where('cashier_id', auth()->id())->delete();
        return back()->with('success', 'Transaksi ditunda.');
    }

    public function resumeCart($holdId)
    {
        DB::transaction(function () use ($holdId) {
            $hold = Hold::where('id', $holdId)->where('user_id', auth()->id())->firstOrFail();
            Cart::where('cashier_id', auth()->id())->delete();
            foreach ($hold->cart_data as $item) {
                Cart::create(['cashier_id' => auth()->id(), 'product_id' => $item['product_id'], 'product_unit_id' => $item['product_unit_id'] ?? null, 'qty' => $item['qty'], 'price' => $item['price']]);
            }
            $hold->delete();
        });
        return back()->with('success', 'Antrean dikembalikan.');
    }

    public function clearHold($holdId)
    {
        Hold::where('id', $holdId)->where('user_id', auth()->id())->delete();
        return back()->with('success', 'Antrean dihapus.');
    }

    public function searchProduct(Request $request)
    {
        $product = Product::with(['units', 'bundle_items'])->where('barcode', $request->barcode)->first();
        return response()->json(['success' => (bool)$product, 'data' => $product]);
    }

    public function addToCart(Request $request)
    {
        $product = Product::find($request->product_id);
        if (!$product) return redirect()->back()->with('error', 'Produk tidak ditemukan.');
        $qty = (float) $request->qty;
        $unitId = $request->product_unit_id ?? null;
        if ($product->type === 'single' && $product->stock < $qty) return redirect()->back()->with('error', 'Stok tidak mencukupi!');
        $cart = Cart::where('product_id', $request->product_id)->where('product_unit_id', $unitId)->where('cashier_id', auth()->user()->id)->whereNull('hold_id')->first();
        if ($cart) {
            $cart->increment('qty', $qty);
            $unitPrice = $unitId ? ProductUnit::find($unitId)->sell_price : $product->sell_price;
            $cart->price = $unitPrice * $cart->qty;
            $cart->save();
        } else {
            Cart::create(['cashier_id' => auth()->user()->id, 'product_id' => $request->product_id, 'product_unit_id' => $unitId, 'qty' => $qty, 'price' => ($unitId ? ProductUnit::find($unitId)->sell_price : $product->sell_price) * $qty]);
        }
        return redirect()->route('transactions.index');
    }

    public function destroyCart($cart_id)
    {
        Cart::whereId($cart_id)->where('cashier_id', auth()->user()->id)->delete();
        return back();
    }

    public function updateCart(Request $request, $cart_id)
    {
        $request->validate(['qty' => 'required|numeric|min:0.01', 'product_unit_id' => 'nullable|exists:product_units,id']);
        $cart = Cart::with('product.units')->whereId($cart_id)->where('cashier_id', auth()->user()->id)->first();
        if (!$cart) return response()->json(['success' => false, 'message' => 'Item tidak ditemukan'], 404);
        $duplicateCart = Cart::where('product_id', $cart->product_id)->where('product_unit_id', $request->product_unit_id)->where('id', '!=', $cart_id)->whereNull('hold_id')->first();
        if ($duplicateCart) {
            $newQty = (float) $duplicateCart->qty + (float) $request->qty;
            $selectedUnit = $cart->product->units->where('id', $request->product_unit_id)->first();
            $pricePerUnit = $selectedUnit ? $selectedUnit->sell_price : $cart->product->sell_price;
            $duplicateCart->update(['qty' => $newQty, 'price' => $pricePerUnit * $newQty]);
            $cart->delete();
            return back();
        }
        $selectedUnit = $cart->product->units->where('id', $request->product_unit_id)->first();
        $conversion = $selectedUnit ? $selectedUnit->conversion : 1;
        $pricePerUnit = $selectedUnit ? $selectedUnit->sell_price : $cart->product->sell_price;
        if ($cart->product->type === 'single' && $cart->product->stock < ($request->qty * $conversion)) return response()->json(['success' => false, 'message' => 'Stok tidak mencukupi.'], 422);
        $cart->update(['qty' => $request->qty, 'product_unit_id' => $request->product_unit_id, 'price' => $pricePerUnit * $request->qty]);
        return back();
    }

    public function print($invoice)
    {
        $transaction = Transaction::with(['details.product.bundle_items.units', 'details.product_unit', 'cashier', 'customer'])->where('invoice', $invoice)->firstOrFail();
        $receiptSetting = ReceiptSetting::first();
        return Inertia::render('Dashboard/Transactions/Print', ['transaction' => $transaction, 'receiptSetting' => $receiptSetting, 'isPublic' => false]);
    }

    public function refund(Request $request, Transaction $transaction)
    {
        $request->validate(['password' => 'required']);
        if (!Hash::check($request->password, auth()->user()->password)) return back()->with('error', 'Password salah!');
        if ($transaction->payment_status === 'refunded') return back()->with('error', 'Sudah direfund.');
        DB::transaction(function () use ($transaction) {
            foreach ($transaction->details as $detail) {
                $product = Product::with('bundle_items')->find($detail->product_id);
                $conversion = $detail->product_unit ? $detail->product_unit->conversion : 1;
                $totalToIncrement = $detail->qty * $conversion;
                if ($product) {
                    if ($product->type === 'bundle') {
                        foreach ($product->bundle_items as $item) {
                            $bundleConversion = $item->pivot->product_unit_id ? (ProductUnit::find($item->pivot->product_unit_id)->conversion ?? 1) : 1;
                            DB::table('products')->where('id', $item->id)->increment('stock', $detail->qty * $item->pivot->qty * $bundleConversion);
                        }
                    } else { $product->increment('stock', $totalToIncrement); }
                }
            }
            $transaction->profits()->delete();
            $transaction->update(['payment_status' => 'refunded', 'refund_reason' => 'Dibatalkan kasir']);
        });
        return back()->with('success', 'Refund berhasil.');
    }

    public function history(Request $request)
    {
        $query = Transaction::query()->with(['cashier:id,name', 'customer:id,name'])->withSum('details as total_items', 'qty')->withSum('profits as total_profit', 'total')->orderByDesc('created_at');
        if (!$request->user()->isSuperAdmin()) $query->where('cashier_id', $request->user()->id);
        $transactions = $query->when($request->invoice, fn($q, $inv) => $q->where('invoice', 'like', "%$inv%"))
            ->when($request->start_date, fn($q, $date) => $q->whereDate('created_at', '>=', $date))
            ->when($request->end_date, fn($q, $date) => $q->whereDate('created_at', '<=', $date))
            ->paginate(10)->withQueryString();
        return Inertia::render('Dashboard/Transactions/History', ['transactions' => $transactions, 'filters' => $request->all(['invoice', 'start_date', 'end_date'])]);
    }

    public function destroyAll(Request $request)
    {
        if (!auth()->user()->hasRole('super-admin')) return back()->with('error', 'Akses ditolak!');
        $request->validate(['password' => 'required']);
        if (!Hash::check($request->password, auth()->user()->password)) return back()->with('error', 'Password salah!');
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        try {
            DB::beginTransaction();
            DB::table('profits')->truncate(); DB::table('transaction_details')->truncate(); 
            DB::table('transactions')->truncate(); DB::table('carts')->truncate();
            DB::table('holds')->truncate(); DB::table('shifts')->truncate(); 
            DB::table('stock_opnames')->truncate(); DB::table('expenses')->truncate();
            DB::table('stock_batches')->truncate(); 
            if (Storage::disk('public')->exists('expenses')) {
                Storage::disk('public')->deleteDirectory('expenses');
                Storage::disk('public')->makeDirectory('expenses');
            }
            DB::commit();
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            return back()->with('success', 'Data dibersihkan.');
        } catch (\Exception $e) {
            DB::rollback(); DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            return back()->with('error', 'Gagal reset: ' . $e->getMessage());
        }
    }
}