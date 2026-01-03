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
    IconReceipt, IconUser, IconClock, IconChartBar, 
    IconPhoto, IconLayoutDashboard, IconWallet, IconArrowUpRight, IconPackage
} from "@tabler/icons-react";

const formatCurrency = (value) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(value || 0);

const FinanceReport = ({ auth, report }) => {
    const [activeTab, setActiveTab] = useState('laba-rugi');
    const [startDate, setStartDate] = useState(report.filter.start || "");
    const [endDate, setEndDate] = useState(report.filter.end || "");
    const [filterStaff, setFilterStaff] = useState(report.filter.user_id || "");

    const { data, setData, post, processing, reset, errors } = useForm({
        name: '', amount: '', date: new Date().toISOString().split('T')[0],
        image: null, source: 'Kas Laci', category: 'Operasional',
        capital_source: 'Setoran Pemilik', capital_amount: '',
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
            onSuccess: () => reset('name', 'amount', 'image', 'source', 'category') 
        });
    };

    const submitCapital = (e) => {
        e.preventDefault();
        post(route('capitals.store'), { 
            onSuccess: () => reset('capital_amount', 'capital_source') 
        });
    };

    return (
        <>
            <Head title="Laporan Keuangan" />
            <div className="space-y-6 text-slate-900 dark:text-slate-100">
                
                {/* 1. Header & Tab Navigation */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2 uppercase tracking-tight">
                            <IconCash className="text-emerald-500" size={28} /> Finance Hub
                        </h1>
                        <div className="flex gap-6 mt-6">
                            {['laba-rugi', 'neraca', 'pengeluaran'].map((tab) => (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab)} 
                                    className={`pb-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                                        activeTab === tab 
                                        ? 'border-primary-600 text-primary-600 dark:text-primary-400' 
                                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {tab.replace('-', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeTab !== 'neraca' && (
                        <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-2">
                            <input type="date" className="border-none bg-transparent text-[10px] font-bold focus:ring-0 p-1 dark:text-white uppercase" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            <span className="text-slate-300 dark:text-slate-700">/</span>
                            <input type="date" className="border-none bg-transparent text-[10px] font-bold focus:ring-0 p-1 dark:text-white uppercase" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} className="border-none bg-transparent text-[10px] font-bold focus:ring-0 p-1 uppercase dark:text-white">
                                <option value="" className="dark:bg-slate-900">Semua Staff</option>
                                {report.staffList?.map(s => <option key={s.id} value={s.id} className="dark:bg-slate-900">{s.name}</option>)}
                            </select>
                            <button type="submit" className="bg-primary-600 text-white p-2 rounded-xl transition-all active:scale-95"><IconSearch size={16} /></button>
                        </form>
                    )}
                </div>

                {/* --- TAB CONTENT: LABA RUGI --- */}
                {activeTab === 'laba-rugi' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: 'Laba Kotor', val: report.grossProfit, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500', icon: <IconTrendingUp size={28}/> },
                                { label: 'Total Biaya', val: report.expenses, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500', icon: <IconReceipt2 size={28}/> },
                            ].map((item, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center gap-5 shadow-sm transition-all hover:shadow-md">
                                    <div className={`p-4 ${item.bg} rounded-2xl text-white shadow-lg shadow-black/10`}>{item.icon}</div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{item.label}</p>
                                        <h3 className={`text-xl font-black ${item.color}`}>{formatCurrency(item.val)}</h3>
                                    </div>
                                </div>
                            ))}
                            <div className="bg-emerald-600 dark:bg-emerald-700 p-6 rounded-3xl flex items-center gap-5 text-white shadow-xl shadow-emerald-600/20">
                                <div className="p-4 bg-white/20 rounded-2xl"><IconCash size={28} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest opacity-80">Laba Bersih</p>
                                    <h3 className="text-xl font-black">{formatCurrency(report.netProfit)}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={report.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#94a3b8'}} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', background: '#0f172a', color: '#fff' }} formatter={(v) => formatCurrency(v)} />
                                        <Area type="monotone" dataKey="revenue" name="Omzet" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.1} />
                                        <Area type="monotone" dataKey="expense" name="Beban" stroke="#f43f5e" strokeWidth={3} fill="#f43f5e" fillOpacity={0.1} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Detail Laba Rugi */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-6 italic">Rincian Performa Keuangan</h3>
                            <div className="space-y-4 text-sm font-bold">
                                <div className="flex justify-between text-slate-500 dark:text-slate-400 uppercase tracking-tighter"><span>Total Omzet Penjualan</span><span>{formatCurrency(report.revenue)}</span></div>
                                <div className="flex justify-between text-rose-500 dark:text-rose-400 uppercase tracking-tighter"><span>Total HPP (Modal Barang)</span><span>({formatCurrency(report.hpp)})</span></div>
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between font-black text-blue-600 dark:text-blue-400 text-xl tracking-tighter"><span>LABA KOTOR</span><span>{formatCurrency(report.grossProfit)}</span></div>
                                <div className="flex justify-between text-rose-500 dark:text-rose-400 italic text-xs"><span>- Biaya Operasional Riil</span><span>({formatCurrency(report.expenses)})</span></div>
                                <div className="pt-4 border-t-2 border-dashed border-slate-200 dark:border-slate-800 flex justify-between font-black text-emerald-600 dark:text-emerald-400 text-2xl tracking-tighter"><span>LABA BERSIH (NET)</span><span>{formatCurrency(report.netProfit)}</span></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB CONTENT: NERACA --- */}
                {activeTab === 'neraca' && (
                    <div className="animate-in fade-in duration-500 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-10 transition-colors">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                                <div className="space-y-8">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em] border-b border-blue-50 dark:border-blue-900 pb-4">Aktiva (Harta Toko)</h4>
                                    <div className="space-y-6 text-sm font-bold">
                                        {[
                                            { label: 'Kas di Laci (Harian)', val: report.balanceSheet.cash_in_drawer, color: 'text-slate-600 dark:text-slate-300' },
                                            { label: 'Saldo Modal Luar (Bank)', val: report.balanceSheet.external_capital, color: 'text-emerald-600 dark:text-emerald-400' },
                                            { label: 'Persediaan Barang (Live)', val: report.balanceSheet.inventory_value, color: 'text-slate-600 dark:text-slate-300' },
                                        ].map((item, i) => (
                                            <div key={i} className="flex justify-between uppercase tracking-tighter">
                                                <span className="text-slate-400 dark:text-slate-500">{item.label}</span>
                                                <span className={item.color}>{formatCurrency(item.val)}</span>
                                            </div>
                                        ))}
                                        <div className="pt-8 border-t-4 border-blue-600 dark:border-blue-500 flex justify-between items-center text-blue-600 dark:text-blue-400 text-2xl tracking-tighter"><span>TOTAL ASET</span><span>{formatCurrency(report.balanceSheet.total_assets)}</span></div>
                                    </div>
                                </div>
                                <div className="space-y-8">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.3em] border-b border-emerald-50 dark:border-emerald-900 pb-4">Pasiva (Kewajiban & Modal)</h4>
                                    <div className="space-y-6 text-sm font-bold">
                                        {[
                                            { label: 'Hutang Dagang (Sisa)', val: report.balanceSheet.accounts_payable, color: 'text-rose-600 dark:text-rose-400' },
                                            { label: 'Modal Disetor (Luar)', val: report.balanceSheet.external_capital, color: 'text-slate-600 dark:text-slate-300' },
                                            { label: 'Laba Ditahan (Akumulasi)', val: report.balanceSheet.retained_earnings, color: 'text-slate-600 dark:text-slate-300' },
                                        ].map((item, i) => (
                                            <div key={i} className="flex justify-between uppercase tracking-tighter">
                                                <span className="text-slate-400 dark:text-slate-500">{item.label}</span>
                                                <span className={item.color}>{formatCurrency(item.val)}</span>
                                            </div>
                                        ))}
                                        <div className="pt-8 border-t-4 border-emerald-600 dark:border-emerald-500 flex justify-between items-center text-emerald-600 dark:text-emerald-400 text-2xl tracking-tighter"><span>TOTAL PASIVA</span><span>{formatCurrency(report.balanceSheet.total_assets)}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top 10 & Suntik Modal */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 font-black text-xs uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                                    <IconPackage size={18} className="text-amber-500" /> 10 Aset Barang Terbesar
                                </div>
                                <table className="w-full text-left text-[11px]">
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {report.topAssets?.map((item, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-bold">
                                                <td className="p-4 px-6 uppercase text-slate-700 dark:text-slate-300">{item.title}</td>
                                                <td className="p-4 text-right text-blue-600 dark:text-blue-400">{formatCurrency(item.total_asset_value)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-200 dark:border-emerald-900/50 p-8 shadow-sm">
                                <h5 className="font-black text-[10px] uppercase text-emerald-600 dark:text-emerald-400 mb-6 flex items-center gap-2"><IconPlus size={16}/> Suntik Modal Investasi Baru</h5>
                                <form onSubmit={submitCapital} className="space-y-4">
                                    <input type="text" placeholder="Sumber (Contoh: Setoran Pribadi Bank)" className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm font-bold dark:text-white" value={data.capital_source} onChange={e => setData('capital_source', e.target.value)} />
                                    <input type="number" placeholder="Nominal Rp" className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm font-bold dark:text-white" value={data.capital_amount} onChange={e => setData('capital_amount', e.target.value)} />
                                    <button disabled={processing} className="w-full bg-emerald-600 dark:bg-emerald-700 text-white font-black text-[10px] py-4 rounded-xl uppercase tracking-widest shadow-lg active:scale-95">Update Saldo Modal</button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB CONTENT: PENGELUARAN --- */}
                {activeTab === 'pengeluaran' && (
                    <div className="animate-in fade-in duration-500 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden sticky top-24">
                                <div className="p-5 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                                    <IconPlus size={18} className="text-primary-500" /><span className="font-black text-xs uppercase tracking-widest dark:text-white">Input Biaya / Hutang</span>
                                </div>
                                <form onSubmit={submitExpense} className="p-6 space-y-5">
                                    {['source', 'category'].map((field) => (
                                        <div key={field}>
                                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">{field === 'source' ? 'Sumber Dana' : 'Kategori'}</label>
                                            <select value={data[field]} onChange={e => setData(field, e.target.value)} className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm font-bold dark:text-white">
                                                {field === 'source' ? (
                                                    <>
                                                        <option value="Kas Laci">Kas Laci (Tunai Toko)</option>
                                                        <option value="Modal Luar">Modal Luar (Bank/Pribadi)</option>
                                                        <option value="Hutang Dagang">Hutang Dagang (Bayar Nanti)</option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <option value="Operasional">Operasional (Biaya Murni)</option>
                                                        <option value="Pelunasan Hutang">Pelunasan Hutang (Bayar Supplier)</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    ))}
                                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm font-bold dark:text-white" placeholder="Keterangan" />
                                    <input type="number" value={data.amount} onChange={e => setData('amount', e.target.value)} className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm font-bold dark:text-white" placeholder="Nominal Rp" />
                                    <button disabled={processing} className="w-full bg-primary-600 text-white font-black text-[10px] uppercase py-4 rounded-xl shadow-lg active:scale-95">Catat Transaksi</button>
                                </form>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 tracking-widest text-center">
                                        <tr><th className="p-5 px-8 text-left">Deskripsi & Petugas</th><th>Sumber</th><th className="text-right px-8">Nominal</th><th>Nota</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                                        {report.expenseList.length > 0 ? report.expenseList.map((exp, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                                                <td className="p-5 px-8">
                                                    <span className="uppercase text-slate-800 dark:text-slate-200 mb-1 block">{exp.name}</span>
                                                    <div className="flex items-center gap-2 text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                                                        <IconClock size={10} /> {new Date(exp.created_at).toLocaleTimeString('id-ID')}
                                                        <span className="opacity-30">•</span>
                                                        <IconUser size={10} className="text-primary-500" /> {exp.user?.name || 'Sistem'}
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                                        exp.source === 'Hutang Dagang' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 
                                                        exp.source === 'Modal Luar' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 
                                                        'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    }`}>{exp.source}</span>
                                                </td>
                                                <td className="p-5 text-right px-8 text-rose-600 dark:text-rose-400 font-black">-{formatCurrency(exp.amount)}</td>
                                                <td className="p-5 text-center text-slate-400 dark:text-slate-600">{exp.image_url ? <a href={exp.image_url} target="_blank"><IconPhoto size={16}/></a> : '-'}</td>
                                            </tr>
                                        )) : <tr><td colSpan="4" className="p-10 text-center opacity-40 uppercase text-[10px] font-black dark:text-white">Belum ada data</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

FinanceReport.layout = (page) => <DashboardLayout children={page} />;
export default FinanceReport;