import React from "react";
import { Head, useForm, Link } from "@inertiajs/react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { IconDeviceFloppy, IconArrowLeft, IconTicket } from "@tabler/icons-react";
import Swal from "sweetalert2";

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        name: "",
        type: "percentage", // default
        value: "",
        min_transaction: 0,
        start_date: new Date().toISOString().split("T")[0], // Hari ini
        end_date: "",
        description: ""
    });

    const submit = (e) => {
        e.preventDefault();
        post(route("discounts.store"), {
            onSuccess: () => {
                Swal.fire("Berhasil!", "Promo diskon berhasil dibuat.", "success");
            }
        });
    };

    return (
        <>
            <Head title="Buat Promo Baru" />
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Link href={route('discounts.index')} className="text-slate-500 hover:text-primary-500 flex items-center gap-2 transition-colors">
                        <IconArrowLeft size={20}/> <span className="font-medium">Kembali</span>
                    </Link>
                </div>
                
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                        <div className="p-3 bg-primary-100 dark:bg-primary-900 text-primary-600 rounded-xl">
                            <IconTicket size={28} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Buat Promo Baru</h1>
                            <p className="text-sm text-slate-500">Isi detail promo diskon di bawah ini.</p>
                        </div>
                    </div>
                    
                    <form onSubmit={submit} className="space-y-6">
                        {/* Nama Promo */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Promo</label>
                            <input 
                                type="text" 
                                value={data.name} 
                                onChange={e => setData('name', e.target.value)} 
                                placeholder="Contoh: Diskon Lebaran / Paket Bundling Hemat" 
                                className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-primary-500 focus:border-primary-500 transition-all" 
                            />
                            {errors.name && <div className="text-red-500 text-xs mt-1 font-medium">{errors.name}</div>}
                        </div>

                        {/* Tipe Diskon & Nilai */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tipe Potongan</label>
                                <select 
                                    value={data.type} 
                                    onChange={e => setData('type', e.target.value)} 
                                    className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
                                >
                                    <option value="percentage">Persentase (%)</option>
                                    <option value="fixed">Nominal (Rupiah)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Besar Potongan {data.type === 'percentage' ? '(%)' : '(Rp)'}
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={data.value} 
                                        onChange={e => setData('value', e.target.value)} 
                                        placeholder={data.type === 'percentage' ? 'Contoh: 10' : 'Contoh: 50000'} 
                                        className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-primary-500 focus:border-primary-500" 
                                    />
                                </div>
                                {errors.value && <div className="text-red-500 text-xs mt-1 font-medium">{errors.value}</div>}
                            </div>
                        </div>

                        {/* Minimal Belanja */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Minimal Total Belanja (Rp)</label>
                            <input 
                                type="number" 
                                value={data.min_transaction} 
                                onChange={e => setData('min_transaction', e.target.value)} 
                                className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-primary-500" 
                            />
                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                ℹ️ Isi <b>0</b> jika promo ini berlaku tanpa minimal pembelian.
                            </p>
                        </div>

                        {/* Periode */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tanggal Mulai</label>
                                <input 
                                    type="date" 
                                    value={data.start_date} 
                                    onChange={e => setData('start_date', e.target.value)} 
                                    className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-primary-500" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tanggal Selesai</label>
                                <input 
                                    type="date" 
                                    value={data.end_date} 
                                    onChange={e => setData('end_date', e.target.value)} 
                                    className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-primary-500" 
                                />
                                {errors.end_date && <div className="text-red-500 text-xs mt-1 font-medium">{errors.end_date}</div>}
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={processing} 
                                className="bg-primary-500 text-white px-8 py-3 rounded-xl flex items-center gap-2 hover:bg-primary-600 shadow-lg shadow-primary-500/30 transition-all font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <IconDeviceFloppy size={20} />
                                {processing ? 'Menyimpan...' : 'Simpan Promo'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

Create.layout = (page) => <DashboardLayout children={page} />;