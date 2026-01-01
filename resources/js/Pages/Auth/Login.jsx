import { useEffect, useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import { 
    IconShoppingCart, 
    IconMail, 
    IconLock, 
    IconEye, 
    IconEyeOff, 
    IconLoader2 
} from "@tabler/icons-react";

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: "",
        password: "",
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        return () => reset("password");
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route("login"));
    };

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans">
            <Head title="Masuk Ke Sistem" />
            
            {/* SISI KIRI: FORM LOGIN */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-slate-900 shadow-xl z-10 transition-colors duration-300">
                <div className="w-full max-w-md">
                    {/* Header Brand */}
                    <div className="mb-10 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-3 mb-8 group">
                            <Link href="/" className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
                                    <IconShoppingCart size={28} className="text-white" />
                                </div>
                                <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
                                    POS SYSTEM
                                </span>
                            </Link>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">
                            Selamat Datang
                        </h1>
                        <p className="mt-3 text-slate-500 dark:text-slate-400 font-medium">
                            Silakan masuk untuk mengelola transaksi toko Anda hari ini.
                        </p>
                    </div>

                    {/* Pesan Status */}
                    {status && (
                        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm border border-emerald-100 dark:border-emerald-800 font-bold">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-5">
                        {/* Input Email */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Email Kasir</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                                    <IconMail size={20} />
                                </div>
                                <input 
                                    type="email" 
                                    value={data.email} 
                                    autoComplete="username"
                                    onChange={e => setData('email', e.target.value)}
                                    placeholder="admin@pos.com"
                                    className={`w-full h-13 pl-12 pr-4 rounded-2xl border-2 ${
                                        errors.email ? 'border-red-500 ring-red-500/10' : 'border-slate-100 dark:border-slate-800'
                                    } bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all`}
                                />
                            </div>
                            {errors.email && <p className="text-red-500 text-[10px] mt-1.5 font-black uppercase tracking-tight">{errors.email}</p>}
                        </div>

                        {/* Input Password */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Kata Sandi</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                                    <IconLock size={20} />
                                </div>
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    value={data.password} 
                                    autoComplete="current-password"
                                    onChange={e => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                    className={`w-full h-13 pl-12 pr-12 rounded-2xl border-2 ${
                                        errors.password ? 'border-red-500 ring-red-500/10' : 'border-slate-100 dark:border-slate-800'
                                    } bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all`}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)} 
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 transition-colors"
                                >
                                    {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-[10px] mt-1.5 font-black uppercase tracking-tight">{errors.password}</p>}
                        </div>

                        {/* Fitur Tambahan: Remember & Forgot Password */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={data.remember} 
                                    onChange={e => setData('remember', e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-slate-200 dark:border-slate-800 text-primary-600 focus:ring-primary-500 transition-all cursor-pointer shadow-sm" 
                                />
                                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-primary-500 transition-colors">Ingat Saya</span>
                            </label>

                            {canResetPassword && (
                                <Link
                                    href={route("password.request")}
                                    className="text-sm font-bold text-primary-600 hover:text-primary-700 underline underline-offset-4 decoration-primary-600/30 hover:decoration-primary-700 transition-all"
                                >
                                    Lupa Password?
                                </Link>
                            )}
                        </div>

                        {/* Tombol Login */}
                        <button 
                            type="submit" 
                            disabled={processing}
                            className="w-full h-14 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 disabled:opacity-50 transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            {processing ? (
                                <IconLoader2 className="animate-spin" size={24} />
                            ) : "Masuk Sekarang"}
                        </button>
                    </form>
                    
                    {/* Link Daftar Sekarang */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">
                            Belum memiliki akun? {" "}
                            <Link
                                href={route("register")}
                                className="text-primary-600 hover:text-primary-700 font-black decoration-primary-600/30 hover:decoration-primary-600 underline underline-offset-4 transition-all"
                            >
                                Daftar Sekarang
                            </Link>
                        </p>
                    </div>

                    <div className="mt-12 text-center">
                        <p className="text-xs text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest">
                            POS SYSTEM © {new Date().getFullYear()} • Build v2.4
                        </p>
                    </div>
                </div>
            </div>

            {/* SISI KANAN: VISUAL (GAMBAR LEBIH TERANG) */}
            <div className="hidden lg:flex flex-1 relative bg-slate-100 items-center justify-center overflow-hidden">
                <img 
                    src="/image/kasir.jpg" 
                    alt="POS Background" 
                    className="absolute inset-0 w-full h-full object-cover scale-105 opacity-90"
                    onError={(e) => { 
                        e.target.onerror = null; 
                        e.target.src = 'https://images.unsplash.com/photo-1556742049-13efd9395b46?q=80&w=1920'; 
                    }}
                />
                
                {/* Overlay dikurangi opasitasnya agar lebih terang */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-primary-900/20 to-slate-900/60 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-white/5 backdrop-blur-[0.5px]"></div>
                
                {/* Content Visual */}
                <div className="relative z-10 text-white p-16 max-w-2xl">
                    <h2 className="text-6xl font-black uppercase leading-[1.1] tracking-tighter mb-8 italic drop-shadow-lg">
                        Solusi Cerdas <br /> Untuk Kasir Anda.
                    </h2>
                    <p className="text-lg font-medium text-white leading-relaxed mb-10 max-w-lg border-l-4 border-primary-500 pl-6 backdrop-blur-md bg-black/20 py-2 rounded-r-xl shadow-lg">
                        Didesain untuk kecepatan transaksi dan akurasi stok. Kelola inventori dan laporan otomatis dalam satu platform terintegrasi.
                    </p>
                    
                    {/* Badge Kecil Fitur */}
                    <div className="flex flex-wrap gap-3">
                        {["Stok Real-time", "Manajemen Diskon", "Laporan", "Inventori", "Manajemen Crew"].map((tag, i) => (
                            <div key={i} className="px-5 py-2.5 rounded-xl bg-primary-600/30 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl">
                                {tag}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: `radial-gradient(#fff 1px, transparent 0)`, backgroundSize: `40px 40px` }}></div>
            </div>
        </div>
    );
}