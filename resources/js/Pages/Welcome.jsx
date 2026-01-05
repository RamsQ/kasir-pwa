import { useEffect, useState, useRef } from "react";
import { Head, Link } from "@inertiajs/react";
import {
    IconShoppingCart, IconDiamond, IconArrowUpRight, IconCrown, 
    IconSun, IconMoon, IconFingerprint, IconWorld, IconBolt,
    IconCurrencyDollar, IconCertificate, IconShieldLock, IconMathFunction
} from "@tabler/icons-react";

export default function Welcome() {
    const [isDark, setIsDark] = useState(true);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") || "dark";
        setIsDark(savedTheme === "dark");
        document.documentElement.classList.toggle("dark", savedTheme === "dark");

        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        document.documentElement.classList.toggle("dark", newTheme);
        localStorage.setItem("theme", newTheme ? "dark" : "light");
    };

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#050505] text-[#1a1a1a] dark:text-[#e5e5e5] transition-colors duration-1000 overflow-x-hidden font-sans selection:bg-rose-500/30">
            <Head title="AuraPOS — The Obsidian Reserve" />

            {/* --- CINEMATIC OVERLAY EFFECTS --- */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#fb718515,transparent_50%)]" />
                <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3C/g%3E%3C/svg%3E")` }} />
            </div>

            {/* --- ARCHITECTURAL NAVIGATION --- */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${scrolled ? 'h-20 bg-white/70 dark:bg-[#050505]/70 backdrop-blur-3xl border-b border-black/5 dark:border-white/5' : 'h-32 bg-transparent'}`}>
                <div className="max-w-[1600px] mx-auto px-12 h-full flex items-center justify-between">
                    <div className="flex items-center gap-6 group cursor-pointer">
                        <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500">
                            <IconDiamond size={24} className="text-white dark:text-black" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-2xl font-black tracking-[0.3em] uppercase italic">Aura<span className="text-rose-600">POS</span></span>
                            <span className="text-[8px] font-bold tracking-[0.6em] uppercase opacity-50">Reserve Collection</span>
                        </div>
                    </div>

                    <div className="hidden xl:flex items-center gap-16 text-[10px] font-black uppercase tracking-[0.4em] opacity-40 hover:opacity-100 transition-opacity">
                        <a href="#" className="hover:text-rose-600 transition-colors">Heritage</a>
                        <a href="#" className="hover:text-rose-600 transition-colors">Bento v2</a>
                        <a href="#" className="hover:text-rose-600 transition-colors">Encrypted</a>
                    </div>

                    <div className="flex items-center gap-8">
                        <button onClick={toggleTheme} className="opacity-50 hover:opacity-100 transition-opacity">
                            {isDark ? <IconSun size={20} stroke={1.5} /> : <IconMoon size={20} stroke={1.5} />}
                        </button>
                        <Link href="/login" className="text-[10px] font-black uppercase tracking-[0.3em]">Sign In</Link>
                        <Link href="/register" className="relative group px-10 py-4 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-full overflow-hidden transition-all shadow-2xl active:scale-95">
                            <div className="absolute inset-0 bg-rose-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            <span className="relative z-10 group-hover:text-white transition-colors">Request Access</span>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* --- HERO: THE OBSIDIAN ARCHIVE --- */}
            <section className="relative pt-64 pb-48 px-12">
                <div className="max-w-[1400px] mx-auto">
                    <div className="flex flex-col items-start text-left mb-32">
                        <div className="flex items-center gap-4 text-rose-600 mb-10 overflow-hidden">
                            <div className="h-[1px] w-20 bg-rose-600" />
                            <span className="text-[10px] font-black uppercase tracking-[0.8em]">Beyond Transactional</span>
                        </div>

                        <h1 className="text-8xl md:text-[160px] font-black leading-[0.75] tracking-[-0.06em] uppercase italic mb-16">
                            The New <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-rose-300 to-slate-400">Statement.</span>
                        </h1>

                        <div className="flex flex-col md:flex-row items-end gap-20">
                            <p className="max-w-md text-xl text-slate-500 font-light leading-relaxed tracking-tight italic">
                                Crafted for those who demand nothing less than perfection. An ecosystem where aesthetics meet mathematical precision.
                            </p>
                            <Link href="/register" className="flex items-center gap-4 group">
                                <span className="w-20 h-20 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center group-hover:bg-rose-600 group-hover:border-rose-600 transition-all duration-700">
                                    <IconArrowUpRight size={32} className="group-hover:text-white transition-colors" />
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Initialize Enterprise</span>
                            </Link>
                        </div>
                    </div>

                    {/* HERO VISUAL MASK */}
                    <div className="relative group overflow-hidden rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-black/5 dark:border-white/5">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 z-10" />
                        <img 
                            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000" 
                            className="w-full h-[800px] object-cover transition-transform duration-[3s] group-hover:scale-110"
                            alt="Luxury Workspace"
                        />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
                            <div className="w-24 h-24 bg-white/10 backdrop-blur-3xl rounded-full flex items-center justify-center mx-auto mb-6">
                                <IconBolt size={40} className="text-white" />
                            </div>
                            <span className="text-white font-black text-[10px] uppercase tracking-[1em]">Press to Inspect</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- BENTO LUXURY CLOUD --- */}
            <section className="py-48 bg-black">
                <div className="max-w-[1400px] mx-auto px-12 text-white">
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 auto-rows-[400px]">
                        {/* Card 1: Intelligence */}
                        <div className="lg:col-span-3 rounded-[3.5rem] bg-[#0a0a0a] border border-white/5 p-16 flex flex-col justify-between group overflow-hidden relative">
                            <div className="z-10">
                                <IconMathFunction size={50} className="text-rose-600 mb-10" />
                                <h3 className="text-5xl font-black italic tracking-tighter uppercase mb-6 leading-none">Computational <br /> Mastery.</h3>
                                <p className="text-slate-500 max-w-xs text-lg font-light">Algoritma prediktif yang menghitung setiap pergerakan inventaris Anda secara absolut.</p>
                            </div>
                            <img src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=800" className="absolute bottom-0 right-0 w-2/3 opacity-20 group-hover:opacity-40 transition-opacity duration-1000 translate-y-1/4" />
                        </div>

                        {/* Card 2: Security */}
                        <div className="lg:col-span-3 rounded-[3.5rem] bg-[#0a0a0a] border border-white/5 p-16 flex flex-col justify-between group overflow-hidden relative">
                            <div className="z-10">
                                <IconShieldLock size={50} className="text-rose-600 mb-10" />
                                <h3 className="text-5xl font-black italic tracking-tighter uppercase mb-6 leading-none">The Vault <br /> Infrastructure.</h3>
                                <p className="text-slate-500 max-w-xs text-lg font-light">Standar enkripsi yang digunakan oleh institusi keuangan global kini tersedia di toko Anda.</p>
                            </div>
                            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-rose-600/10 blur-[100px] rounded-full" />
                        </div>

                        {/* Card 3: Global */}
                        <div className="lg:col-span-2 rounded-[3.5rem] bg-[#0a0a0a] border border-white/5 p-12 text-center flex flex-col items-center justify-center group">
                            <IconWorld size={80} stroke={0.5} className="text-rose-600 mb-8 animate-spin-slow" />
                            <h4 className="text-sm font-black uppercase tracking-[0.5em] mb-4">Borderless Flow</h4>
                            <p className="text-slate-500 font-light italic">Sync without borders.</p>
                        </div>

                        {/* Card 4: Hardware Integration */}
                        <div className="lg:col-span-4 rounded-[3.5rem] bg-[#0a0a0a] border border-white/5 p-12 flex items-center justify-between group overflow-hidden">
                            <div className="max-w-md">
                                <h4 className="text-3xl font-black italic uppercase mb-6">Hardware Synergy.</h4>
                                <p className="text-slate-500 text-lg font-light italic leading-relaxed">Kompatibilitas tanpa celah dengan perangkat thermal premium dan ekosistem scanner kelas dunia.</p>
                            </div>
                            <IconCertificate size={120} stroke={0.2} className="text-rose-600/20 group-hover:text-rose-600/50 transition-colors duration-1000" />
                        </div>
                    </div>
                </div>
            </section>

            {/* --- THE PRESTIGE CTA --- */}
            <section className="py-64 text-center relative overflow-hidden bg-white dark:bg-transparent">
                <div className="max-w-5xl mx-auto relative z-10 px-12">
                    <h2 className="text-[120px] font-black text-slate-900 dark:text-white tracking-[-0.08em] mb-20 leading-none italic uppercase">
                        Own the <span className="text-rose-600">Aura.</span>
                    </h2>
                    <Link href="/register" className="inline-block px-24 py-10 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.6em] text-[12px] rounded-full hover:shadow-[0_40px_100px_-20px_rgba(225,29,72,0.4)] hover:bg-rose-600 dark:hover:bg-rose-600 hover:text-white transition-all duration-700 active:scale-90">
                        Secure Membership
                    </Link>
                </div>
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/5 dark:bg-white/5" />
            </section>

            {/* --- THE RESERVE FOOTER --- */}
            <footer className="py-32 bg-[#0a0a0a] text-white px-12 border-t border-white/5">
                <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-24">
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-4 mb-10">
                            <IconDiamond size={32} className="text-rose-600" />
                            <span className="text-3xl font-black tracking-[0.4em] uppercase italic">Aura Reserve</span>
                        </div>
                        <p className="text-slate-500 text-xl font-light italic max-w-md mb-12 leading-relaxed">Masa depan ritel bukan hanya tentang data, tapi tentang perasaan eksklusivitas di setiap detik transaksi.</p>
                    </div>
                    
                    <div>
                        <h5 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.6em] mb-10">Core Identity</h5>
                        <ul className="space-y-6 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">
                            <li className="hover:text-white cursor-pointer transition-colors">Heritage Archive</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Mathematics</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Global Node</li>
                        </ul>
                    </div>

                    <div className="text-right flex flex-col justify-between">
                        <h5 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.6em]">Geneva • London • Jakarta</h5>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em] pt-20">© {new Date().getFullYear()} Aura Reserve Int. All Rights Reserved.</p>
                    </div>
                </div>
            </footer>

            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 20s linear infinite;
                }
                html { scroll-behavior: smooth; }
                h1, h2, h3, .font-black {
                    font-family: 'Inter', sans-serif;
                    letter-spacing: -0.04em;
                }
            `}</style>
        </div>
    );
}