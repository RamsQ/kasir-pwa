import React, { useState } from "react";
import { Head, router, useForm } from "@inertiajs/react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
    CartesianGrid, Tooltip, Legend 
} from "recharts";
import {
    IconCash, IconPlus, IconCalendar, IconSearch,
    IconTrendingUp, IconReceipt2, IconTable,
    IconReceipt, IconUser, IconClock, IconChartBar, IconPhoto
} from "@tabler/icons-react";

const formatCurrency = (value) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(value || 0);

const FinanceReport = ({ auth, report }) => {
    const [startDate, setStartDate] = useState(report.filter.start || "");
    const [endDate, setEndDate] = useState(report.filter.end || "");
    const [filterStaff, setFilterStaff] = useState(report.filter.user_id || "");

    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        image: null,
        note: '',
    });

    const handleFilter = (e) => {
        e.preventDefault();
        router.get(route("report.finance"), 
            { start_date: startDate, end_date: endDate, user_id: filterStaff },
            { preserveState: true, replace: true }
        );
    };

    const submitExpense = (e) => {
        e.preventDefault();
        post(route('expenses.store'), {
            forceFormData: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <>
            <Head title="Laporan Keuangan" />
            <div className="space-y-6">
                
                {/* 1. Header & Filter */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                            <IconCash className="text-emerald-500" size={28} /> Laporan Keuangan
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">Analisa performa toko, laba rugi, dan arus kas harian.</p>
                    </div>

                    <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2 px-3 border-r dark:border-slate-800">
                            <IconCalendar size={18} className="text-slate-400" />
                            <input type="date" className="border-none bg-transparent text-xs font-bold focus:ring-0 p-1 text-slate-700 dark:text-slate-300" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            <span className="text-slate-300">/</span>
                            <input type="date" className="border-none bg-transparent text-xs font-bold focus:ring-0 p-1 text-slate-700 dark:text-slate-300" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2 px-2">
                            <IconUser size={18} className="text-slate-400" />
                            <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} className="border-none bg-transparent text-xs font-bold focus:ring-0 p-1 text-slate-700 dark:text-slate-300 min-w-[120px]">
                                <option value="">Semua Staff</option>
                                {report.staffList?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white p-2.5 rounded-xl transition-all shadow-lg active:scale-95"><IconSearch size={18} /></button>
                    </form>
                </div>

                {/* 2. Kartu Ringkasan (Top Stats) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center gap-5 shadow-sm">
                        <div className="p-4 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-500/30"><IconTrendingUp size={28} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Laba Kotor</p>
                            <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(report.grossProfit)}</h3>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center gap-5 shadow-sm">
                        <div className="p-4 bg-rose-500 rounded-2xl text-white shadow-lg shadow-rose-500/30"><IconReceipt2 size={28} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Beban</p>
                            <h3 className="text-2xl font-black text-rose-600">{formatCurrency(report.expenses)}</h3>
                        </div>
                    </div>
                    <div className="bg-emerald-600 p-6 rounded-3xl flex items-center gap-5 text-white shadow-xl shadow-emerald-600/20">
                        <div className="p-4 bg-white/20 rounded-2xl"><IconCash size={28} /></div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Laba Bersih</p>
                            <h3 className="text-2xl font-black">{formatCurrency(report.netProfit)}</h3>
                        </div>
                    </div>
                </div>

                {/* 3. CHART SECTION */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><IconChartBar size={20} /></div>
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Trend Arus Kas Harian</h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={report.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} dy={10} />
                                <YAxis hide />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Area type="monotone" dataKey="revenue" name="Omzet" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 4. INPUT PENGELUARAN */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden sticky top-24">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                                <IconPlus size={18} className="text-primary-500" />
                                <span className="font-black text-xs uppercase tracking-widest text-slate-800 dark:text-white">Input Pengeluaran</span>
                            </div>
                            <form onSubmit={submitExpense} className="p-6 space-y-5">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Keterangan</label>
                                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-sm font-bold focus:ring-primary-500 dark:text-white" placeholder="Bayar Listrik" />
                                    {errors.name && <p className="text-rose-500 text-[10px] mt-1 font-bold">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Nominal (Rp)</label>
                                    <input type="number" value={data.amount} onChange={e => setData('amount', e.target.value)} className="w-full rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-sm font-bold focus:ring-primary-500 dark:text-white" placeholder="0" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Bukti Nota</label>
                                    <input type="file" onChange={e => setData('image', e.target.files[0])} className="w-full text-[10px] text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-black file:uppercase file:bg-primary-50 file:text-primary-600 cursor-pointer" />
                                </div>
                                <button disabled={processing} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50">
                                    {processing ? 'Menyimpan...' : 'Simpan Transaksi'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* 5. ANALISA DETAIL & LOG PENGELUARAN */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Detail Rincian (Omset, HPP) */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 transition-all hover:shadow-md">
                            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-8">
                                <IconReceipt className="text-emerald-500" /> Analisa Laba Rugi Detail
                            </h3>
                            <div className="space-y-5">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">Total Omzet Penjualan</span>
                                    <span className="text-lg font-black text-slate-800 dark:text-white">{formatCurrency(report.revenue)}</span>
                                </div>
                                <div className="flex justify-between items-center text-rose-500">
                                    <span className="text-sm font-bold uppercase tracking-tight">Total HPP (Modal Barang)</span>
                                    <span className="text-lg font-black">({formatCurrency(report.hpp)})</span>
                                </div>
                                <div className="pt-6 border-t-2 border-dashed dark:border-slate-800 flex justify-between items-center font-black text-blue-600 dark:text-blue-400 text-2xl tracking-tighter">
                                    <span>LABA KOTOR</span>
                                    <span>{formatCurrency(report.grossProfit)}</span>
                                </div>
                                <div className="pt-2 flex justify-between items-center text-slate-500 italic text-xs">
                                    <span>* Belum dikurangi beban operasional (beban gaji, listrik, dll)</span>
                                </div>
                            </div>
                        </div>

                        {/* Tabel Log Pengeluaran */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                                <IconClock size={18} className="text-blue-600" />
                                <span className="font-black text-xs uppercase tracking-widest text-slate-800 dark:text-white">Log Pengeluaran Kas</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[9px] uppercase font-black tracking-[0.2em]">
                                        <tr>
                                            <th className="px-6 py-4">Waktu / Tanggal</th>
                                            <th className="px-6 py-4">Petugas</th>
                                            <th className="px-6 py-4">Keterangan</th>
                                            <th className="px-6 py-4 text-right">Nominal</th>
                                            <th className="px-6 py-4 text-center">Nota</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {report.expenseList.length > 0 ? (
                                            report.expenseList.map((item, i) => (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                                {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{item.date}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                                                            {item.user?.name || 'Sistem'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 italic">
                                                            {item.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right font-black text-rose-600 text-xs">
                                                        - {formatCurrency(item.amount)}
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        {item.image_url ? (
                                                            <a href={item.image_url} target="_blank" className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl inline-block border border-blue-100 dark:border-blue-800 hover:bg-blue-600 hover:text-white transition-all">
                                                                <IconPhoto size={16}/>
                                                            </a>
                                                        ) : <span className="text-[10px] font-black text-slate-300">N/A</span>}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic font-bold uppercase tracking-widest text-[10px] opacity-40">Belum ada pengeluaran tercatat</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

FinanceReport.layout = (page) => <DashboardLayout children={page} />;

export default FinanceReport;