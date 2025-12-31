<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Requests\UserRequest;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    /**
     * Tampilkan daftar user.
     */
    public function index()
    {
        $users = User::query()
            ->with('roles')
            ->when(request()->search, function($query) {
                $query->where('name', 'like', '%' . request()->search . '%')
                      ->orWhere('email', 'like', '%' . request()->search . '%');
            })
            // Hanya mengambil kolom yang diperlukan untuk performa
            ->select('id', 'name', 'avatar', 'email', 'created_at')
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Dashboard/Users/Index', [
            'users' => $users,
        ]);
    }

    /**
     * Form tambah user.
     */
    public function create()
    {
        // Pengecekan izin menggunakan Spatie Permission
        if (!auth()->user()->can('users.create')) {
            abort(403, 'Anda tidak memiliki izin untuk menambah pengguna.');
        }

        $roles = Role::query()->select('id', 'name')->orderBy('name')->get();
        return Inertia::render('Dashboard/Users/Create', [
            'roles' => $roles
        ]);
    }

    /**
     * Simpan user baru ke database.
     */
    public function store(UserRequest $request)
    {
        if (!auth()->user()->can('users.create')) {
            return back()->withErrors(['error' => 'Akses ditolak.']);
        }

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => bcrypt($request->password),
        ]);

        // Assign role yang dipilih dari frontend
        $user->assignRole($request->selectedRoles);

        return to_route('users.index')->with('success', 'User berhasil ditambahkan!');
    }

    /**
     * Form edit user.
     */
    public function edit(User $user)
    {
        if (!auth()->user()->can('users.edit')) {
            abort(403, 'Anda tidak memiliki izin untuk mengedit pengguna.');
        }

        $roles = Role::query()->select('id', 'name')->orderBy('name')->get();
        
        // Load roles agar checkbox di frontend otomatis tercentang sesuai data DB
        $user->load(['roles']);

        return Inertia::render('Dashboard/Users/Edit', [
            'roles' => $roles, 
            'user'  => $user
        ]);
    }

    /**
     * Update data user.
     */
    public function update(UserRequest $request, User $user)
    {
        if (!auth()->user()->can('users.edit')) {
            return back()->withErrors(['error' => 'Akses ditolak.']);
        }

        $data = [
            'name'  => $request->name, 
            'email' => $request->email
        ];
        
        // Hanya update password jika input password diisi
        if ($request->password) { 
            $data['password'] = bcrypt($request->password); 
        }

        $user->update($data);

        // Sinkronisasi role (hapus role lama, ganti dengan yang baru dipilih)
        $user->syncRoles($request->selectedRoles);

        return to_route('users.index')->with('success', 'User berhasil diperbarui!');
    }

    /**
     * Hapus user (Soft Delete).
     * Mendukung penghapusan tunggal maupun masal (bulk delete).
     */
    public function destroy($id)
    {
        // Proteksi izin hapus
        if (!auth()->user()->can('users.delete')) {
            return back()->withErrors(['error' => 'Anda tidak memiliki izin untuk menghapus akun!']);
        }

        // Mendukung format ID tunggal "5" atau masal "1,2,3"
        $ids = explode(',', $id);
        
        // Keamanan: Mencegah user menghapus dirinya sendiri
        if (in_array(auth()->id(), $ids)) {
            return back()->withErrors(['error' => 'Tindakan ditolak! Anda tidak bisa menghapus akun Anda sendiri.']);
        }

        /**
         * Karena model User sudah menggunakan trait SoftDeletes,
         * perintah delete() di bawah hanya akan mengisi kolom deleted_at.
         * Ini menyelesaikan masalah Integrity Constraint Violation pada foreign key.
         */
        User::whereIn('id', $ids)->delete();

        return back()->with('success', 'User berhasil dinonaktifkan!');
    }
}