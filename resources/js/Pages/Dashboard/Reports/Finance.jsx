import React, { useState } from "react";
import { Head, router, useForm } from "@inertiajs/react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { 
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
    CartesianGrid, Tooltip, Legend, AreaChart, Area 
} from "recharts";
import {
    IconCash, IconPlus, IconCalendar, IconSearch,
    IconTrendingUp, IconReceipt2, IconTable,
    IconReceipt, IconUser, IconClock, IconChartBar
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
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase">
                            <IconCash className="text-emerald-500" size={28} /> Laporan Keuangan
                        </h1>
                        <p className="text-slate-500 text-sm">Visualisasi laba rugi dan pengeluaran.</p>
                    </div>

                    <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <input type="date" className="border-none bg-transparent text-xs font-bold focus:ring-0 p-1 text-slate-700 dark:text-slate-300" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        <span className="text-slate-300">/</span>
                        <input type="date" className="border-none bg-transparent text-xs font-bold focus:ring-0 p-1 text-slate-700 dark:text-slate-300" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} className="border-none bg-transparent text-xs font-bold focus:ring-0 p-1 text-slate-700 dark:text-slate-300 ml-2">
                            <option value="">Semua Staff</option>
                            {report.staffList?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <button type="submit" className="bg-primary-600 text-white p-2 rounded-xl"><IconSearch size={18} /></button>
                    </form>
                </div>

                {/* 2. Kartu Ringkasan */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                        <div className="p-4 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-500/30"><IconTrendingUp size={28} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Laba Kotor</p>
                            <h3 className="text-xl font-black text-blue-600">{formatCurrency(report.grossProfit)}</h3>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                        <div className="p-4 bg-rose-500 rounded-2xl text-white shadow-lg shadow-rose-500/30"><IconReceipt2 size={28} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Beban</p>
                            <h3 className="text-xl font-black text-rose-600">{formatCurrency(report.expenses)}</h3>
                        </div>
                    </div>
                    <div className="bg-emerald-600 p-6 rounded-3xl flex items-center gap-4 text-white shadow-xl shadow-emerald-600/20">
                        <div className="p-4 bg-white/20 rounded-2xl"><IconCash size={28} /></div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Laba Bersih</p>
                            <h3 className="text-xl font-black">{formatCurrency(report.netProfit)}</h3>
                        </div>
                    </div>
                </div>

                {/* 3. CHART SECTION (Trend Penjualan vs Pengeluaran) */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><IconChartBar size={20} /></div>
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Trend Arus Kas</h3>
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
                    {/* Input Pengeluaran & Log Detail tetap sama seperti kode sebelumnya */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 flex items-center gap-2">
                                <IconPlus size={18} className="text-primary-500" />
                                <span className="font-black text-xs uppercase tracking-widest">Input Pengeluaran</span>
                            </div>
                            <form onSubmit={submitExpense} className="p-6 space-y-5">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Keterangan</label>
                                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-sm font-bold" placeholder="Bayar Listrik" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Nominal</label>
                                    <input type="number" value={data.amount} onChange={e => setData('amount', e.target.value)} className="w-full rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-sm font-bold" />
                                </div>
                                <button disabled={processing} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50">
                                    Simpan Transaksi
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        {/* Tabel Log Pengeluaran */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 flex items-center gap-2">
                                <IconClock size={18} className="text-blue-600" />
                                <span className="font-black text-xs uppercase tracking-widest">Log Pengeluaran Kas</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 text-[9px] uppercase font-black">
                                        <tr>
                                            <th className="px-6 py-4">Waktu</th>
                                            <th className="px-6 py-4">Petugas</th>
                                            <th className="px-6 py-4 text-right">Nominal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {report.expenseList.length > 0 ? report.expenseList.map((item, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">{new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{item.date}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-[11px] font-black uppercase text-slate-600 dark:text-slate-400">{item.user?.name || 'Sistem'}</td>
                                                <td className="px-6 py-4 text-right font-black text-rose-600 text-xs">- {formatCurrency(item.amount)}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="3" className="px-6 py-10 text-center text-xs font-bold text-slate-400 uppercase">Belum ada data</td></tr>
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