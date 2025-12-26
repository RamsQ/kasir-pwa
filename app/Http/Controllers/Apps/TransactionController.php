<?php

namespace App\Http\Controllers\Apps;

use App\Exceptions\PaymentGatewayException;
use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Customer;
use App\Models\Discount;
use App\Models\PaymentSetting;
use App\Models\Product;
use App\Models\ReceiptSetting;
use App\Models\Transaction;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;

class TransactionController extends Controller
{
    public function index()
    {
        $userId = auth()->user()->id;

        $carts = Cart::with(['product.bundle_items'])
            ->where('cashier_id', $userId)
            ->active()
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

        $products = Product::with(['category:id,name', 'bundle_items'])
            ->select('id', 'barcode', 'title', 'description', 'image', 'buy_price', 'sell_price', 'stock', 'category_id', 'type')
            ->where(function ($query) {
                $query->where('stock', '>', 0)
                      ->orWhere('type', 'bundle');
            })
            ->orderBy('title')
            ->get();

        $categories = \App\Models\Category::select('id', 'name', 'image')
            ->orderBy('name')
            ->get();

        $activeDiscounts = Discount::active()->get();
        
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
            'customers'             => $customers,
            'products'              => $products,
            'categories'            => $categories,
            'paymentGateways'       => $paymentSetting?->enabledGateways() ?? [],
            'defaultPaymentGateway' => $defaultGateway,
            'discounts'             => $activeDiscounts,
            'paymentSetting'        => $paymentSetting,
        ]);
    }

    public function searchProduct(Request $request)
    {
        $product = Product::where('barcode', $request->barcode)->first();
        return response()->json([
            'success' => (bool)$product,
            'data'    => $product,
        ]);
    }

    public function addToCart(Request $request)
    {
        $product = Product::find($request->product_id);
        if (!$product) return redirect()->back()->with('error', 'Produk tidak ditemukan.');

        if ($product->type === 'single' && $product->stock < $request->qty) {
            return redirect()->back()->with('error', 'Stok tidak mencukupi!');
        }

        $cart = Cart::where('product_id', $request->product_id)
            ->where('cashier_id', auth()->user()->id)
            ->whereNull('hold_id')
            ->first();

        if ($cart) {
            $cart->increment('qty', $request->qty);
            $cart->price = $product->sell_price * $cart->qty;
            $cart->save();
        } else {
            Cart::create([
                'cashier_id' => auth()->user()->id,
                'product_id' => $request->product_id,
                'qty'        => $request->qty,
                'price'      => $product->sell_price * $request->qty,
            ]);
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
        $request->validate(['qty' => 'required|integer|min:1']);
        $cart = Cart::with('product')->whereId($cart_id)->where('cashier_id', auth()->user()->id)->first();
        if (!$cart) return response()->json(['success' => false, 'message' => 'Item tidak ditemukan'], 404);

        if ($cart->product->type === 'single' && $cart->product->stock < $request->qty) {
            return response()->json(['success' => false, 'message' => 'Stok terbatas: ' . $cart->product->stock], 422);
        }

        $cart->qty   = $request->qty;
        $cart->price = $cart->product->sell_price * $request->qty;
        $cart->save();
        return back();
    }

    public function store(Request $request, PaymentGatewayManager $paymentGatewayManager)
    {
        $paymentGateway = strtolower($request->input('payment_gateway', 'cash'));
        $invoice = 'TRX-' . Str::upper(Str::random(10));
        
        $isManualPayment = ($paymentGateway === 'cash' || $paymentGateway === 'qris' || empty($paymentGateway));
        
        $cashAmount   = $isManualPayment ? $request->cash : $request->grand_total;
        $changeAmount = $isManualPayment ? $request->change : 0;

        $transaction = DB::transaction(function () use ($request, $invoice, $cashAmount, $changeAmount, $paymentGateway, $isManualPayment) {
            
            $transaction = Transaction::create([
                'cashier_id'     => auth()->user()->id,
                'customer_id'    => $request->customer_id,
                'invoice'        => $invoice,
                'cash'           => $cashAmount,
                'change'         => $changeAmount,
                'discount'       => $request->discount,
                'grand_total'    => $request->grand_total,
                'payment_method' => $paymentGateway ?: 'cash',
                'payment_status' => $isManualPayment ? 'paid' : 'pending',
            ]);

            $carts = Cart::with('product')->where('cashier_id', auth()->user()->id)->active()->get();

            foreach ($carts as $cart) {
                $transaction->details()->create([
                    'product_id' => $cart->product_id,
                    'qty'        => $cart->qty,
                    'price'      => $cart->price,
                ]);

                $total_buy_price = $cart->product->buy_price * $cart->qty;
                $transaction->profits()->create([
                    'total' => $cart->price - $total_buy_price,
                ]);

                $product = Product::with('bundle_items')->find($cart->product_id);
                if ($product && $product->type === 'bundle') {
                    foreach ($product->bundle_items as $item) {
                        $qtyPerBundle = $item->pivot->qty;
                        $totalToDecrement = $cart->qty * $qtyPerBundle;
                        DB::table('products')->where('id', $item->id)->decrement('stock', $totalToDecrement);
                    }
                } elseif ($product) {
                    $product->decrement('stock', $cart->qty);
                }
            }

            Cart::where('cashier_id', auth()->user()->id)->active()->delete();
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

    public function print($invoice)
    {
        // PENTING: Menambahkan relasi customer agar nomor WA muncul di React
        $transaction = Transaction::with([
            'details.product.bundle_items', 
            'cashier', 
            'customer'
        ])->where('invoice', $invoice)->firstOrFail();

        $receiptSetting = ReceiptSetting::first();

        return Inertia::render('Dashboard/Transactions/Print', [
            'transaction'    => $transaction,
            'receiptSetting' => $receiptSetting,
            'isPublic'       => false
        ]);
    }

    public function shareInvoice($invoice)
    {
        $transaction = Transaction::with(['details.product.bundle_items', 'cashier', 'customer'])
            ->where('invoice', $invoice)
            ->first();

        if (!$transaction) abort(404);

        $receiptSetting = ReceiptSetting::first();

        return Inertia::render('Dashboard/Transactions/Print', [
            'transaction'    => $transaction,
            'receiptSetting' => $receiptSetting,
            'isPublic'       => true 
        ]);
    }

    public function history(Request $request)
    {
        $query = Transaction::query()
            ->with(['cashier:id,name', 'customer:id,name'])
            ->withSum('details as total_items', 'qty')
            ->withSum('profits as total_profit', 'total')
            ->orderByDesc('created_at');

        if (!$request->user()->isSuperAdmin()) {
            $query->where('cashier_id', $request->user()->id);
        }

        $transactions = $query->when($request->invoice, fn($q, $inv) => $q->where('invoice', 'like', "%$inv%"))
            ->when($request->start_date, fn($q, $date) => $q->whereDate('created_at', '>=', $date))
            ->when($request->end_date, fn($q, $date) => $q->whereDate('created_at', '<=', $date))
            ->paginate(10)->withQueryString();

        return Inertia::render('Dashboard/Transactions/History', [
            'transactions' => $transactions,
            'filters'      => $request->all(['invoice', 'start_date', 'end_date']),
        ]);
    }

    public function refund(Request $request, Transaction $transaction)
    {
        $request->validate(['password' => 'required']);
        if (!Hash::check($request->password, auth()->user()->password)) return back()->with('error', 'Password salah!');
        if ($transaction->payment_status === 'refunded') return back()->with('error', 'Sudah direfund.');

        DB::transaction(function () use ($transaction) {
            foreach ($transaction->details as $detail) {
                $product = Product::with('bundle_items')->find($detail->product_id);
                if ($product) {
                    if ($product->type === 'bundle') {
                        foreach ($product->bundle_items as $item) {
                            $totalToIncrement = $detail->qty * $item->pivot->qty;
                            DB::table('products')->where('id', $item->id)->increment('stock', $totalToIncrement);
                        }
                    } else {
                        $product->increment('stock', $detail->qty);
                    }
                }
            }
            $transaction->profits()->delete();
            $transaction->update(['payment_status' => 'refunded', 'refund_reason' => 'Dibatalkan kasir']);
        });

        return back()->with('success', 'Refund berhasil.');
    }

    public function destroyAll(Request $request)
    {
        if (!auth()->user()->hasRole('super-admin')) return back()->with('error', 'Bukan Admin!');
        $request->validate(['password' => 'required']);
        if (!Hash::check($request->password, auth()->user()->password)) return back()->with('error', 'Salah password!');

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('profits')->truncate();
        DB::table('transaction_details')->truncate();
        DB::table('transactions')->truncate();
        DB::table('carts')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        return back()->with('success', 'Data reset berhasil!');
    }
}