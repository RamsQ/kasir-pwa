import React, { useState, useEffect, useMemo } from "react";
import { Head, router, Link, usePage } from "@inertiajs/react";
import { 
    IconSearch, IconShoppingCart, IconX, IconTicket, IconGift,
    IconLayoutDashboard, IconCash, IconSun, IconMoon,
    IconPower, IconPackage, IconQrcode, IconPrinter, IconTag
} from "@tabler/icons-react";
import Swal from "sweetalert2";
import ThermalReceipt from "@/Components/Receipt/ThermalReceipt";

const formatPrice = (value) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value || 0);

const Index = ({ carts = [], carts_total = 0, products = [], customers = [], discounts = [], paymentSetting = {} }) => {
    const { auth, receiptSetting } = usePage().props;
    
    // --- STATE UTAMA ---
    const [search, setSearch] = useState("");
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [cash, setCash] = useState(0);
    const [selectedDiscountId, setSelectedDiscountId] = useState("");
    const [discountAmount, setDiscountAmount] = useState(0);
    const [showQrisModal, setShowQrisModal] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

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

    // --- LOGIKA FILTER PRODUK ---
    useEffect(() => {
        const safeProducts = Array.isArray(products) ? products : [];
        const filtered = safeProducts.filter(p => 
            p?.title?.toLowerCase().includes(search.toLowerCase()) || 
            p?.barcode?.toLowerCase().includes(search.toLowerCase())
        );
        setFilteredProducts(filtered);
    }, [search, products]);

    // --- [BARU] LOGIKA DISKON PER PRODUK ---
    const subtotalWithProductDiscounts = useMemo(() => {
        return carts.reduce((acc, item) => {
            let itemPrice = parseFloat(item.product?.sell_price || 0);
            const productDiscount = discounts.find(d => d.product_id === item.product_id);
            
            if (productDiscount) {
                if (productDiscount.type === 'percentage') {
                    itemPrice -= (itemPrice * (parseFloat(productDiscount.value) / 100));
                } else {
                    itemPrice -= parseFloat(productDiscount.value);
                }
            }
            
            return acc + (Math.max(0, itemPrice) * item.qty);
        }, 0);
    }, [carts, discounts]);

    // --- LOGIKA DISKON GLOBAL (INVOICE) ---
    useEffect(() => {
        const safeDiscounts = Array.isArray(discounts) ? discounts : [];
        if (selectedDiscountId) {
            const promo = safeDiscounts.find(d => d.id === parseInt(selectedDiscountId) && !d.product_id);
            if (promo) {
                const minTrans = parseFloat(promo.min_transaction || 0);
                if (subtotalWithProductDiscounts < minTrans) {
                    Swal.fire({ icon: 'warning', title: 'Syarat Belum Terpenuhi', text: `Min. belanja ${formatPrice(minTrans)}` });
                    setSelectedDiscountId(""); setDiscountAmount(0);
                } else {
                    let amount = promo.type === 'percentage' ? subtotalWithProductDiscounts * (parseFloat(promo.value) / 100) : parseFloat(promo.value);
                    setDiscountAmount(Math.min(amount, subtotalWithProductDiscounts));
                }
            }
        } else { setDiscountAmount(0); }
    }, [selectedDiscountId, subtotalWithProductDiscounts, discounts]);

    const grandTotal = Math.max(0, subtotalWithProductDiscounts - discountAmount);
    const change = cash - grandTotal;

    // --- ACTIONS ---
    const addToCart = (product) => {
        if (!product?.id) return;
        router.post(route("transactions.addToCart"), { product_id: product.id, qty: 1, sell_price: product.sell_price }, { preserveScroll: true });
    };

    const updateQty = (id, qty) => {
        if (qty < 1) return;
        router.patch(route("transactions.updateCart", id), { qty }, { preserveScroll: true });
    };

    const deleteCart = (id) => router.delete(route("transactions.destroyCart", id), { preserveScroll: true });

    const submitTransaction = (method, paidAmount) => {
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
        if ((carts?.length || 0) === 0) return Swal.fire("Error", "Keranjang kosong!", "error");
        if (cash < grandTotal) return Swal.fire("Error", "Uang tunai kurang!", "error");
        submitTransaction('cash', cash);
    };

    return (
        <>
            <Head title="Kasir Point of Sales" />
            
            <div id="main-app-content" className={`flex flex-col min-h-screen w-full transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-800'} print:hidden`}>
                
                {/* --- HEADER --- */}
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30 transition-colors">
                    <div className="flex items-center gap-4">
                        <Link href={route('dashboard')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary-500 transition-all">
                            <IconLayoutDashboard size={24} />
                        </Link>
                        <div className="hidden sm:block leading-tight">
                            <h1 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Kasir Toko</h1>
                            <p className="text-[10px] text-slate-500 font-medium tracking-widest">POINT OF SALES</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden lg:block px-4 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-xs font-bold font-mono border border-primary-100 dark:border-primary-800">
                            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-yellow-400 hover:scale-105 transition-transform">
                            {isDarkMode ? <IconSun size={20} /> : <IconMoon size={20} />}
                        </button>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <div className="flex items-center gap-3">
                            <div className="hidden md:block text-right leading-tight">
                                <p className="text-sm font-bold truncate max-w-[100px]">{auth?.user?.name || 'Kasir'}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{auth?.user?.roles?.[0]?.name || 'Staff'}</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden ring-2 ring-white dark:ring-slate-800 shadow-sm">
                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(auth?.user?.name || 'U')}&background=random`} alt="Avatar" className="w-full h-full object-cover"/>
                            </div>
                        </div>
                        <button onClick={() => router.post(route('logout'))} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors">
                            <IconPower size={20} />
                        </button>
                    </div>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
                    {/* --- KIRI: PRODUK --- */}
                    <div className="lg:col-span-7 xl:col-span-8 flex flex-col p-4 gap-4 overflow-y-auto max-h-[calc(100vh-64px)] scrollbar-hide">
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-10 transition-colors">
                            <div className="relative">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari Produk..." className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-primary-500 transition-all shadow-inner" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 pb-4">
                            {filteredProducts.length > 0 ? filteredProducts.map((p) => {
                                const productDiscount = discounts.find(d => d.product_id === p.id);
                                return (
                                    <button key={p.id} onClick={() => addToCart(p)} className="text-left group active:scale-95 transition-transform relative">
                                        <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary-500 hover:shadow-lg transition-all h-full flex flex-col shadow-sm">
                                            <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg mb-2 overflow-hidden relative">
                                                <img src={p.image ? `/storage/products/${p.image}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.title)}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                
                                                {productDiscount && (
                                                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-bl-xl shadow-lg flex items-center gap-1 animate-pulse">
                                                        <IconTag size={10}/> {productDiscount.type === 'percentage' ? `${productDiscount.value}%` : 'PROMO'}
                                                    </div>
                                                )}

                                                {p.type === 'bundle' && (
                                                    <div className="absolute bottom-2 left-2 bg-purple-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-lg shadow-lg flex items-center gap-1">
                                                        <IconPackage size={10}/> PAKET
                                                    </div>
                                                )}
                                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                                                    {p.type === 'single' ? `Stok: ${p.stock}` : 'Ready'}
                                                </div>
                                            </div>
                                            <h3 className="font-semibold text-slate-800 dark:text-white line-clamp-2 text-[11px] mb-1 leading-tight uppercase">{p.title}</h3>
                                            <div className="mt-auto">
                                                {productDiscount ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-slate-400 line-through">{formatPrice(p.sell_price)}</span>
                                                        <span className="font-bold text-red-600 dark:text-red-400 text-xs">
                                                            {formatPrice(productDiscount.type === 'percentage' ? p.sell_price - (p.sell_price * productDiscount.value / 100) : p.sell_price - productDiscount.value)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <p className="font-bold text-primary-600 dark:text-primary-400 text-xs">{formatPrice(p.sell_price)}</p>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            }) : (
                                <div className="col-span-full py-20 text-center text-slate-400 italic">Produk tidak ditemukan</div>
                            )}
                        </div>
                    </div>

                    {/* --- KANAN: KERANJANG --- */}
                    <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-slate-900 border-t lg:border-l border-slate-200 dark:border-slate-800 flex flex-col h-full sticky bottom-0 lg:static z-20 transition-colors shadow-[0_-10px_20px_rgba(0,0,0,0.05)] lg:shadow-none">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-3 font-bold text-sm uppercase tracking-wider">
                                <span className="flex items-center gap-2 dark:text-white"><IconShoppingCart size={18} className="text-primary-500" /> Keranjang</span>
                                <span className="bg-primary-50 dark:bg-primary-900/30 text-primary-600 px-2.5 py-0.5 rounded-full text-[10px] border border-primary-100 dark:border-primary-800">{carts?.length || 0} ITEM</span>
                            </div>
                            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-primary-500 shadow-sm">
                                <option value="">-- Pelanggan Umum --</option>
                                {Array.isArray(customers) && customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[300px] lg:max-h-none p-3 space-y-2">
                            {carts.map((c) => {
                                const prodDiscount = discounts.find(d => d.product_id === c.product_id);
                                let displayPrice = c.price;
                                if(prodDiscount) {
                                    const unitPrice = c.price / c.qty;
                                    const disc = prodDiscount.type === 'percentage' ? unitPrice * (prodDiscount.value / 100) : prodDiscount.value;
                                    displayPrice = (unitPrice - disc) * c.qty;
                                }

                                return (
                                    <div key={c.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-[11px] font-bold uppercase truncate dark:text-white flex-1 mr-2">{c.product?.title}</h4>
                                            {prodDiscount && <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase">Promo</span>}
                                        </div>
                                        
                                        {c.product?.type === 'bundle' && (
                                            <div className="mb-2 pl-2 border-l-2 border-primary-400 text-[9px] text-slate-500 dark:text-slate-400 italic bg-white/50 dark:bg-white/5 p-1 rounded">
                                                {c.product.bundle_items?.map((item, idx) => <div key={idx}>• {item.title} (x{item.pivot?.qty * c.qty})</div>)}
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs text-primary-600 dark:text-primary-400">{formatPrice(displayPrice)}</span>
                                                {prodDiscount && <span className="text-[8px] text-slate-400 line-through">{formatPrice(c.price)}</span>}
                                            </div>
                                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg p-1 border dark:border-slate-700 shadow-inner">
                                                <button onClick={() => updateQty(c.id, c.qty - 1)} className="w-6 h-6 flex items-center justify-center font-bold text-slate-400 hover:text-primary-500">-</button>
                                                <span className="text-[10px] font-bold w-4 text-center dark:text-white">{c.qty}</span>
                                                <button onClick={() => updateQty(c.id, c.qty + 1)} className="w-6 h-6 flex items-center justify-center font-bold text-slate-400 hover:text-primary-500">+</button>
                                            </div>
                                            <button onClick={() => deleteCart(c.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><IconX size={16} /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-3 transition-colors">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1 tracking-widest"><IconTicket size={12} className="text-primary-500"/> Diskon Global (Invoice)</label>
                                <select value={selectedDiscountId} onChange={(e) => setSelectedDiscountId(e.target.value)} className={`w-full text-xs rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-primary-500 ${selectedDiscountId ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 text-primary-700 font-bold' : ''}`}>
                                    <option value="">-- Pilih Diskon Global --</option>
                                    {Array.isArray(discounts) && discounts.filter(d => !d.product_id).map(d => (
                                        <option key={d.id} value={d.id} disabled={subtotalWithProductDiscounts < parseFloat(d.min_transaction)}>
                                            {d.name} {d.type === 'percentage' ? `(${d.value}%)` : `(-${formatPrice(d.value)})`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between text-slate-500 dark:text-slate-400 font-medium"><span>Subtotal</span><span>{formatPrice(subtotalWithProductDiscounts)}</span></div>
                                {discountAmount > 0 && <div className="flex justify-between text-red-500 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg"><span className="flex items-center gap-1"><IconGift size={12}/> Diskon Global</span><span>- {formatPrice(discountAmount)}</span></div>}
                                <div className="flex justify-between text-lg font-black text-primary-600 dark:text-primary-400 border-t border-dashed border-slate-300 dark:border-slate-700 pt-2 mt-2 uppercase tracking-tighter"><span>Total Bayar</span><span>{formatPrice(grandTotal)}</span></div>
                            </div>

                            <div className="grid grid-cols-4 gap-1.5">
                                {[grandTotal, 10000, 50000, 100000].map((val, i) => (
                                    <button key={i} onClick={() => setCash(val)} className="py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[9px] font-bold uppercase dark:text-white hover:bg-primary-50 transition-all shadow-sm">{i === 0 ? 'Pas' : (val/1000) + 'K'}</button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" value={cash || ''} onChange={(e) => setCash(Number(e.target.value))} placeholder="Tunai..." className="w-full px-3 py-2 text-xs font-bold rounded-xl dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white focus:ring-primary-500 shadow-sm" />
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1.5 flex flex-col items-center justify-center leading-none shadow-inner">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">Kembali</span>
                                    <span className={`text-[11px] font-extrabold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatPrice(change)}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button onClick={() => window.print()} disabled={carts.length === 0} className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-xl flex items-center justify-center gap-2 uppercase transition-all shadow-lg shadow-amber-500/20">
                                    <IconPrinter size={16} /> Cetak Tagihan (QRIS)
                                </button>

                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={handlePayCash} disabled={carts.length === 0 || cash < grandTotal} className="py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold text-[10px] rounded-xl shadow-lg transition-all flex flex-col items-center justify-center gap-1 uppercase group">
                                        <IconCash size={20} className="group-hover:scale-110 transition-transform" /> Tunai
                                    </button>
                                    {paymentSetting?.qris_manual_enabled && (
                                        <button onClick={() => setShowQrisModal(true)} disabled={carts.length === 0} className="py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white font-bold text-[10px] rounded-xl shadow-lg transition-all flex flex-col items-center justify-center gap-1 uppercase group">
                                            <IconQrcode size={20} className="group-hover:scale-110 transition-transform" /> Bayar QRIS
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* --- SECTION KHUSUS PRINT --- */}
            <div id="print-section" className="hidden print:block bg-white min-h-screen">
                <ThermalReceipt 
                    transaction={{
                        invoice: 'PROFORMA-' + new Date().getTime(),
                        created_at: new Date(),
                        grand_total: grandTotal,
                        details: carts,
                        cashier: auth.user,
                        payment_method: 'qris'
                    }}
                    // Memastikan prop qrisImage diteruskan dan path gambarnya benar
                    qrisImage={paymentSetting?.qris_manual_image ? `/storage/payments/${paymentSetting.qris_manual_image}` : null}
                    isTemporary={true}
                    storeName={receiptSetting?.store_name || "WARUNG PALUGADA"}
                    storeAddress={receiptSetting?.store_address || ""}
                    storePhone={receiptSetting?.store_phone || ""}
                    footerMessage="Silakan scan dan tunjukkan bukti bayar ke kasir"
                />
            </div>

            {/* --- MODAL QRIS --- */}
            {showQrisModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center border dark:border-slate-800">
                        <div className="mb-4">
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Konfirmasi QRIS</h3>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest opacity-60">Scan & Pastikan Uang Masuk</p>
                        </div>
                        {/* Container Gambar: Diberikan flex center agar gambar QRIS berada di tengah */}
                        <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 mb-4 flex items-center justify-center shadow-inner group overflow-hidden">
                            {paymentSetting?.qris_manual_image ? (
                                <img 
                                    src={`/storage/payments/${paymentSetting.qris_manual_image}`} 
                                    alt="QRIS" 
                                    className="block mx-auto w-full h-auto max-w-[220px] rounded-lg group-hover:scale-105 transition-transform" 
                                />
                            ) : (
                                <div className="py-14 text-slate-400 text-[10px] italic flex flex-col items-center gap-2">
                                    <IconQrcode size={48} className="opacity-10"/> Gambar QRIS belum diunggah
                                </div>
                            )}
                        </div>
                        <div className="bg-primary-50 dark:bg-primary-900/30 rounded-2xl p-4 mb-6 border border-primary-100 dark:border-primary-800">
                            <p className="text-[10px] text-primary-600 dark:text-primary-400 uppercase font-black tracking-widest mb-1">Total Tagihan</p>
                            <p className="text-2xl font-black text-primary-700 dark:text-white leading-none">{formatPrice(grandTotal)}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => submitTransaction('qris', grandTotal)} className="w-full py-4 bg-primary-600 text-white font-black rounded-2xl hover:bg-primary-700 uppercase text-xs shadow-xl shadow-primary-500/30 transition-all flex items-center justify-center gap-2">
                                <IconCash size={18}/> Konfirmasi Sudah Bayar
                            </button>
                            <button onClick={() => setShowQrisModal(false)} className="w-full py-3 text-slate-400 font-bold text-[10px] uppercase">Batal</button>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    html, body, #main-app-content, header, main, .print\\:hidden {
                        background: white !important;
                        visibility: hidden !important;
                        height: 0 !important;
                        overflow: hidden !important;
                        margin: 0 !important;
                    }
                    /* Container struk dipaksa rata tengah di layar print */
                    #print-section {
                        visibility: visible !important;
                        display: flex !important;
                        justify-content: center !important;
                        align-items: flex-start !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        background: white !important;
                        z-index: 99999 !important;
                    }
                    #print-section * {
                        visibility: visible !important;
                    }
                    @page {
                        size: auto;
                        margin: 0mm;
                    }
                }
            ` }} />
        </>
    );
};

Index.layout = (page) => page;
export default Index;