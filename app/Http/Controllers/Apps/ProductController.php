<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use App\Imports\ProductsImport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Database\QueryException;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $products = Product::when($request->search, function ($query, $search) {
            $query->where('title', 'like', '%' . $search . '%')
                ->orWhere('barcode', 'like', '%' . $search . '%');
        })
        ->with('category')
        ->latest()
        ->paginate(10)
        ->withQueryString();

        return Inertia::render('Dashboard/Products/Index', [
            'products' => $products,
            'search'   => $request->search
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $categories = Category::all();
        
        // Ambil produk tipe 'single' untuk bahan bundling
        $products = Product::where('type', 'single')->get();

        return Inertia::render('Dashboard/Products/Create', [
            'categories' => $categories,
            'products'   => $products
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // 1. Validasi mendalam
        $request->validate([
            'image'        => 'nullable|image|mimes:jpeg,jpg,png|max:2048',
            'barcode'      => ['nullable', Rule::unique('products')->whereNull('deleted_at')],
            'title'        => 'required',
            'description'  => 'nullable',
            'category_id'  => 'required',
            'buy_price'    => 'required|numeric',
            'sell_price'   => 'required|numeric',
            'expired_date' => 'nullable|date',
            'type'         => 'required|in:single,bundle',
            
            // Stok hanya wajib jika tipe single. Jika bundle, stok dikirim "" (string kosong) dari React.
            'stock'        => 'nullable|required_if:type,single',
            
            // Validasi Array Bundle jika tipe produk adalah bundle
            'bundle_items' => 'nullable|required_if:type,bundle|array',
            'bundle_items.*.item_id' => 'required_if:type,bundle', 
            'bundle_items.*.qty'     => 'required_if:type,bundle|numeric|min:1',
        ]);

        DB::transaction(function () use ($request) {
            // 2. Upload Image
            $imageName = null;
            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $image->storeAs('public/products', $image->hashName());
                $imageName = $image->hashName();
            }

            // 3. Simpan Produk Utama
            $product = Product::create([
                'image'        => $imageName,
                'barcode'      => $request->barcode,
                'title'        => $request->title,
                'description'  => $request->description ?? '-',
                'category_id'  => $request->category_id,
                'buy_price'    => $request->buy_price,
                'sell_price'   => $request->sell_price,
                // Jika bundle, paksa stok database jadi 0 karena stok ikut komponen
                'stock'        => $request->type === 'bundle' ? 0 : $request->stock,
                'expired_date' => $request->expired_date,
                'type'         => $request->type,
            ]);

            // 4. Jika Bundle, Simpan Item Penyusun ke Pivot
            if ($request->type === 'bundle' && $request->bundle_items) {
                foreach ($request->bundle_items as $item) {
                    if(!empty($item['item_id'])) {
                        $product->bundle_items()->attach($item['item_id'], ['qty' => $item['qty']]);
                    }
                }
            }
        });

        return redirect()->route('products.index')->with('success', 'Produk Berhasil Disimpan!');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Product $product)
    {
        $categories = Category::all();
        
        // Produk penyusun selain dirinya sendiri
        $products = Product::where('type', 'single')->where('id', '!=', $product->id)->get();
        
        // Load relasi bundling
        $product->load('bundle_items');

        return Inertia::render('Dashboard/Products/Edit', [
            'product'    => $product,
            'categories' => $categories,
            'products'   => $products
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {
        $request->validate([
            'barcode' => ['nullable', Rule::unique('products')->ignore($product->id)->whereNull('deleted_at')],
            'title'        => 'required',
            'category_id'  => 'required',
            'buy_price'    => 'required|numeric',
            'sell_price'   => 'required|numeric',
            'type'         => 'required|in:single,bundle',
            'stock'        => 'nullable|required_if:type,single',
            'bundle_items' => 'nullable|required_if:type,bundle|array',
        ]);

        DB::transaction(function () use ($request, $product) {
            if ($request->hasFile('image')) {
                $request->validate(['image' => 'image|mimes:jpeg,jpg,png|max:2048']);
                if ($product->image) Storage::delete('public/products/' . basename($product->image));
                $image = $request->file('image');
                $image->storeAs('public/products', $image->hashName());
                $product->image = $image->hashName();
            }

            $product->update([
                'image'        => $product->image,
                'barcode'      => $request->barcode,
                'title'        => $request->title,
                'description'  => $request->description ?? '-',
                'category_id'  => $request->category_id,
                'buy_price'    => $request->buy_price,
                'sell_price'   => $request->sell_price,
                'stock'        => $request->type === 'bundle' ? 0 : $request->stock,
                'expired_date' => $request->expired_date,
                'type'         => $request->type,
            ]);

            // Sync Bundling Items
            if ($request->type === 'bundle' && $request->bundle_items) {
                $syncData = [];
                foreach ($request->bundle_items as $item) {
                    if(!empty($item['item_id'])) {
                        $syncData[$item['item_id']] = ['qty' => $item['qty']];
                    }
                }
                $product->bundle_items()->sync($syncData);
            } else {
                $product->bundle_items()->detach();
            }
        });

        return redirect()->route('products.index')->with('success', 'Produk Berhasil Diperbarui!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        try {
            $product->delete();
            return redirect()->route('products.index')->with('success', 'Produk Berhasil Dihapus!');
        } catch (QueryException $e) {
            return back()->with('error', 'Gagal hapus: Produk terikat dengan data transaksi.');
        }
    }

    /**
     * Download Excel Template.
     */
    public function template()
    {
        try {
            $fileName = 'template_produk_' . now()->format('Y-m-d') . '.xlsx';
            
            $export = new class implements 
                \Maatwebsite\Excel\Concerns\FromArray, 
                \Maatwebsite\Excel\Concerns\WithHeadings, 
                \Maatwebsite\Excel\Concerns\ShouldAutoSize 
            {
                public function headings(): array {
                    return ['barcode', 'title', 'category', 'description', 'buy_price', 'sell_price', 'stock', 'expired_date'];
                }
                public function array(): array {
                    return [['8991001', 'Nama Barang', 'Makanan', 'Keterangan', '5000', '7000', '100', date('Y-m-d')]];
                }
            };

            return Excel::download($export, $fileName);
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal: ' . $e->getMessage());
        }
    }

    /**
     * Import Excel Data.
     */
    public function import(Request $request)
    {
        $request->validate(['file' => 'required|mimes:xlsx,xls']);

        try {
            Excel::import(new ProductsImport, $request->file('file'));
            return back()->with('success', 'Data produk berhasil diimport!');
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal import: ' . $e->getMessage());
        }
    }

    /**
     * Bulk Delete resources.
     */
    public function bulkDestroy(Request $request)
    {
        $request->validate([
            'ids'   => 'required|array',
            'ids.*' => 'exists:products,id',
        ]);

        try {
            Product::destroy($request->ids);
            return back()->with('success', 'Produk terpilih berhasil dihapus!');
        } catch (\Exception $e) {
            return back()->with('error', 'Beberapa produk gagal dihapus.');
        }
    }
}