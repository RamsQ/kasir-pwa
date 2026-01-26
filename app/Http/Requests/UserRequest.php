<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; 
    }

    public function rules(): array
    {
        $userId = $this->route('user') ? $this->route('user')->id : null;

        return [
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email,' . $userId,
            'password' => $this->isMethod('POST') 
                            ? 'required|min:8|confirmed' 
                            : 'nullable|min:8|confirmed',
            // Kita buat salah satu wajib ada: 'roles' atau 'selectedRoles'
            'roles'         => 'nullable|array',
            'selectedRoles' => 'nullable|array',
        ];
    }
}