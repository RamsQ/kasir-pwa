import React, { useState, useEffect } from "react";
import { Head, Link } from "@inertiajs/react";
import { 
    IconArrowLeft, IconPrinter, IconCash, IconClock, 
    IconBuildingStore, IconReceipt, IconCalendar, IconUser,
    IconDeviceFloppy, IconScale
} from "@tabler/icons-react";

export default function Print({ shift, receiptSetting }) {
    if (!shift) return <div className="p-10 text-center">Data Shift tidak ditemukan...</div>;

    // State untuk ukuran kertas (Default 80mm)
    const [paperSize, setPaperSize] = useState("80");

    const storeName = receiptSetting?.store_name || "TOKO POS";
    const storeAddress = receiptSetting?.store_address || "Alamat belum diatur";

    const formatPrice = (price = 0) => 
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price || 0);

    // Memicu print otomatis saat pertama kali load (Opsional)
    // useEffect(() => { setTimeout(() => window.print(), 1000); }, []);

    return (
        <>
            <Head title={`Print Laporan Shift - ${shift.user?.name}`} />

            <div className="min-h-screen bg-slate-900 text-slate-300 p-4 md:p-8 print:bg-white print:p-0">
                
                {/* --- NAVIGATION CONTROLS --- */}
                <div className="max-w-xl mx-auto mb-6 flex flex-col gap-4 print:hidden">
                    <div className="flex justify-between items-center">
                        <Link href={route("transactions.index")} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                            <IconArrowLeft size={18} /> Kembali ke Kasir
                        </Link>
                        <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                            <IconPrinter size={20} /> CETAK SEKARANG
                        </button>
                    </div>

                    <div className="bg-slate-800 p-2 rounded-2xl border border-slate-700 flex items-center justify-between">
                        <span className="text-xs font-bold px-3 uppercase tracking-widest text-slate-500">Pilih Ukuran Kertas:</span>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setPaperSize("80")} 
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${paperSize === "80" ? "bg-primary-600 text-white shadow-md" : "hover:bg-slate-700 text-slate-400"}`}
                            >
                                80mm
                            </button>
                            <button 
                                onClick={() => setPaperSize("58")} 
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${paperSize === "58" ? "bg-primary-600 text-white shadow-md" : "hover:bg-slate-700 text-slate-400"}`}
                            >
                                58mm
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- AREA STRUK THERMAL --- */}
                <div className="flex justify-center">
                    <div 
                        className={`bg-white text-black p-4 shadow-2xl print:shadow-none transition-all duration-300 ${paperSize === "80" ? "w-[80mm]" : "w-[58mm]"}`}
                        id="receipt-content"
                    >
                        {/* Header Toko */}
                        <div className="text-center mb-4">
                            <h2 className="font-black text-lg uppercase leading-tight">{storeName}</h2>
                            <p className="text-[10px] leading-tight mt-1">{storeAddress}</p>
                            <div className="border-b border-black border-dashed my-3"></div>
                            <h3 className="font-bold text-xs uppercase tracking-widest">Laporan Tutup Kasir</h3>
                        </div>

                        {/* Info Shift */}
                        <div className="text-[10px] space-y-1 mb-3">
                            <div className="flex justify-between"><span>Kasir:</span><span className="font-bold uppercase">{shift.user?.name}</span></div>
                            <div className="flex justify-between"><span>Buka:</span><span>{new Date(shift.opened_at).toLocaleString('id-ID')}</span></div>
                            <div className="flex justify-between"><span>Tutup:</span><span>{new Date(shift.closed_at).toLocaleString('id-ID')}</span></div>
                        </div>

                        <div className="border-b border-black border-dashed my-3"></div>

                        {/* Rincian Saldo */}
                        <div className="text-[11px] space-y-2">
                            <div className="flex justify-between">
                                <span>Modal Awal:</span>
                                <span>{formatPrice(shift.starting_cash)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Penjualan Tunai:</span>
                                <span>{formatPrice(shift.total_cash_sales)}</span>
                            </div>
                            <div className="flex justify-between font-bold border-t border-black pt-1">
                                <span>Total Diharapkan:</span>
                                <span>{formatPrice(shift.total_cash_expected)}</span>
                            </div>
                            <div className="flex justify-between font-black text-sm pt-1">
                                <span>Setoran Fisik:</span>
                                <span>{formatPrice(shift.total_cash_actual)}</span>
                            </div>
                        </div>

                        <div className="border-b border-black border-dashed my-3"></div>

                        {/* Selisih & QRIS */}
                        <div className="text-[11px] space-y-1">
                            <div className="flex justify-between font-black">
                                <span>SELISIH:</span>
                                <span>{formatPrice(shift.difference)}</span>
                            </div>
                            <div className="flex justify-between italic text-[10px] pt-2">
                                <span>Total QRIS (Non-Tunai):</span>
                                <span>{formatPrice(shift.total_qris_sales)}</span>
                            </div>
                        </div>

                        <div className="border-b border-black border-dashed my-3"></div>

                        {/* Footer Struk */}
                        <div className="text-center text-[9px] mt-4 space-y-4">
                            <p className="italic">Laporan ini sah sebagai bukti audit operasional kasir.</p>
                            
                            {/* Signature Area */}
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="border-t border-black pt-1">Kasir</div>
                                <div className="border-t border-black pt-1">Manager</div>
                            </div>

                            <p className="pt-4 font-bold uppercase tracking-tighter">
                                Dicetak: {new Date().toLocaleString('id-ID')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CSS KHUSUS PRINT --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body { background: white !important; margin: 0; padding: 0; }
                    #receipt-content { 
                        width: ${paperSize}mm !important; 
                        margin: 0 auto;
                        padding: 2mm !important;
                        box-shadow: none !important;
                    }
                    .print\\:hidden { display: none !important; }
                }
                /* Sembunyikan scrollbar di struk saat preview */
                #receipt-content { overflow: hidden; }
            ` }} />
        </>
    );
}