import React, { useEffect, useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, usePage, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import Textarea from "@/Components/Dashboard/TextArea";
import InputSelect from "@/Components/Dashboard/InputSelect";
import toast from "react-hot-toast";
import {
    IconPackage, IconDeviceFloppy, IconArrowLeft, IconPhoto,
    IconBarcode, IconCurrencyDollar, IconCalendar, IconPlus,
    IconTrash, IconScale, IconX
} from "@tabler/icons-react";

export default function Edit({ categories, product, products }) {
    const { errors } = usePage().props;

    // Transformasi data bundle items dari pivot
    const initialBundleItems = product.bundle_items?.map((item) => ({
        item_id: item.id,
        qty: item.pivot.qty,
        product_unit_id: item.pivot.product_unit_id || "", 
    })) || [{ item_id: "", qty: 1, product_unit_id: "" }];

    // Transformasi data multi-satuan
    const initialUnits = product.units?.map((u) => ({
        unit_name: u.unit_name,
        conversion: u.conversion,
        sell_price: u.sell_price,
    })) || [];

    const { data, setData, post, processing } = useForm({
        image: "",
        barcode: product.barcode || "",
        title: product.title,
        category_id: product.category_id,
        description: product.description,
        buy_price: product.buy_price,
        sell_price: product.sell_price,
        stock: product.stock,
        unit: product.unit || "Pcs",
        expired_date: product.expired_date ?? "",
        type: product.type, 
        bundle_items: initialBundleItems,
        units: initialUnits,
        _method: "PUT",
    });

    const [selectedCategory, setSelectedCategory] = useState(null);
    
    /**
     * PERBAIKAN UTAMA:
     * Langsung gunakan product.image karena Model sudah memberikan URL lengkap.
     * Jangan gunakan fungsi getProductImageUrl lagi untuk menghindari URL dobel.
     */
    const [imagePreview, setImagePreview] = useState(product.image || null);

    useEffect(() => {
        if (product.category_id) {
            setSelectedCategory(categories.find((cat) => cat.id === product.category_id));
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

    const calculateTotalModal = (items) => {
        if (data.type !== 'bundle') return;
        let totalModal = 0;
        items.forEach(item => {
            const originalProduct = products.find(p => p.id == item.item_id);
            if (originalProduct) totalModal += parseFloat(originalProduct.buy_price) * parseFloat(item.qty || 0);
        });
        setData(prevData => ({ ...prevData, buy_price: totalModal, bundle_items: items }));
    };

    const addBundleItem = () => {
        setData("bundle_items", [...data.bundle_items, { item_id: "", qty: 1, product_unit_id: "" }]);
    };

    const removeBundleItem = (index) => {
        const list = [...data.bundle_items];
        list.splice(index, 1);
        data.type === 'bundle' ? calculateTotalModal(list) : setData("bundle_items", list);
    };

    const handleItemChange = (index, field, value) => {
        const list = [...data.bundle_items];
        list[index][field] = value;
        if (field === "item_id") list[index]["product_unit_id"] = "";
        data.type === 'bundle' ? calculateTotalModal(list) : setData("bundle_items", list);
    };

    const addUnitRow = () => setData("units", [...data.units, { unit_name: "", conversion: 1, sell_price: 0 }]);
    const removeUnitRow = (index) => setData("units", data.units.filter((_, i) => i !== index));
    const updateUnitData = (index, field, value) => {
        const newUnits = [...data.units];
        newUnits[index][field] = value;
        setData("units", newUnits);
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
                <Link href={route("products.index")} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 mb-3 uppercase font-bold tracking-tight">
                    <IconArrowLeft size={16} /> Kembali ke Produk
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                    <IconPackage size={28} className="text-primary-500" /> Edit Produk
                </h1>
            </div>

            <form onSubmit={submit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 flex items-center gap-2 tracking-widest"><IconPhoto size={18} /> Gambar Produk</h3>
                            <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden mb-4 text-center">
                                {imagePreview ? (
                                    <img 
                                        src={imagePreview} 
                                        alt="Preview" 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.title)}&background=random` }}
                                    />
                                ) : (
                                    <IconPhoto size={48} className="text-slate-400" />
                                )}
                            </div>
                            <Input type="file" label="Ganti Gambar" onChange={handleImageChange} errors={errors.image} accept="image/*" />
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Jenis Produk</h3>
                            <div className={`px-4 py-3 rounded-xl text-xs font-bold uppercase flex items-center gap-2 ${data.type === 'bundle' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                                <IconPackage size={18} /> {data.type === 'single' ? 'Produk Biasa (Retail)' : 'Paket Bundling'}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 flex items-center gap-2 tracking-widest"><IconBarcode size={18} /> Informasi Dasar</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2"><InputSelect label="Kategori" data={categories} selected={selectedCategory} setSelected={setSelectedCategoryHandler} displayKey="name" searchable /></div>
                                <Input label="Barcode" value={data.barcode} onChange={(e) => setData("barcode", e.target.value)} errors={errors.barcode} />
                                <Input label="Nama Produk" value={data.title} onChange={(e) => setData("title", e.target.value)} errors={errors.title} />
                                <Input label="Satuan Dasar" value={data.unit} onChange={(e) => setData("unit", e.target.value)} errors={errors.unit} placeholder="Pcs" />
                                <div className="md:col-span-2"><Textarea label="Deskripsi" value={data.description} onChange={(e) => setData("description", e.target.value)} /></div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 flex items-center gap-2 tracking-widest"><IconCurrencyDollar size={18} /> Harga & Stok</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Harga Beli" value={data.buy_price} readOnly={data.type === 'bundle'} className={data.type === 'bundle' ? 'bg-slate-50 dark:bg-slate-800 font-bold' : ''} onChange={(e) => setData("buy_price", e.target.value)} />
                                <Input label="Harga Jual" value={data.sell_price} onChange={(e) => setData("sell_price", e.target.value)} errors={errors.sell_price} />
                                {data.type === "single" && <Input label="Stok" value={data.stock} onChange={(e) => setData("stock", e.target.value)} errors={errors.stock} />}
                                <Input type="date" label="Kadaluarsa" value={data.expired_date} onChange={(e) => setData("expired_date", e.target.value)} />
                            </div>
                        </div>

                        {/* Satuan Kustom */}
                        {data.type === "single" && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest"><IconScale size={18} /> Konversi Satuan Luar</h3>
                                    <button type="button" onClick={addUnitRow} className="bg-primary-50 text-primary-600 px-3 py-1.5 rounded-lg text-[10px] uppercase font-black hover:bg-primary-100 transition-colors flex items-center gap-1"><IconPlus size={14} /> Tambah Satuan</button>
                                </div>
                                {data.units.map((unit, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mb-2 items-end">
                                        <div className="col-span-4">
                                            <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block tracking-wide">Nama Satuan</label>
                                            <input placeholder="Kg / Dus" value={unit.unit_name} onChange={(e) => updateUnitData(index, "unit_name", e.target.value)} className="w-full rounded-lg text-sm dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700" />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block tracking-wide">Isi (Qty)</label>
                                            <input type="number" placeholder="Konv" value={unit.conversion} onChange={(e) => updateUnitData(index, "conversion", e.target.value)} className="w-full rounded-lg text-sm dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700" />
                                        </div>
                                        <div className="col-span-4">
                                            <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block tracking-wide">Harga Jual</label>
                                            <input type="number" placeholder="Harga" value={unit.sell_price} onChange={(e) => updateUnitData(index, "sell_price", e.target.value)} className="w-full rounded-lg text-sm dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700" />
                                        </div>
                                        <div className="col-span-1 text-right">
                                            <button type="button" onClick={() => removeUnitRow(index)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><IconX size={18} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4">
                            <Link href={route("products.index")} className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs uppercase tracking-widest transition-all">Batal</Link>
                            <button type="submit" disabled={processing} className="px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary-500/25 transition-all active:scale-95 disabled:opacity-50">
                                {processing ? "Sedang Memperbarui..." : "Simpan Perubahan"}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;