import React, { useState } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import { 
    IconArrowLeft, IconPrinter, IconCash, IconPackage, 
    IconBuildingStore, IconReceipt, IconHash, IconCalendar, IconUser,
    IconFileInvoice, IconUsers, IconBrandWhatsapp, IconExternalLink
} from "@tabler/icons-react";
import Swal from "sweetalert2";
import ThermalReceipt, { ThermalReceipt58mm } from "@/Components/Receipt/ThermalReceipt";

export default function Print({ transaction, receiptSetting, isPublic = false }) {
    // 1. Guard Utama
    if (!transaction || !transaction.invoice) {
        return <div className="p-10 text-center text-white bg-slate-900 min-h-screen">Memuat Transaksi...</div>;
    }

    const [printMode, setPrintMode] = useState("invoice");

    // --- SETUP DATA TOKO ---
    const storeName = receiptSetting?.store_name || "TOKO POS";
    const storeAddress = receiptSetting?.store_address || "Alamat belum diatur";
    const storePhone = receiptSetting?.store_phone || "-";
    const storeFooter = receiptSetting?.store_footer || "Terima kasih atas kunjungan Anda";
    const storeLogo = receiptSetting?.store_logo ? `/storage/receipt/${receiptSetting.store_logo}` : null;

    const formatPrice = (price = 0) => 
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price || 0);

    const details = Array.isArray(transaction.details) ? transaction.details : [];

    // --- FUNGSI WHATSAPP ---
    const sendWhatsApp = () => {
        let phone = transaction.customer?.phone || "";
        
        if (!phone) {
            Swal.fire({
                title: 'Nomor HP Tidak Ditemukan',
                text: "Masukkan nomor HP pelanggan secara manual:",
                input: 'number',
                showCancelButton: true,
                confirmButtonText: 'Kirim WA',
                confirmButtonColor: '#10b981',
            }).then((result) => {
                if (result.isConfirmed && result.value) processWhatsApp(result.value);
            });
            return;
        }
        processWhatsApp(phone);
    };

    const processWhatsApp = (rawPhone) => {
        let phone = rawPhone.replace(/\D/g, "");
        if (phone.startsWith("0")) phone = "62" + phone.slice(1);
        else if (!phone.startsWith("62")) phone = "62" + phone;

        // Link Validasi untuk Pelanggan
        const shareLink = `${window.location.origin}/share/invoice/${transaction.invoice}`;

        const message = 
            `*STRUK DIGITAL ${storeName.toUpperCase()}*\n` +
            `----------------------------------\n` +
            `Halo *${transaction.customer?.name || "Pelanggan"}*,\n` +
            `Terima kasih telah berbelanja.\n\n` +
            `No. Invoice: #${transaction.invoice}\n` +
            `Total: *${formatPrice(transaction.grand_total)}*\n` +
            `Status: *LUNAS*\n\n` +
            `Klik link di bawah ini untuk melihat struk lengkap Anda:\n` +
            `${shareLink}\n\n` +
            `_Semoga hari Anda menyenangkan!_`;

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    };

    return (
        <>
            <Head title={`Invoice #${transaction.invoice}`} />

            <div className={`min-h-screen ${isPublic ? 'bg-white' : 'bg-slate-950'} text-slate-300 p-2 md:p-8 print:bg-white print:p-0`}>
                
                {/* --- NAVIGATION: Sembunyi jika isPublic atau saat print --- */}
                {!isPublic && (
                    <div className="max-w-4xl mx-auto mb-6 flex flex-wrap justify-between items-center gap-4 print:hidden">
                        <Link href={route("transactions.index")} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 shadow-lg">
                            <IconArrowLeft size={18} /> Kembali
                        </Link>
                        
                        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
                            {[{ id: "invoice", label: "A4", icon: IconFileInvoice }, { id: "thermal80", label: "80mm", icon: IconReceipt }].map((mode) => (
                                <button key={mode.id} onClick={() => setPrintMode(mode.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${printMode === mode.id ? "bg-emerald-600 text-white shadow-md" : "text-slate-500 hover:text-slate-200"}`}>
                                    <mode.icon size={16} /> {mode.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={sendWhatsApp} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl shadow-lg active:scale-95">
                                <IconBrandWhatsapp size={20} /> KIRIM WA
                            </button>
                            <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-black rounded-xl shadow-lg active:scale-95">
                                <IconPrinter size={20} /> CETAK
                            </button>
                        </div>
                    </div>
                )}

                {/* --- AREA KONTEN --- */}
                <div className="max-w-4xl mx-auto print:max-w-full">
                    <div className={`print-content bg-white ${isPublic ? '' : 'rounded-[2.5rem] shadow-2xl'} overflow-hidden print:shadow-none print:rounded-none`}>
                        
                        {printMode === "invoice" ? (
                            <div className="p-6 md:p-12 text-slate-800 bg-white min-h-[1000px] flex flex-col">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-12">
                                    <div className="flex gap-4 items-start">
                                        {storeLogo ? <img src={storeLogo} className="w-20 h-20 object-contain" /> : <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400"><IconBuildingStore size={32} /></div>}
                                        <div>
                                            <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">{storeName}</h1>
                                            <p className="text-[11px] text-slate-500 max-w-xs mt-2 leading-relaxed">{storeAddress}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-5xl font-black text-emerald-500/10 print:text-emerald-500/20 leading-none mb-2 tracking-tighter uppercase">Invoice</h2>
                                        <span className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold font-mono">#{transaction.invoice}</span>
                                    </div>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 border-y border-slate-100 py-6">
                                    <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><IconUsers size={12}/> Pelanggan</p><p className="text-sm font-bold text-slate-900 uppercase">{transaction.customer?.name || "UMUM"}</p></div>
                                    <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><IconUser size={12}/> Kasir</p><p className="text-sm font-bold text-slate-700 uppercase">{transaction.cashier?.name}</p></div>
                                    <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><IconCalendar size={12}/> Waktu</p><p className="text-sm font-bold text-slate-700">{new Date(transaction.created_at).toLocaleDateString('id-ID')}</p></div>
                                    <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><IconHash size={12}/> Metode</p><p className="text-sm font-bold text-emerald-600 font-black italic">{transaction.payment_method?.toUpperCase()}</p></div>
                                </div>

                                {/* Table */}
                                <div className="flex-1">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-slate-900 text-left">
                                                <th className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-900">Deskripsi Produk</th>
                                                <th className="py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Qty</th>
                                                <th className="py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700">
                                            {details.map((item, i) => (
                                                <React.Fragment key={i}>
                                                    <tr>
                                                        <td className="py-5"><p className="font-bold text-slate-900 uppercase">{item.product?.title}</p></td>
                                                        <td className="py-5 text-center text-sm font-bold text-slate-900">{item.qty}</td>
                                                        <td className="py-5 text-right text-sm font-black text-slate-900">{formatPrice(item.price)}</td>
                                                    </tr>
                                                    {item.product?.type === 'bundle' && item.product?.bundle_items?.length > 0 && (
                                                        <tr>
                                                            <td colSpan="3" className="pb-5 pt-0">
                                                                <div className="bg-slate-50 rounded-2xl p-4 ml-6 border-l-4 border-emerald-500 italic text-[11px] text-slate-500">
                                                                    {item.product.bundle_items.map((bi, idx) => (<div key={idx}>- {bi.title} (x{bi.pivot?.qty * item.qty})</div>))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer */}
                                <div className="mt-12 flex justify-end">
                                    <div className="w-full md:w-80 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <div className="flex justify-between items-center pt-4"><span className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Total Bayar</span><span className="text-2xl font-black text-emerald-600">{formatPrice(transaction.grand_total)}</span></div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-4 flex justify-center">
                                <ThermalReceipt transaction={transaction} storeName={storeName} storeAddress={storeAddress} storePhone={storePhone} footerMessage={storeFooter} storeLogo={storeLogo} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
Print.layout = (page) => page;