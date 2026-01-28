import React, { useState, useEffect, useCallback } from "react";
import { Head, router, Link, usePage, useForm } from "@inertiajs/react";
import axios from "axios"; 
import debounce from "lodash/debounce";
import { 
    IconSearch, IconShoppingCart, IconX, IconTicket, IconGift,
    IconLayoutDashboard, IconCash, IconSun, IconMoon,
    IconPower, IconPackage, IconQrcode, IconPrinter, IconTag, IconScale,
    IconDoorEnter, IconDoorExit, IconClockPause, IconRestore, IconTrash,
    IconCashOff, IconLayoutGrid, IconList, IconCategory, IconUser, IconLoader,
    IconChevronUp, IconChevronDown, IconArmchair, IconArrowsExchange, IconGitMerge, IconDeviceFloppy
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
const Index = ({ carts = [], products: initialProducts, customers = [], discounts = [], paymentSetting = {}, activeShift = null, holds = [], tables = [], categories = [], filters = {} }) => {
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
    const [activeHoldId, setActiveHoldId] = useState(null); 
    const [showCartDrawer, setShowCartDrawer] = useState(false);
    
    // [STUDAK] State untuk pilihan Meja/Take Away langsung di UI Cart
    const [selectedTable, setSelectedTable] = useState("");

    const { data: shiftData, setData: setShiftData, post: postShift } = useForm({ starting_cash: 0 });
    const { data: closeShiftData, setData: setCloseShiftData, post: postCloseShift, processing: processingCloseShift } = useForm({ total_cash_physical: 0 });
    const { data: cashOutData, setData: setCashOutData, post: postCashOut, reset: resetCashOut, processing: processingCashOut } = useForm({ name: '', amount: '' });

    // Helper untuk mencari data hold aktif
    const currentActiveHold = holds.find(h => h.id === activeHoldId);

    // Sync pilihan meja jika pesanan ditarik dari antrean (Hold)
    useEffect(() => {
        if (currentActiveHold) {
            setSelectedTable(currentActiveHold.table_id || "take_away");
        } else {
            setSelectedTable("");
        }
    }, [activeHoldId, holds]);

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

    // --- LOGIKA SIMPAN PESANAN (HOLD) ---
    const handleSaveOrder = () => {
        if (carts.length === 0) return Swal.fire("Peringatan", "Keranjang kosong!", "warning");
        if (!selectedTable) return Swal.fire("Peringatan", "Pilih Meja atau Take Away terlebih dahulu!", "warning");

        router.post(route('transactions.hold'), { 
            ref_number: `ORDER-${Date.now().toString().slice(-4)}`, 
            customer_name: selectedCustomer ? customers.find(c => c.id == selectedCustomer)?.name : "Pelanggan",
            table_id: selectedTable === "take_away" ? null : selectedTable,
            cart_items: carts, 
            total: grandTotal 
        }, {
            onSuccess: () => {
                setSelectedTable("");
                setSelectedCustomer("");
                setActiveHoldId(null);
                setShowCartDrawer(false);
            }
        });
    };

    const handleResumeHold = (holdId) => {
        router.post(route('transactions.resume', holdId), {}, {
            onSuccess: () => {
                setActiveHoldId(holdId);
                setShowModalHold(false);
                if (window.innerWidth < 1024) setShowCartDrawer(true);
            }
        });
    };

    // --- OPERASIONAL MEJA ---
    const handleMoveTable = (holdId) => {
        let availableOptions = '';
        (tables || []).filter(t => t.status === 'available').forEach(t => {
            availableOptions += `<option value="${t.id}">${t.name}</option>`;
        });
        if (!availableOptions) return Swal.fire("Penuh", "Tidak ada meja kosong tersedia", "warning");
        Swal.fire({
            title: 'Pindah Meja',
            html: `<select id="new-table-id" class="swal2-input !w-full !m-0">${availableOptions}</select>`,
            confirmButtonText: 'Pindah Sekarang',
            showCancelButton: true,
            preConfirm: () => document.getElementById('new-table-id').value
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('transactions.move_table', holdId), { new_table_id: result.value });
            }
        });
    };

    const handleMergeTable = (sourceHoldId) => {
        const sourceHold = holds.find(h => h.id === sourceHoldId);
        let otherHoldsOptions = '';
        holds.filter(h => h.id !== sourceHoldId && h.table_id).forEach(h => {
            otherHoldsOptions += `<option value="${h.id}">${h.table?.name} (Order: ${h.ref_number})</option>`;
        });
        if (!otherHoldsOptions) return Swal.fire("Info", "Tidak ada meja aktif lain untuk digabung", "info");
        Swal.fire({
            title: 'Gabung Meja',
            html: `<select id="target-hold-id" class="swal2-input !w-full !m-0"><option value="">-- Pilih Meja Tujuan --</option>${otherHoldsOptions}</select>`,
            showCancelButton: true,
            confirmButtonText: 'Gabung Sekarang',
            preConfirm: () => document.getElementById('target-hold-id').value
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                router.post(route('transactions.merge_table'), { source_hold_id: sourceHoldId, target_hold_id: result.value });
            }
        });
    };

    // --- TRANSAKSI AKHIR ---
    const subtotal = (carts || []).reduce((acc, item) => acc + parseFloat(item.price || 0), 0);
    const grandTotal = Math.max(0, subtotal);
    const change = cash - grandTotal;

    const submitTransaction = (method, paidAmount) => {
        if (carts.length === 0) return;
        if (!selectedTable) return Swal.fire("Peringatan", "Pilih Tipe Pesanan (Meja/Take Away) sebelum membayar!", "warning");

        const queueNumber = currentActiveHold ? currentActiveHold.queue_number : null;
        const tableName = selectedTable === "take_away" ? "TAKE AWAY" : tables.find(t => t.id == selectedTable)?.name;

        router.post(route("transactions.store"), {
            customer_id: selectedCustomer || null,
            grand_total: grandTotal, 
            cash: paidAmount,
            change: method === 'qris' ? 0 : (paidAmount - grandTotal),
            payment_gateway: method, 
            hold_id: activeHoldId,
            queue_number: queueNumber,
            table_name: tableName 
        }, {
            onSuccess: () => { 
                setCash(0); setShowQrisModal(false); setSearch(""); 
                setSelectedCustomer(""); setActiveHoldId(null); setShowCartDrawer(false);
                setSelectedTable("");
            },
        });
    };

    return (
        <>
            <Head title="Kasir Toko" />
            
            {!activeShift && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 text-center">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-8 shadow-2xl">
                        <IconDoorEnter size={48} className="mx-auto text-primary-500 mb-4" />
                        <h2 className="text-xl font-black dark:text-white uppercase mb-6">Buka Shift Kasir</h2>
                        <input type="number" className="w-full py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center text-xl font-black mb-6 border-none shadow-inner focus:ring-0" value={shiftData.starting_cash} onChange={e => setShiftData('starting_cash', e.target.value)} required />
                        <button onClick={(e) => { e.preventDefault(); postShift(route('shifts.store')); }} className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black uppercase shadow-lg hover:bg-primary-700 transition-all">Mulai Bertugas</button>
                    </div>
                </div>
            )}

            <div id="main-app-content" className={`flex flex-col h-[100dvh] w-full transition-colors ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-800'} overflow-hidden print:hidden ${!activeShift ? 'blur-xl pointer-events-none' : ''}`}>
                <header className="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0 z-20 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Link href={route('dashboard')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary-500"><IconLayoutDashboard size={22} /></Link>
                        <h1 className="text-sm md:text-lg font-bold dark:text-white uppercase tracking-tight truncate max-w-[120px] md:max-w-none">{auth?.user?.name}</h1>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <button onClick={() => setShowCashOut(true)} className="hidden sm:flex px-4 py-2 bg-orange-100 text-orange-600 rounded-xl text-[10px] font-black uppercase items-center gap-2 border border-orange-200 hover:bg-orange-200 transition-colors"><IconCashOff size={16}/> Kas Keluar</button>
                        <button onClick={() => setShowModalHold(true)} className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 border dark:border-slate-700">
                            <IconClockPause size={20} />
                            {holds?.length > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full animate-bounce">{holds.length}</span>}
                        </button>
                        <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border dark:border-slate-700">{isDarkMode ? <IconSun size={20} className="text-yellow-400" /> : <IconMoon size={20} className="text-slate-600" />}</button>
                        <button onClick={() => setShowCloseShift(true)} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500 border border-red-100 dark:border-red-900/50"><IconPower size={20} /></button>
                    </div>
                </header>

                <main className="flex flex-1 overflow-hidden lg:flex-row flex-col relative">
                    <div className="flex-1 flex flex-col min-w-0 bg-transparent">
                        <div className="p-3 md:p-4 bg-white/50 dark:bg-slate-900/50 border-b dark:border-slate-800 flex items-center justify-between gap-3 backdrop-blur-sm">
                            <div className="relative flex-1 max-w-xl">
                                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="text" value={search} onChange={handleSearchChange} placeholder="Cari Produk..." className="w-full pl-11 pr-4 py-2.5 md:py-3 text-sm rounded-2xl border-none bg-white dark:bg-slate-800 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm">
                                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}><IconLayoutGrid size={18} /></button>
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}><IconList size={18} /></button>
                            </div>
                        </div>

                        <div className="bg-white/30 dark:bg-slate-900/30 border-b dark:border-slate-800 p-2 flex items-center gap-2 overflow-x-auto scrollbar-hide shrink-0">
                            <button onClick={() => handleCategoryChange('all')} className={`px-5 py-2 rounded-2xl font-black uppercase text-[9px] md:text-[10px] whitespace-nowrap border transition-all ${selectedCategory === 'all' ? 'bg-primary-500 text-white border-primary-600 shadow-md scale-105' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}><IconCategory size={14} className="inline mr-1"/> Semua</button>
                            {categories.map((cat) => (
                                <button key={cat.id} onClick={() => handleCategoryChange(cat.id.toString())} className={`px-5 py-2 rounded-2xl font-black uppercase text-[9px] md:text-[10px] whitespace-nowrap border transition-all ${selectedCategory === cat.id.toString() ? 'bg-primary-500 text-white border-primary-600 shadow-md scale-105' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}>{cat.name}</button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar">
                            <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4" : "flex flex-col gap-2"}>
                                {productList.map((p) => (
                                    <button key={p.id} onClick={() => addToCart(p)} className={`text-left transition-all active:scale-95 group border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-primary-500 hover:shadow-xl ${viewMode === 'list' ? 'flex items-center p-3 rounded-2xl gap-4' : 'flex flex-col p-2.5 rounded-[1.5rem] md:rounded-[2rem] h-full'}`}>
                                        <div className={`relative overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0 ${viewMode === 'list' ? 'w-14 h-14 md:w-16 md:h-16 rounded-xl' : 'aspect-square rounded-xl md:rounded-2xl mb-2 md:mb-3'}`}>
                                            <img src={p.image ? (p.image.startsWith('http') ? p.image : `/storage/products/${p.image}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.title)}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                            {p.stock <= 5 && <span className="absolute top-1 right-1 bg-red-500 text-white text-[7px] px-1.5 py-0.5 rounded-full font-black">TIPIS</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-black uppercase leading-tight dark:text-white transition-colors group-hover:text-primary-500 ${viewMode === 'list' ? 'text-xs md:text-sm mb-1' : 'text-[9px] md:text-[10px] line-clamp-2 h-7 md:h-8'}`}>{p.title}</h3>
                                            <div className="flex justify-between items-center mt-1">
                                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Sisa: {p.stock}</p>
                                                {viewMode === 'grid' && <p className="font-black text-primary-600 dark:text-primary-400 text-[10px] md:text-xs">{formatPrice(p.sell_price)}</p>}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {nextPageUrl && (
                                <button onClick={loadMoreProducts} disabled={loadingMore} className="my-8 mx-auto flex items-center gap-2 px-8 py-3 bg-white dark:bg-slate-800 dark:text-white rounded-full text-[10px] font-black uppercase shadow-md border dark:border-slate-700 active:scale-95 transition-all">{loadingMore ? <IconLoader className="animate-spin" size={14} /> : 'Muat Lebih Banyak'}</button>
                            )}
                        </div>
                    </div>

                    <aside className={`
                        fixed inset-x-0 bottom-0 z-40 lg:relative lg:inset-auto lg:z-auto
                        w-full lg:w-[380px] xl:w-[420px] bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l dark:border-slate-800 
                        flex flex-col shadow-[0_-20px_40px_rgba(0,0,0,0.1)] transition-all duration-500 ease-in-out
                        ${showCartDrawer ? 'h-[90vh]' : 'h-16 lg:h-full'}
                    `}>
                        <div onClick={() => window.innerWidth < 1024 && setShowCartDrawer(!showCartDrawer)} className="h-16 p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/50 cursor-pointer lg:cursor-default">
                             <div className="flex items-center gap-3">
                                <IconShoppingCart size={24} className="text-primary-500" />
                                <div>
                                    <span className="font-black dark:text-white uppercase text-xs italic tracking-tighter block leading-none">Ringkasan Pesanan</span>
                                    {currentActiveHold && (
                                        <p className="text-[10px] font-black text-orange-500 leading-none">#{currentActiveHold.queue_number}</p>
                                    )}
                                </div>
                             </div>
                             {!showCartDrawer && <div className="lg:hidden text-right font-black text-primary-600">{formatPrice(grandTotal)}</div>}
                             <div className="flex items-center gap-2">
                                {window.innerWidth < 1024 && (showCartDrawer ? <IconChevronDown /> : <IconChevronUp className="animate-bounce" />)}
                             </div>
                        </div>

                        <div className={`flex flex-col flex-1 overflow-hidden transition-opacity duration-300 ${!showCartDrawer && window.innerWidth < 1024 ? 'opacity-0 invisible' : 'opacity-100 visible'}`}>
                            {/* SELEKSI PELANGGAN & MEJA TERINTEGRASI */}
                            <div className="p-4 border-b dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
                                <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="w-full pl-4 pr-4 py-2 bg-white dark:bg-slate-800 border-none rounded-xl text-[10px] font-black uppercase focus:ring-2 focus:ring-primary-500 transition-all shadow-sm">
                                    <option value="">Pelanggan Umum</option>
                                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                
                                <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)} className={`w-full pl-4 pr-4 py-2 border-none rounded-xl text-[10px] font-black uppercase focus:ring-2 focus:ring-primary-500 transition-all shadow-sm ${selectedTable ? 'bg-primary-50 text-primary-600' : 'bg-white dark:bg-slate-800'}`}>
                                    <option value="">-- Pilih Tipe Pesanan --</option>
                                    <option value="take_away">Bawa Pulang (Take Away)</option>
                                    {(tables || []).filter(t => t.status === 'available' || t.id == currentActiveHold?.table_id).map((t) => (
                                        <option key={t.id} value={t.id}>Meja: {t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
                                {carts.length === 0 ? <div className="h-full flex flex-col items-center justify-center opacity-10 font-black italic uppercase text-xs tracking-widest">Belum ada pesanan</div> : carts.map((c) => <CartItem key={c.id} c={c} discounts={discounts} updateCartItem={updateCartItem} deleteCart={deleteCart} />)}
                            </div>

                            <div className="p-4 md:p-6 bg-white dark:bg-slate-950 border-t dark:border-slate-800 space-y-4 shadow-xl">
                                <div className="flex justify-between items-end"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</span><span className="text-2xl md:text-3xl font-black text-primary-600 italic tracking-tighter">{formatPrice(grandTotal)}</span></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative"><span className="absolute top-2 left-3 text-[7px] font-black text-slate-400 uppercase">Input Bayar</span><input type="number" value={cash || ''} onChange={(e) => setCash(Number(e.target.value))} placeholder="0" className="w-full pt-5 pb-2 px-3 text-base font-black rounded-2xl border-none shadow-inner bg-slate-100 dark:bg-slate-800 dark:text-white focus:ring-0" /></div>
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-2 text-center shadow-inner flex flex-col justify-center border border-slate-100 dark:border-slate-700"><span className="text-[7px] font-black text-slate-400 uppercase mb-1">Kembalian</span><span className={`text-xs font-black truncate ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatPrice(change)}</span></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => submitTransaction('cash', cash)} disabled={carts.length === 0 || cash < grandTotal} className="py-4 bg-slate-900 dark:bg-slate-800 text-white font-black text-[10px] rounded-[1.25rem] uppercase active:scale-95 disabled:opacity-50 transition-all hover:bg-black flex items-center justify-center gap-2"><IconCash size={18} /> Tunai</button>
                                    <button onClick={() => setShowQrisModal(true)} disabled={carts.length === 0} className="py-4 bg-primary-600 text-white font-black text-[10px] rounded-[1.25rem] uppercase active:scale-95 disabled:opacity-50 transition-all hover:bg-primary-700 flex items-center justify-center gap-2"><IconQrcode size={18} /> QRIS</button>
                                </div>

                                {/* TOMBOL SIMPAN ORDER (MENGGANTIKAN CETAK BILL) */}
                                <button onClick={handleSaveOrder} disabled={carts.length === 0 || !selectedTable} className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-primary-500 text-primary-600 font-black text-[10px] rounded-2xl uppercase transition-all flex items-center justify-center gap-2 hover:bg-primary-500 hover:text-white active:scale-95 disabled:opacity-30 shadow-sm">
                                    <IconDeviceFloppy size={18} /> Simpan Pesanan (Dine-in / Hold)
                                </button>
                            </div>
                        </div>
                    </aside>
                </main>
            </div>

            {showModalHold && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border dark:border-slate-800">
                        <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-black uppercase dark:text-white text-sm flex items-center gap-3 italic"><IconClockPause className="text-indigo-500" size={24} /> Antrean & Meja Aktif</h3>
                            <button onClick={() => setShowModalHold(false)} className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl text-slate-400 shadow-sm hover:text-red-500 transition-colors"><IconX size={20} /></button>
                        </div>
                        <div className="p-8 max-h-[500px] overflow-y-auto space-y-4 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(!holds || holds.length === 0) ? <div className="col-span-2 text-center py-12 opacity-20 italic font-black uppercase text-[11px]">Belum ada antrean aktif</div> : holds.map((h) => (
                                    <div key={h.id} className={`p-5 rounded-3xl border dark:border-slate-800 flex flex-col justify-between shadow-sm transition-all hover:border-indigo-500 ${h.table_id ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {h.table_id && <IconArmchair size={16} className="text-orange-500" />}
                                                    <p className="font-black text-slate-900 dark:text-white uppercase text-[11px] tracking-tight truncate">{h.ref_number}</p>
                                                </div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{h.table?.name || 'Bawa Pulang'}</p>
                                                <p className="text-[8px] font-black text-indigo-500 mt-1">NO: #{h.queue_number}</p>
                                            </div>
                                            <p className="text-sm font-black text-indigo-500 shrink-0">{formatPrice(h.total)}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleResumeHold(h.id)} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl active:scale-95 transition-all font-black text-[9px] uppercase shadow-md">Buka</button>
                                            {h.table_id && (
                                                <>
                                                    <button onClick={() => handleMoveTable(h.id)} className="p-2 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-500 rounded-xl hover:bg-slate-100" title="Pindah Meja"><IconArrowsExchange size={18}/></button>
                                                    <button onClick={() => handleMergeTable(h.id)} className="p-2 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-500 rounded-xl hover:bg-slate-100" title="Gabung Meja"><IconGitMerge size={18}/></button>
                                                </>
                                            )}
                                            <button onClick={() => router.delete(route('holds.destroy', h.id))} className="p-2 bg-red-50 text-red-600 rounded-xl active:scale-95 transition-all hover:bg-red-500 hover:text-white"><IconTrash size={18}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showQrisModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-sm w-full text-center border dark:border-slate-800 shadow-2xl transition-all">
                        <h3 className="text-xl font-black uppercase mb-6 italic dark:text-white tracking-tight">QRIS Payment</h3>
                        <div className="bg-white p-4 rounded-3xl mb-6 shadow-inner flex justify-center ring-1 ring-slate-100">{paymentSetting?.qris_manual_image ? <img src={`/storage/payments/${paymentSetting.qris_manual_image}`} className="w-full h-auto max-w-[220px]" /> : <div className="py-12 opacity-20 font-black uppercase tracking-widest text-xs">No QRIS Image</div>}</div>
                        <p className="text-3xl font-black text-primary-600 mb-8 italic tracking-tighter">{formatPrice(grandTotal)}</p>
                        <button onClick={() => submitTransaction('qris', grandTotal)} className="w-full py-4 bg-primary-600 text-white font-black rounded-2xl uppercase text-[10px] mb-2 tracking-widest shadow-xl hover:bg-primary-700">Sudah Bayar</button>
                        <button onClick={() => setShowQrisModal(false)} className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2 hover:text-slate-600">Tutup</button>
                    </div>
                </div>
            )}

            <div id="print-area" className="hidden print:block">
                {flash.print_invoice && (
                    <ThermalReceipt 
                        transaction={{ 
                            ...flash.print_invoice, 
                            queue_number: flash.print_invoice.queue_number || null,
                            details: flash.print_invoice.details?.map(d => ({ ...d, product_title: d.product?.title, unit_name: d.product_unit?.unit_name || d.unit || 'PCS' })) 
                        }} 
                        storeName={receiptSetting?.store_name} 
                        storeAddress={receiptSetting?.store_address} 
                    />
                )}
                {flash.print_shift && <ShiftReceipt shift={flash.print_shift} storeName={receiptSetting?.store_name} />}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
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