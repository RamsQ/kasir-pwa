import React, { useEffect, useState } from "react";
import { Head, router, Link, usePage } from "@inertiajs/react"; // <-- Import usePage
import DashboardLayout from "@/Layouts/DashboardLayout";
import Swal from "sweetalert2";
import Pagination from "@/Components/Dashboard/Pagination";
import {
    IconDatabaseOff,
    IconSearch,
    IconHistory,
    IconReceipt,
    IconPrinter,
    IconFilter,
    IconX,
    IconRefresh,
    IconTrash,
} from "@tabler/icons-react";

const defaultFilters = {
    invoice: "",
    start_date: "",
    end_date: "",
};

const formatCurrency = (value = 0) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(value);

const History = ({ transactions, filters }) => {
    // --- CEK PERMISSION ---
    const { auth } = usePage().props;
    // Cek apakah user punya role 'super-admin'
    const isSuperAdmin = auth.user.roles.some(role => role.name === 'super-admin');

    const [filterData, setFilterData] = useState({
        ...defaultFilters,
        ...filters,
    });
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        setFilterData({
            ...defaultFilters,
            ...filters,
        });
    }, [filters]);

    const handleChange = (field, value) => {
        setFilterData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const applyFilters = (event) => {
        event.preventDefault();
        router.get(route("transactions.history"), filterData, {
            preserveScroll: true,
            preserveState: true,
        });
        setShowFilters(false);
    };

    const resetFilters = () => {
        setFilterData(defaultFilters);
        router.get(route("transactions.history"), defaultFilters, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    // --- FUNGSI REFUND ---
    const handleRefund = (id) => {
        Swal.fire({
            title: "Otorisasi Refund",
            text: "Masukkan password Akun Anda untuk konfirmasi refund.",
            input: "password",
            inputAttributes: {
                autocapitalize: "off",
                placeholder: "Password...",
            },
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#f59e0b",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Verifikasi & Refund",
            cancelButtonText: "Batal",
            showLoaderOnConfirm: true,
            preConfirm: (password) => {
                if (!password) {
                    Swal.showValidationMessage("Password wajib diisi!");
                }
                return password;
            },
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(
                    route("transactions.refund", id),
                    { password: result.value },
                    {
                        onSuccess: () => {
                            Swal.fire("Berhasil!", "Transaksi telah direfund.", "success");
                        },
                        onError: (errors) => {
                            Swal.fire("Gagal!", errors.error || "Password salah.", "error");
                        },
                    }
                );
            }
        });
    };

    // --- FUNGSI RESET DATA (Hanya Dipanggil Super Admin) ---
    const handleReset = () => {
        Swal.fire({
            title: "BAHAYA! HAPUS SEMUA?",
            text: "Seluruh riwayat transaksi & profit akan dihapus permanen! Invoice kembali ke 0. Data tidak bisa kembali.",
            icon: "error",
            input: "password",
            inputAttributes: {
                placeholder: "Masukkan Password Super Admin...",
                autocapitalize: "off",
            },
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "YA, RESET SEKARANG!",
            cancelButtonText: "Batal",
            showLoaderOnConfirm: true,
            preConfirm: (password) => {
                if (!password) {
                    Swal.showValidationMessage("Password wajib diisi!");
                }
                return password;
            },
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route("transactions.reset"), {
                    data: { password: result.value },
                    onSuccess: () => {
                        Swal.fire("DIRESET!", "Database transaksi bersih.", "success");
                    },
                    onError: (errors) => {
                        Swal.fire("Gagal!", errors.error || "Terjadi kesalahan.", "error");
                    },
                });
            }
        });
    };

    const rows = transactions?.data ?? [];
    const links = transactions?.links ?? [];
    const currentPage = transactions?.current_page ?? 1;
    const perPage = transactions?.per_page ? Number(transactions?.per_page) : rows.length || 1;
    const hasActiveFilters = filterData.invoice || filterData.start_date || filterData.end_date;

    return (
        <>
            <Head title="Riwayat Transaksi" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <IconHistory size={28} className="text-primary-500" />
                            Riwayat Transaksi
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {transactions?.total || 0} transaksi tercatat
                        </p>
                    </div>
                    <div className="flex gap-2">
                        
                        {/* HANYA RENDER TOMBOL JIKA SUPER ADMIN */}
                        {isSuperAdmin && (
                            <button
                                onClick={handleReset}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors text-sm font-medium"
                                title="Hapus Semua Data"
                            >
                                <IconTrash size={18} />
                                <span className="hidden sm:inline">Reset Data</span>
                            </button>
                        )}

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                                showFilters || hasActiveFilters
                                    ? "bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-950/50 dark:border-primary-800 dark:text-primary-400"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            }`}
                        >
                            <IconFilter size={18} />
                            <span>Filter</span>
                            {hasActiveFilters && (
                                <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                            )}
                        </button>
                        <Link
                            href={route("transactions.index")}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors shadow-lg shadow-primary-500/30"
                        >
                            <IconReceipt size={18} />
                            <span>Transaksi Baru</span>
                        </Link>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 animate-slide-up">
                        <form onSubmit={applyFilters}>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Nomor Invoice
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="TRX-..."
                                        value={filterData.invoice}
                                        onChange={(e) => handleChange("invoice", e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Tanggal Mulai
                                    </label>
                                    <input
                                        type="date"
                                        value={filterData.start_date}
                                        onChange={(e) => handleChange("start_date", e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Tanggal Akhir
                                    </label>
                                    <input
                                        type="date"
                                        value={filterData.end_date}
                                        onChange={(e) => handleChange("end_date", e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                    />
                                </div>
                                <div className="flex items-end gap-2">
                                    <button
                                        type="submit"
                                        className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors"
                                    >
                                        <IconSearch size={18} />
                                        <span>Cari</span>
                                    </button>
                                    {hasActiveFilters && (
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <IconX size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Transaction List */}
                {rows.length > 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">No</th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Invoice</th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kasir</th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pelanggan</th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Item</th>
                                        <th className="px-4 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                                        <th className="px-4 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Profit</th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {rows.map((transaction, index) => (
                                        <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {index + 1 + (currentPage - 1) * perPage}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{transaction.invoice}</span>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">{transaction.created_at}</td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">{transaction.cashier?.name ?? "-"}</td>
                                            <td className="px-4 py-4">
                                                <span className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                                                    {transaction.customer?.name ?? "Umum"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="px-2 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400 rounded-full">
                                                    {transaction.total_items ?? 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(transaction.grand_total ?? 0)}
                                            </td>
                                            <td className="px-4 py-4 text-right text-sm font-semibold text-success-600 dark:text-success-400">
                                                {formatCurrency(transaction.total_profit ?? 0)}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        href={route("transactions.print", transaction.invoice)}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors"
                                                        title="Cetak Struk"
                                                    >
                                                        <IconPrinter size={18} />
                                                    </Link>

                                                    {transaction.payment_status !== "refunded" ? (
                                                        <button
                                                            onClick={() => handleRefund(transaction.id)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                                            title="Refund Transaksi"
                                                        >
                                                            <IconRefresh size={18} />
                                                        </button>
                                                    ) : (
                                                        <span className="px-2 py-1 text-[10px] font-bold text-red-600 bg-red-100 rounded-full">REFUND</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <IconDatabaseOff size={32} className="text-slate-400" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-1">Belum Ada Transaksi</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {hasActiveFilters ? "Tidak ada transaksi sesuai filter." : "Transaksi akan muncul di sini."}
                        </p>
                    </div>
                )}

                {links.length > 3 && <Pagination links={links} />}
            </div>
        </>
    );
};

History.layout = (page) => <DashboardLayout children={page} />;

export default History;