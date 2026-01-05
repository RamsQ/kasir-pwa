import React, { useState, useEffect, useMemo } from "react";
import { Head, router, Link, usePage, useForm } from "@inertiajs/react";
import { 
    IconSearch, IconShoppingCart, IconX, IconTicket, IconGift,
    IconLayoutDashboard, IconCash, IconSun, IconMoon,
    IconPower, IconPackage, IconQrcode, IconPrinter, IconTag, IconScale,
    IconDoorEnter, IconDoorExit, IconClockPause, IconRestore, IconTrash,
    IconCashOff, IconLayoutGrid, IconList, IconCategory
} from "@tabler/icons-react";
import Swal from "sweetalert2";
import ThermalReceipt from "@/Components/Receipt/ThermalReceipt";
import ShiftReceipt from "@/Components/Receipt/ShiftReceipt";

const formatPrice = (value) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value || 0);

const Index = ({ carts = [], carts_total = 0, products = [], customers = [], discounts = [], paymentSetting = {}, activeShift = null, holds = [], categories = [] }) => {
    const { auth, receiptSetting, flash } = usePage().props;
    
    // --- STATE UTAMA ---
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all"); // <--- Fitur Baru
    const [viewMode, setViewMode] = useState("grid"); // <--- Fitur Baru: 'grid' atau 'list'
    const [cash, setCash] = useState(0);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [discountAmount, setDiscountAmount] = useState(0);
    const [showQrisModal, setShowQrisModal] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [shiftToPrint, setShiftToPrint] = useState(null);
    
    // --- STATE MODAL REVIEW, HOLD, & KAS KELUAR ---
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showModalHold, setShowModalHold] = useState(false);
    const [showCashOut, setShowCashOut] = useState(false);
    const [dataLaporan, setDataLaporan] = useState(null);

    // --- LOGIKA FORM SHIFT ---
    const { data: shiftData, setData: setShiftData, post: postShift, processing: processingShift } = useForm({
        starting_cash: 0,
    });

    // --- LOGIKA FORM KAS KELUAR ---
    const { data: cashOutData, setData: setCashOutData, post: postCashOut, processing: processingCashOut, reset: resetCashOut, errors: cashOutErrors } = useForm({
        name: '',
        amount: '',
    });

    // --- LOGIKA TEMA ---
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') === 'dark';
        setIsDarkMode(savedTheme);
        if (savedTheme) document.documentElement.classList.add('dark');
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        if (newTheme) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    // --- LOGIKA CETAK SHIFT OTOMATIS ---
    useEffect(() => {
        if (flash?.printShift) {
            setDataLaporan(flash.printShift);
            setShowReviewModal(true);
        }
    }, [flash]);

    // --- LOGIKA FILTER PRODUK (Pencarian + Kategori) ---
    const filteredProducts = useMemo(() => {
        const safeProducts = Array.isArray(products) ? products : [];
        return safeProducts.filter(p => {
            const matchSearch = p?.title?.toLowerCase().includes(search.toLowerCase()) || 
                                p?.barcode?.toLowerCase().includes(search.toLowerCase());
            const matchCategory = selectedCategory === "all" || p?.category_id === parseInt(selectedCategory);
            return matchSearch && matchCategory;
        });
    }, [search, products, selectedCategory]);

    // --- LOGIKA PERHITUNGAN TOTAL + PROMO ---
    const subtotalWithProductDiscounts = useMemo(() => {
        return (carts || []).reduce((acc, item) => {
            let basePrice = parseFloat(item.price || 0);
            const productDiscount = (discounts || []).find(d => d.product_id === item.product_id);
            if (productDiscount) {
                const discountVal = parseFloat(productDiscount.value);
                basePrice = productDiscount.type === 'percentage' 
                    ? basePrice - (basePrice * (discountVal / 100))
                    : basePrice - (discountVal * parseFloat(item.qty));
            }
            return acc + Math.max(0, basePrice);
        }, 0);
    }, [carts, discounts]);

    const grandTotal = Math.max(0, subtotalWithProductDiscounts - discountAmount);
    const change = cash - grandTotal;

    // --- ACTIONS ---
    const handleOpenShift = (e) => {
        e.preventDefault();
        postShift(route('shifts.store'), {
            onSuccess: () => Swal.fire("Berhasil", "Shift dimulai!", "success"),
        });
    };

    const handleCloseShift = () => {
        if (!activeShift) return;
        Swal.fire({
            title: 'Tutup Shift?',
            text: "Hitung total uang fisik di laci saat ini!",
            input: 'number',
            inputLabel: 'Uang Fisik (Rp)',
            showCancelButton: true,
            confirmButtonText: 'Review Laporan',
        }).then((result) => {
            if (result.isConfirmed) {
                router.put(route('shifts.update', activeShift.id), {
                    total_cash_actual: result.value
                });
            }
        });
    };

    const handleCashOut = (e) => {
        e.preventDefault();
        postCashOut(route('transactions.expense'), {
            onSuccess: () => {
                setShowCashOut(false);
                resetCashOut();
                Swal.fire("Berhasil", "Kas keluar berhasil dicatat.", "success");
            },
            onError: () => Swal.fire("Gagal", "Periksa kembali inputan Anda", "error")
        });
    };

    const addToCart = (product) => {
        if (!product?.id) return;
        router.post(route("transactions.addToCart"), { product_id: product.id, qty: 1 }, { 
            preserveScroll: true,
            onError: (err) => Swal.fire("Gagal", err.error || "Gagal menambah ke keranjang", "error")
        });
    };

    const updateCartItem = (id, qty, unitId = null) => {
        const val = parseFloat(qty);
        if (isNaN(val) || val < 0) return;
        if (val === 0) return deleteCart(id);
        router.patch(route("transactions.updateCart", id), { qty: val, product_unit_id: unitId }, { 
            preserveScroll: true,
            onError: (errors) => Swal.fire("Peringatan", errors.message || "Stok fisik tidak mencukupi", "warning")
        });
    };

    const deleteCart = (id) => router.delete(route("transactions.destroyCart", id), { preserveScroll: true });

    const handleHoldTransaction = () => {
        if (carts.length === 0) return Swal.fire("Peringatan", "Keranjang kosong!", "warning");
        
        Swal.fire({
            title: 'Tunda Transaksi',
            text: "Masukkan Atas Nama / Nomor Meja (Opsional)",
            input: 'text',
            inputPlaceholder: 'Contoh: Meja 05 / Pak Budi',
            showCancelButton: true,
            confirmButtonText: 'Simpan Antrean',
            confirmButtonColor: '#6366f1',
        }).then((result) => {
            if (result.isConfirmed) {
                const autoRef = result.value ? result.value : `HOLD-${new Date().getTime()}`;
                router.post(route('holds.store'), {
                    ref_number: autoRef,
                    cart_items: carts,
                    total: grandTotal
                }, { onSuccess: () => { 
                    setSearch("");
                    Swal.fire("Berhasil", "Transaksi disimpan dalam antrean.", "success");
                }});
            }
        });
    };

    const handleResumeHold = (holdId) => {
        router.post(route('transactions.resume', holdId), {}, {
            onSuccess: () => {
                setShowModalHold(false);
                Swal.fire("Berhasil", "Transaksi dikembalikan ke keranjang.", "success");
            }
        });
    };

    const submitTransaction = (method, paidAmount) => {
        if (carts.length === 0) return;
        router.post(route("transactions.store"), {
            customer_id: selectedCustomer || null,
            discount: discountAmount,
            grand_total: grandTotal,
            cash: paidAmount,
            change: method === 'qris' ? 0 : (paidAmount - grandTotal),
            payment_gateway: method,
        }, {
            onSuccess: () => { 
                setCash(0); setShowQrisModal(false); setSearch("");
                Swal.fire("Berhasil!", "Transaksi Selesai", "success");
            },
        });
    };

    const handlePayCash = (e) => {
        e.preventDefault();
        if (carts.length === 0) return;
        if (cash < grandTotal) return Swal.fire("Error", "Uang tunai kurang!", "error");
        submitTransaction('cash', cash);
    };

    return (
        <>
            <Head title="Kasir Toko" />
            
            {/* MODAL OPEN SHIFT */}
            {!activeShift && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border dark:border-slate-800 overflow-hidden p-8">
                        <form onSubmit={handleOpenShift}>
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center mb-4"><IconDoorEnter size={40} /></div>
                                <h2 className="text-2xl font-black dark:text-white uppercase tracking-tight">Buka Shift Kasir</h2>
                            </div>
                            <div className="mb-8 text-center">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Modal Awal (Rp)</label>
                                <input type="number" className="w-full py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-2xl font-black text-center dark:text-white border-none shadow-inner" value={shiftData.starting_cash} onChange={e => setShiftData('starting_cash', e.target.value)} required />
                            </div>
                            <button type="submit" className="w-full py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl shadow-xl font-black uppercase" disabled={processingShift}>Mulai Bertugas</button>
                        </form>
                    </div>
                </div>
            )}

            <div id="main-app-content" className={`flex flex-col h-screen w-full transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-800'} overflow-hidden print:hidden ${!activeShift ? 'blur-xl pointer-events-none' : ''}`}>
                
                {/* HEADER */}
                <header className="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center justify-between px-6 shrink-0 shadow-sm transition-colors z-20">
                    <div className="flex items-center gap-4">
                        <Link href={route('dashboard')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary-500 transition-all">
                            <IconLayoutDashboard size={24} />
                        </Link>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Kasir: {auth?.user?.name}</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowCashOut(true)} className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-orange-200 transition-all active:scale-95 border border-orange-200 dark:border-orange-800/50">
                            <IconCashOff size={16}/> Kas Keluar
                        </button>
                        <button onClick={() => setShowModalHold(true)} className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 transition-all active:scale-90">
                            <IconClockPause size={20} />
                            {holds?.length > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900 animate-bounce">{holds.length}</span>}
                        </button>
                        <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                            {isDarkMode ? <IconSun size={20} className="text-yellow-400" /> : <IconMoon size={20} className="text-slate-600" />}
                        </button>
                        <button onClick={handleCloseShift} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                            <IconDoorExit size={16}/> Tutup Shift
                        </button>
                        <button onClick={() => router.post(route('logout'))} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500"><IconPower size={20} /></button>
                    </div>
                </header>

                <main className="flex flex-1 overflow-hidden lg:flex-row flex-col">
                    
                    {/* SIDEBAR KATEGORI */}
                    <div className="w-20 lg:w-64 bg-white dark:bg-slate-900 border-r dark:border-slate-800 flex flex-col shrink-0">
                        <div className="p-4 hidden lg:block">
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Kategori</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-2 custom-scrollbar">
                            <button 
                                onClick={() => setSelectedCategory('all')}
                                className={`w-full p-3 lg:p-4 rounded-2xl flex items-center gap-3 transition-all font-bold uppercase text-[10px] tracking-widest ${selectedCategory === 'all' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100'}`}
                            >
                                <IconCategory size={20} />
                                <span className="hidden lg:inline">Semua Menu</span>
                            </button>
                            
                            {categories.map((cat) => (
                                <button 
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`w-full p-3 lg:p-4 rounded-2xl flex items-center gap-3 transition-all font-bold uppercase text-[10px] tracking-widest ${selectedCategory === cat.id ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${selectedCategory === cat.id ? 'bg-white' : 'bg-primary-500'}`} />
                                    <span className="hidden lg:inline">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* AREA TENGAH: PRODUK */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Toolbar Search & Toggle View */}
                        <div className="p-4 bg-white/50 dark:bg-slate-900/50 border-b dark:border-slate-800 flex items-center justify-between gap-4 backdrop-blur-sm z-10 transition-colors">
                            <div className="relative flex-1 max-w-xl">
                                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari Nama / Barcode..." className="w-full pl-12 pr-4 py-3 text-sm rounded-2xl border-none bg-white dark:bg-slate-800 dark:text-white shadow-sm focus:ring-2 focus:ring-primary-500 transition-all" />
                            </div>
                            <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border dark:border-slate-700">
                                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary-500 text-white shadow-md' : 'text-slate-400 hover:text-primary-500'}`}><IconLayoutGrid size={20} /></button>
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary-500 text-white shadow-md' : 'text-slate-400 hover:text-primary-500'}`}><IconList size={20} /></button>
                            </div>
                        </div>

                        {/* List Produk */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {filteredProducts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20"><IconPackage size={80} /><p className="font-black uppercase tracking-widest mt-4">Produk Kosong</p></div>
                            ) : (
                                viewMode === 'grid' ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {filteredProducts.map((p) => {
                                            const prodDiscount = (discounts || []).find(d => d.product_id === p.id);
                                            return (
                                                <button key={p.id} onClick={() => addToCart(p)} className="text-left group active:scale-95 transition-all">
                                                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-[2rem] border border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-sm hover:border-primary-500 hover:shadow-xl hover:shadow-primary-500/10 transition-all">
                                                        <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl mb-3 overflow-hidden relative border dark:border-slate-700">
                                                            <img src={p.image ? (p.image.startsWith('http') ? p.image : `/storage/products/${p.image}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.title)}&background=random`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                            {prodDiscount && <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-lg animate-pulse">PROMO</div>}
                                                            <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-white text-[9px] font-bold px-3 py-1 rounded-full border border-white/10 uppercase tracking-tighter">{p.type === 'single' ? `Stok: ${p.stock}` : 'Ready'}</div>
                                                        </div>
                                                        <h3 className="font-bold text-xs mb-1 dark:text-white line-clamp-2 px-1 uppercase leading-tight tracking-tight h-8">{p.title}</h3>
                                                        <p className="font-black text-primary-600 dark:text-primary-400 text-sm mt-auto px-1">{formatPrice(p.sell_price)}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="space-y-3 pb-4">
                                        {filteredProducts.map((p) => (
                                            <button key={p.id} onClick={() => addToCart(p)} className="w-full text-left bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-primary-500 transition-all group shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border dark:border-slate-700">
                                                        <img src={p.image ? (p.image.startsWith('http') ? p.image : `/storage/products/${p.image}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.title)}`} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold dark:text-white uppercase tracking-tight text-sm">{p.title}</h4>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase mt-0.5">Barcode: {p.barcode || '-'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-primary-600 dark:text-primary-400 text-lg">{formatPrice(p.sell_price)}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{p.type === 'single' ? `Tersedia: ${p.stock}` : 'Pesan Antar'}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* SIDEBAR KANAN: KERANJANG */}
                    <div className="w-full lg:w-[450px] bg-white dark:bg-slate-900 border-t lg:border-l dark:border-slate-800 flex flex-col h-full shrink-0 z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
                        <div className="p-5 border-b dark:border-slate-800 flex justify-between items-center shrink-0">
                             <span className="flex items-center gap-2 font-black dark:text-white uppercase tracking-tight italic"><IconShoppingCart size={22} className="text-primary-500" /> Detail Pesanan</span>
                             <span className="bg-primary-500 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-tighter shadow-lg shadow-primary-500/20">{carts?.length || 0} ITEM</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {carts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-10 italic text-sm font-black uppercase tracking-[0.2em]">Belum ada item dipilih</div>
                            ) : carts.map((c) => {
                                const itemDiscount = (discounts || []).find(d => d.product_id === c.product_id);
                                let dPrice = parseFloat(c.price);
                                if (itemDiscount) {
                                    dPrice = itemDiscount.type === 'percentage' ? dPrice - (dPrice * (parseFloat(itemDiscount.value) / 100)) : dPrice - (parseFloat(itemDiscount.value) * parseFloat(c.qty));
                                }
                                return (
                                    <div key={c.id} className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border dark:border-slate-700 flex flex-col shadow-sm border-l-4 border-l-primary-500">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <h4 className="text-[11px] font-black uppercase truncate dark:text-white tracking-tight">{c.product?.title}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="font-black text-xs text-primary-600 dark:text-primary-400">{formatPrice(dPrice)}</span>
                                                    {itemDiscount && <span className="text-[8px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">PROMO</span>}
                                                </div>
                                            </div>
                                            <button onClick={() => deleteCart(c.id)} className="text-slate-300 hover:text-red-500 transition-colors bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm"><IconX size={16} /></button>
                                        </div>

                                        {/* Bundle Info */}
                                        {c.product?.type === 'bundle' && c.product?.bundle_items?.length > 0 && (
                                            <div className="mb-3 pl-3 border-l-2 border-primary-400 text-[9px] text-slate-500 font-bold uppercase italic">
                                                {c.product.bundle_items.map((bi, idx) => (<div key={idx}>• {bi.title} (x{parseFloat(bi.pivot?.qty || 0) * parseFloat(c.qty)})</div>))}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-3 mt-2 pt-3 border-t dark:border-slate-700 border-dashed">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Satuan</label>
                                                <select value={c.product_unit_id || ''} onChange={(e) => updateCartItem(c.id, c.qty, e.target.value || null)} className="bg-white dark:bg-slate-800 border-none text-[10px] font-black text-primary-600 rounded-xl p-2 shadow-sm focus:ring-0 uppercase cursor-pointer">
                                                    <option value="">UTAMA</option>
                                                    {c.product?.units?.map(u => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1 text-center">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Jumlah</label>
                                                <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border dark:border-slate-700">
                                                    <button onClick={() => updateCartItem(c.id, parseFloat(c.qty) - 1, c.product_unit_id)} className="w-8 h-8 flex items-center justify-center font-black text-slate-400 hover:text-primary-500">-</button>
                                                    <input type="number" step="0.01" value={c.qty} readOnly className="w-10 text-[11px] font-black text-center bg-transparent border-none p-0 dark:text-white" />
                                                    <button onClick={() => updateCartItem(c.id, parseFloat(c.qty) + 1, c.product_unit_id)} className="w-8 h-8 flex items-center justify-center font-black text-slate-400 hover:text-primary-500">+</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* PEMBAYARAN */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t dark:border-slate-800 space-y-4 shrink-0">
                            <div className="flex justify-between text-2xl font-black text-primary-600 dark:text-primary-400 uppercase tracking-tighter italic">
                                <span>TOTAL</span><span>{formatPrice(grandTotal)}</span>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                {[grandTotal, 10000, 50000, 100000].map((v, i) => (
                                    <button key={i} onClick={() => setCash(v)} className="py-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-primary-500 hover:text-white transition-all dark:text-white">{i === 0 ? 'PAS' : v/1000 + 'K'}</button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative flex-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">Rp</span>
                                    <input type="number" value={cash || ''} onChange={(e) => setCash(Number(e.target.value))} placeholder="Input Tunai..." className="w-full pl-10 pr-4 py-4 text-sm font-black rounded-2xl dark:bg-slate-800 border-none dark:text-white shadow-inner focus:ring-2 focus:ring-primary-500 transition-all" />
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-2 flex flex-col items-center justify-center shadow-inner text-center overflow-hidden">
                                    <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Kembalian</span>
                                    <span className={`text-sm font-black tracking-tighter truncate w-full ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatPrice(change)}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                <button onClick={handleHoldTransaction} disabled={carts.length === 0} className="w-full py-4 border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 font-black text-[10px] rounded-2xl flex items-center justify-center gap-2 uppercase transition-all active:scale-95"><IconClockPause size={18} /> Simpan Antrean</button>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={handlePayCash} disabled={carts.length === 0 || cash < grandTotal} className="py-5 bg-slate-900 dark:bg-slate-800 text-white font-black text-[10px] rounded-2xl uppercase transition-all shadow-xl active:scale-95 flex flex-col items-center justify-center gap-1 border border-white/5"><IconCash size={22} /> Bayar Tunai</button>
                                    <button onClick={() => setShowQrisModal(true)} disabled={carts.length === 0} className="py-5 bg-primary-600 text-white font-black text-[10px] rounded-2xl flex flex-col items-center justify-center gap-1 uppercase transition-all shadow-xl active:scale-95 shadow-primary-500/20 border border-white/10"><IconQrcode size={22} /> Scan QRIS</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* MODAL QRIS */}
            {showQrisModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-sm w-full text-center border dark:border-slate-800 shadow-2xl animate-in zoom-in duration-300">
                        <h3 className="text-xl font-black uppercase dark:text-white mb-8 italic tracking-tight">QRIS Payment Gateway</h3>
                        <div className="bg-white p-6 rounded-[2.5rem] mb-8 border-4 border-slate-50 flex justify-center relative shadow-2xl group">
                            {paymentSetting?.qris_manual_image ? (
                                <>
                                    <img src={`/storage/payments/${paymentSetting.qris_manual_image}`} className="w-full h-auto max-w-[220px] transition-transform group-hover:scale-105" />
                                    <button onClick={() => window.print()} className="absolute -bottom-4 -right-4 w-14 h-14 bg-primary-600 text-white rounded-2xl shadow-xl hover:bg-primary-700 transition-all active:scale-90 flex items-center justify-center border-4 border-white dark:border-slate-900"><IconPrinter size={24} /></button>
                                </>
                            ) : <div className="py-16 text-slate-300 italic text-[10px] uppercase font-black tracking-[0.2em]">No QRIS Active</div>}
                        </div>
                        <p className="text-4xl font-black text-primary-600 dark:text-white mb-8 tracking-tighter italic">{formatPrice(grandTotal)}</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => submitTransaction('qris', grandTotal)} className="w-full py-5 bg-primary-600 hover:bg-primary-700 text-white font-black rounded-2xl uppercase text-[10px] shadow-2xl active:scale-95 transition-all tracking-widest">Selesai / Sudah Bayar</button>
                            <button onClick={() => setShowQrisModal(false)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Batalkan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL KAS KELUAR */}
            {showCashOut && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-sm w-full border dark:border-slate-800 shadow-2xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner"><IconCashOff size={32} /></div>
                            <div>
                                <h3 className="text-xl font-black uppercase dark:text-white italic tracking-tighter">Kas Keluar</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Laci Pengeluaran</p>
                            </div>
                        </div>
                        <form onSubmit={handleCashOut} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tujuan / Alasan</label>
                                <input type="text" value={cashOutData.name} onChange={e => setCashOutData('name', e.target.value)} className="w-full mt-2 py-4 px-5 rounded-2xl border-none bg-slate-50 dark:bg-slate-800 dark:text-white text-sm font-bold shadow-inner focus:ring-2 focus:ring-orange-500 transition-all" placeholder="Contoh: Beli Air Galon / Sabun" required />
                                {cashOutErrors.name && <p className="text-red-500 text-[10px] mt-2 font-black italic">{cashOutErrors.name}</p>}
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nominal (Rp)</label>
                                <input type="number" value={cashOutData.amount} onChange={e => setCashOutData('amount', e.target.value)} className="w-full mt-2 py-4 px-5 rounded-2xl border-none bg-slate-50 dark:bg-slate-800 dark:text-white text-sm font-bold shadow-inner focus:ring-2 focus:ring-orange-500 transition-all" placeholder="0" required />
                                {cashOutErrors.amount && <p className="text-red-500 text-[10px] mt-2 font-black italic">{cashOutErrors.amount}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button type="button" onClick={() => setShowCashOut(false)} className="py-4 text-slate-400 font-black text-[10px] uppercase hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all tracking-widest">Batal</button>
                                <button type="submit" disabled={processingCashOut} className="py-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all tracking-widest">Simpan Data</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL HOLD ANTREAN */}
            {showModalHold && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border dark:border-slate-800 animate-in zoom-in duration-300">
                        <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-black uppercase dark:text-white text-sm flex items-center gap-3 italic tracking-tight"><IconClockPause className="text-indigo-500" size={24} /> Daftar Antrean Tunda</h3>
                            <button onClick={() => setShowModalHold(false)} className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl text-slate-400 shadow-sm border dark:border-slate-700 hover:text-red-500 transition-colors"><IconX size={20} /></button>
                        </div>
                        <div className="p-8 max-h-[450px] overflow-y-auto space-y-4 custom-scrollbar">
                            {(!holds || holds.length === 0) ? (
                                <div className="text-center py-16 opacity-20 italic font-black uppercase tracking-[0.3em] text-sm">Belum ada antrean</div>
                            ) : holds.map((h) => (
                                <div key={h.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-transparent dark:border-slate-800 flex justify-between items-center hover:border-indigo-500/30 hover:bg-indigo-50/20 transition-all group shadow-sm">
                                    <div className="flex-1">
                                        <p className="font-black text-slate-900 dark:text-white uppercase text-[11px] tracking-tight">{h.ref_number}</p>
                                        <p className="text-sm font-black text-indigo-500 mt-0.5">{formatPrice(h.total)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleResumeHold(h.id)} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-90 transition-all hover:bg-indigo-700" title="Ambil Antrean"><IconRestore size={20}/></button>
                                        <button onClick={() => router.delete(route('holds.destroy', h.id))} className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-500 hover:text-white active:scale-90 transition-all" title="Hapus"><IconTrash size={20}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic border-t dark:border-slate-800">Gunakan tombol biru untuk memproses kembali pesanan</div>
                    </div>
                </div>
            )}

            {/* AREA PRINT */}
            <div id="print-area" className="hidden print:block">
                {shiftToPrint ? (
                    <ShiftReceipt shift={shiftToPrint} storeName={receiptSetting?.store_name} />
                ) : (
                    <ThermalReceipt 
                        transaction={{
                            invoice: 'TAGIHAN-' + new Date().getTime(),
                            created_at: new Date(),
                            grand_total: grandTotal,
                            details: (carts || []).map(c => ({ 
                                ...c, 
                                product_title: c.product?.title,
                                unit_name: c.unit?.unit_name || 'PCS' 
                            })),
                            cashier: auth.user,
                            payment_method: 'qris' 
                        }}
                        qrisImage={paymentSetting?.qris_manual_image ? `/storage/payments/${paymentSetting.qris_manual_image}` : null}
                        isTemporary={true}
                        storeName={receiptSetting?.store_name}
                        storeAddress={receiptSetting?.store_address}
                    />
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; display: flex; justify-content: center; }
                    @page { margin: 0; }
                }
            `}</style>
        </>
    );
};

Index.layout = (page) => page;
export default Index;