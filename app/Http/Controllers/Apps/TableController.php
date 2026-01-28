<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Table;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TableController extends Controller
{
    public function index()
    {
        $tables = Table::orderBy('name')->paginate(10);
        return Inertia::render('Dashboard/Tables/Index', [
            'tables' => $tables
        ]);
    }

    public function store(Request $request)
    {
        $request->validate(['name' => 'required|unique:tables,name']);
        Table::create(['name' => $request->name, 'status' => 'available']);
        return back()->with('success', 'Meja berhasil ditambahkan.');
    }

    public function update(Request $request, Table $table)
    {
        $request->validate(['name' => 'required|unique:tables,name,' . $table->id]);
        $table->update(['name' => $request->name]);
        return back()->with('success', 'Meja berhasil diupdate.');
    }

    public function destroy(Table $table)
    {
        if ($table->status === 'occupied') {
            return back()->with('error', 'Meja sedang digunakan!');
        }
        $table->delete();
        return back()->with('success', 'Meja berhasil dihapus.');
    }
}