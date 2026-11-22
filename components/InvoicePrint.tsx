import { money, num, remaining, shortDate, type Order, type Partner, type Product } from "@/lib/data";
export default function InvoicePrint({ order, partner, product, isDemo }:{order?:Order;partner?:Partner;product?:Product;isDemo:boolean}) {
 if(!order)return null;
 return <article className="print-document" aria-label="Dokumen faktur siap cetak">
   <div className="print-top"><div className="print-logo"><img className="print-logo-image" src="/bsm-logo.png" alt="" width={64} height={64}/><div><strong>PT. BUKIT SION MEDIKAL</strong><small>DISTRIBUTION OPERATING SYSTEM</small></div></div><div className="print-type"><h1>{order.kind==="sale"?"FAKTUR PENJUALAN":"DOKUMEN PEMBELIAN"}</h1><p>{order.number}</p></div></div>
   <div className="print-bar">{isDemo?"DOKUMEN SIMULASI — BUKAN FAKTUR RESMI":"DOKUMEN PREVIEW — VERIFIKASI SEBELUM DIGUNAKAN"}</div>
   <div className="print-meta"><div><span>{order.kind==="sale"?"DITAGIHKAN KEPADA":"DIPESAN DARI"}</span><strong>{partner?.name||"—"}</strong><p>{partner?.city||"—"}</p><p>{partner?.phone||""}</p></div><div><div><span>TANGGAL</span><strong>{shortDate(order.date)}</strong></div><div><span>JATUH TEMPO</span><strong>{shortDate(order.due)}</strong></div></div></div>
   <table className="print-lines"><thead><tr><th>NO.</th><th>DESKRIPSI PRODUK</th><th>QTY</th><th>HARGA</th><th>JUMLAH</th></tr></thead><tbody><tr><td>01</td><td><strong>{product?.name||"—"}</strong><small>{product?.code||"—"} · {product?.unit||"unit"}</small></td><td>{num(order.qty)}</td><td>{money(order.price)}</td><td>{money(order.qty*order.price)}</td></tr></tbody></table>
   <div className="print-totals"><div><span>Subtotal</span><strong>{money(order.qty*order.price)}</strong></div><div><span>Pembayaran tercatat</span><strong>{money(order.paid)}</strong></div><div className="print-final"><span>Sisa tagihan</span><strong>{money(remaining(order))}</strong></div></div>
   {order.note&&<div className="print-note"><strong>Keterangan</strong><p>{order.note}</p></div>}
   <div className="print-bottom"><p>Dicetak melalui PT. BUKIT SION MEDIKAL. Informasi dibuat berdasarkan data yang dimasukkan ke aplikasi.</p><strong>PT. BUKIT SION MEDIKAL · DISTRIBUTION OPERATING SYSTEM</strong></div>
 </article>;
}