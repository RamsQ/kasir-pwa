<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProfileController extends Controller
{
    /**
     * Menampilkan halaman profil
     * PERUBAHAN: Path render disesuaikan ke folder 'Profile/Index'
     */
    public function edit()
    {
        return Inertia::render('Profile/Index', [
            'user' => auth()->user()
        ]);
    }

    /**
     * Memperbarui informasi profil (Nama, Email, dan Foto)
     */
    public function update(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();

        $request->validate([
            'name'  => 'required|string|max:255',
            'email' => ['required', 'email', Rule::unique('users')->ignore($user->id)],
            'image' => 'nullable|image|mimes:jpg,jpeg,png|max:2048', 
        ]);

        $user->name = $request->name;
        $user->email = $request->email;

        // Logika Upload Foto Profil
        if ($request->hasFile('image')) {
            
            // 1. Hapus foto lama jika ada di storage (bukan URL luar)
            if ($user->image && !str_contains($user->image, 'http')) {
                Storage::disk('public')->delete('users/' . $user->image);
            }

            // 2. Ambil file dan simpan ke: storage/app/public/users
            $image = $request->file('image');
            $filename = $image->hashName();
            
            // Menggunakan storeAs untuk kontrol folder yang lebih baik
            $image->storeAs('public/users', $filename);
            
            // 3. Simpan nama filenya saja ke kolom 'image' di database
            $user->image = $filename;
        }

        $user->save();

        // Redirect back agar session auth.user di frontend terupdate otomatis
        return redirect()->back()->with('success', 'Profil berhasil diperbarui!');
    }

    /**
     * Memperbarui Password
     */
    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'password'         => 'required|min:8|confirmed',
        ]);

        /** @var \App\Models\User $user */
        $user = auth()->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return back()->withErrors(['current_password' => 'Password saat ini tidak cocok.']);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        return back()->with('success', 'Password berhasil diubah!');
    }
}