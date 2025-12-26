import React, { useEffect, useState } from "react";
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
import { getProductImageUrl } from "@/Utils/imageUrl";

export default function Edit({ categories, product, products }) {
    const { errors } = usePage().props;

    // Transformasi data pivot bundle agar sesuai format form
    const initialBundleItems = product.bundle_items?.map((item) => ({
        item_id: item.id,
        qty: item.pivot.qty,
    })) || [{ item_id: "", qty: 1 }];

    const { data, setData, post, processing } = useForm({
        image: "",
        barcode: product.barcode,
        title: product.title,
        category_id: product.category_id,
        description: product.description,
        buy_price: product.buy_price,
        sell_price: product.sell_price,
        stock: product.stock,
        expired_date: product.expired_date ?? "",
        type: product.type, 
        bundle_items: initialBundleItems,
        _method: "PUT",
    });

    const [selectedCategory, setSelectedCategory] = useState(null);
    const [imagePreview, setImagePreview] = useState(
        product.image ? getProductImageUrl(product.image) : null
    );

    useEffect(() => {
        if (product.category_id) {
            setSelectedCategory(
                categories.find((cat) => cat.id === product.category_id)
            );
        }
    }, [product.category_id, categories]);

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

    // --- LOGIC AUTO CALCULATE MODAL (REUSE FROM CREATE) ---
    const calculateTotalModal = (items) => {
        if (data.type !== 'bundle') return;
        
        let totalModal = 0;
        items.forEach(item => {
            const originalProduct = products.find(p => p.id == item.item_id);
            if (originalProduct) {
                totalModal += parseFloat(originalProduct.buy_price) * parseInt(item.qty || 0);
            }
        });

        setData(prevData => ({
            ...prevData,
            buy_price: totalModal,
            bundle_items: items
        }));
    };

    // --- LOGIC BUNDLING ---
    const addBundleItem = () => {
        setData("bundle_items", [...data.bundle_items, { item_id: "", qty: 1 }]);
    };

    const removeBundleItem = (index) => {
        const list = [...data.bundle_items];
        list.splice(index, 1);
        // Jika tipe bundle, hitung ulang modal setelah hapus
        if (data.type === 'bundle') {
            calculateTotalModal(list);
        } else {
            setData("bundle_items", list);
        }
    };

    const handleItemChange = (index, field, value) => {
        const list = [...data.bundle_items];
        list[index][field] = value;
        
        // Jika tipe bundle, hitung ulang modal saat ada perubahan item/qty
        if (data.type === 'bundle') {
            calculateTotalModal(list);
        } else {
            setData("bundle_items", list);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        post(route("products.update", product.id), {
            onSuccess: () => toast.success("Produk berhasil diperbarui"),
            onError: () => toast.error("Gagal memperbarui produk"),
        });
    };

    return (
        <>
            <Head title="Edit Produk" />

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
                    Edit Produk
                </h1>
                <p className="text-sm text-slate-500 mt-1 uppercase font-bold">{product.title}</p>
            </div>

            <form onSubmit={submit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                <IconPhoto size={18} />
                                Gambar Produk
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
                            <Input type="file" label="Ganti Gambar" onChange={handleImageChange} errors={errors.image} accept="image/*" />
                        </div>

                         <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Jenis Produk</h3>
                            <div className={`px-4 py-3 rounded-xl text-sm font-bold uppercase flex items-center gap-2 ${data.type === 'bundle' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                <IconPackage size={18} />
                                {data.type === 'single' ? 'Produk Biasa (Single)' : 'Paket Bundling'}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">* Tipe produk tidak dapat diubah setelah dibuat.</p>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2"><IconBarcode size={18} /> Informasi Dasar</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <InputSelect label="Kategori" data={categories} selected={selectedCategory} setSelected={setSelectedCategoryHandler} placeholder="Pilih kategori" errors={errors.category_id} searchable={true} displayKey="name" />
                                </div>
                                <Input type="text" label="Barcode / SKU" value={data.barcode} onChange={(e) => setData("barcode", e.target.value)} errors={errors.barcode} placeholder="Kode produk" />
                                <Input type="text" label="Nama Produk" value={data.title} onChange={(e) => setData("title", e.target.value)} errors={errors.title} placeholder="Nama produk" />
                                <div className="md:col-span-2">
                                    <Textarea label="Deskripsi" placeholder="Deskripsi produk" errors={errors.description} onChange={(e) => setData("description", e.target.value)} value={data.description} rows={3} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2"><IconCurrencyDollar size={18} /> Harga & Stok</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input 
                                    type="number" 
                                    label={data.type === 'bundle' ? "Harga Beli (Auto-akumulasi)" : "Harga Beli"} 
                                    value={data.buy_price} 
                                    onChange={(e) => setData("buy_price", e.target.value)} 
                                    errors={errors.buy_price} 
                                    placeholder="0" 
                                    readOnly={data.type === 'bundle'}
                                    className={data.type === 'bundle' ? 'bg-slate-50 cursor-not-allowed font-bold text-primary-600' : ''}
                                />
                                <Input type="number" label="Harga Jual" value={data.sell_price} onChange={(e) => setData("sell_price", e.target.value)} errors={errors.sell_price} placeholder="0" />
                                
                                {data.type === "single" && (
                                    <Input type="number" label="Stok" value={data.stock} onChange={(e) => setData("stock", e.target.value)} errors={errors.stock} placeholder="0" />
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tanggal Kadaluarsa</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><IconCalendar size={18} className="text-slate-400" /></div>
                                        <input type="date" className="pl-10 w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-primary-500 sm:text-sm" value={data.expired_date} onChange={(e) => setData("expired_date", e.target.value)} />
                                    </div>
                                    {errors.expired_date && <p className="mt-1 text-sm text-red-600">{errors.expired_date}</p>}
                                </div>
                            </div>
                        </div>

                        {data.type === "bundle" && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm ring-1 ring-primary-500/10">
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2"><IconPackage size={18} /> Isi Paket Bundling</h3>
                                <div className="space-y-3">
                                    {data.bundle_items.map((item, index) => (
                                        <div key={index} className="flex items-end gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex-1">
                                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Produk Penyusun</label>
                                                <select className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm focus:ring-primary-500 py-2.5" value={item.item_id} onChange={(e) => handleItemChange(index, "item_id", e.target.value)}>
                                                    <option value="">-- Pilih Produk --</option>
                                                    {products.map((p) => (
                                                        <option key={p.id} value={p.id}>{p.title} (Modal: Rp{p.buy_price})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-24">
                                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Qty</label>
                                                <input type="number" min="1" className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm focus:ring-primary-500 py-2.5" value={item.qty} onChange={(e) => handleItemChange(index, "qty", e.target.value)} />
                                            </div>
                                            <button type="button" onClick={() => removeBundleItem(index)} className="p-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><IconTrash size={18} /></button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={addBundleItem} className="mt-4 flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"><IconPlus size={18} /> Tambah Item</button>
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <Link href={route("products.index")} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium transition-colors">Batal</Link>
                            <button type="submit" disabled={processing} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors disabled:opacity-50">
                                <IconDeviceFloppy size={18} />
                                {processing ? "Menyimpan..." : "Simpan Perubahan"}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;