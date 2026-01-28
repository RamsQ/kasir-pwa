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
export function ThermalReceipt58mm(props) {
    return (
        <div className="bg-white text-black font-mono shadow-sm mx-auto p-1 leading-tight w-[58mm] text-[10px]">
            <ReceiptContent size="58mm" {...props} />
        </div>
    );
}

// --- 3. INTERNAL COMPONENT: Reusable Content Logic ---
function ReceiptContent({ 
    size, 
    transaction, 
    storeName, 
    storeAddress, 
    storePhone, 
    footerMessage, 
    storeLogo, 
    qrisImage, 
    isTemporary 
}) {
    const isSmall = size === "58mm";

    return (
        <>
            {/* HEADER AREA */}
            <div className="text-center mb-2">
                {storeLogo && <img src={storeLogo} className="w-12 h-12 mx-auto mb-1 grayscale" alt="logo" />}
                
                {/* INFORMASI TOKO */}
                <h1 className={`${isSmall ? 'text-sm' : 'text-lg'} font-bold uppercase`}>{storeName}</h1>
                {storeAddress && <p className="uppercase text-[9px]">{storeAddress}</p>}
                {storePhone && <p className="text-[9px]">TELP: {storePhone}</p>}
                
                {/* NOMOR ANTREAN - Posisi di bawah nama/alamat toko, ukuran agak dikecilkan */}
                {transaction.queue_number && (
                    <div className="my-1 border-y border-black py-1">
                        <h2 className={`${isSmall ? 'text-lg' : 'text-xl'} font-black leading-tight`}>
                            #{transaction.queue_number}
                        </h2>
                    </div>
                )}

                {isTemporary && (
                    <div className="mt-1 font-bold text-[10px] border border-black px-2 inline-block uppercase italic">
                        *** Bill Sementara ***
                    </div>
                )}
            </div>

            {/* INFO TRANSAKSI & STATUS */}
            <div className="border-b border-black border-dashed py-2 mb-2 space-y-0.5 uppercase text-[10px]">
                <div className="flex justify-between">
                    <span>No: {transaction.invoice || 'DRAFT'}</span>
                </div>
                <div className="flex justify-between">
                    <span>Tgl: {transaction.created_at ? new Date(transaction.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                <div className="flex justify-between">
                    <span>KSR: {transaction.cashier?.name?.split(' ')[0] || 'KASIR'}</span>
                </div>

                {/* STATUS MEJA / TAKE AWAY */}
                <div className="flex justify-between font-bold border-t border-black border-dotted mt-1 pt-1">
                    <span>STATUS:</span>
                    <span>{transaction.table_name || 'TAKE AWAY'}</span>
                </div>

                {/* INFO PELANGGAN */}
                {(transaction.customer || transaction.customer_name) && (
                    <div className="flex justify-between">
                        <span>PLG:</span>
                        <span className="truncate ml-2">{transaction.customer?.name || transaction.customer_name}</span>
                    </div>
                )}
            </div>

            {/* DAFTAR ITEM BELANJA */}
            <div className="mb-2">
                {transaction.details?.map((item, index) => (
                    <div key={index} className="mb-2">
                        <div className="uppercase font-bold">{item.product?.title || item.product_title}</div>
                        <div className="flex justify-between pl-2">
                            <span>
                                {item.qty} {item.unit || item.product_unit?.unit_name || 'PCS'} x {formatPriceReceipt(item.price / item.qty)}
                            </span>
                            <span>{formatPriceReceipt(item.price)}</span>
                        </div>

                        {/* FITUR BUNDLE / KOMPOSISI */}
                        {item.product?.type === 'bundle' && item.product?.bundle_items?.length > 0 && (
                            <div className="pl-4 italic text-slate-700" style={{ fontSize: isSmall ? '8px' : '10px' }}>
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

            {/* RINGKASAN PEMBAYARAN */}
            <div className="border-t border-black border-dashed pt-2 space-y-1">
                <div className="flex justify-between font-bold border-b border-black pb-1 mb-1">
                    <span>TOTAL</span>
                    <span className={isSmall ? 'text-sm' : 'text-base'}>
                        Rp {new Intl.NumberFormat("id-ID").format(transaction.grand_total)}
                    </span>
                </div>

                {!isTemporary ? (
                    <>
                        <div className="flex justify-between">
                            <span>BAYAR</span>
                            <span>{formatPriceReceipt(transaction.cash || transaction.grand_total)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span>KEMBALI</span>
                            <span>{formatPriceReceipt(transaction.change || 0)}</span>
                        </div>
                        <div className="flex justify-between text-[9px] mt-1 border-t border-black border-dotted pt-1">
                            <span>METODE PEMBAYARAN:</span>
                            <span>{transaction.payment_method?.toUpperCase() || 'CASH'}</span>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-1 italic text-[10px] border border-black my-1 font-bold">
                        SILAHKAN SELESAIKAN PEMBAYARAN DI KASIR
                    </div>
                )}
            </div>

            {/* SCAN QRIS */}
            {!isTemporary && qrisImage && (transaction.payment_method === 'qris') && (
                <div className="text-center my-4 border-t border-black border-dashed pt-4">
                    <p className="text-[9px] font-bold mb-2 uppercase">Bukti Bayar QRIS</p>
                    <img src={qrisImage} className="w-32 h-32 mx-auto grayscale" alt="QRIS" />
                </div>
            )}

            {/* FOOTER AREA */}
            <div className="text-center mt-4 border-t border-black border-dashed pt-2">
                <p className="uppercase font-bold text-[10px]">{footerMessage || 'Terima Kasih Atas Kunjungannya'}</p>
                <div className="mt-1 opacity-50 text-[8px]">
                    {isTemporary ? '*** DRAFT / BUKAN BUKTI PEMBAYARAN SAH ***' : '*** TRANSAKSI SELESAI ***'}
                </div>
                <p className="text-[7px] mt-1 italic opacity-40">{new Date().toLocaleString('id-ID')}</p>
            </div>
        </>
    );
}