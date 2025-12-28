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

// --- 1. KOMPONEN STRUK 80mm (Standard) ---
export default function ThermalReceipt({
    transaction,
    storeName,
    storeAddress,
    storePhone,
    footerMessage,
    storeLogo,
    qrisImage, // URL gambar QRIS dari folder storage
}) {
    if (!transaction) return null;

    const discount = Number(transaction.discount || 0);
    const subtotal = Number(transaction.grand_total) + discount;

    // Logika agar gambar muncul baik saat lunas (qris) maupun saat penagihan (tagihan)
    const showQR = (transaction.payment_method === 'qris' || transaction.payment_method === 'tagihan') && qrisImage;

    return (
        <div className="bg-white text-black font-mono text-xs leading-tight w-[80mm] mx-auto p-2 pb-6 receipt-content">
            {/* HEADER */}
            <div className="text-center mb-4 border-b border-black border-dashed pb-3 flex flex-col items-center">
                {storeLogo && (
                    <div className="mb-2">
                        <img
                            src={storeLogo}
                            alt="Logo"
                            className="h-16 w-auto object-contain grayscale mx-auto"
                        />
                    </div>
                )}
                <h2 className="text-lg font-bold uppercase mb-1">{storeName}</h2>
                {storeAddress && <p className="mb-0.5">{storeAddress}</p>}
                {storePhone && <p>{storePhone}</p>}
            </div>

            {/* INFO TRANSAKSI */}
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

            {/* ITEM BELANJA */}
            <div className="mb-4 border-b border-black border-dashed pb-2">
                {transaction.details?.map((item, index) => {
                    const unitPriceAtTransaction = item.price / item.qty;
                    const originalUnitPrice = item.product?.sell_price || unitPriceAtTransaction;
                    const hasProductDiscount = originalUnitPrice > unitPriceAtTransaction;

                    return (
                        <div key={index} className="mb-2">
                            <div className="font-bold mb-0.5 uppercase">{item.product?.title}</div>
                            <div className="flex justify-between">
                                <span>
                                    {item.qty} x {formatPrice(unitPriceAtTransaction)}
                                    {hasProductDiscount && (
                                        <span className="ml-1 line-through text-[9px] opacity-60 italic">
                                            ({formatPrice(originalUnitPrice)})
                                        </span>
                                    )}
                                </span>
                                <span>{formatPrice(item.price)}</span>
                            </div>
                            
                            {/* Fitur Bundling Item */}
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
                    );
                })}
            </div>

            {/* TOTAL & PEMBAYARAN */}
            <div className="mb-4 text-right">
                <div className="flex justify-between font-bold text-sm mb-1 border-t border-black border-dashed pt-2">
                    <span>TOTAL</span>
                    <span>{formatPrice(transaction.grand_total)}</span>
                </div>
                
                <div className="flex justify-between text-[10px] font-bold mt-1 uppercase">
                    <span>Metode</span>
                    <span>
                        {transaction.payment_method === 'qris' ? 'QRIS (LUNAS)' : 
                         transaction.payment_method === 'tagihan' ? 'TAGIHAN QRIS' : 
                         transaction.payment_method}
                    </span>
                </div>
            </div>

            {/* QRIS DISPLAY (Muncul saat metode qris ATAU tagihan) */}
            {showQR && (
                <div className="text-center my-4 border-t border-black border-dashed pt-4 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-bold mb-2 uppercase tracking-widest">Scan QRIS Untuk Bayar</p>
                    <div className="bg-white p-2 border border-black inline-block shadow-sm mx-auto">
                        <img 
                            src={qrisImage} 
                            alt="QRIS Manual" 
                            className="w-40 h-40 object-contain grayscale"
                            style={{ imageRendering: 'pixelated' }}
                            onError={(e) => e.target.style.display = 'none'}
                        />
                    </div>
                    <p className="text-[9px] mt-2 italic opacity-70">Pastikan Nama Merchant Sesuai</p>
                </div>
            )}

            {/* FOOTER */}
            <div className="text-center mt-6">
                <p className="mb-1">{footerMessage}</p>
                <p className="text-[10px]">-- Terima Kasih --</p>
            </div>
        </div>
    );
}

// --- 2. KOMPONEN STRUK 58mm (Kecil) ---
export function ThermalReceipt58mm({
    transaction,
    storeName,
    storePhone,
    footerMessage,
    storeLogo,
    qrisImage,
}) {
    if (!transaction) return null;

    const showQR = (transaction.payment_method === 'qris' || transaction.payment_method === 'tagihan') && qrisImage;

    return (
        <div className="bg-white text-black font-mono text-[10px] leading-tight w-[58mm] mx-auto p-1 pb-6 receipt-content">
             {/* HEADER */}
             <div className="text-center mb-3 border-b border-black border-dashed pb-2 flex flex-col items-center">
                 {storeLogo && (
                    <div className="mb-2">
                        <img src={storeLogo} alt="Logo" className="h-10 w-auto object-contain grayscale mx-auto" />
                    </div>
                )}
                <h2 className="text-sm font-bold uppercase mb-1">{storeName}</h2>
                {storePhone && <p>{storePhone}</p>}
            </div>

             {/* INFO */}
             <div className="mb-2 border-b border-black border-dashed pb-1">
                <p>No: {transaction.invoice}</p>
                <p>{new Date(transaction.created_at).toLocaleDateString('id-ID')} {new Date(transaction.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</p>
            </div>

            {/* ITEM BELANJA */}
            <div className="mb-2 border-b border-black border-dashed pb-1">
                {transaction.details?.map((item, index) => {
                    const unitPrice = item.price / item.qty;
                    return (
                        <div key={index} className="mb-1">
                            <div className="uppercase font-bold">{item.product?.title}</div>
                            <div className="flex justify-between">
                                <span>{item.qty}x {formatPrice(unitPrice)}</span>
                                <span>{formatPrice(item.price)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

             {/* TOTAL */}
             <div className="mb-3 text-right">
                <div className="flex justify-between font-bold mb-1 border-t border-black border-dashed pt-1 text-[11px]">
                    <span>TOTAL</span>
                    <span>{formatPrice(transaction.grand_total)}</span>
                </div>
                <div className="flex justify-between uppercase font-bold text-[9px]">
                    <span>Metode</span>
                    <span>
                        {transaction.payment_method === 'qris' ? 'QRIS' : 
                         transaction.payment_method === 'tagihan' ? 'TAGIHAN' : 
                         transaction.payment_method}
                    </span>
                </div>
            </div>

            {/* QRIS DISPLAY (58mm RATA TENGAH) */}
            {showQR && (
                <div className="text-center my-2 border-t border-black border-dashed pt-2 flex flex-col items-center justify-center">
                    <p className="text-[8px] font-bold mb-1 uppercase tracking-tighter">Scan QRIS</p>
                    <div className="bg-white p-1 border border-black inline-block mx-auto">
                        <img 
                            src={qrisImage} 
                            alt="QRIS" 
                            className="w-32 h-32 object-contain grayscale"
                            style={{ imageRendering: 'pixelated' }}
                            onError={(e) => e.target.style.display = 'none'}
                        />
                    </div>
                </div>
            )}

             {/* FOOTER */}
             <div className="text-center mt-4 border-t border-black border-dotted pt-2">
                <p>{footerMessage}</p>
            </div>
        </div>
    );
}