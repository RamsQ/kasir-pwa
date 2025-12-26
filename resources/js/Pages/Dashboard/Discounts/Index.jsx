import React from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import Pagination from "@/Components/Dashboard/Pagination";
import { IconPlus, IconTicket, IconTrash } from "@tabler/icons-react";
import Swal from "sweetalert2";

export default function Index({ discounts }) {
    const handleDelete = (id) => {
        Swal.fire({
            title: "Hapus Promo?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            confirmButtonText: "Ya, Hapus!",
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route("discounts.destroy", id));
            }
        });
    };

    return (
        <>
            <Head title="Manajemen Diskon" />
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <IconTicket className="text-primary-500" /> Manajemen Promo & Diskon
                    </h1>
                    <Link href={route("discounts.create")} className="bg-primary-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary-600">
                        <IconPlus size={18} /> Tambah Promo
                    </Link>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Nama Promo</th>
                                <th className="px-6 py-4">Tipe</th>
                                <th className="px-6 py-4">Nilai</th>
                                <th className="px-6 py-4">Min. Belanja</th>
                                <th className="px-6 py-4">Periode</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {discounts.data.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{item.name}</td>
                                    <td className="px-6 py-4 capitalize badge">
                                        <span className={item.type === 'percentage' ? 'bg-blue-100 text-blue-700 px-2 py-1 rounded' : 'bg-green-100 text-green-700 px-2 py-1 rounded'}>
                                            {item.type === 'percentage' ? 'Persentase' : 'Nominal'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold">
                                        {item.type === 'percentage' ? `${item.value}%` : `Rp ${Number(item.value).toLocaleString('id-ID')}`}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        Rp {Number(item.min_transaction).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">
                                        {item.start_date} s/d {item.end_date}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                                            <IconTrash size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {discounts.data.length === 0 && <div className="p-6 text-center text-slate-500">Belum ada promo aktif.</div>}
                </div>
                <Pagination links={discounts.links} />
            </div>
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;