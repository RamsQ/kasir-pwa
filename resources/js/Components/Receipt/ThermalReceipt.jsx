import React from "react";

// Helper format uang
const formatPrice = (price = 0) => {
    return Number(price).toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

// --- KOMPONEN STRUK 80mm (Standard) ---
export default function ThermalReceipt({
    transaction,
    storeName,
    storeAddress,
    storePhone,
    footerMessage,
    storeLogo,
}) {
    if (!transaction) return null;

    // Hitung subtotal asli (Total Bayar + Diskon)
    const discount = Number(transaction.discount || 0);
    const subtotal = Number(transaction.grand_total) + discount;

    return (
        <div className="bg-white text-black font-mono text-xs leading-tight w-[80mm] mx-auto p-2 pb-6">
            {/* 1. HEADER (LOGO & NAMA TOKO) */}
            <div className="text-center mb-4 border-b border-black border-dashed pb-3">
                {storeLogo && (
                    <div className="flex justify-center mb-2">
                        <img
                            src={storeLogo}
                            alt="Logo"
                            className="h-16 w-auto object-contain grayscale"
                        />
                    </div>
                )}
                <h2 className="text-lg font-bold uppercase mb-1">{storeName}</h2>
                {storeAddress && <p className="mb-0.5">{storeAddress}</p>}
                {storePhone && <p>{storePhone}</p>}
            </div>

            {/* 2. INFO TRANSAKSI */}
            <div className="mb-4 border-b border-black border-dashed pb-2">
                <div className="flex justify-between mb-1">
                    <span>No: {transaction.invoice}</span>
                    <span>{new Date(transaction.created_at).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                    <span>Kasir: {transaction.cashier?.name?.split(' ')[0]}</span>
                    <span>{new Date(transaction.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
            </div>

            {/* 3. ITEM BELANJA */}
            <div className="mb-4 border-b border-black border-dashed pb-2">
                {transaction.details?.map((item, index) => (
                    <div key={index} className="mb-2">
                        <div className="font-bold mb-0.5 uppercase">{item.product?.title}</div>
                        <div className="flex justify-between">
                            <span>
                                {item.qty} x {formatPrice(item.price / item.qty)}
                            </span>
                            <span>{formatPrice(item.price)}</span>
                        </div>

                        {/* --- RINCIAN BUNDLE (80mm) --- */}
                        {item.product?.type === 'bundle' && item.product?.bundle_items?.length > 0 && (
                            <div className="mt-1 ml-2 pl-2 border-l border-black">
                                {item.product.bundle_items.map((bundleItem, idx) => (
                                    <div key={idx} className="text-[10px] text-slate-700 flex justify-between italic">
                                        <span>- {bundleItem.title}</span>
                                        <span>x{bundleItem.pivot?.qty * item.qty}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* 4. TOTAL & PEMBAYARAN */}
            <div className="mb-4 text-right">
                {discount > 0 && (
                    <>
                        <div className="flex justify-between mb-1 text-[10px]">
                            <span>Subtotal</span>
                            <span>{formatPrice(subtotal)}</span>
                        </div>
                        <div className="flex justify-between mb-2 text-[10px]">
                            <span>Diskon</span>
                            <span>- {formatPrice(discount)}</span>
                        </div>
                    </>
                )}

                <div className="flex justify-between font-bold text-sm mb-1 border-t border-black border-dashed pt-2">
                    <span>TOTAL</span>
                    <span>{formatPrice(transaction.grand_total)}</span>
                </div>
                
                {/* LOGIKA PEMBEDA METODE PEMBAYARAN (80mm) */}
                {transaction.payment_method === 'qris' ? (
                    <div className="flex justify-between text-[10px] font-bold mt-1 uppercase">
                        <span>Metode</span>
                        <span>Lunas (QRIS)</span>
                    </div>
                ) : transaction.payment_method === 'cash' ? (
                    <>
                         <div className="flex justify-between text-[10px]">
                            <span>Tunai</span>
                            <span>{formatPrice(transaction.cash)}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                            <span>Kembali</span>
                            <span>{formatPrice(transaction.change)}</span>
                        </div>
                    </>
                ) : (
                    <div className="flex justify-between text-[10px]">
                        <span>Metode</span>
                        <span className="uppercase">{transaction.payment_method}</span>
                    </div>
                )}
            </div>

            {/* 5. FOOTER */}
            <div className="text-center mt-6">
                <p className="mb-1">{footerMessage}</p>
                <p className="text-[10px]">-- Simpan struk ini sebagai bukti --</p>
            </div>
        </div>
    );
}

// --- KOMPONEN STRUK 58mm (Kecil) ---
export function ThermalReceipt58mm({
    transaction,
    storeName,
    storePhone,
    footerMessage,
    storeLogo,
}) {
    if (!transaction) return null;

    const discount = Number(transaction.discount || 0);
    const subtotal = Number(transaction.grand_total) + discount;

    return (
        <div className="bg-white text-black font-mono text-[10px] leading-tight w-[58mm] mx-auto p-1 pb-6">
             {/* 1. HEADER */}
            <div className="text-center mb-3 border-b border-black border-dashed pb-2">
                 {storeLogo && (
                    <div className="flex justify-center mb-2">
                        <img
                            src={storeLogo}
                            alt="Logo"
                            className="h-10 w-auto object-contain grayscale"
                        />
                    </div>
                )}
                <h2 className="text-sm font-bold uppercase mb-1">{storeName}</h2>
                {storePhone && <p>{storePhone}</p>}
            </div>

             {/* 2. INFO */}
             <div className="mb-2 border-b border-black border-dashed pb-1">
                <p>No: {transaction.invoice}</p>
                <p>{new Date(transaction.created_at).toLocaleString('id-ID')}</p>
            </div>

            {/* 3. ITEM BELANJA */}
            <div className="mb-2 border-b border-black border-dashed pb-1">
                {transaction.details?.map((item, index) => (
                    <div key={index} className="mb-1">
                        <div className="uppercase font-bold">{item.product?.title}</div>
                        <div className="flex justify-between">
                            <span>{item.qty}x {formatPrice(item.price / item.qty)}</span>
                            <span>{formatPrice(item.price)}</span>
                        </div>

                        {/* --- RINCIAN BUNDLE (58mm) --- */}
                        {item.product?.type === 'bundle' && item.product?.bundle_items?.length > 0 && (
                            <div className="mt-0.5 ml-1 pl-1 border-l border-black/50 space-y-0.5">
                                {item.product.bundle_items.map((bundleItem, idx) => (
                                    <div key={idx} className="text-[9px] text-slate-800 flex justify-between italic">
                                        <span>x {bundleItem.title.substring(0, 15)}..</span>
                                        <span>x{bundleItem.pivot?.qty * item.qty}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

             {/* 4. TOTAL */}
             <div className="mb-3 text-right">
                {discount > 0 && (
                    <>
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{formatPrice(subtotal)}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                            <span>Diskon</span>
                            <span>-{formatPrice(discount)}</span>
                        </div>
                    </>
                )}

                <div className="flex justify-between font-bold mb-1 border-t border-black border-dashed pt-1 text-[11px]">
                    <span>TOTAL</span>
                    <span>{formatPrice(transaction.grand_total)}</span>
                </div>

                 {/* LOGIKA PEMBEDA METODE PEMBAYARAN (58mm) */}
                 {transaction.payment_method === 'qris' ? (
                     <div className="flex justify-between font-bold uppercase">
                        <span>Metode</span>
                        <span>QRIS (LUNAS)</span>
                     </div>
                 ) : transaction.payment_method === 'cash' ? (
                     <>
                        <div className="flex justify-between">
                            <span>Tunai</span>
                            <span>{formatPrice(transaction.cash)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span>Kembali</span>
                            <span>{formatPrice(transaction.change)}</span>
                        </div>
                     </>
                 ) : (
                     <div className="flex justify-between">
                        <span>Via</span>
                        <span className="uppercase">{transaction.payment_method}</span>
                    </div>
                 )}
            </div>

             {/* 5. FOOTER */}
             <div className="text-center mt-4">
                <p>{footerMessage}</p>
            </div>
        </div>
    );
}