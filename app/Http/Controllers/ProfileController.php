<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use App\Models\User;

class ProfileController extends Controller
{
    public function index()
    {
        return Inertia::render('Dashboard/Profile/Index', [
            'user' => auth()->user()
        ]);
    }

    /**
     * Update Profile (Name, Email, and Image)
     */
    public function update(Request $request)
    {
        $user = auth()->user();

        $request->validate([
            'name'  => 'required|string|max:255',
            'email' => ['required', 'email', Rule::unique('users')->ignore($user->id)],
            'image' => 'nullable|image|mimes:jpg,jpeg,png|max:2048', 
        ]);

        // 1. Ambil data input nama dan email
        $user->name = $request->name;
        $user->email = $request->email;

        // 2. Logika Upload Foto Profil
        if ($request->hasFile('image')) {
            
            // Hapus foto lama jika ada
            if ($user->image && file_exists(public_path('storage/users/' . $user->image))) {
                @unlink(public_path('storage/users/' . $user->image));
            }

            // Ambil file dan buat nama unik
            $image = $request->file('image');
            $filename = time() . '_' . $image->hashName();
            
            // Simpan LANGSUNG ke folder public/storage/users
            // Pastikan folder ini sudah ada atau dibuat manual
            $image->move(public_path('storage/users'), $filename);
            
            // Simpan nama filenya saja ke kolom 'image' di database
            $user->image = $filename;
        }

        // 3. Simpan perubahan ke database
        $user->save();

        return redirect()->back()->with('success', 'Profil berhasil diperbarui!');
    }

    /**
     * Update Password (Tetap sama)
     */
    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'password'         => 'required|min:8|confirmed',
        ]);

        $user = auth()->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return back()->withErrors(['current_password' => 'Password saat ini tidak cocok.']);
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return back()->with('success', 'Password berhasil diubah!');
    }
}