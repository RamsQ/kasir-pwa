import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, router } from "@inertiajs/react";
import Pagination from "@/Components/Dashboard/Pagination";
import hasAnyPermission from "@/Utils/Permission"; 
import { 
    IconPackage, IconDeviceFloppy, IconSearch, IconAlertCircle, 
    IconNote, IconRefresh, IconFileTypeXls, IconUpload,
    IconFileText, IconCalendar, IconUser
} from "@tabler/icons-react";
import Swal from "sweetalert2";

export default function Index({ auth, products, history, filters }) {
    const [searchQuery, setSearchQuery] = useState(filters.search || "");
    const fileInput = useRef();

    const { data, setData, post, processing } = useForm({
        adjustments: []
    });

    useEffect(() => {
        const initialData = products.data.map(p => ({
            product_id: p.id,
            title: p.title,
            barcode: p.barcode,
            stock_system: p.stock,
            stock_actual: "", 
            reason: ""        
        }));
        setData('adjustments', initialData);
    }, [products.data]);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route("stock_opnames.index"), { ...filters, search: searchQuery }, { preserveState: true });
    };

    const handleFilterDate = (field, value) => {
        router.get(route("stock_opnames.index"), { ...filters, [field]: value }, { preserveState: true });
    };

    const handleInputChange = (index, field, value) => {
        const newAdjustments = [...data.adjustments];
        newAdjustments[index][field] = value;
        setData('adjustments', newAdjustments);
    };

    const handleClearAll = () => {
        Swal.fire({
            title: 'Kosongkan Input?',
            text: "Data yang Anda ketik di tabel input akan dihapus.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Reset',
            confirmButtonColor: '#ef4444',
        }).then((result) => {
            if (result.isConfirmed) {
                const clearedData = data.adjustments.map(item => ({
                    ...item,
                    stock_actual: "",
                    reason: ""
                }));
                setData('adjustments', clearedData);
            }
        });
    };

    const submitBulkOpname = (e) => {
        e.preventDefault();
        const filledData = data.adjustments.filter(item => item.stock_actual !== "");
        if (filledData.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Input Kosong', text: 'Isi minimal satu kolom Stok Fisik.' });
            return;
        }
        post(route("stock_opnames.store"), {
            onSuccess: () => Swal.fire("Berhasil", "Stok fisik diperbarui.", "success"),
        });
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        router.post(route('stock_opnames.import'), formData, {
            forceFormData: true,
            onSuccess: () => {
                Swal.fire("Berhasil", "Data Excel berhasil diimport!", "success");
                e.target.value = null;
            }
        });
    };

    return (
        <>
            <Head title="Stock Opname" />

            {/* --- HEADER --- */}
            <div className="mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                        <IconPackage size={28} className="text-primary-500" />
                        Stock Opname
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-tight uppercase">Audit & Penyesuaian Inventaris</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <input type="file" ref={fileInput} className="hidden" onChange={handleImport} accept=".xlsx, .xls" />
                    
                    <a href={route('stock_opnames.export')} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all shadow-sm">
                        <IconFileTypeXls size={18} /> Format Excel
                    </a>

                    <button onClick={() => fileInput.current.click()} className="flex items-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all shadow-sm">
                        <IconUpload size={18} /> Import Excel
                    </button>

                    {hasAnyPermission(['stock_opnames.reset']) && (
                        <button onClick={handleClearAll} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-3 rounded-xl font-bold text-xs uppercase hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                            <IconRefresh size={18} /> Reset
                        </button>
                    )}

                    <button onClick={submitBulkOpname} disabled={processing} className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary-200 active:scale-95 disabled:opacity-50 uppercase text-xs">
                        <IconDeviceFloppy size={20} /> {processing ? "Proses..." : "Simpan Semua"}
                    </button>
                </div>
            </div>

            {/* --- TABEL INPUT PRODUK --- */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 shadow-sm">
                <form onSubmit={handleSearch} className="relative w-full">
                    <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text"
                        className="pl-10 w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-primary-500"
                        placeholder="Cari produk untuk di-opname..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </form>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm mb-12">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 font-black tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Produk</th>
                                <th className="px-6 py-4 text-center">Stok Sistem</th>
                                <th className="px-6 py-4 text-center w-48 bg-primary-50/50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-black uppercase">Stok Fisik</th>
                                <th className="px-6 py-4 text-center w-72">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.adjustments.map((item, index) => (
                                <tr key={item.product_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white uppercase leading-tight">
                                        {item.title} <br/> <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-normal">{item.barcode}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-slate-500 dark:text-slate-400">{item.stock_system}</td>
                                    <td className="px-6 py-4 bg-primary-50/20 dark:bg-primary-900/10 text-center">
                                        <input 
                                            type="number"
                                            className="w-32 mx-auto rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-center font-black text-primary-600 dark:text-primary-400 focus:ring-primary-500 py-2 shadow-sm"
                                            value={item.stock_actual}
                                            onChange={e => handleInputChange(index, 'stock_actual', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input 
                                            type="text"
                                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-xs py-2"
                                            placeholder="Opsional..."
                                            value={item.reason}
                                            onChange={e => handleInputChange(index, 'reason', e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
                    <Pagination links={products.links} />
                </div>
            </div>

            {/* --- LAPORAN RIWAYAT --- */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t pt-10 border-slate-200 dark:border-slate-800">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                        <IconFileText size={24} className="text-orange-500" />
                        Laporan Riwayat Opname
                    </h2>
                </div>
                <div className="flex gap-2">
                    <input 
                        type="date" 
                        className="rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-xs" 
                        value={filters.start_date || ""} 
                        onChange={e => handleFilterDate('start_date', e.target.value)}
                    />
                    <input 
                        type="date" 
                        className="rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-xs" 
                        value={filters.end_date || ""} 
                        onChange={e => handleFilterDate('end_date', e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800 font-black tracking-widest border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Waktu / Petugas</th>
                                <th className="px-6 py-4">Produk</th>
                                <th className="px-6 py-4 text-center">Sistem</th>
                                <th className="px-6 py-4 text-center font-bold">Fisik</th>
                                <th className="px-6 py-4 text-center">Selisih</th>
                                <th className="px-6 py-4">Alasan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {history.data.length > 0 ? history.data.map((h) => (
                                <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1"><IconUser size={14}/> {h.user?.name}</div>
                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 italic flex items-center gap-1"><IconCalendar size={12}/> {new Date(h.created_at).toLocaleString('id-ID')}</div>
                                    </td>
                                    <td className="px-6 py-4 font-bold uppercase text-slate-600 dark:text-slate-300">{h.product?.title}</td>
                                    <td className="px-6 py-4 text-center text-slate-400 dark:text-slate-500">{h.stock_system}</td>
                                    <td className="px-6 py-4 text-center font-black text-slate-900 dark:text-white">{h.stock_actual}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-md text-[11px] font-black ${h.difference < 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : h.difference > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                            {h.difference > 0 ? `+${h.difference}` : h.difference}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs italic text-slate-500 dark:text-slate-400">{h.reason}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="p-10 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">Belum ada riwayat opname</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <Pagination links={history.links} />
                </div>
            </div>
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;