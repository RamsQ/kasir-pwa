import React from "react";

// Helper format uang khusus struk (Clean tanpa Rp untuk efisiensi ruang)
const formatPriceReceipt = (value) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(value || 0).replace('Rp', '').trim();

// --- 1. DEFAULT EXPORT: ThermalReceipt (80mm) ---
export default function ThermalReceipt(props) {
    return (
        <div className="bg-white text-black font-mono shadow-sm mx-auto p-2 leading-tight w-[80mm] text-[12px]">
            <ReceiptContent size="80mm" {...props} />
        </div>
    );
}

// --- 2. NAMED EXPORT: ThermalReceipt58mm (58mm) ---
// Kata kunci 'export' di depan function ini memperbaiki error di Print.jsx
export function ThermalReceipt58mm(props) {
    return (
        <div className="bg-white text-black font-mono shadow-sm mx-auto p-1 leading-tight w-[58mm] text-[10px]">
            <ReceiptContent size="58mm" {...props} />
        </div>
    );
}

// --- 3. INTERNAL COMPONENT: Reusable Content Logic ---
function ReceiptContent({ size, transaction, storeName, storeAddress, storePhone, footerMessage, storeLogo, qrisImage, isTemporary }) {
    const isSmall = size === "58mm";

    return (
        <>
            {/* LOGO & HEADER */}
            <div className="text-center mb-4">
                {storeLogo && <img src={storeLogo} className="w-12 h-12 mx-auto mb-1 grayscale" alt="logo" />}
                <h1 className={`${isSmall ? 'text-sm' : 'text-lg'} font-bold uppercase`}>{storeName}</h1>
                {storeAddress && <p className="uppercase">{storeAddress}</p>}
                <p>TELP: {storePhone}</p>
            </div>

            {/* INFO TRANSAKSI */}
            <div className="border-t border-b border-black border-dashed py-2 mb-2">
                <div className="flex justify-between uppercase">
                    <span>No: {transaction.invoice}</span>
                </div>
                <div className="flex justify-between uppercase">
                    <span>Tgl: {new Date(transaction.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                <div className="flex justify-between uppercase">
                    <span>KSR: {transaction.cashier?.name?.split(' ')[0]}</span>
                </div>
                {transaction.customer && (
                    <div className="flex justify-between uppercase">
                        <span>PLG: {transaction.customer?.name}</span>
                    </div>
                )}
            </div>

            {/* DAFTAR ITEM */}
            <div className="mb-2">
                {transaction.details?.map((item, index) => (
                    <div key={index} className="mb-2">
                        <div className="uppercase font-bold">{item.product?.title || item.product_title}</div>
                        <div className="flex justify-between pl-2">
                            <span>
                                {item.qty} {item.unit || 'PCS'} x {formatPriceReceipt(item.price / item.qty)}
                            </span>
                            <span>{formatPriceReceipt(item.price)}</span>
                        </div>

                        {/* FITUR BUNDLE */}
                        {item.product?.type === 'bundle' && item.product?.bundle_items?.length > 0 && (
                            <div className="pl-4 italic text-slate-700" style={{ fontSize: isSmall ? '9px' : '11px' }}>
                                {item.product.bundle_items.map((bi, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span>- {bi.title}</span>
                                        <span>x{parseFloat(bi.pivot?.qty || 0) * parseFloat(item.qty)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* TOTALAN */}
            <div className="border-t border-black border-dashed pt-2 space-y-1">
                <div className="flex justify-between font-bold border-b border-black pb-1 mb-1">
                    <span>TOTAL</span>
                    <span className={isSmall ? 'text-sm' : 'text-base'}>
                        Rp {new Intl.NumberFormat("id-ID").format(transaction.grand_total)}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span>BAYAR</span>
                    <span>{formatPriceReceipt(transaction.cash || transaction.grand_total)}</span>
                </div>
                <div className="flex justify-between font-bold">
                    <span>KEMBALI</span>
                    <span>{formatPriceReceipt(transaction.change || 0)}</span>
                </div>
            </div>

            {/* QRIS */}
            {qrisImage && (transaction.payment_method === 'qris') && (
                <div className="text-center my-4 border-t border-black border-dashed pt-4">
                    <p className="text-[10px] font-bold mb-2 uppercase">Scan QRIS</p>
                    <img src={qrisImage} className="w-32 h-32 mx-auto grayscale" alt="QRIS" />
                </div>
            )}

            {/* FOOTER */}
            <div className="text-center mt-6 border-t border-black border-dashed pt-4">
                {isTemporary && <p className="font-bold border border-black p-1 mb-2">*** TAGIHAN SEMENTARA ***</p>}
                <p className="uppercase font-bold">{footerMessage}</p>
                <div className="mt-2 opacity-50 text-[8px]">*** SELESAI ***</div>
            </div>
        </>
    );
}