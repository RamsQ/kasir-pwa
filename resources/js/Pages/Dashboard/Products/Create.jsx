import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, usePage, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import Textarea from "@/Components/Dashboard/TextArea";
import InputSelect from "@/Components/Dashboard/InputSelect";
import toast from "react-hot-toast";
import {
    IconPackage,
    IconDeviceFloppy,
    IconArrowLeft,
    IconPhoto,
    IconBarcode,
    IconCurrencyDollar,
    IconCalendar,
    IconPlus,
    IconTrash,
} from "@tabler/icons-react";

export default function Create({ categories, products }) {
    const { errors } = usePage().props;

    const { data, setData, post, processing } = useForm({
        image: "",
        barcode: "",
        title: "",
        category_id: "",
        description: "",
        buy_price: "",
        sell_price: "",
        stock: "", 
        expired_date: "",
        type: "single",
        bundle_items: [{ item_id: "", qty: 1 }],
    });

    const [selectedCategory, setSelectedCategory] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const setSelectedCategoryHandler = (value) => {
        setSelectedCategory(value);
        setData("category_id", value?.id || "");
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData("image", file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // --- LOGIC AUTO CALCULATE MODAL ---
    const calculateTotalModal = (items) => {
        let totalModal = 0;
        
        items.forEach(item => {
            // Cari data produk asli berdasarkan item_id yang dipilih
            const originalProduct = products.find(p => p.id == item.item_id);
            if (originalProduct) {
                totalModal += parseFloat(originalProduct.buy_price) * parseInt(item.qty || 0);
            }
        });

        // Set data buy_price dan bundle_items secara bersamaan
        setData(prevData => ({
            ...prevData,
            buy_price: totalModal,
            bundle_items: items
        }));
    };

    // --- LOGIC BUNDLING ---
    const addBundleItem = () => {
        const newList = [...data.bundle_items, { item_id: "", qty: 1 }];
        setData("bundle_items", newList);
        // Tidak perlu hitung modal di sini karena item baru masih kosong
    };

    const removeBundleItem = (index) => {
        const newList = [...data.bundle_items];
        newList.splice(index, 1);
        calculateTotalModal(newList); // Hitung ulang modal setelah item dihapus
    };

    const handleItemChange = (index, field, value) => {
        const newList = [...data.bundle_items];
        newList[index][field] = value;
        
        // Jalankan kalkulasi setiap ada perubahan produk atau qty
        calculateTotalModal(newList);
    };

    const submit = (e) => {
        e.preventDefault();
        post(route("products.store"), {
            onSuccess: () => toast.success("Produk berhasil ditambahkan"),
            onError: (err) => {
                toast.error("Gagal menyimpan produk");
                console.log("Error Validation:", err);
            },
        });
    };

    return (
        <>
            <Head title="Tambah Produk" />

            <div className="mb-6">
                <Link
                    href={route("products.index")}
                    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 mb-3"
                >
                    <IconArrowLeft size={16} />
                    Kembali ke Produk
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <IconPackage size={28} className="text-primary-500" />
                    Tambah Produk Baru
                </h1>
            </div>

            <form onSubmit={submit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                <IconPhoto size={18} />
                                Gambar Produk (Opsional)
                            </h3>
                            <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden mb-4">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center p-6">
                                        <IconPhoto size={48} className="mx-auto text-slate-400 mb-2" />
                                        <p className="text-sm text-slate-500">Belum ada gambar</p>
                                    </div>
                                )}
                            </div>
                            <Input
                                type="file"
                                label="Upload Gambar"
                                onChange={handleImageChange}
                                errors={errors.image}
                                accept="image/*"
                            />
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Jenis Produk</h3>
                            <div className="flex flex-col gap-3">
                                <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${data.type === 'single' ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800' : 'border-slate-200 dark:border-slate-700'}`}>
                                    <input type="radio" name="type" value="single" checked={data.type === "single"} onChange={(e) => setData("type", e.target.value)} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Produk Biasa (Single)</span>
                                </label>
                                <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${data.type === 'bundle' ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800' : 'border-slate-200 dark:border-slate-700'}`}>
                                    <input type="radio" name="type" value="bundle" checked={data.type === "bundle"} onChange={(e) => setData("type", e.target.value)} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Paket Bundling</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                <IconBarcode size={18} /> Informasi Dasar
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <InputSelect
                                        label="Kategori"
                                        data={categories}
                                        selected={selectedCategory}
                                        setSelected={setSelectedCategoryHandler}
                                        placeholder="Pilih kategori"
                                        errors={errors.category_id}
                                        searchable={true}
                                        displayKey="name"
                                    />
                                </div>
                                <Input type="text" label="Barcode / SKU (Opsional)" value={data.barcode} onChange={(e) => setData("barcode", e.target.value)} errors={errors.barcode} placeholder="Masukkan kode produk" />
                                <Input type="text" label="Nama Produk" value={data.title} onChange={(e) => setData("title", e.target.value)} errors={errors.title} placeholder="Masukkan nama produk" />
                                <div className="md:col-span-2">
                                    <Textarea label="Deskripsi (Opsional)" placeholder="Deskripsi produk" errors={errors.description} onChange={(e) => setData("description", e.target.value)} value={data.description} rows={3} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                <IconCurrencyDollar size={18} /> Harga & Stok
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input 
                                    type="number" 
                                    label={data.type === 'bundle' ? "Harga Beli (Auto-akumulasi)" : "Harga Beli"} 
                                    value={data.buy_price} 
                                    onChange={(e) => setData("buy_price", e.target.value)} 
                                    errors={errors.buy_price} 
                                    placeholder="0" 
                                    readOnly={data.type === 'bundle'} // Lock field jika bundle agar akurat, hapus jika ingin tetap bisa edit manual
                                    className={data.type === 'bundle' ? 'bg-slate-50 dark:bg-slate-800 cursor-not-allowed' : ''}
                                />
                                <Input type="number" label="Harga Jual" value={data.sell_price} onChange={(e) => setData("sell_price", e.target.value)} errors={errors.sell_price} placeholder="0" />
                                
                                {data.type === "single" && (
                                    <Input type="number" label="Stok" value={data.stock} onChange={(e) => setData("stock", e.target.value)} errors={errors.stock} placeholder="0" />
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tanggal Kadaluarsa (Opsional)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><IconCalendar size={18} className="text-slate-400" /></div>
                                        <input type="date" className="pl-10 w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm" value={data.expired_date} onChange={(e) => setData("expired_date", e.target.value)} />
                                    </div>
                                    {errors.expired_date && <p className="mt-1 text-sm text-red-600">{errors.expired_date}</p>}
                                </div>
                            </div>
                        </div>

                        {/* --- AREA BUNDLE ITEMS --- */}
                        {data.type === "bundle" && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm ring-1 ring-primary-500/10">
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                    <IconPackage size={18} className="text-primary-500" /> Isi Paket Bundling
                                </h3>
                                <div className="space-y-3">
                                    {data.bundle_items.map((item, index) => (
                                        <div key={index} className="flex items-end gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex-1">
                                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Produk Penyusun</label>
                                                <select 
                                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm focus:border-primary-500 focus:ring-primary-500 py-2.5" 
                                                    value={item.item_id} 
                                                    onChange={(e) => handleItemChange(index, "item_id", e.target.value)}
                                                >
                                                    <option value="">-- Pilih Produk --</option>
                                                    {products.map((p) => (
                                                        <option key={p.id} value={p.id}>{p.title} (Modal: Rp{p.buy_price})</option>
                                                    ))}
                                                </select>
                                                {errors[`bundle_items.${index}.item_id`] && <p className="text-red-500 text-xs mt-1">Pilih produk</p>}
                                            </div>
                                            <div className="w-24">
                                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Qty</label>
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm focus:border-primary-500 focus:ring-primary-500 py-2.5" 
                                                    value={item.qty} 
                                                    onChange={(e) => handleItemChange(index, "qty", e.target.value)} 
                                                />
                                            </div>
                                            <button type="button" onClick={() => removeBundleItem(index)} className="p-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"><IconTrash size={18} /></button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={addBundleItem} className="mt-4 flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"><IconPlus size={18} /> Tambah Item Lain</button>
                                {errors.bundle_items && <p className="mt-2 text-sm text-red-600">{errors.bundle_items}</p>}
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <Link href={route("products.index")} className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors">Batal</Link>
                            <button type="submit" disabled={processing} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors disabled:opacity-50 shadow-lg shadow-primary-500/25"><IconDeviceFloppy size={18} /> {processing ? "Menyimpan..." : "Simpan Produk"}</button>
                        </div>
                    </div>
                </div>
            </form>
        </>
    );
}

Create.layout = (page) => <DashboardLayout children={page} />;