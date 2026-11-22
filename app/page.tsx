"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Activity, ArrowDownLeft, ArrowRight, BarChart3, Boxes, Building2, CalendarDays, Check, CheckCircle2, ChevronDown, CircleDollarSign, Cloud, Download, LayoutDashboard, LogOut, Menu, Package, Printer, Plus, RefreshCw, Search, Settings2, ShoppingBag, ShoppingCart, Smartphone, TrendingUp, Truck, Upload, Users, Wallet, X } from "lucide-react";
import { addDays, amount, csvDownload, emptyData, id, money, num, productStock, remaining, seedData, shortDate, today, type AppData, type Delivery, type Order, type Partner, type Product } from "@/lib/data";
import { cloudConfigured, getCloud, loadRemote, saveRemote } from "@/lib/cloud";
import InvoicePrint from "@/components/InvoicePrint";
import { agingSummary } from "@/lib/reporting";

type Page = "Dashboard" | "Penjualan" | "Pembelian" | "Persediaan" | "Hutang & Piutang" | "Pelanggan" | "Supplier" | "Produk" | "Distribusi" | "Laporan" | "Pengaturan";
type Modal = "sale" | "purchase" | "product" | "customer" | "supplier" | "delivery" | "adjustment" | null;
const navigation = [
 {group:"UTAMA",items:[{name:"Dashboard",icon:LayoutDashboard},{name:"Penjualan",icon:ShoppingCart},{name:"Pembelian",icon:ShoppingBag},{name:"Persediaan",icon:Boxes},{name:"Hutang & Piutang",icon:Wallet}]},
 {group:"OPERASIONAL",items:[{name:"Pelanggan",icon:Users},{name:"Supplier",icon:Building2},{name:"Produk",icon:Package},{name:"Distribusi",icon:Truck}]},
 {group:"INSIGHT",items:[{name:"Laporan",icon:BarChart3},{name:"Pengaturan",icon:Settings2}]}
] as const;
const pages: Record<Page,string> = {
 Dashboard:"Pantau seluruh aktivitas bisnis dalam satu tampilan",
 Penjualan:"Kelola faktur penjualan dan penerimaan pembayaran",
 Pembelian:"Pantau pembelian barang dan tagihan pemasok",
 Persediaan:"Monitor stok, pergerakan barang, dan stok minimum",
 "Hutang & Piutang":"Jatuh tempo, pelunasan, dan posisi hutang-piutang",
 Pelanggan:"Data pelanggan dan aktivitas pembeliannya",
 Supplier:"Informasi pemasok dan histori transaksi",
 Produk:"Katalog barang, harga jual dan harga beli",
 Distribusi:"Rencanakan dan lacak proses pengiriman",
 Laporan:"Ringkasan kinerja dari transaksi yang tercatat",
 Pengaturan:"Pengaturan akun, penyimpanan, dan aplikasi"
};
const blankSale = { partnerId:"", productId:"", qty:"1", price:"", paid:"0", due:addDays(today(),14), note:"" };
const blankPartner = { name:"",phone:"",city:"" };
const blankProduct = { name:"", category:"Sembako",unit:"karton",price:"",cost:"",opening:"0",min:"10" };
const kindLabel = (k: "sale"|"purchase") => k==="sale"?"Penjualan":"Pembelian";
const pill = (text: string, type:"good"|"warn"|"danger"|"neutral"="neutral") => <span className={"status status-"+type}><span className="status-dot"/>{text}</span>;
function MiniChart({values, labels}:{values:number[]; labels:string[]}) {
 const chartId=useId();
 const color="var(--brand-strong)";
 const max=Math.max(...values,1);
 const pts=values.map((v,i)=>String(12+i*(276/Math.max(1,values.length-1)))+","+String(110-(v/max)*87)).join(" ");
 const area="12,114 "+pts+" 288,114";
 return <svg className="mini-chart" viewBox="0 0 300 124" role="img" aria-label={labels.map((label,i)=>label+" "+money(values[i])).join(", ")} preserveAspectRatio="none"><defs><linearGradient id={chartId} x1="0" y1="0" x2="0" y2="1"><stop stopColor={color} stopOpacity=".18"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs><line x1="8" y1="114" x2="292" y2="114" stroke="#e9ebf0"/><line x1="8" y1="64" x2="292" y2="64" stroke="#eef0f4" strokeDasharray="4 5"/><polygon points={area} fill={`url(#${chartId})`}/><polyline points={pts} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>{values.map((v,i)=><circle key={i} cx={12+i*(276/Math.max(1,values.length-1))} cy={110-(v/max)*87} r="3.5" fill={color} stroke="#fff" strokeWidth="2"/>)}</svg>;
}
export default function Home() {
 const [page,setPage]=useState<Page>("Dashboard");
 const [data,setData]=useState<AppData>(()=>seedData());
 const [ready,setReady]=useState(false);
 const [modal,setModal]=useState<Modal>(null);
 const [search,setSearch]=useState("");
 const [toast,setToast]=useState("");
 const [saleForm,setSaleForm]=useState(blankSale);
 const [partnerForm,setPartnerForm]=useState(blankPartner);
 const [productForm,setProductForm]=useState(blankProduct);
 const [deliveryForm,setDeliveryForm]=useState({orderId:"",driver:"",vehicle:"",destination:"",date:today()});
 const [adjustForm,setAdjustForm]=useState({productId:"",qty:"",note:""});
 const [payOrder,setPayOrder]=useState<string|null>(null);
 const [payAmount,setPayAmount]=useState("");
 const [payMethod,setPayMethod]=useState("Transfer Bank");
 const [payReference,setPayReference]=useState("");
 const [printOrder,setPrintOrder]=useState<string|null>(null);
 const [userId,setUserId]=useState<string|null>(null);
 const [userEmail,setUserEmail]=useState("");
 const [authForm,setAuthForm]=useState({email:"",password:""});
 const [cloudBusy,setCloudBusy]=useState(false);
 const [cloudError,setCloudError]=useState("");
 const [syncState,setSyncState]=useState("Data tersimpan di browser");
 const [expandedSetting,setExpandedSetting]=useState<"cloud"|"install"|null>(null);
 const [installPrompt,setInstallPrompt]=useState<null|{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}>(null);
 const dataRef=useRef(data);
 const restoreInput=useRef<HTMLInputElement|null>(null);
 function exportBackup(){
  const payload={format:"opspiry-backup",version:1,createdAt:new Date().toISOString(),data};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");
  a.href=url;a.download="OPSPIRY-backup-"+today()+".json";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);toastIt("Backup JSON berhasil diunduh");
 }
 async function importBackup(file:File|undefined){
  if(!file)return;
  if(userId){toastIt("Impor backup dinonaktifkan dalam mode cloud untuk menghindari penimpaan data.");return;}
  if(file.size>3_000_000){toastIt("File terlalu besar. Maksimal 3 MB.");return;}
  try{
   const parsed=JSON.parse(await file.text());
   if(parsed?.format!=="opspiry-backup"||parsed?.version!==1)throw Error("Format backup tidak dikenali.");
   const d=parsed.data as AppData;
   if(!d||!Array.isArray(d.products)||!Array.isArray(d.partners)||!Array.isArray(d.orders)||!Array.isArray(d.deliveries)||!Array.isArray(d.adjustments))throw Error("Struktur backup tidak lengkap.");
   if(d.products.length>10000||d.partners.length>20000||d.orders.length>100000||d.deliveries.length>100000||d.adjustments.length>100000)throw Error("Jumlah data terlalu besar.");
   if(d.products.some(p=>typeof p.id!=="string"||typeof p.name!=="string"||!Number.isFinite(p.opening)||!Number.isFinite(p.price)||!Number.isFinite(p.cost))||d.orders.some(o=>typeof o.id!=="string"||!["sale","purchase"].includes(o.kind)||!Number.isFinite(o.qty)||!Number.isFinite(o.price)||!Number.isFinite(o.paid)))throw Error("Isi backup tidak valid.");
   if(!window.confirm("Impor backup akan mengganti seluruh data demo saat ini. Lanjutkan?"))return;
   setData(d);toastIt("Backup berhasil dipulihkan.");
  }catch(error){toastIt(error instanceof Error?error.message:"Gagal membaca backup.");}
  finally{if(restoreInput.current)restoreInput.current.value="";}
 }
 useEffect(()=>{dataRef.current=data;},[data]);
 useEffect(()=>{
  try { const raw=localStorage.getItem("opspiry_demo_v1");if(raw){const parsed=JSON.parse(raw);if(parsed&&Array.isArray(parsed.products)&&Array.isArray(parsed.orders))setData(parsed);} } catch{}
  setReady(true);
  const cloud=getCloud();
  if(cloud){cloud.auth.getUser().then(async ({data:auth})=>{
    if(!auth.user) return;
    try {const remote=await loadRemote(auth.user.id);setUserId(auth.user.id);setUserEmail(auth.user.email||"");setData(remote||emptyData);setSyncState("Cloud OPSPIRY aktif");}
    catch(e){setCloudError(e instanceof Error?e.message:"Gagal memuat data cloud");}
   });}
  const onInstall=(event: Event)=>{event.preventDefault();setInstallPrompt(event as unknown as {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>});};
  window.addEventListener("beforeinstallprompt",onInstall);
  return ()=>window.removeEventListener("beforeinstallprompt",onInstall);
 },[]);
 useEffect(()=>{
   if(!ready) return;
   if(!userId){localStorage.setItem("opspiry_demo_v1",JSON.stringify(data));setSyncState("Data tersimpan di browser");return;}
   setSyncState("Menyinkronkan perubahan…");
   const timer=setTimeout(()=>{saveRemote(userId,data).then(()=>setSyncState("Tersimpan di cloud")).catch(e=>{setSyncState("Sinkronisasi gagal");setCloudError(e.message);});},650);
   return ()=>clearTimeout(timer);
 },[data,ready,userId]);
 useEffect(()=>{setSearch("");window.scrollTo({top:0,behavior:"smooth"});},[page]);
 useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(""),3800);return()=>clearTimeout(t);}},[toast]);
 useEffect(()=>{
  if(!printOrder)return;
  const done=()=>setPrintOrder(null);
  window.addEventListener("afterprint",done);
  const t=window.setTimeout(()=>window.print(),180);
  return ()=>{window.clearTimeout(t);window.removeEventListener("afterprint",done);};
 },[printOrder]);
 const ordersSale=data.orders.filter(o=>o.kind==="sale");
 const ordersPurchase=data.orders.filter(o=>o.kind==="purchase");
 const sales=ordersSale.reduce((n,o)=>n+amount(o),0);
 const purchase=ordersPurchase.reduce((n,o)=>n+amount(o),0);
 const receivables=ordersSale.reduce((n,o)=>n+remaining(o),0);
 const payables=ordersPurchase.reduce((n,o)=>n+remaining(o),0);
 const grossProfit=ordersSale.reduce((n,o)=>n+o.qty*(o.price-(data.products.find(p=>p.id===o.productId)?.cost||0)),0);
 const inventoryWorth=data.products.reduce((n,p)=>n+productStock(data,p.id)*p.cost,0);
 const customerCount=data.partners.filter(p=>p.type==="customer").length;
 const lowStock=data.products.filter(p=>productStock(data,p.id)<=p.min).length;
 const findPartner=(partnerId:string)=>data.partners.find(p=>p.id===partnerId)?.name||"—";
 const findProduct=(productId:string)=>data.products.find(p=>p.id===productId)?.name||"—";
 const matches=(...strings:string[])=>strings.join(" ").toLowerCase().includes(search.toLowerCase());
 const entryTotal=(Number(saleForm.qty)||0)*(Number(saleForm.price)||0);
 const entryBalance=Math.max(0,entryTotal-(Number(saleForm.paid)||0));
 const salesDates=Array.from({length:7},(_,i)=>addDays(today(),i-6));
 const salesDaily=salesDates.map(day=>ordersSale.filter(o=>o.date===day).reduce((n,o)=>n+amount(o),0));
 const salesDayLabels=salesDates.map(day=>new Date(day+"T12:00:00").toLocaleDateString("id-ID",{weekday:"short"}));
 const topProducts=data.products.map(product=>({
  id:product.id,
  name:product.name,
  sales:ordersSale.filter(order=>order.productId===product.id).reduce((total,order)=>total+amount(order),0),
 })).filter(product=>product.sales>0).sort((a,b)=>b.sales-a.sales).slice(0,3);
 const salesMax=topProducts[0]?.sales||1;
 const deliveriesByStatus=(["Dijadwalkan","Dalam Perjalanan","Terkirim"] as const).map(status=>({
  status,count:data.deliveries.filter(delivery=>delivery.status===status).length,
 }));
 const toastIt=(msg:string)=>setToast(msg);
 const modalTitle:Record<Exclude<Modal,null>,string>={sale:"Buat Faktur Penjualan",purchase:"Buat Pembelian",product:"Tambah Produk Baru",customer:"Tambah Pelanggan",supplier:"Tambah Supplier",delivery:"Buat Surat Jalan",adjustment:"Penyesuaian Stok"};
 function openModal(type: Exclude<Modal,null>) {
  setModal(type);setPayOrder(null);
  setSaleForm({...blankSale,due:addDays(today(),14)});
  setPartnerForm(blankPartner);setProductForm(blankProduct);
  setDeliveryForm({orderId:"",driver:"",vehicle:"",destination:"",date:today()});
  setAdjustForm({productId:"",qty:"",note:""});
 }
 function saveOrder(event:React.FormEvent) {
  event.preventDefault();if(!modal||!(modal==="sale"||modal==="purchase"))return;
  const qty=Number(saleForm.qty),price=Number(saleForm.price),paid=Number(saleForm.paid);
  if(!saleForm.partnerId||!saleForm.productId||!Number.isFinite(qty)||qty<=0||!Number.isInteger(qty)||!Number.isFinite(price)||price<=0||!Number.isFinite(paid)||paid<0||paid>qty*price){toastIt("Periksa produk, mitra, kuantitas, harga dan pembayaran.");return;}
  if(modal==="sale"&&qty>productStock(data,saleForm.productId)){toastIt("Stok tidak mencukupi. Periksa persediaan.");return;}
  const kind=modal, prefix=kind==="sale"?"INV":"PO";
  const number=prefix+"-"+new Date().getFullYear().toString().slice(2)+"-"+String(data.orders.filter(o=>o.kind===kind).length+1).padStart(5,"0");
  const record:Order={id:id(),number,kind,date:today(),partnerId:saleForm.partnerId,productId:saleForm.productId,qty,price,paid,due:saleForm.due,note:saleForm.note.trim()};
  setData(d=>({...d,orders:[record,...d.orders]}));setModal(null);toastIt("Transaksi "+number+" berhasil disimpan");
 }
 function saveProduct(event:React.FormEvent){
  event.preventDefault();const price=Number(productForm.price),cost=Number(productForm.cost),opening=Number(productForm.opening),min=Number(productForm.min);
  if(!productForm.name.trim()||!Number.isFinite(price)||!Number.isFinite(cost)||price<0||cost<0||!Number.isFinite(opening)||opening<0||!Number.isInteger(opening)||!Number.isInteger(min)||min<0){toastIt("Isi detail produk dengan benar.");return;}
  const record:Product={id:id(),code:"PRD-"+String(data.products.length+1).padStart(3,"0"),name:productForm.name.trim(),category:productForm.category,unit:productForm.unit,price,cost,opening,min};
  setData(d=>({...d,products:[record,...d.products]}));setModal(null);toastIt("Produk berhasil ditambahkan");
 }
 function savePartner(event:React.FormEvent){
  event.preventDefault();if(!partnerForm.name.trim())return;
  const kind=modal==="supplier"?"supplier":"customer";
  const record:Partner={id:id(),code:(kind==="supplier"?"SUP-":"CUS-")+String(data.partners.filter(p=>p.type===kind).length+1).padStart(3,"0"),name:partnerForm.name.trim(),phone:partnerForm.phone.trim(),city:partnerForm.city.trim(),type:kind};
  setData(d=>({...d,partners:[record,...d.partners]}));setModal(null);toastIt("Data mitra berhasil ditambahkan");
 }
 function saveDelivery(event:React.FormEvent){
  event.preventDefault();if(!deliveryForm.orderId||!deliveryForm.destination.trim()){toastIt("Pilih faktur dan isi tujuan pengiriman.");return;}
  const record:Delivery={id:id(),orderId:deliveryForm.orderId,driver:deliveryForm.driver.trim(),vehicle:deliveryForm.vehicle.trim(),destination:deliveryForm.destination.trim(),date:deliveryForm.date,status:"Dijadwalkan"};
  setData(d=>({...d,deliveries:[record,...d.deliveries]}));setModal(null);toastIt("Surat jalan ditambahkan");
 }
 function saveAdjustment(event:React.FormEvent){
  event.preventDefault();const qty=Number(adjustForm.qty);
  if(!adjustForm.productId||!Number.isInteger(qty)||qty===0||productStock(data,adjustForm.productId)+qty<0){toastIt("Penyesuaian stok tidak valid.");return;}
  setData(d=>({...d,adjustments:[{id:id(),productId:adjustForm.productId,qty,note:adjustForm.note.trim(),date:today()},...d.adjustments]}));setModal(null);toastIt("Stok berhasil disesuaikan");
 }
 function settle(event:React.FormEvent){
  event.preventDefault();if(!payOrder)return;
  const order=data.orders.find(o=>o.id===payOrder);const value=Number(payAmount);
  if(!order||!Number.isFinite(value)||value<=0||value>remaining(order)){toastIt("Nominal pelunasan tidak valid.");return;}
  const payment={id:id(),orderId:payOrder,date:today(),amount:value,method:payMethod,reference:payReference.trim()};
  setData(d=>({...d,orders:d.orders.map(o=>o.id===payOrder?{...o,paid:Math.round((o.paid+value)*100)/100}:o),payments:[...(d.payments||[]),payment]}));
  setPayOrder(null);setPayReference("");toastIt("Pembayaran berhasil dicatat dan masuk riwayat");
 }
 function exportActive(){
  let header:string[]=[];let rows:(string|number)[][]=[];
  if(page==="Penjualan"||page==="Pembelian"||page==="Hutang & Piutang"||page==="Laporan"||page==="Dashboard"){
   header=["No Dokumen","Jenis","Tanggal","Mitra","Produk","Qty","Harga","Total","Dibayar","Sisa","Jatuh Tempo"];
   rows=data.orders.filter(o=>page==="Penjualan"?o.kind==="sale":page==="Pembelian"?o.kind==="purchase":page==="Hutang & Piutang"?remaining(o)>0:true).map(o=>[o.number,kindLabel(o.kind),o.date,findPartner(o.partnerId),findProduct(o.productId),o.qty,o.price,amount(o),o.paid,remaining(o),o.due]);
  }else if(page==="Produk"||page==="Persediaan"){header=["Kode","Produk","Kategori","Satuan","Stok","Minimum","Harga Jual","Harga Beli"];rows=data.products.map(p=>[p.code,p.name,p.category,p.unit,productStock(data,p.id),p.min,p.price,p.cost]);}
  else if(page==="Distribusi"){header=["Faktur","Pengemudi","Kendaraan","Tujuan","Jadwal","Status"];rows=data.deliveries.map(d=>[data.orders.find(o=>o.id===d.orderId)?.number||"",d.driver,d.vehicle,d.destination,d.date,d.status]);}
  else {header=["Kode","Nama","Kota","Telepon"];rows=data.partners.filter(p=>p.type===(page==="Supplier"?"supplier":"customer")).map(p=>[p.code,p.name,p.city,p.phone]);}
  csvDownload("OPSPIRY-"+page.replace(/[^a-zA-Z]/g,"-")+"-"+today()+".csv",[header,...rows]);toastIt("File CSV berhasil diunduh");
 }
 async function signIn(event:React.FormEvent,signUp=false){
  event.preventDefault();const cloud=getCloud();if(!cloud){setCloudError("Konfigurasi database belum tersedia.");return;}
  setCloudError("");setCloudBusy(true);
  try{
   if(signUp){const {error}=await cloud.auth.signUp({email:authForm.email,password:authForm.password});if(error)throw error;toastIt("Pendaftaran dikirim. Konfirmasi email jika diminta.");}
   else {const {data:result,error}=await cloud.auth.signInWithPassword({email:authForm.email,password:authForm.password});if(error)throw error;if(result.user){const remote=await loadRemote(result.user.id);setData(remote||emptyData);setUserId(result.user.id);setUserEmail(result.user.email||"");setSyncState("Cloud OPSPIRY aktif");toastIt("Berhasil masuk ke ruang kerja cloud");}}
  }catch(e){setCloudError(e instanceof Error?e.message:"Gagal login");}finally{setCloudBusy(false);}
 }
 async function signOut(){const cloud=getCloud();if(cloud)await cloud.auth.signOut();setUserId(null);setUserEmail("");try{const raw=localStorage.getItem("opspiry_demo_v1");setData(raw?JSON.parse(raw):seedData());}catch{setData(seedData());}toastIt("Keluar dari cloud. Mode demo aktif.");}
 const rowOrder=(o:Order)=><tr key={o.id}><td><strong className="ref">{o.number}</strong><small>{shortDate(o.date)}</small></td><td><strong>{findPartner(o.partnerId)}</strong><small>{findProduct(o.productId)} · {num(o.qty)} unit</small></td><td className="numeric">{money(amount(o))}</td><td className="numeric">{money(remaining(o))}</td><td>{remaining(o)===0?pill("Lunas","good"):o.due<today()?pill("Terlambat","danger"):pill("Belum lunas","warn")}</td><td className="center"><div className="action-pair"><button className="icon-button" aria-label={"Cetak faktur "+o.number} title="Cetak faktur" onClick={()=>setPrintOrder(o.id)}><Printer size={18}/></button><button className="icon-button" title="Catat pembayaran" aria-label={"Catat pembayaran "+o.number} onClick={()=>{setPayOrder(o.id);setPayAmount(String(remaining(o)));setPayMethod("Transfer Bank");setPayReference("");}} disabled={remaining(o)===0}><CircleDollarSign size={18}/></button></div></td></tr>;
 const tableCard=(heading:string,headings:string[],body:React.ReactNode,side?:React.ReactNode)=><section className="surface table-surface"><div className="section-header"><div><h3>{heading}</h3><p>Data diperbarui berdasarkan aktivitas yang dicatat</p></div>{side}</div><div className="table-scroll"><table><thead><tr>{headings.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{body}</tbody></table></div></section>;
 return <div className="shell os-shell">
  <div className="main-panel">
   <header className="os-header">
    <button className="os-brand" type="button" onClick={()=>setPage("Dashboard")} aria-label="Kembali ke dashboard OPSPIRY">
     <img className="os-brand-mark" src="/opspiry-mark.svg" width={43} height={43} alt=""/>
     <span className="os-brand-copy"><strong>OPSPIRY</strong><small>OPERATING SYSTEM</small></span>
    </button>
    <div className="os-header-controls">
     {page!=="Pengaturan"&&page!=="Laporan"&&<div className="os-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari data halaman…" aria-label="Cari data halaman"/></div>}
     <span className="os-current-date"><CalendarDays size={16}/>{new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"})}</span>
     <button className="os-account" type="button" onClick={()=>setPage("Pengaturan")} aria-label="Pengaturan dan akun"><span className="os-account-avatar">OS</span><span>{userId?"Cloud Pribadi":"Mode Demo"}</span><ChevronDown size={15}/></button>
    </div>
   </header>
   <nav className="os-nav" aria-label="Menu utama OPSPIRY">
    <div className="os-nav-inner">
     {navigation.map(group=><div className="os-nav-group" key={group.group}>{group.items.map(item=><button type="button" key={item.name} className={"os-nav-item "+(page===item.name?"is-active":"")} aria-current={page===item.name?"page":undefined} onClick={()=>setPage(item.name as Page)}><item.icon size={17} strokeWidth={1.9}/><span>{item.name}</span>{item.name==="Hutang & Piutang"&&receivables+payables>0&&<i className="os-nav-dot" aria-hidden="true" title="Ada saldo terbuka"/>}</button>)}</div>)}
    </div>
   </nav>
   <main className="content">
    <div className="page-intro"><div><div className="eyebrow"><span className="eyebrow-dot"/>{userId?"WORKSPACE CLOUD":"PREVIEW · DATA SIMULASI"}</div><h1>{page==="Dashboard"?"Dashboard OPSPIRY":page}<span className="title-accent">.</span></h1><p>{pages[page]}</p></div>{page!=="Pengaturan"&&<div className="intro-actions"><button className="btn btn-outline" onClick={exportActive}><Download size={17}/> Ekspor CSV</button><button className="btn btn-primary" onClick={()=>openModal(page==="Pembelian"?"purchase":page==="Produk"?"product":page==="Pelanggan"?"customer":page==="Supplier"?"supplier":page==="Distribusi"?"delivery":page==="Persediaan"?"adjustment":"sale")}><Plus size={18}/> {page==="Produk"?"Tambah Produk":page==="Pelanggan"?"Tambah Pelanggan":page==="Supplier"?"Tambah Supplier":page==="Distribusi"?"Buat Pengiriman":page==="Persediaan"?"Sesuaikan Stok":page==="Pembelian"?"Buat Pembelian":"Transaksi Baru"}</button></div>}</div>
    {!userId&&<div className="demo-banner"><span className="demo-icon"><Activity size={17}/></span><span><strong>Mode simulasi aktif.</strong> Angka dan nama yang ditampilkan merupakan contoh, bukan data perusahaan nyata. Perubahan tersimpan di browser perangkat ini.</span><button onClick={()=>setPage("Pengaturan")}>Pengaturan cloud <ArrowRight size={15}/></button></div>}
    {page==="Dashboard"&&<>
      <section className="os-hero" aria-label="Ringkasan OPSPIRY Distribution Management System">
       <div className="os-hero-main">
        <div className="os-hero-kicker"><span className="os-hero-kicker-dot"/> SATU SISTEM, LEBIH BANYAK KONTROL</div>
        <h2>Distribusi <span>lebih terkontrol.</span><br/>Bisnis lebih terukur.</h2>
        <p>Kelola penjualan, pembelian, persediaan, hutang-piutang dan pengiriman dari satu dashboard yang saling terhubung.</p>
        <div className="os-hero-buttons">
         <button className="os-hero-btn-primary" onClick={()=>openModal("sale")}><Plus size={17}/> Input Penjualan</button>
         <button className="os-hero-btn-outline" onClick={()=>openModal("purchase")}><ShoppingBag size={17}/> Input Pembelian</button>
         <button className="os-hero-btn-outline" onClick={()=>setPage("Persediaan")}><Package size={17}/> Cek Stok</button>
         <button className="os-hero-btn-outline" onClick={()=>setPage("Hutang & Piutang")}><Wallet size={17}/> Lihat Piutang</button>
        </div>
       </div>
       <div className="os-pulse-card">
        <div className="os-pulse-title"><strong>Performa Penjualan</strong><span>7 hari terakhir</span></div>
        <div className="os-pulse-amount">{money(salesDaily.reduce((sum,value)=>sum+value,0))}</div>
        <MiniChart values={salesDaily} labels={salesDayLabels}/>
        <div className="os-pulse-days" aria-hidden="true">{salesDayLabels.map((label,i)=><span key={salesDates[i]}>{label}</span>)}</div>
       </div>
      </section>
      <div className="metric-grid">
       {[{label:"Total Penjualan",value:money(sales),hint:"Seluruh periode · "+ordersSale.length+" faktur",icon:TrendingUp,tone:"brand"},{label:"Estimasi Laba Kotor",value:money(grossProfit),hint:"Seluruh periode · HPP saat ini",icon:CircleDollarSign,tone:"green"},{label:"Piutang Pelanggan",value:money(receivables),hint:"Belum diterima",icon:ArrowDownLeft,tone:"orange"},{label:"Nilai Persediaan",value:money(inventoryWorth),hint:data.products.length+" jenis produk",icon:Boxes,tone:"brand"}].map((m,i)=><div className="metric-card" key={m.label}><div className="metric-top"><span>{m.label}</span><span className={"metric-icon "+m.tone}><m.icon size={20}/></span></div><strong className="metric-value">{m.value}</strong><div className="metric-foot"><span className="metric-foot-dot"/>{m.hint}</div>{i===0&&<div className="metric-watermark"><TrendingUp size={68}/></div>}</div>)}
      </div>
      <section className="surface dashboard-summary" aria-label="Ringkasan operasional">
       <div className="dashboard-summary-grid">
        <section>
         <h3>Produk terlaris</h3>
         <p>Omzet seluruh periode</p>
         {topProducts.length===0&&<p>Belum ada penjualan.</p>}
         {topProducts.map(product=><div className="bar-label-row" key={product.id}>
          <div><span>{product.name}</span><strong>{money(product.sales)}</strong></div>
          <div className="progress-track" aria-hidden="true"><div style={{width:`${product.sales/salesMax*100}%`}}/></div>
         </div>)}
        </section>
        <section>
         <h3>Stok dan tagihan</h3>
         <div className="report-row"><span>Produk di batas stok minimum</span><strong>{num(lowStock)}</strong></div>
         <div className="report-row"><span>Hutang supplier terbuka</span><strong>{money(payables)}</strong></div>
         <div className="report-row"><span>Pelanggan terdaftar</span><strong>{num(customerCount)}</strong></div>
        </section>
        <section>
         <h3>Pengiriman</h3>
         <div className="report-row"><span>Aktif</span><strong>{num(data.deliveries.filter(d=>d.status!=="Terkirim").length)}</strong></div>
         {deliveriesByStatus.map(({status,count})=><div className="report-row" key={status}><span>{status}</span><strong>{num(count)}</strong></div>)}
        </section>
       </div>
      </section>
      {tableCard("Transaksi Terbaru",["No Dokumen","Mitra / Produk","Total","Sisa","Status","Aksi"],[...data.orders].filter(o=>matches(o.number,findPartner(o.partnerId),findProduct(o.productId))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(rowOrder),<button className="text-link" onClick={()=>setPage("Laporan")}>Lihat laporan <ArrowRight size={16}/></button>)}
    </>}
    {(page==="Penjualan"||page==="Pembelian")&&<>
      <div className="compact-stats"><div><span>Total {page}</span><strong>{money(page==="Penjualan"?sales:purchase)}</strong></div><div><span>Jumlah Dokumen</span><strong>{page==="Penjualan"?ordersSale.length:ordersPurchase.length}</strong></div><div><span>Belum Lunas</span><strong>{money(page==="Penjualan"?receivables:payables)}</strong></div></div>
      {tableCard("Daftar "+page,["No Dokumen","Mitra / Produk","Nilai Transaksi","Sisa Tagihan","Status","Bayar"],data.orders.filter(o=>o.kind===(page==="Penjualan"?"sale":"purchase")&&matches(o.number,findPartner(o.partnerId),findProduct(o.productId))).map(rowOrder))}
    </>}
    {page==="Persediaan"&&<>
      <div className="compact-stats"><div><span>Nilai Persediaan</span><strong>{money(inventoryWorth)}</strong></div><div><span>Jumlah SKU</span><strong>{data.products.length}</strong></div><div><span>Stok Minimum</span><strong className={lowStock?"danger-text":""}>{lowStock} produk</strong></div></div>
      {tableCard("Posisi Stok Produk",["Kode","Nama Produk","Kategori","Stok Tersedia","Batas Minimum","Status"],data.products.filter(p=>matches(p.code,p.name,p.category)).map(p=><tr key={p.id}><td className="ref">{p.code}</td><td><strong>{p.name}</strong><small>{p.unit}</small></td><td>{p.category}</td><td className="numeric strong-cell">{num(productStock(data,p.id))}</td><td className="numeric">{num(p.min)}</td><td>{productStock(data,p.id)<=p.min?pill("Stok rendah","danger"):pill("Aman","good")}</td></tr>))}
      {tableCard("Riwayat Perubahan Stok",["Tanggal","Produk","Jenis","Jumlah","Keterangan"],[...data.orders.map(o=>({id:o.id,date:o.date,product:o.productId,kind:o.kind==="purchase"?"Barang Masuk":"Barang Keluar",qty:o.kind==="purchase"?o.qty:-o.qty,note:o.number})),...data.adjustments.map(a=>({id:a.id,date:a.date,product:a.productId,kind:"Penyesuaian",qty:a.qty,note:a.note}))].sort((a,b)=>b.date.localeCompare(a.date)).filter(a=>matches(findProduct(a.product),a.note,a.kind)).map(a=><tr key={a.id}><td>{shortDate(a.date)}</td><td>{findProduct(a.product)}</td><td>{a.kind}</td><td className={"numeric "+(a.qty>0?"positive-text":"danger-text")}>{a.qty>0?"+":""}{num(a.qty)}</td><td>{a.note||"—"}</td></tr>))}
    </>}
    {page==="Hutang & Piutang"&&<>
      <div className="compact-stats"><div><span>Piutang Belum Dibayar</span><strong>{money(receivables)}</strong></div><div><span>Hutang Belum Dibayar</span><strong>{money(payables)}</strong></div><div><span>Tagihan Terbuka</span><strong>{data.orders.filter(o=>remaining(o)>0).length}</strong></div></div>
      {tableCard("Kartu Hutang & Piutang",["No Dokumen","Mitra / Produk","Total","Outstanding","Status","Aksi"],data.orders.filter(o=>remaining(o)>0&&matches(o.number,findPartner(o.partnerId),findProduct(o.productId),kindLabel(o.kind))).map(rowOrder))}
      {tableCard("Riwayat Pelunasan",["Tanggal","Nomor Dokumen","Mitra","Metode","Referensi","Nominal"],(data.payments||[]).filter(p=>matches(data.orders.find(o=>o.id===p.orderId)?.number||"",findPartner(data.orders.find(o=>o.id===p.orderId)?.partnerId||""),p.method,p.reference)).slice().reverse().map(p=>{const o=data.orders.find(o=>o.id===p.orderId);return <tr key={p.id}><td>{shortDate(p.date)}</td><td className="ref">{o?.number||"—"}</td><td>{findPartner(o?.partnerId||"")}</td><td>{p.method}</td><td>{p.reference||"—"}</td><td className="numeric strong-cell">{money(p.amount)}</td></tr>}),<button className="text-link" onClick={()=>{csvDownload("OPSPIRY-Riwayat-Pembayaran-"+today()+".csv",[["Tanggal","No Dokumen","Mitra","Metode","Referensi","Jumlah"],...(data.payments||[]).map(p=>{const o=data.orders.find(o=>o.id===p.orderId);return [p.date,o?.number||"",findPartner(o?.partnerId||""),p.method,p.reference,p.amount];})]);toastIt("Riwayat pembayaran diunduh");}}><Download size={14}/> Ekspor pembayaran</button>)}
    </>}
    {(page==="Pelanggan"||page==="Supplier")&&<>
      <div className="compact-stats"><div><span>Total {page}</span><strong>{data.partners.filter(p=>p.type===(page==="Pelanggan"?"customer":"supplier")).length}</strong></div><div><span>Total Transaksi</span><strong>{data.orders.filter(o=>o.kind===(page==="Pelanggan"?"sale":"purchase")).length}</strong></div><div><span>Total Outstanding</span><strong>{money(page==="Pelanggan"?receivables:payables)}</strong></div></div>
      {tableCard("Master "+page,["Kode","Nama Mitra","Kota","Kontak","Total Transaksi","Sisa Tagihan"],data.partners.filter(p=>p.type===(page==="Pelanggan"?"customer":"supplier")&&matches(p.code,p.name,p.city)).map(p=><tr key={p.id}><td className="ref">{p.code}</td><td><strong>{p.name}</strong></td><td>{p.city||"—"}</td><td>{p.phone||"—"}</td><td className="numeric">{data.orders.filter(o=>o.partnerId===p.id).length}</td><td className="numeric">{money(data.orders.filter(o=>o.partnerId===p.id).reduce((n,o)=>n+remaining(o),0))}</td></tr>))}
    </>}
    {page==="Produk"&&<>
      <div className="compact-stats"><div><span>Produk Aktif</span><strong>{data.products.length}</strong></div><div><span>Total Kategori</span><strong>{new Set(data.products.map(p=>p.category)).size}</strong></div><div><span>Persediaan</span><strong>{money(inventoryWorth)}</strong></div></div>
      {tableCard("Master Produk",["Kode","Nama Produk","Kategori","Satuan","Harga Jual","Harga Beli","Stok"],data.products.filter(p=>matches(p.code,p.name,p.category)).map(p=><tr key={p.id}><td className="ref">{p.code}</td><td><strong>{p.name}</strong></td><td>{p.category}</td><td>{p.unit}</td><td className="numeric">{money(p.price)}</td><td className="numeric">{money(p.cost)}</td><td className="numeric strong-cell">{num(productStock(data,p.id))}</td></tr>))}
    </>}
    {page==="Distribusi"&&<>
      <div className="compact-stats"><div><span>Total Pengiriman</span><strong>{data.deliveries.length}</strong></div><div><span>Dalam Perjalanan</span><strong>{data.deliveries.filter(d=>d.status==="Dalam Perjalanan").length}</strong></div><div><span>Sudah Diterima</span><strong>{data.deliveries.filter(d=>d.status==="Terkirim").length}</strong></div></div>
      {tableCard("Monitoring Pengiriman",["Faktur","Pelanggan","Pengemudi / Kendaraan","Tujuan","Tanggal","Status / Aksi"],data.deliveries.filter(d=>matches(d.destination,d.driver,d.vehicle,data.orders.find(o=>o.id===d.orderId)?.number||"")).map(d=><tr key={d.id}><td className="ref">{data.orders.find(o=>o.id===d.orderId)?.number||"—"}</td><td>{findPartner(data.orders.find(o=>o.id===d.orderId)?.partnerId||"")}</td><td><strong>{d.driver||"—"}</strong><small>{d.vehicle||"—"}</small></td><td>{d.destination}</td><td>{shortDate(d.date)}</td><td><select className="table-select" aria-label={"Status pengiriman "+d.id} value={d.status} onChange={e=>{const status=e.target.value as Delivery["status"];setData(v=>({...v,deliveries:v.deliveries.map(x=>x.id===d.id?{...x,status}:x)}));toastIt("Status pengiriman diperbarui");}}><option>Dijadwalkan</option><option>Dalam Perjalanan</option><option>Terkirim</option></select></td></tr>))}
    </>}
    {page==="Laporan"&&<>
      <div className="compact-stats"><div><span>Omzet Penjualan</span><strong>{money(sales)}</strong></div><div><span>Laba Kotor Estimasi</span><strong>{money(grossProfit)}</strong></div><div><span>Margin Kotor</span><strong>{sales?(grossProfit/sales*100).toFixed(1):"0"}%</strong></div></div>
      <div className="report-grid"><section className="surface report-card"><h3>Ringkasan Keuangan</h3><p>Nilai berdasarkan faktur yang dicatat, belum termasuk biaya operasional dan pajak.</p>{[{label:"Omzet Penjualan",v:sales},{label:"Pembelian Barang",v:purchase},{label:"Estimasi HPP Barang Terjual",v:sales-grossProfit},{label:"Estimasi Laba Kotor",v:grossProfit},{label:"Piutang",v:receivables},{label:"Hutang",v:payables},{label:"Nilai Stok",v:inventoryWorth}].map(r=><div className="report-row" key={r.label}><span>{r.label}</span><strong>{money(r.v)}</strong></div>)}</section><section className="surface report-card"><h3>Komposisi Penjualan Produk</h3><p>Kontribusi setiap produk terhadap omzet.</p>{data.products.map(p=>{const value=ordersSale.filter(o=>o.productId===p.id).reduce((n,o)=>n+amount(o),0);return <div className="bar-label-row" key={p.id}><div><span>{p.name}</span><strong>{sales?(value/sales*100).toFixed(1):"0"}%</strong></div><div className="progress-track"><div style={{width:(sales?Math.min(100,value/sales*100):0)+"%"}}/></div></div>;})}</section></div>
      <div className="report-grid aging-panels">
        {(["sale","purchase"] as const).map(kind=><section className="surface report-card" key={kind}><h3>Umur {kind==="sale"?"Piutang Pelanggan":"Hutang Supplier"}</h3><p>Tagihan terbuka dikelompokkan menurut keterlambatan jatuh tempo hari ini.</p>{agingSummary(data.orders,kind).map(bucket=><div className="report-row" key={bucket.label}><span>{bucket.label} · {bucket.count} faktur</span><strong>{money(bucket.amount)}</strong></div>)}</section>)}
      </div>
    </>}
    {page==="Pengaturan"&&<>
      <div className="settings-grid">
        <section className="surface settings-card settings-card-compact">
          <button type="button" className="settings-toggle" aria-expanded={expandedSetting==="cloud"} aria-controls="opspiry-cloud-details" onClick={()=>setExpandedSetting(value=>value==="cloud"?null:"cloud")}>
            <span className="settings-icon"><Cloud size={24}/></span>
            <h3>Sinkronisasi Data Cloud</h3>
            <ChevronDown className={"settings-chevron "+(expandedSetting==="cloud"?"is-open":"")} size={19}/>
          </button>
          {expandedSetting==="cloud"&&<div id="opspiry-cloud-details" className="settings-details">
            <div className="setting-row"><span>Status Database</span>{cloudConfigured()?pill("Konfigurasi tersedia","good"):pill("Belum dikonfigurasi","warn")}</div>
            <div className="setting-row"><span>Status Penyimpanan</span><strong>{syncState}</strong></div>
            {userId?<><div className="setting-row"><span>Akun</span><strong>{userEmail}</strong></div><button className="btn btn-outline" onClick={signOut}><LogOut size={16}/> Keluar dari cloud</button></>:cloudConfigured()?<form className="auth-form" onSubmit={e=>signIn(e,false)}><label>Email<input type="email" required value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))} placeholder="nama@perusahaan.com"/></label><label>Password<input type="password" minLength={6} required value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))} placeholder="Masukkan password"/></label><div className="auth-actions"><button className="btn btn-primary" disabled={cloudBusy} type="submit">Masuk Cloud</button><button className="btn btn-outline" disabled={cloudBusy} type="button" onClick={e=>signIn(e as unknown as React.FormEvent,true)}>Daftar Akun Baru</button></div></form>:null}
            {cloudError&&<p className="form-error" role="alert">{cloudError}</p>}
          </div>}
        </section>
        <section className="surface settings-card settings-card-compact">
          <button type="button" className="settings-toggle" aria-expanded={expandedSetting==="install"} aria-controls="opspiry-install-details" onClick={()=>setExpandedSetting(value=>value==="install"?null:"install")}>
            <span className="settings-icon"><Smartphone size={24}/></span>
            <h3>Instal Aplikasi</h3>
            <ChevronDown className={"settings-chevron "+(expandedSetting==="install"?"is-open":"")} size={19}/>
          </button>
          {expandedSetting==="install"&&<div id="opspiry-install-details" className="settings-details">
            {installPrompt?<button className="btn btn-outline" onClick={async()=>{await installPrompt.prompt();await installPrompt.userChoice;setInstallPrompt(null);}}><Smartphone size={17}/> Instal OPSPIRY</button>:<span className="settings-short-hint">Instal melalui menu browser.</span>}
          </div>}
        </section>
      </div>
      <section className="surface reset-card"><div><h3>Cadangkan Data OPSPIRY</h3><p>Unduh data sebagai JSON. Mode demo mendukung pemulihan backup setelah konfirmasi.</p></div><div className="backup-buttons"><button className="btn btn-outline" onClick={exportBackup}><Download size={16}/> Backup JSON</button><input aria-label="Pilih backup" type="file" accept=".json,application/json" ref={restoreInput} hidden onChange={e=>importBackup(e.target.files?.[0])}/><button className="btn btn-outline" disabled={!!userId} onClick={()=>restoreInput.current?.click()}><Upload size={16}/> Pulihkan Backup</button></div></section>
      {!userId&&<section className="surface reset-card"><div><h3>Reset Data Simulasi</h3><p>Hapus perubahan yang tersimpan di browser ini dan muat ulang data contoh.</p></div><button className="btn btn-danger-outline" onClick={()=>{if(confirm("Reset seluruh data demo di browser ini?")){setData(seedData());toastIt("Data demo berhasil direset");}}}><RefreshCw size={16}/> Reset data contoh</button></section>}
    </>}
    <footer className="app-footer"><span>© 2026 OPSPIRY · Sistem Operasional</span><span><span className="footer-live"/> {syncState}</span></footer>
   </main></div>
   {toast&&<div className="toast" role="status"><CheckCircle2 size={19}/>{toast}<button onClick={()=>setToast("")} aria-label="Tutup pesan"><X size={16}/></button></div>}
   {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null);}}><section className="modal" role="dialog" aria-modal="true" aria-label={modalTitle[modal]}><header className="modal-header"><div><div className="section-kicker">OPERASIONAL OPSPIRY</div><h2>{modalTitle[modal]}</h2><p>Lengkapi data untuk menyimpan perubahan.</p></div><button className="icon-button" onClick={()=>setModal(null)} aria-label="Tutup formulir"><X size={21}/></button></header>
     {(modal==="sale"||modal==="purchase")&&<form onSubmit={saveOrder} className="modal-form"><div className="form-grid"><label className="field full">{modal==="sale"?"Pelanggan":"Supplier"}<select required value={saleForm.partnerId} onChange={e=>setSaleForm(v=>({...v,partnerId:e.target.value}))}><option value="">Pilih {modal==="sale"?"pelanggan":"supplier"}</option>{data.partners.filter(p=>p.type===(modal==="sale"?"customer":"supplier")).map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label><label className="field full">Produk<select required value={saleForm.productId} onChange={e=>{const pid=e.target.value;const p=data.products.find(x=>x.id===pid);setSaleForm(v=>({...v,productId:pid,price:p?String(modal==="sale"?p.price:p.cost):""}));}}><option value="">Pilih produk</option>{data.products.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name} (stok {productStock(data,p.id)})</option>)}</select></label><label className="field">Kuantitas<input required type="number" min="1" step="1" value={saleForm.qty} onChange={e=>setSaleForm(v=>({...v,qty:e.target.value}))}/></label><label className="field">Harga satuan (Rp)<input required type="number" min="1" step="1" value={saleForm.price} onChange={e=>setSaleForm(v=>({...v,price:e.target.value}))}/></label><label className="field">Pembayaran awal (Rp)<input required type="number" min="0" step="1" value={saleForm.paid} onChange={e=>setSaleForm(v=>({...v,paid:e.target.value}))}/></label><label className="field">Jatuh tempo<input required type="date" value={saleForm.due} onChange={e=>setSaleForm(v=>({...v,due:e.target.value}))}/></label><label className="field full">Keterangan<textarea rows={2} placeholder="Opsional" value={saleForm.note} onChange={e=>setSaleForm(v=>({...v,note:e.target.value}))}/></label></div><div className="form-total"><span>Total transaksi</span><strong>{money(entryTotal)}</strong><span>Sisa {modal==="sale"?"piutang":"hutang"}</span><strong>{money(entryBalance)}</strong></div><div className="modal-actions"><button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Batal</button><button type="submit" className="btn btn-primary"><Check size={17}/> Simpan Transaksi</button></div></form>}
     {modal==="product"&&<form className="modal-form" onSubmit={saveProduct}><div className="form-grid"><label className="field full">Nama produk<input required value={productForm.name} onChange={e=>setProductForm(v=>({...v,name:e.target.value}))} placeholder="Contoh: Beras Premium 5kg"/></label><label className="field">Kategori<input value={productForm.category} onChange={e=>setProductForm(v=>({...v,category:e.target.value}))}/></label><label className="field">Satuan<input value={productForm.unit} onChange={e=>setProductForm(v=>({...v,unit:e.target.value}))}/></label><label className="field">Harga jual (Rp)<input required type="number" min="0" value={productForm.price} onChange={e=>setProductForm(v=>({...v,price:e.target.value}))}/></label><label className="field">Harga beli (Rp)<input required type="number" min="0" value={productForm.cost} onChange={e=>setProductForm(v=>({...v,cost:e.target.value}))}/></label><label className="field">Stok awal<input required type="number" min="0" step="1" value={productForm.opening} onChange={e=>setProductForm(v=>({...v,opening:e.target.value}))}/></label><label className="field">Stok minimum<input required type="number" min="0" step="1" value={productForm.min} onChange={e=>setProductForm(v=>({...v,min:e.target.value}))}/></label></div><div className="modal-actions"><button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Batal</button><button className="btn btn-primary" type="submit">Simpan Produk</button></div></form>}
     {(modal==="customer"||modal==="supplier")&&<form className="modal-form" onSubmit={savePartner}><div className="form-grid"><label className="field full">Nama {modal==="customer"?"pelanggan":"supplier"}<input required value={partnerForm.name} onChange={e=>setPartnerForm(v=>({...v,name:e.target.value}))}/></label><label className="field">Nomor kontak<input value={partnerForm.phone} onChange={e=>setPartnerForm(v=>({...v,phone:e.target.value}))}/></label><label className="field">Kota<input value={partnerForm.city} onChange={e=>setPartnerForm(v=>({...v,city:e.target.value}))}/></label></div><div className="modal-actions"><button className="btn btn-outline" type="button" onClick={()=>setModal(null)}>Batal</button><button className="btn btn-primary" type="submit">Simpan Mitra</button></div></form>}
     {modal==="delivery"&&<form className="modal-form" onSubmit={saveDelivery}><div className="form-grid"><label className="field full">Faktur penjualan<select required value={deliveryForm.orderId} onChange={e=>{const o=data.orders.find(o=>o.id===e.target.value);setDeliveryForm(v=>({...v,orderId:e.target.value,destination:o?data.partners.find(p=>p.id===o.partnerId)?.city||"":" "}));}}><option value="">Pilih faktur</option>{ordersSale.map(o=><option key={o.id} value={o.id}>{o.number} · {findPartner(o.partnerId)}</option>)}</select></label><label className="field">Pengemudi<input value={deliveryForm.driver} onChange={e=>setDeliveryForm(v=>({...v,driver:e.target.value}))}/></label><label className="field">No. kendaraan<input value={deliveryForm.vehicle} onChange={e=>setDeliveryForm(v=>({...v,vehicle:e.target.value}))}/></label><label className="field">Kota tujuan<input required value={deliveryForm.destination} onChange={e=>setDeliveryForm(v=>({...v,destination:e.target.value}))}/></label><label className="field">Tanggal kirim<input required type="date" value={deliveryForm.date} onChange={e=>setDeliveryForm(v=>({...v,date:e.target.value}))}/></label></div><div className="modal-actions"><button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Batal</button><button type="submit" className="btn btn-primary">Buat Surat Jalan</button></div></form>}
     {modal==="adjustment"&&<form className="modal-form" onSubmit={saveAdjustment}><div className="form-grid"><label className="field full">Produk<select required value={adjustForm.productId} onChange={e=>setAdjustForm(v=>({...v,productId:e.target.value}))}><option value="">Pilih produk</option>{data.products.map(p=><option value={p.id} key={p.id}>{p.name} · Stok {productStock(data,p.id)}</option>)}</select></label><label className="field full">Perubahan kuantitas (minus untuk berkurang)<input type="number" required step="1" value={adjustForm.qty} placeholder="Contoh: -5 atau 10" onChange={e=>setAdjustForm(v=>({...v,qty:e.target.value}))}/></label><label className="field full">Alasan / Keterangan<textarea rows={3} value={adjustForm.note} onChange={e=>setAdjustForm(v=>({...v,note:e.target.value}))} placeholder="Hasil stock opname, rusak, dll."/></label></div><div className="modal-actions"><button className="btn btn-outline" type="button" onClick={()=>setModal(null)}>Batal</button><button className="btn btn-primary" type="submit">Simpan Penyesuaian</button></div></form>}
   </section></div>}
   {payOrder&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setPayOrder(null);}}><section className="modal modal-small" role="dialog" aria-modal="true" aria-label="Catat pembayaran"><header className="modal-header"><div><div className="section-kicker">PELUNASAN</div><h2>Catat Pembayaran</h2><p>{data.orders.find(o=>o.id===payOrder)?.number}</p></div><button className="icon-button" aria-label="Tutup" onClick={()=>setPayOrder(null)}><X size={21}/></button></header><form className="modal-form" onSubmit={settle}><label className="field">Nominal pembayaran (Rp)<input type="number" min="1" step="1" required value={payAmount} onChange={e=>setPayAmount(e.target.value)}/></label><label className="field">Metode pembayaran<select value={payMethod} onChange={e=>setPayMethod(e.target.value)}><option>Transfer Bank</option><option>Tunai</option><option>Giro</option><option>Lainnya</option></select></label><label className="field">Referensi / catatan pembayaran<input value={payReference} onChange={e=>setPayReference(e.target.value)} placeholder="No. bukti / nama bank (opsional)"/></label><p className="settings-note">Maksimal sisa tagihan: {money(remaining(data.orders.find(o=>o.id===payOrder)!))}</p><div className="modal-actions"><button type="button" className="btn btn-outline" onClick={()=>setPayOrder(null)}>Batal</button><button className="btn btn-primary" type="submit">Simpan Pelunasan</button></div></form></section></div>}
  <InvoicePrint order={data.orders.find(o=>o.id===printOrder)} partner={data.partners.find(p=>p.id===data.orders.find(o=>o.id===printOrder)?.partnerId)} product={data.products.find(p=>p.id===data.orders.find(o=>o.id===printOrder)?.productId)} isDemo={!userId}/>
  </div>;
}