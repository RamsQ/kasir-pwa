<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Requests\UserRequest;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;
use App\Http\Controllers\Controller;

class UserController extends Controller
{
    public function index()
    {
        $users = User::query()
            ->with('roles')
            ->when(request()->search, fn($query) => $query->where('name', 'like', '%' . request()->search . '%'))
            ->select('id', 'name', 'avatar', 'email')
            ->latest()
            ->paginate(7)
            ->withQueryString();

        return Inertia::render('Dashboard/Users/Index', [
            'users' => $users
        ]);
    }

    public function create()
    {
        $roles = Role::query()->select('id', 'name')->orderBy('name')->get();

        return Inertia::render('Dashboard/Users/Create', [
            'roles' => $roles
        ]);
    }

    public function store(UserRequest $request)
    {
        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => bcrypt($request->password),
        ]);

        $user->assignRole($request->selectedRoles);

        return to_route('users.index');
    }

    public function edit(User $user)
    {
        $roles = Role::query()->select('id', 'name')->orderBy('name')->get();

        $user->load([
            'roles' => fn($query) => $query->select('id', 'name'), 
            'roles.permissions' => fn($query) => $query->select('id', 'name')
        ]);

        return Inertia::render('Dashboard/Users/Edit', [
            'roles' => $roles,
            'user'  => $user
        ]);
    }

    public function update(UserRequest $request, User $user)
    {
        $data = [
            'name'  => $request->name,
            'email' => $request->email,
        ];

        if ($request->password) {
            $data['password'] = bcrypt($request->password);
        }

        $user->update($data);

        $user->syncRoles($request->selectedRoles);

        return to_route('users.index');
    }

    public function destroy($id)
    {
        $ids = explode(',', $id);

        if (count($ids) > 1) {
            User::whereIn('id', $ids)->delete();
        } else {
            User::findOrFail($id)->delete();
        }

        return back();
    }
}