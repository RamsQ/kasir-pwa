<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Discount;
use App\Models\Product; // Tambahkan import Model Product
use Illuminate\Http\Request;
use Inertia\Inertia;

class DiscountController extends Controller
{
    public function index(Request $request)
    {
        // 1. Ambil diskon dengan relasi product
        $discounts = Discount::with('product') 
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', '%' . $search . '%');
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        // 2. Ambil daftar produk untuk dropdown di form (Create/Modal)
        $products = Product::select('id', 'title')->orderBy('title', 'asc')->get();

        return Inertia::render('Dashboard/Discounts/Index', [
            'discounts' => $discounts,
            'products'  => $products, // Kirim daftar produk ke React
            'filters'   => $request->only(['search'])
        ]);
    }

    public function create()
    {
        // Ambil produk jika Anda menggunakan halaman Create terpisah (bukan modal)
        $products = Product::select('id', 'title')->orderBy('title', 'asc')->get();

        return Inertia::render('Dashboard/Discounts/Create', [
            'products' => $products
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'            => 'required|string|max:255',
            'type'            => 'required|in:percentage,fixed',
            'value'           => 'required|numeric|min:0',
            'min_transaction' => 'required|numeric|min:0',
            'start_date'      => 'required|date',
            'end_date'        => 'required|date|after_or_equal:start_date',
            'product_id'      => 'nullable|exists:products,id', // Validasi product_id baru
        ]);

        Discount::create([
            'name'            => $request->name,
            'description'     => $request->description,
            'type'            => $request->type,
            'value'           => $request->value,
            'min_transaction' => $request->min_transaction,
            'start_date'      => $request->start_date,
            'end_date'        => $request->end_date,
            'product_id'      => $request->product_id, // Simpan product_id (bisa null untuk diskon global)
            'is_active'       => true
        ]);

        return redirect()->route('discounts.index')->with('success', 'Promo Diskon berhasil dibuat!');
    }

    public function destroy($id)
    {
        $discount = Discount::findOrFail($id);
        $discount->delete();
        return back()->with('success', 'Promo Diskon dihapus.');
    }
}