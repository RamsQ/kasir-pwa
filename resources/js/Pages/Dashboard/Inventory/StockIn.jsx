import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout"; 
import { Head, useForm, router } from "@inertiajs/react";
import Pagination from "@/Components/Dashboard/Pagination";
import { 
    IconDeviceFloppy, IconSearch, IconRefresh, 
    IconHistory, IconCalendar, IconUser, IconPackageImport,
    IconAlertCircle, IconFileTypeXls, IconFileImport, IconDownload
} from "@tabler/icons-react";
import Swal from "sweetalert2";

export default function StockIn({ auth, products, history, filters, excel_data }) {
    const [searchQuery, setSearchQuery] = useState(filters.search || "");
    const fileInputRef = useRef(null);

    const { data, setData, reset, processing } = useForm({
        entries: []
    });

    // 1. Inisialisasi baris tabel dari data produk yang dikirim server
    useEffect(() => {
        if (products.data) {
            const initialData = products.data.map(p => ({
                product_id: p.id,
                title: p.title,
                barcode: p.barcode,
                stock_current: p.stock,
                qty_in: "", 
                buy_price: p.buy_price || "" 
            }));
            setData('entries', initialData);
        }
    }, [products.data]);

    // 2. Menangkap data hasil olahan Excel dari Backend (Parse Result)
    useEffect(() => {
        if (excel_data && excel_data.length > 0) {
            const updatedEntries = data.entries.map(entry => {
                // Mencocokkan berdasarkan barcode yang ada di file Excel
                const match = excel_data.find(row => String(row.barcode) === String(entry.barcode));
                if (match) {
                    return {
                        ...entry,
                        qty_in: match.qty > 0 ? match.qty : entry.qty_in,
                        buy_price: match.price > 0 ? match.price : entry.buy_price
                    };
                }
                return entry;
            });
            setData('entries', updatedEntries);
            
            Swal.fire({
                icon: 'success',
                title: 'Data Excel Sinkron',
                text: `${excel_data.length} baris data berhasil diproses oleh server.`,
                confirmButtonColor: '#10b981',
            });
        }
    }, [excel_data]);

    // --- LOGIKA EXCEL (VIA SERVER) ---

    const handleDownloadTemplate = () => {
        // Mengunduh seluruh data produk untuk diedit massal
        window.open(route("stock_in.template"), "_blank");
    };

    const handleExportHistory = () => {
        // Mengunduh riwayat transaksi stock in
        window.open(route("stock_in.export"), "_blank");
    };

    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Mengirim file ke backend untuk di-parse menggunakan Laravel Excel (Composer)
        router.post(route('stock_in.parse_excel'), { file: file }, {
            forceFormData: true,
            preserveState: true,
            onSuccess: () => {
                e.target.value = null; // Bersihkan input file
            },
            onError: () => {
                Swal.fire("Gagal", "Pastikan format file benar (Barcode, Qty, Harga).", "error");
            }
        });
    };

    // --- LOGIKA FORM ---

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route("stock_in.index"), { ...filters, search: searchQuery }, { preserveState: true });
    };

    const handleInputChange = (index, field, value) => {
        const newEntries = [...data.entries];
        newEntries[index][field] = value;
        setData('entries', newEntries);
    };

    const submitBulkStockIn = (e) => {
        e.preventDefault();

        const filledData = data.entries
            .filter(item => item.qty_in !== "" && parseFloat(item.qty_in) > 0)
            .map(item => ({
                product_id: item.product_id,
                qty_in: parseFloat(item.qty_in),
                buy_price: parseFloat(item.buy_price) || 0
            }));
        
        if (filledData.length === 0) {
            Swal.fire({ 
                icon: 'warning', 
                title: 'INPUT KOSONG', 
                text: 'Silakan isi jumlah masuk pada tabel atau gunakan fitur Import Excel.',
                confirmButtonColor: '#e11d48',
            });
            return;
        }

        router.post(route("stock_in.store"), {
            entries: filledData 
        }, {
            preserveScroll: true,
            onSuccess: () => {
                reset(); 
                Swal.fire({
                    title: "BERHASIL",
                    text: "Stok dan Harga Rata-rata berhasil diperbarui.",
                    icon: "success",
                    confirmButtonColor: '#e11d48',
                });
            },
        });
    };

    return (
        <DashboardLayout auth={auth}> 
            <Head title="Stock In - Bulk Inventory" />

            <div className="min-h-screen bg-transparent text-slate-300 font-sans">
                
                {/* --- HEADER --- */}
                <div className="mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                            <IconPackageImport size={28} className="text-rose-500" />
                            Stock In
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase italic leading-none">
                            Update Massal via Excel & Perhitungan Average Cost
                        </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <input type="file" ref={fileInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx, .xls, .csv" />
                        
                        <div className="flex bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <button onClick={handleDownloadTemplate} className="p-3 text-blue-600 hover:bg-blue-50 border-r border-slate-200 flex items-center gap-2 text-xs font-bold uppercase transition-all">
                                <IconDownload size={18}/> Export Data Produk
                            </button>
                            <button onClick={() => fileInputRef.current.click()} className="p-3 text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 text-xs font-bold uppercase transition-all">
                                <IconFileImport size={18}/> Import & Sync
                            </button>
                        </div>

                        <button onClick={handleExportHistory} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase shadow-md transition-all">
                            <IconFileTypeXls size={18} /> History
                        </button>

                        <button onClick={submitBulkStockIn} disabled={processing} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-rose-200 uppercase text-xs transition-all active:scale-95 disabled:opacity-50">
                            <IconDeviceFloppy size={20} /> {processing ? "Menyimpan..." : "Simpan Masuk Barang"}
                        </button>
                    </div>
                </div>

                {/* --- SEARCH BAR --- */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 shadow-sm flex items-center gap-4">
                    <form onSubmit={handleSearch} className="relative flex-1">
                        <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text"
                            className="pl-10 w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-rose-500 shadow-sm"
                            placeholder="Cari produk berdasarkan nama atau barcode..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </form>
                    <button onClick={() => router.get(route("stock_in.index"))} className="p-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">
                        <IconRefresh size={20} />
                    </button>
                </div>

                {/* --- TABEL INPUT MASSAL --- */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm mb-12">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-[10px] text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 font-black tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Informasi Produk</th>
                                    <th className="px-6 py-4 text-center">Stok Sistem</th>
                                    <th className="px-6 py-4 text-center w-48 bg-rose-50/50 dark:bg-rose-900/10 text-rose-600 font-black">Qty Masuk</th>
                                    <th className="px-6 py-4 text-center w-64 bg-amber-50/50 dark:bg-amber-900/10 text-amber-600 font-black">Harga Modal (Rp)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {data.entries.length > 0 ? data.entries.map((item, index) => (
                                    <tr key={item.product_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white uppercase leading-tight text-xs">
                                            {item.title} <br/> 
                                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-normal">{item.barcode}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-500">
                                            {item.stock_current}
                                        </td>
                                        <td className="px-6 py-4 bg-rose-50/20 dark:bg-rose-900/5 text-center">
                                            <input 
                                                type="number" step="any"
                                                className="w-32 mx-auto rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-center font-black text-rose-600 focus:ring-rose-500 py-2 shadow-sm"
                                                value={item.qty_in}
                                                onChange={e => handleInputChange(index, 'qty_in', e.target.value)}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="px-6 py-4 bg-amber-50/20 dark:bg-amber-900/5 text-center">
                                            <input 
                                                type="number"
                                                className="w-44 mx-auto rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-center font-black text-amber-600 focus:ring-amber-500 py-2 shadow-sm"
                                                value={item.buy_price}
                                                onChange={e => handleInputChange(index, 'buy_price', e.target.value)}
                                                placeholder="0"
                                            />
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="p-10 text-center text-slate-400 uppercase font-bold text-xs tracking-widest italic">
                                            Produk tidak ditemukan
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
                        <Pagination links={products.links} />
                    </div>
                </div>

                {/* --- SECTION RIWAYAT --- */}
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t pt-10 border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                        <IconHistory size={24} className="text-orange-500" /> Riwayat Stock In
                    </h2>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm mb-10">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800 font-black tracking-widest border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-xs">Waktu & Petugas</th>
                                    <th className="px-6 py-4 text-xs">Produk</th>
                                    <th className="px-6 py-4 text-center text-xs">Jumlah</th>
                                    <th className="px-6 py-4 text-right text-xs">Modal Masuk</th>
                                    <th className="px-6 py-4 text-center text-xs">Ref</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {history.data.length > 0 ? history.data.map((h) => (
                                    <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700 dark:text-slate-200 uppercase text-[11px]">
                                                {h.user?.name}
                                            </div>
                                            <div className="text-[10px] text-slate-400 italic">
                                                {new Date(h.created_at).toLocaleString('id-ID')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold uppercase text-slate-600 dark:text-slate-300 text-[11px]">
                                            {h.product?.title}
                                        </td>
                                        <td className="px-6 py-4 text-center text-emerald-600 font-black">
                                            +{h.qty}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">
                                            Rp {new Intl.NumberFormat('id-ID').format(h.price)}
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono text-[10px] text-slate-400">
                                            {h.reference}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="p-10 text-center text-xs opacity-40 uppercase font-bold tracking-widest">
                                            Belum ada riwayat masuk barang
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800">
                        <Pagination links={history.links} />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}