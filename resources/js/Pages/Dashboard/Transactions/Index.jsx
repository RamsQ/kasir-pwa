import React, { useState, useEffect, useMemo } from "react";
import { Head, router, Link, usePage, useForm } from "@inertiajs/react";
import { 
    IconSearch, IconShoppingCart, IconX, IconTicket, IconGift,
    IconLayoutDashboard, IconCash, IconSun, IconMoon,
    IconPower, IconPackage, IconQrcode, IconPrinter, IconTag, IconScale,
    IconDoorEnter, IconDoorExit
} from "@tabler/icons-react";
import Swal from "sweetalert2";
import ThermalReceipt from "@/Components/Receipt/ThermalReceipt";
import ShiftReceipt from "@/Components/Receipt/ShiftReceipt";

const formatPrice = (value) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value || 0);

const Index = ({ carts = [], carts_total = 0, products = [], customers = [], discounts = [], paymentSetting = {}, activeShift = null }) => {
    const { auth, receiptSetting, flash } = usePage().props;
    
    // --- STATE UTAMA ---
    const [search, setSearch] = useState("");
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [cash, setCash] = useState(0);
    const [selectedDiscountId, setSelectedDiscountId] = useState("");
    const [discountAmount, setDiscountAmount] = useState(0);
    const [showQrisModal, setShowQrisModal] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [shiftToPrint, setShiftToPrint] = useState(null);
    
    // --- STATE MODAL REVIEW ---
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [dataLaporan, setDataLaporan] = useState(null);

    // --- LOGIKA FORM SHIFT ---
    const { data: shiftData, setData: setShiftData, post: postShift, processing: processingShift } = useForm({
        starting_cash: 0,
    });

    // --- LOGIKA TEMA ---
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') === 'dark';
        setIsDarkMode(savedTheme);
        if (savedTheme) document.documentElement.classList.add('dark');
    }, []);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    // --- LOGIKA CETAK SHIFT OTOMATIS (MENDENGARKAN FLASH) ---
    useEffect(() => {
        if (flash?.printShift) {
            setDataLaporan(flash.printShift);
            setShowReviewModal(true);
        }
    }, [flash]);

    // --- LOGIKA FILTER PRODUK ---
    useEffect(() => {
        const safeProducts = Array.isArray(products) ? products : [];
        const filtered = safeProducts.filter(p => 
            p?.title?.toLowerCase().includes(search.toLowerCase()) || 
            p?.barcode?.toLowerCase().includes(search.toLowerCase())
        );
        setFilteredProducts(filtered);
    }, [search, products]);

    // --- LOGIKA PERHITUNGAN TOTAL ---
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
            inputPlaceholder: 'Masukkan jumlah uang tunai...',
            showCancelButton: true,
            confirmButtonText: 'Review Laporan',
            confirmButtonColor: '#3b82f6',
            inputAttributes: { min: 0 },
        }).then((result) => {
            if (result.isConfirmed) {
                router.put(route('shifts.update', activeShift.id), {
                    total_cash_actual: result.value
                }, {
                    preserveScroll: true,
                    onSuccess: () => {
                        // Logic diarahkan ke useEffect flash
                    }
                });
            }
        });
    };

    const handlePrintReview = () => {
        // 1. Masukkan data ke state cetak
        setShiftToPrint(dataLaporan);
        
        // 2. Berikan delay agar browser merender komponen struk di area hidden
        setTimeout(() => {
            window.print();
            
            // 3. Reset states dan navigasi keluar
            setShiftToPrint(null);
            setShowReviewModal(false);
            router.get(route('dashboard'));
        }, 1500); 
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
                setCash(0); setSelectedDiscountId(""); setShowQrisModal(false); setSearch("");
                Swal.fire("Berhasil!", "Transaksi Selesai", "success");
            },
        });
    };

    const handlePayCash = (e) => {
        e.preventDefault();
        if (carts.length === 0) return Swal.fire("Error", "Keranjang kosong!", "error");
        if (cash < grandTotal) return Swal.fire("Error", "Uang tunai kurang!", "error");
        submitTransaction('cash', cash);
    };

    return (
        <>
            <Head title="Kasir Toko" />
            
            {/* --- MODAL BUKA SHIFT --- */}
            {!activeShift && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border dark:border-slate-800 overflow-hidden p-8">
                        <form onSubmit={handleOpenShift}>
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center mb-4">
                                    <IconDoorEnter size={40} />
                                </div>
                                <h2 className="text-2xl font-black dark:text-white uppercase tracking-tight">Buka Shift Kasir</h2>
                                <p className="text-sm text-slate-500 mt-2 font-medium italic">Input modal awal di laci kasir.</p>
                            </div>
                            <div className="mb-8 text-center">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Modal Awal (Rp)</label>
                                <input 
                                    type="number"
                                    className="w-full py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-4 focus:ring-primary-500/20 text-2xl font-black text-center dark:text-white border-none shadow-inner"
                                    value={shiftData.starting_cash}
                                    onChange={e => setShiftData('starting_cash', e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl shadow-xl font-black uppercase" disabled={processingShift}>
                                {processingShift ? 'Memproses...' : 'Mulai Bertugas'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div id="main-app-content" className={`flex flex-col h-screen w-full transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-800'} overflow-hidden print:hidden ${!activeShift ? 'blur-xl pointer-events-none' : ''}`}>
                
                <header className="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center justify-between px-6 shrink-0 shadow-sm transition-colors">
                    <div className="flex items-center gap-4">
                        <Link href={route('dashboard')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary-500 transition-all">
                            <IconLayoutDashboard size={24} />
                        </Link>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Kasir Toko</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                            {isDarkMode ? <IconSun size={20} className="text-yellow-400" /> : <IconMoon size={20} className="text-slate-600" />}
                        </button>
                        <button onClick={handleCloseShift} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                            <IconDoorExit size={16}/> Tutup Shift
                        </button>
                        <img 
                            src={auth?.user?.image ? `/storage/users/${auth.user.image}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(auth?.user?.name || 'U')}&background=random`} 
                            className="w-9 h-9 rounded-full ring-2 ring-white dark:ring-slate-800 shadow-sm"
                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(auth?.user?.name || 'U')}&background=random`; }}
                        />
                        <button onClick={() => router.post(route('logout'))} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500"><IconPower size={20} /></button>
                    </div>
                </header>

                <main className="flex flex-1 overflow-hidden lg:flex-row flex-col">
                    <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto scrollbar-hide">
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border dark:border-slate-800 shadow-sm sticky top-0 z-10 transition-colors">
                            <div className="relative">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari Nama / Barcode..." className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-primary-500 shadow-inner" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 pb-4">
                            {filteredProducts.map((p) => {
                                const productDiscount = (discounts || []).find(d => d.product_id === p.id);
                                return (
                                    <button key={p.id} onClick={() => addToCart(p)} className="text-left group active:scale-95 transition-transform relative">
                                        <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-sm hover:border-primary-500 transition-all">
                                            <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg mb-2 overflow-hidden relative">
                                                <img 
                                                    src={p.image ? (p.image.startsWith('http') ? p.image : `/storage/products/${p.image}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.title)}&background=random`} 
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                                                    onError={(e) => { 
                                                        e.target.onerror = null;
                                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.title)}&background=random`; 
                                                    }} 
                                                />
                                                {productDiscount && <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-bl-xl z-10 animate-pulse flex items-center gap-1 shadow-lg"><IconTag size={10}/> PROMO</div>}
                                                {p.type === 'bundle' && <div className="absolute bottom-2 left-2 bg-purple-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-lg"><IconPackage size={10}/> PAKET</div>}
                                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">{p.type === 'single' ? `Stok: ${p.stock}` : 'Ready'}</div>
                                            </div>
                                            <h3 className="font-bold text-[11px] mb-1 leading-tight uppercase dark:text-white line-clamp-2 h-8">{p.title}</h3>
                                            <p className="font-bold text-primary-600 dark:text-primary-400 text-xs mt-auto">{formatPrice(p.sell_price)}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="w-full lg:w-[450px] bg-white dark:bg-slate-900 border-t lg:border-l dark:border-slate-800 flex flex-col h-full shrink-0 transition-colors">
                        <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center font-bold text-sm uppercase shrink-0">
                             <span className="flex items-center gap-2 dark:text-white"><IconShoppingCart size={18} className="text-primary-500" /> Keranjang</span>
                             <span className="bg-primary-50 dark:bg-primary-900/30 text-primary-600 px-2.5 py-0.5 rounded-full text-[10px] border dark:border-primary-800 font-black tracking-tighter">{carts?.length || 0} ITEM</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {carts.map((c) => {
                                const itemDiscount = (discounts || []).find(d => d.product_id === c.product_id);
                                let rowPrice = parseFloat(c.price);
                                if (itemDiscount) {
                                    rowPrice = itemDiscount.type === 'percentage' 
                                        ? rowPrice - (rowPrice * (parseFloat(itemDiscount.value) / 100))
                                        : rowPrice - (parseFloat(itemDiscount.value) * parseFloat(c.qty));
                                }
                                return (
                                    <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700 flex flex-col shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-[11px] font-bold uppercase truncate dark:text-white mr-2">
                                                    {c.product?.title}
                                                    {itemDiscount && <span className="ml-2 text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">PROMO</span>}
                                                </h4>
                                                <p className="font-bold text-xs text-primary-600 dark:text-primary-400">{formatPrice(rowPrice)}</p>
                                            </div>
                                            <button onClick={() => deleteCart(c.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><IconX size={18} /></button>
                                        </div>

                                        {c.product?.type === 'bundle' && c.product?.bundle_items?.length > 0 && (
                                            <div className="mb-2 mt-1 pl-2 border-l-2 border-purple-400 text-[9px] text-slate-500 italic bg-purple-50/50 dark:bg-purple-900/10 p-1.5 rounded">
                                                <p className="font-bold text-[8px] text-purple-600 dark:text-purple-400 uppercase mb-1">Isi Paket:</p>
                                                {c.product.bundle_items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between">
                                                        <span>• {item.title}</span>
                                                        <span className="font-bold">x{parseFloat(item.pivot?.qty || 0) * parseFloat(c.qty)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-dashed dark:border-slate-700">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1 text-slate-400 uppercase text-[9px] font-bold"><IconScale size={14}/> Satuan:</div>
                                                <select value={c.product_unit_id || ''} onChange={(e) => updateCartItem(c.id, c.qty, e.target.value || null)} className="bg-transparent border-none text-[10px] font-black text-primary-600 focus:ring-0 p-0 cursor-pointer uppercase">
                                                    <option value="">Satuan Dasar</option>
                                                    {c.product?.units?.map(unit => (<option key={unit.id} value={unit.id}>{unit.unit_name} (@{formatPrice(unit.sell_price)})</option>))}
                                                </select>
                                            </div>
                                            <div className="flex items-center justify-between border-t dark:border-slate-800 pt-2">
                                                <div className="flex gap-1">
                                                    <button onClick={() => updateCartItem(c.id, 0.25, c.product_unit_id)} className="text-[8px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded font-black hover:bg-primary-500 hover:text-white transition-colors">0.25</button>
                                                    <button onClick={() => updateCartItem(c.id, 0.5, c.product_unit_id)} className="text-[8px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded font-black hover:bg-primary-500 hover:text-white transition-colors">0.5</button>
                                                </div>
                                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1">
                                                    <button onClick={() => updateCartItem(c.id, parseFloat(c.qty) - 1, c.product_unit_id)} className="font-black text-slate-400 hover:text-primary-500">-</button>
                                                    <input type="number" step="0.01" value={c.qty} readOnly className="w-8 text-xs font-black text-center bg-transparent border-none p-0 dark:text-white" />
                                                    <button onClick={() => updateCartItem(c.id, parseFloat(c.qty) + 1, c.product_unit_id)} className="font-black text-slate-400 hover:text-primary-500">+</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t dark:border-slate-800 space-y-3 shrink-0">
                            <div className="flex justify-between text-lg font-black text-primary-600 dark:text-primary-400 uppercase tracking-tighter pt-2 border-t border-dashed border-slate-300 dark:border-slate-700">
                                <span>TOTAL</span><span>{formatPrice(grandTotal)}</span>
                            </div>

                            <div className="grid grid-cols-4 gap-1.5">
                                {[grandTotal, 10000, 50000, 100000].map((v, i) => (
                                    <button key={i} onClick={() => setCash(v)} className="py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase dark:text-white shadow-sm hover:bg-primary-50 transition-colors">
                                        {i === 0 ? 'Pas' : v/1000 + 'K'}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">Rp</span>
                                    <input type="number" value={cash || ''} onChange={(e) => setCash(Number(e.target.value))} placeholder="Tunai..." className="w-full pl-8 pr-3 py-3 text-sm font-black rounded-2xl dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white focus:ring-primary-500 shadow-sm" />
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-1.5 flex flex-col items-center justify-center shadow-inner text-center">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase mb-1 leading-none">Kembali</span>
                                    <span className={`text-xs font-black leading-none ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatPrice(change)}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button onClick={() => window.print()} disabled={carts.length === 0} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] rounded-2xl flex items-center justify-center gap-2 uppercase shadow-lg active:scale-95 transition-all">
                                    <IconPrinter size={18} /> Tagihan Sementara
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={handlePayCash} disabled={carts.length === 0 || cash < grandTotal} className="py-4 bg-slate-800 text-white font-black text-[10px] rounded-2xl flex flex-col items-center justify-center uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50"><IconCash size={20} /> Tunai</button>
                                    <button onClick={() => setShowQrisModal(true)} disabled={carts.length === 0} className="py-4 bg-primary-600 text-white font-black text-[10px] rounded-2xl flex flex-col items-center justify-center gap-1 uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50"><IconQrcode size={20} /> QRIS</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* --- MODAL REVIEW PENUTUPAN SHIFT --- */}
            {showReviewModal && dataLaporan && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border dark:border-slate-800">
                        <div className="p-6 border-b dark:border-slate-800 text-center font-black uppercase dark:text-white tracking-widest text-sm">Review Tutup Kasir</div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium uppercase text-[10px]">Modal Awal</span>
                                <span className="font-bold dark:text-white">{formatPrice(dataLaporan.starting_cash)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-green-600">
                                <span className="font-medium uppercase text-[10px]">Penjualan Tunai</span>
                                <span className="font-bold">{formatPrice(dataLaporan.total_cash_expected - dataLaporan.starting_cash)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-purple-600">
                                <span className="font-medium uppercase text-[10px]">Total QRIS</span>
                                <span className="font-bold">{formatPrice(dataLaporan.total_qris_sales)}</span>
                            </div>
                            <div className="pt-4 border-t dark:border-slate-800 flex justify-between items-center text-primary-600">
                                <span className="font-bold uppercase text-[10px]">Setoran Fisik</span>
                                <span className="text-xl font-black">{formatPrice(dataLaporan.total_cash_actual)}</span>
                            </div>
                            <div className={`p-3 rounded-2xl flex justify-between items-center ${dataLaporan.difference < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                <span className="text-[10px] font-bold uppercase">Selisih</span>
                                <span className="font-black">{formatPrice(dataLaporan.difference)}</span>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                            <button onClick={() => setShowReviewModal(false)} className="flex-1 py-3 text-slate-500 font-bold uppercase text-[10px]">Batal</button>
                            <button onClick={handlePrintReview} className="flex-[2] py-3 bg-primary-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                                <IconPrinter size={18}/> Cetak & Selesai
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- AREA PRINT --- */}
            <div id="print-area" className="hidden print:block">
                {shiftToPrint ? (
                    <ShiftReceipt shift={shiftToPrint} storeName={receiptSetting?.store_name} />
                ) : (
                    <ThermalReceipt 
                        transaction={{
                            invoice: 'TAGIHAN-' + new Date().getTime(),
                            created_at: new Date(),
                            grand_total: grandTotal,
                            details: carts.map(c => ({ ...c, unit_name: c.unit?.unit_name || 'PCS' })),
                            cashier: auth.user,
                            payment_method: 'tagihan' 
                        }}
                        qrisImage={paymentSetting?.qris_manual_image ? `/storage/payments/${paymentSetting.qris_manual_image}` : null}
                        isTemporary={true}
                        storeName={receiptSetting?.store_name}
                        storeAddress={receiptSetting?.store_address}
                        footerMessage="Terima kasih"
                    />
                )}
            </div>

            {/* MODAL QRIS */}
            {showQrisModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full text-center border dark:border-slate-800 shadow-2xl">
                        <h3 className="text-lg font-black uppercase dark:text-white mb-4">Bayar QRIS</h3>
                        <div className="bg-white p-4 rounded-2xl mb-4 border-2 border-slate-100 flex justify-center overflow-hidden">
                            {paymentSetting?.qris_manual_image ? <img src={`/storage/payments/${paymentSetting.qris_manual_image}`} className="w-full h-auto max-w-[220px]" /> : <div className="py-14 text-slate-400 italic">QRIS Belum Diunggah</div>}
                        </div>
                        <p className="text-2xl font-black text-primary-700 dark:text-white mb-6">{formatPrice(grandTotal)}</p>
                        <button onClick={() => submitTransaction('qris', grandTotal)} className="w-full py-4 bg-primary-600 text-white font-black rounded-xl uppercase text-xs active:scale-95 transition-all shadow-lg shadow-primary-500/30">Sudah Dibayar</button>
                        <button onClick={() => setShowQrisModal(false)} className="w-full py-3 text-slate-400 font-bold text-[10px] uppercase">Batal</button>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; display: flex; justify-content: center; }
                    @page { size: auto; margin: 0mm; }
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
            `}</style>
        </>
    );
};

Index.layout = (page) => page;
export default Index;