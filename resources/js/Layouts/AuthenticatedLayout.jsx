import { useState } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import Notification from '@/Components/Dashboard/Notification'; // Menggunakan komponen Dashboard/Notification
import Toast from '@/Components/Notification'; // Komponen Toast untuk pesan flash

export default function Authenticated({ user, header, children }) {
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    
    // Mengambil data props terbaru dari Inertia
    const { notifications } = usePage().props;

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 transition-colors duration-300">
            {/* Listener untuk Toast Notification (Popup Berhasil/Gagal) */}
            <Toast />

            <nav className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            {/* Logo Section */}
                            <div className="shrink-0 flex items-center">
                                <Link href="/">
                                    <ApplicationLogo className="block h-9 w-auto fill-current text-gray-800 dark:text-white" />
                                </Link>
                            </div>

                            {/* Desktop Navigation */}
                            <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex text-slate-900 dark:text-slate-100">
                                <NavLink href={route('dashboard')} active={route().current('dashboard')}>
                                    Dashboard
                                </NavLink>
                                <NavLink href={route('stock_opnames.index')} active={route().current('stock_opnames.*')}>
                                    Stock Opname
                                </NavLink>
                            </div>
                        </div>

                        {/* Right Side Header (Desktop) */}
                        <div className="hidden sm:flex sm:items-center sm:ms-6 gap-2">
                            
                            {/* --- KOMPONEN NOTIFIKASI UTAMA (LONCENG) --- */}
                            <Notification />

                            <div className="ms-3 relative">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 hover:text-gray-700 dark:hover:text-white focus:outline-none transition ease-in-out duration-150">
                                            {/* Inisial Profil (Lingkaran Orange) */}
                                            <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold mr-2 uppercase shadow-sm">
                                                {user.name.substring(0, 2)}
                                            </div>
                                            <span className="hidden md:inline">{user.name}</span>
                                            <svg className="ms-2 -me-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        <div className="px-4 py-2 border-b dark:border-slate-800">
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Akun Terhubung</p>
                                            <p className="text-sm font-semibold truncate dark:text-slate-200">{user.email}</p>
                                        </div>
                                        <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                        <Dropdown.Link href={route('logout')} method="post" as="button" className="text-red-500 hover:text-red-600">
                                            Log Out
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>
                        
                        {/* Mobile view Controls */}
                        <div className="-me-2 flex items-center sm:hidden gap-3">
                            {/* Notifikasi tetap muncul di mobile */}
                            <Notification />
                            
                            <button 
                                onClick={() => setShowingNavigationDropdown(!showingNavigationDropdown)} 
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none transition duration-150"
                            >
                                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                    <path className={!showingNavigationDropdown ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    <path className={showingNavigationDropdown ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Responsive Navigation Menu */}
                <div className={(showingNavigationDropdown ? 'block' : 'hidden') + ' sm:hidden bg-white dark:bg-slate-900 border-t dark:border-slate-800'}>
                    <div className="pt-2 pb-3 space-y-1">
                        <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard')}>
                            Dashboard
                        </ResponsiveNavLink>
                        <ResponsiveNavLink href={route('stock_opnames.index')} active={route().current('stock_opnames.*')}>
                            Stock Opname
                        </ResponsiveNavLink>
                    </div>

                    <div className="pt-4 pb-1 border-t border-gray-200 dark:border-slate-800">
                        <div className="px-4">
                            <div className="font-medium text-base text-gray-800 dark:text-white">{user.name}</div>
                            <div className="font-medium text-sm text-gray-500">{user.email}</div>
                        </div>

                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')}>Profile</ResponsiveNavLink>
                            <ResponsiveNavLink method="post" href={route('logout')} as="button">
                                Log Out
                            </ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Page Header */}
            {header && (
                <header className="bg-white dark:bg-slate-900 shadow-sm transition-colors duration-300">
                    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                        <h2 className="font-semibold text-xl text-gray-800 dark:text-white leading-tight">
                            {header}
                        </h2>
                    </div>
                </header>
            )}

            {/* Main Content Area */}
            <main className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>
        </div>
    );
}