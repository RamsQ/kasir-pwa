<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Discount;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DiscountController extends Controller
{
    public function index(Request $request)
    {
        $discounts = Discount::when($request->search, function ($query, $search) {
            $query->where('name', 'like', '%' . $search . '%');
        })->latest()->paginate(10)->withQueryString();

        return Inertia::render('Dashboard/Discounts/Index', [
            'discounts' => $discounts,
            'filters' => $request->only(['search'])
        ]);
    }

    public function create()
    {
        return Inertia::render('Dashboard/Discounts/Create');
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
        ]);

        Discount::create([
            'name'            => $request->name,
            'description'     => $request->description,
            'type'            => $request->type,
            'value'           => $request->value,
            'min_transaction' => $request->min_transaction,
            'start_date'      => $request->start_date,
            'end_date'        => $request->end_date,
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