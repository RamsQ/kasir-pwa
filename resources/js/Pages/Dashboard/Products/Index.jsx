import React, { useState, useRef } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import Pagination from "@/Components/Dashboard/Pagination";
import {
    IconPencil,
    IconTrash,
    IconPlus,
    IconSearch,
    IconPackage,
    IconFileTypeXls,
    IconDownload,
    IconUpload,
} from "@tabler/icons-react";

export default function Index({ products, search }) {
    const [searchQuery, setSearchQuery] = useState(search || "");
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Ref untuk input file import
    const fileInputRef = useRef(null);

    // --- 1. SEARCH ---
    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route("products.index"), { search: searchQuery }, { preserveState: true });
    };

    // --- 2. CHECKBOX LOGIC ---
    const handleCheckAll = (e) => {
        if (e.target.checked) {
            const allIds = products.data.map((product) => product.id);
            setSelectedIds(allIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleCheckOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((itemId) => itemId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    // --- 3. DELETE LOGIC ---
    const deleteProduct = (id) => {
        if (confirm("Hapus satu produk ini?")) {
            router.delete(route("products.destroy", id));
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        if (confirm(`Yakin hapus ${selectedIds.length} produk terpilih?`)) {
            router.post(route("products.bulk_destroy"), { ids: selectedIds }, {
                onSuccess: () => setSelectedIds([])
            });
        }
    };

    // --- 4. IMPORT EXCEL LOGIC ---
    const handleImportClick = () => {
        fileInputRef.current.click(); // Trigger input file yang tersembunyi
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Langsung upload saat file dipilih
            const formData = new FormData();
            formData.append("file", file);
            
            router.post(route("products.import"), formData, {
                onSuccess: () => {
                    fileInputRef.current.value = ""; // Reset input
                    alert("Import berhasil!");
                },
                onError: () => {
                    fileInputRef.current.value = ""; // Reset input
                    alert("Gagal import, cek format excel Anda.");
                }
            });
        }
    };

    return (
        <>
            <Head title="Produk" />

            {/* Input File Tersembunyi untuk Import */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".xlsx, .xls"
            />

            <div className="mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <IconPackage size={28} className="text-primary-500" />
                        Manajemen Produk
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* --- TOMBOL DELETE MASSAL --- */}
                    <button
                        onClick={handleBulkDelete}
                        disabled={selectedIds.length === 0}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            selectedIds.length > 0
                                ? "bg-red-500 hover:bg-red-600 text-white shadow-md animate-pulse"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600"
                        }`}
                    >
                        <IconTrash size={18} />
                        {selectedIds.length > 0 ? `Hapus (${selectedIds.length})` : "Hapus Banyak"}
                    </button>

                    {/* --- TOMBOL DOWNLOAD TEMPLATE --- */}
                    <a
                        href={route("products.template")}
                        className="bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                        <IconDownload size={18} />
                        Template
                    </a>

                    {/* --- TOMBOL IMPORT EXCEL --- */}
                    <button
                        onClick={handleImportClick}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        <IconFileTypeXls size={18} />
                        Import Excel
                    </button>

                    {/* --- TOMBOL TAMBAH PRODUK --- */}
                    <Link
                        href={route("products.create")}
                        className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        <IconPlus size={18} />
                        Tambah
                    </Link>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 shadow-sm">
                <form onSubmit={handleSearch} className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IconSearch size={18} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="Cari produk berdasarkan nama atau barcode..."
                    />
                </form>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th scope="col" className="px-4 py-4 w-10 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                        onChange={handleCheckAll}
                                        checked={products.data.length > 0 && selectedIds.length === products.data.length}
                                    />
                                </th>
                                <th scope="col" className="px-6 py-4">Barcode</th>
                                <th scope="col" className="px-6 py-4">Nama Produk</th>
                                <th scope="col" className="px-6 py-4">Harga</th>
                                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {products.data.map((product) => (
                                <tr key={product.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedIds.includes(product.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                    <td className="px-4 py-4 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                            checked={selectedIds.includes(product.id)}
                                            onChange={() => handleCheckOne(product.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-500">{product.barcode || '-'}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900 dark:text-white">{product.title}</div>
                                        {product.expired_date && <span className="text-xs text-red-500 bg-red-50 px-1 py-0.5 rounded">Exp: {product.expired_date}</span>}
                                    </td>
                                    <td className="px-6 py-4">Rp {new Intl.NumberFormat("id-ID").format(product.sell_price)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <Link href={route("products.edit", product.id)} className="p-2 bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100 transition-colors"><IconPencil size={18} /></Link>
                                            <button onClick={() => deleteProduct(product.id)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"><IconTrash size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                    <Pagination links={products.links} />
                </div>
            </div>
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;