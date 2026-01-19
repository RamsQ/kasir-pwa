import React, { useState, useEffect, useCallback } from "react";
import { Head, router, Link, usePage, useForm } from "@inertiajs/react";
import axios from "axios"; 
import debounce from "lodash/debounce";
import { 
    IconSearch, IconShoppingCart, IconX, IconTicket, IconGift,
    IconLayoutDashboard, IconCash, IconSun, IconMoon,
    IconPower, IconPackage, IconQrcode, IconPrinter, IconTag, IconScale,
    IconDoorEnter, IconDoorExit, IconClockPause, IconRestore, IconTrash,
    IconCashOff, IconLayoutGrid, IconList, IconCategory, IconUser, IconLoader
} from "@tabler/icons-react";
import Swal from "sweetalert2";
import ThermalReceipt from "@/Components/Receipt/ThermalReceipt";
import ShiftReceipt from "@/Components/Receipt/ShiftReceipt";

// --- HELPER FORMAT HARGA ---
const formatPrice = (value) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value || 0);

// --- KOMPONEN ITEM KERANJANG ---
const CartItem = ({ c, discounts, updateCartItem, deleteCart }) => {
    const [localQty, setLocalQty] = useState(c.qty);
    useEffect(() => { setLocalQty(c.qty); }, [c.qty]);

    const handleBlur = () => {
        const val = parseFloat(localQty);
        if (!isNaN(val) && val !== parseFloat(c.qty)) {
            updateCartItem(c.id, val, c.product_unit_id);
        } else { setLocalQty(c.qty); }
    };

    const itemDiscount = (discounts || []).find(d => d.product_id === c.product_id);
    let dPrice = parseFloat(c.price);
    if (itemDiscount) {
        dPrice = itemDiscount.type === 'percentage' 
            ? dPrice - (dPrice * (parseFloat(itemDiscount.value) / 100)) 
            : dPrice - (parseFloat(itemDiscount.value) * parseFloat(c.qty));
    }

    return (
        <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800/40 border dark:border-slate-700 rounded-xl shadow-sm mb-2 group">
            <div className="flex-1 min-w-0">
                <h4 className="text-[10px] font-black uppercase truncate dark:text-white leading-tight">{c.product?.title}</h4>
                <p className="text-[9px] font-bold text-primary-600 dark:text-primary-400">{formatPrice(dPrice)}</p>
            </div>
            <select value={c.product_unit_id || ''} onChange={(e) => updateCartItem(c.id, c.qty, e.target.value || null)} className="bg-slate-50 dark:bg-slate-800 border-none text-[8px] font-black p-1 rounded-md focus:ring-0 uppercase cursor-pointer">
                <option value="">UTAMA</option>
                {c.product?.units?.map(u => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
            </select>
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 border dark:border-slate-600">
                <button onClick={() => updateCartItem(c.id, parseFloat(c.qty) - 1, c.product_unit_id)} className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-500">-</button>
                <input type="number" step="0.01" value={localQty} onChange={(e) => setLocalQty(e.target.value)} onBlur={handleBlur} className="w-7 text-[9px] font-black text-center bg-transparent border-none p-0 dark:text-white focus:ring-0" />
                <button onClick={() => updateCartItem(c.id, parseFloat(c.qty) + 1, c.product_unit_id)} className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-500">+</button>
            </div>
            <button onClick={() => deleteCart(c.id)} className="text-slate-300 hover:text-red-500 transition-colors"><IconX size={14} /></button>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
const Index = ({ carts = [], products: initialProducts, customers = [], discounts = [], paymentSetting = {}, activeShift = null, holds = [], categories = [], filters = {} }) => {
    const { auth, receiptSetting, flash } = usePage().props;
    
    const [productList, setProductList] = useState(initialProducts.data || []);
    const [nextPageUrl, setNextPageUrl] = useState(initialProducts.next_page_url);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState(filters.search || "");
    const [selectedCategory, setSelectedCategory] = useState(filters.category_id || "all"); 
    const [viewMode, setViewMode] = useState("grid"); 
    const [cash, setCash] = useState(0);
    const [selectedCustomer, setSelectedCustomer] = useState(""); 
    const [showQrisModal, setShowQrisModal] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showModalHold, setShowModalHold] = useState(false);
    const [showCashOut, setShowCashOut] = useState(false);
    const [showCloseShift, setShowCloseShift] = useState(false);

    // Forms
    const { data: shiftData, setData: setShiftData, post: postShift } = useForm({ starting_cash: 0 });
    const { data: closeShiftData, setData: setCloseShiftData, post: postCloseShift, processing: processingCloseShift } = useForm({ total_cash_physical: 0 });
    const { data: cashOutData, setData: setCashOutData, post: postCashOut, reset: resetCashOut, processing: processingCashOut } = useForm({ name: '', amount: '' });

    // --- LOGIKA AUTO PRINT ---
    useEffect(() => {
        if (flash.print_invoice || flash.print_shift) {
            setTimeout(() => { window.print(); }, 800);
            if (flash.print_shift) {
                setTimeout(() => { router.post(route('logout')); }, 3000);
            }
        }
    }, [flash]);

    // --- TEMA ---
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') === 'dark';
        setIsDarkMode(savedTheme);
        if (savedTheme) document.documentElement.classList.add('dark');
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        newTheme ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    };

    // --- PRODUK & SEARCH ---
    useEffect(() => {
        setProductList(initialProducts.data || []);
        setNextPageUrl(initialProducts.next_page_url);
    }, [initialProducts]);

    const performSearch = (query, categoryId) => {
        router.get(route('transactions.index'), 
            { search: query, category_id: categoryId === 'all' ? '' : categoryId }, 
            { preserveState: true, preserveScroll: true, only: ['products', 'filters'] }
        );
    };

    const debouncedSearch = useCallback(debounce((query, category) => performSearch(query, category), 500), []);

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        debouncedSearch(e.target.value, selectedCategory);
    };

    const handleCategoryChange = (catId) => {
        setSelectedCategory(catId);
        performSearch(search, catId);
    };

    const loadMoreProducts = async () => {
        if (!nextPageUrl || loadingMore) return;
        setLoadingMore(true);
        try {
            const response = await axios.get(nextPageUrl, { params: { search, category_id: selectedCategory === 'all' ? '' : selectedCategory } });
            setProductList(prev => [...prev, ...response.data.data]);
            setNextPageUrl(response.data.next_page_url);
        } catch (error) { console.error(error); } finally { setLoadingMore(false); }
    };

    // --- KERANJANG ACTIONS ---
    const addToCart = (product) => {
        if (!product?.id) return;
        router.post(route("transactions.addToCart"), { product_id: product.id, qty: 1 }, { preserveScroll: true });
    };

    const updateCartItem = (id, qty, unitId = null) => {
        const val = parseFloat(qty);
        if (isNaN(val) || val < 0) return;
        if (val === 0) return deleteCart(id);
        router.patch(route("transactions.updateCart", id), { qty: val, product_unit_id: unitId }, { preserveScroll: true });
    };

    const deleteCart = (id) => router.delete(route("transactions.destroyCart", id), { preserveScroll: true });

    // --- HOLD & RESUME ---
    const handleHoldTransaction = () => {
        if (carts.length === 0) return Swal.fire("Peringatan", "Keranjang kosong!", "warning");
        Swal.fire({
            title: 'Tunda Transaksi',
            text: "Masukkan Nama Pelanggan / Nomor Meja",
            input: 'text',
            showCancelButton: true,
            confirmButtonText: 'Simpan Antrean',
        }).then((result) => {
            if (result.isConfirmed) {
                const autoRef = result.value ? result.value : `HOLD-${new Date().getTime()}`;
                router.post(route('transactions.hold'), { ref_number: autoRef, cart_items: carts, total: grandTotal });
            }
        });
    };

    const handleResumeHold = (holdId) => {
        router.post(route('transactions.resume', holdId), {}, {
            onSuccess: () => setShowModalHold(false)
        });
    };

    // --- TRANSAKSI ---
    const subtotal = (carts || []).reduce((acc, item) => acc + parseFloat(item.price || 0), 0);
    const grandTotal = Math.max(0, subtotal);
    const change = cash - grandTotal;

    const submitTransaction = (method, paidAmount) => {
        if (carts.length === 0) return;
        router.post(route("transactions.store"), {
            customer_id: selectedCustomer || null,
            grand_total: grandTotal,
            cash: paidAmount,
            change: method === 'qris' ? 0 : (paidAmount - grandTotal),
            payment_gateway: method,
        }, {
            onSuccess: () => { setCash(0); setShowQrisModal(false); setSearch(""); setSelectedCustomer(""); },
        });
    };

    const handleCashOut = (e) => {
        e.preventDefault();
        postCashOut(route('transactions.expense'), {
            onSuccess: () => { setShowCashOut(false); resetCashOut(); Swal.fire("Berhasil", "Kas keluar dicatat.", "success"); }
        });
    };

    const handleCloseShiftSubmit = (e) => {
        e.preventDefault();
        postCloseShift(route('shifts.close'), {
            onSuccess: () => { setShowCloseShift(false); }
        });
    };

    return (
        <>
            <Head title="Kasir Toko" />
            
            {/* Modal Buka Shift */}
            {!activeShift && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 text-center">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-8 shadow-2xl">
                        <IconDoorEnter size={48} className="mx-auto text-primary-500 mb-4" />
                        <h2 className="text-xl font-black dark:text-white uppercase mb-6">Buka Shift Kasir</h2>
                        <input type="number" className="w-full py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center text-xl font-black mb-6 border-none shadow-inner" value={shiftData.starting_cash} onChange={e => setShiftData('starting_cash', e.target.value)} required />
                        <button onClick={(e) => { e.preventDefault(); postShift(route('shifts.store')); }} className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black uppercase shadow-lg">Mulai Bertugas</button>
                    </div>
                </div>
            )}

            <div id="main-app-content" className={`flex flex-col h-screen w-full transition-colors ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-800'} overflow-hidden print:hidden ${!activeShift ? 'blur-xl pointer-events-none' : ''}`}>
                <header className="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Link href={route('dashboard')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary-500"><IconLayoutDashboard size={24} /></Link>
                        <h1 className="text-lg font-bold dark:text-white uppercase tracking-tight">Kasir: {auth?.user?.name}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowCashOut(true)} className="px-4 py-2 bg-orange-100 text-orange-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 border border-orange-200"><IconCashOff size={16}/> Kas Keluar</button>
                        <button onClick={() => setShowModalHold(true)} className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600">
                            <IconClockPause size={20} />
                            {holds?.length > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full animate-bounce">{holds.length}</span>}
                        </button>
                        <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">{isDarkMode ? <IconSun size={20} className="text-yellow-400" /> : <IconMoon size={20} className="text-slate-600" />}</button>
                        <button onClick={() => setShowCloseShift(true)} className="p-2.5 rounded-xl bg-red-50 text-red-500"><IconPower size={20} /></button>
                    </div>
                </header>

                <main className="flex flex-1 overflow-hidden lg:flex-row flex-col">
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="p-4 bg-white/50 dark:bg-slate-900 border-b dark:border-slate-800 flex items-center justify-between gap-4 backdrop-blur-sm">
                            <div className="relative flex-1 max-w-xl">
                                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="text" value={search} onChange={handleSearchChange} placeholder="Cari Produk..." className="w-full pl-12 pr-4 py-3 text-sm rounded-2xl border-none bg-slate-50 dark:bg-slate-800 dark:text-white shadow-inner focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border dark:border-slate-700">
                                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-400'}`}><IconLayoutGrid size={20} /></button>
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-400'}`}><IconList size={20} /></button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 p-2 flex items-center gap-2 overflow-x-auto scrollbar-hide shrink-0">
                            <button onClick={() => handleCategoryChange('all')} className={`px-5 py-2 rounded-2xl font-black uppercase text-[10px] whitespace-nowrap border dark:border-slate-700 ${selectedCategory === 'all' ? 'bg-primary-500 text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}><IconCategory size={14} className="inline mr-1"/> Semua</button>
                            {categories.map((cat) => (
                                <button key={cat.id} onClick={() => handleCategoryChange(cat.id.toString())} className={`px-5 py-2 rounded-2xl font-black uppercase text-[10px] whitespace-nowrap border dark:border-slate-700 ${selectedCategory === cat.id.toString() ? 'bg-primary-500 text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}>{cat.name}</button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4" : "flex flex-col gap-2"}>
                                {productList.map((p) => (
                                    <button key={p.id} onClick={() => addToCart(p)} className={`text-left transition-all active:scale-95 group border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-primary-500 ${viewMode === 'list' ? 'flex items-center p-3 rounded-2xl gap-4' : 'flex flex-col p-2.5 rounded-[2rem] h-full'}`}>
                                        <div className={`relative overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0 ${viewMode === 'list' ? 'w-16 h-16 rounded-xl' : 'aspect-square rounded-2xl mb-3'}`}>
                                            <img src={p.image ? (p.image.startsWith('http') ? p.image : `/storage/products/${p.image}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.title)}`} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-black uppercase leading-tight dark:text-white ${viewMode === 'list' ? 'text-sm mb-1' : 'text-[10px] line-clamp-2 h-8'}`}>{p.title}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Stok: {p.stock}</p>
                                        </div>
                                        <div className={`${viewMode === 'list' ? 'text-right' : 'mt-auto'}`}>
                                            <p className="font-black text-primary-600 dark:text-primary-400 text-sm">{formatPrice(p.sell_price)}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {nextPageUrl && (
                                <button onClick={loadMoreProducts} disabled={loadingMore} className="mt-8 mx-auto flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 rounded-full text-[10px] font-black uppercase shadow-sm border active:scale-95 border-slate-200">{loadingMore ? <IconLoader className="animate-spin" size={14} /> : 'Muat Lebih Banyak'}</button>
                            )}
                        </div>
                    </div>

                    <div className="w-full lg:w-[400px] bg-white dark:bg-slate-900 border-l dark:border-slate-800 flex flex-col h-full shrink-0 shadow-2xl">
                        <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                             <span className="flex items-center gap-2 font-black dark:text-white uppercase text-xs italic"><IconShoppingCart size={20} className="text-primary-500" /> Detail Pesanan</span>
                             <span className="bg-primary-500 text-white px-3 py-1 rounded-full text-[10px] font-black">{carts?.length || 0} ITEM</span>
                        </div>
                        <div className="p-3 border-b dark:border-slate-800">
                            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="w-full py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[10px] font-black uppercase focus:ring-2 focus:ring-primary-500">
                                <option value="">Pelanggan Umum</option>
                                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                            {carts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-10 italic font-black uppercase text-xs">Keranjang Kosong</div>
                            ) : carts.map((c) => (
                                <CartItem key={c.id} c={c} discounts={discounts} updateCartItem={updateCartItem} deleteCart={deleteCart} />
                            ))}
                        </div>
                        <div className="p-5 bg-slate-50 dark:bg-slate-950 border-t dark:border-slate-800 space-y-4 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                            <div className="flex justify-between text-xl font-black text-primary-600 italic uppercase">
                                <span>TOTAL</span><span>{formatPrice(grandTotal)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" value={cash || ''} onChange={(e) => setCash(Number(e.target.value))} placeholder="Bayar..." className="w-full px-4 py-3 text-sm font-black rounded-xl border-none shadow-inner dark:bg-slate-800 dark:text-white" />
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-1 text-center shadow-inner flex flex-col justify-center border dark:border-slate-700">
                                    <span className="text-[8px] font-black text-slate-400 uppercase">Kembali</span>
                                    <span className={`text-[11px] font-black ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatPrice(change)}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => submitTransaction('cash', cash)} disabled={carts.length === 0 || cash < grandTotal} className="py-4 bg-slate-900 text-white font-black text-[10px] rounded-2xl uppercase shadow-xl flex items-center justify-center gap-2 active:scale-95"><IconCash size={18} /> Tunai</button>
                                <button onClick={() => setShowQrisModal(true)} disabled={carts.length === 0} className="py-4 bg-primary-600 text-white font-black text-[10px] rounded-2xl uppercase shadow-xl flex items-center justify-center gap-2 active:scale-95"><IconQrcode size={18} /> QRIS</button>
                            </div>
                            <button onClick={handleHoldTransaction} disabled={carts.length === 0} className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 font-black text-[10px] rounded-xl uppercase hover:bg-slate-50 transition-colors">Tunda Transaksi</button>
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal Kas Keluar */}
            {showCashOut && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-sm w-full border dark:border-slate-800 shadow-2xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-2xl flex items-center justify-center"><IconCashOff size={32} /></div>
                            <h3 className="text-xl font-black uppercase dark:text-white italic tracking-tighter">Kas Keluar</h3>
                        </div>
                        <form onSubmit={handleCashOut} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tujuan / Alasan</label>
                                <input type="text" value={cashOutData.name} onChange={e => setCashOutData('name', e.target.value)} className="w-full mt-2 py-4 px-5 rounded-2xl border-none bg-slate-50 dark:bg-slate-800 dark:text-white text-sm font-bold shadow-inner focus:ring-2 focus:ring-orange-500 transition-all" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nominal (Rp)</label>
                                <input type="number" value={cashOutData.amount} onChange={e => setCashOutData('amount', e.target.value)} className="w-full mt-2 py-4 px-5 rounded-2xl border-none bg-slate-50 dark:bg-slate-800 dark:text-white text-sm font-bold shadow-inner focus:ring-2 focus:ring-orange-500 transition-all" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button type="button" onClick={() => setShowCashOut(false)} className="py-4 text-slate-400 font-black text-[10px] uppercase">Batal</button>
                                <button type="submit" disabled={processingCashOut} className="py-4 bg-orange-500 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">Simpan Data</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Tutup Shift */}
            {showCloseShift && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-md w-full border dark:border-slate-800 shadow-2xl animate-in zoom-in duration-300">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4"><IconDoorExit size={40} /></div>
                            <h3 className="text-2xl font-black uppercase dark:text-white italic tracking-tighter">Tutup Kasir</h3>
                        </div>
                        <form onSubmit={handleCloseShiftSubmit} className="space-y-6">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400"><span>Uang Awal</span><span>{formatPrice(activeShift?.starting_cash)}</span></div>
                                <div className="flex justify-between text-[10px] font-black uppercase text-green-500"><span>Penjualan Tunai</span><span>{formatPrice(activeShift?.total_cash_expected)}</span></div>
                                <div className="flex justify-between text-[10px] font-black uppercase text-red-500"><span>Kas Keluar</span><span>- {formatPrice(activeShift?.total_expense)}</span></div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block">Total Uang Fisik di Laci</label>
                                <input type="number" value={closeShiftData.total_cash_physical} onChange={e => setCloseShiftData('total_cash_physical', e.target.value)} className="w-full mt-2 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white text-2xl font-black text-center border-none shadow-inner focus:ring-2 focus:ring-primary-500" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button type="button" onClick={() => setShowCloseShift(false)} className="py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Batal</button>
                                <button type="submit" disabled={processingCloseShift} className="py-4 bg-primary-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">Tutup & Logout</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Antrean */}
            {showModalHold && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border dark:border-slate-800 animate-in zoom-in duration-300">
                        <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-black uppercase dark:text-white text-sm flex items-center gap-3 italic tracking-tight"><IconClockPause className="text-indigo-500" size={24} /> Daftar Antrean</h3>
                            <button onClick={() => setShowModalHold(false)} className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl text-slate-400 shadow-sm border dark:border-slate-700 hover:text-red-500 transition-colors"><IconX size={20} /></button>
                        </div>
                        <div className="p-8 max-h-[400px] overflow-y-auto space-y-4 custom-scrollbar">
                            {(!holds || holds.length === 0) ? (
                                <div className="text-center py-12 opacity-20 italic font-black uppercase tracking-[0.3em] text-[11px]">Belum ada antrean</div>
                            ) : holds.map((h) => (
                                <div key={h.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border dark:border-slate-800 flex justify-between items-center group shadow-sm transition-all hover:border-indigo-500">
                                    <div className="flex-1">
                                        <p className="font-black text-slate-900 dark:text-white uppercase text-[11px] tracking-tight">{h.ref_number}</p>
                                        <p className="text-sm font-black text-indigo-500 mt-0.5">{formatPrice(h.total)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleResumeHold(h.id)} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-90 transition-all hover:bg-indigo-700"><IconRestore size={18}/></button>
                                        <button onClick={() => router.delete(route('holds.destroy', h.id))} className="p-3 bg-red-100 text-red-600 rounded-2xl active:scale-90 transition-all hover:bg-red-500 hover:text-white"><IconTrash size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal QRIS */}
            {showQrisModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-sm w-full text-center border dark:border-slate-800 shadow-2xl">
                        <h3 className="text-xl font-black uppercase mb-6 italic dark:text-white tracking-tight">QRIS Payment</h3>
                        <div className="bg-white p-4 rounded-3xl mb-6 shadow-inner flex justify-center">
                            {paymentSetting?.qris_manual_image ? <img src={`/storage/payments/${paymentSetting.qris_manual_image}`} className="w-full h-auto max-w-[220px]" /> : <div className="py-12 opacity-20 font-black uppercase tracking-widest text-xs">No QRIS Image</div>}
                        </div>
                        <p className="text-3xl font-black text-primary-600 mb-8 italic tracking-tighter">{formatPrice(grandTotal)}</p>
                        <button onClick={() => submitTransaction('qris', grandTotal)} className="w-full py-4 bg-primary-600 text-white font-black rounded-2xl uppercase text-[10px] mb-2 tracking-widest shadow-xl">Sudah Bayar</button>
                        <button onClick={() => setShowQrisModal(false)} className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Tutup</button>
                    </div>
                </div>
            )}

            {/* AREA PRINT (DISEMBUNYIKAN DARI LAYAR) */}
            <div id="print-area" className="hidden print:block">
                {flash.print_invoice && (
                    <ThermalReceipt 
                        transaction={{
                            ...flash.print_invoice,
                            details: flash.print_invoice.details?.map(d => ({
                                ...d,
                                product_title: d.product?.title,
                                unit_name: d.product_unit?.unit_name || d.unit || 'PCS'
                            }))
                        }}
                        storeName={receiptSetting?.store_name}
                        storeAddress={receiptSetting?.store_address}
                    />
                )}
                {flash.print_shift && <ShiftReceipt shift={flash.print_shift} storeName={receiptSetting?.store_name} />}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                @media print {
                    body * { visibility: hidden !important; }
                    #print-area, #print-area * { visibility: visible !important; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; display: flex; justify-content: center; }
                    @page { margin: 0; }
                }
            `}</style>
        </>
    );
};

Index.layout = (page) => page;
export default Index;