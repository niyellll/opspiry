export type Partner = { id: string; code: string; name: string; phone: string; city: string; type: "customer" | "supplier" };
export type Product = { id: string; code: string; name: string; category: string; unit: string; price: number; cost: number; opening: number; min: number };
export type Order = { id: string; number: string; kind: "sale" | "purchase"; date: string; partnerId: string; productId: string; qty: number; price: number; paid: number; due: string; note: string; requiresReceipt?: true };
export type Delivery = { id: string; orderId: string; driver: string; vehicle: string; destination: string; status: "Dijadwalkan" | "Dalam Perjalanan" | "Terkirim"; date: string };
export type Adjustment = { id: string; productId: string; qty: number; note: string; date: string };
export type Payment = { id: string; orderId: string; date: string; amount: number; method: string; reference: string };
export type Receipt = { id: string; orderId: string; qty: number; date: string };
export type AppData = { products: Product[]; partners: Partner[]; orders: Order[]; deliveries: Delivery[]; adjustments: Adjustment[]; payments?: Payment[]; receipts?: Receipt[] };
export const emptyData: AppData = { products: [], partners: [], orders: [], deliveries: [], adjustments: [], payments: [], receipts: [] };
export const id = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
const localDate = (date: Date) => [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
export const today = () => localDate(new Date());
export const addDays = (date: string, days: number) => { const d = new Date(date + "T12:00:00"); d.setDate(d.getDate() + days); return localDate(d); };
export const money = (value: number) => "Rp " + Math.round(value).toLocaleString("id-ID");
export const num = (value: number) => value.toLocaleString("id-ID");
export const shortDate = (value: string) => new Date(value + "T12:00:00").toLocaleDateString("id-ID", {day:"2-digit",month:"short",year:"numeric"});
export const amount = (order: Order) => order.qty * order.price;
export const remaining = (order: Order) => Math.max(0, amount(order) - order.paid);
// Purchases written before receiving was introduced already contributed to stock.
export function receivedQty(data: AppData, order: Order) {
 if (order.kind !== "purchase") return 0;
 if (!order.requiresReceipt) return order.qty;
 return (data.receipts ?? []).reduce((total, receipt) => total + (receipt.orderId === order.id ? receipt.qty : 0), 0);
}

export function stockMovements(data: AppData) {
 const purchases = new Map(data.orders.filter(order => order.kind === "purchase").map(order => [order.id, order]));
 return [
  ...data.orders.filter(order => !order.requiresReceipt).map(order => ({
   id: order.id, date: order.date, product: order.productId,
   kind: order.kind === "purchase" ? "Pembelian lama" : "Barang Keluar",
   qty: order.kind === "purchase" ? order.qty : -order.qty, note: order.number,
  })),
  ...(data.receipts ?? []).flatMap(receipt => {
   const order = purchases.get(receipt.orderId);
   return order ? [{id: receipt.id, date: receipt.date, product: order.productId,
    kind: "Penerimaan Barang", qty: receipt.qty, note: order.number}] : [];
  }),
  ...data.adjustments.map(adjustment => ({...adjustment, product: adjustment.productId, kind: "Penyesuaian"})),
 ];
}

export const productStock = (data: AppData, productId: string) =>
 (data.products.find(product => product.id === productId)?.opening ?? 0) +
 data.orders.reduce((total, order) => total + (order.productId === productId ?
  (order.kind === "purchase" ? receivedQty(data, order) : -order.qty) : 0), 0) +
 data.adjustments.reduce((total, adjustment) => total + (adjustment.productId === productId ? adjustment.qty : 0), 0);
export function seedData(): AppData {
 const day = today();
 const products: Product[] = [
  {id:"p1",code:"PRD-001",name:"Minyak Goreng Premium 2L",category:"Sembako",unit:"karton",price:265000,cost:225000,opening:220,min:35},
  {id:"p2",code:"PRD-002",name:"Beras Premium 5kg",category:"Sembako",unit:"sak",price:76000,cost:61500,opening:450,min:70},
  {id:"p3",code:"PRD-003",name:"Gula Pasir 1kg",category:"Sembako",unit:"dus",price:205000,cost:168000,opening:160,min:30},
  {id:"p4",code:"PRD-004",name:"Air Mineral 600ml",category:"Minuman",unit:"karton",price:61000,cost:44000,opening:380,min:55},
  {id:"p5",code:"PRD-005",name:"Tepung Terigu 1kg",category:"Sembako",unit:"dus",price:129000,cost:100000,opening:110,min:25},
  {id:"p6",code:"PRD-006",name:"Kopi Bubuk 200gr",category:"Minuman",unit:"dus",price:240000,cost:192000,opening:95,min:20}
 ];
 const partners: Partner[] = [
  {id:"c1",code:"CUS-001",name:"Toko Makmur Jaya",phone:"081200000001",city:"Surabaya",type:"customer"},
  {id:"c2",code:"CUS-002",name:"CV Sumber Rejeki",phone:"081200000002",city:"Sidoarjo",type:"customer"},
  {id:"c3",code:"CUS-003",name:"Grosir Sentosa",phone:"081200000003",city:"Gresik",type:"customer"},
  {id:"c4",code:"CUS-004",name:"UD Maju Bersama",phone:"081200000004",city:"Malang",type:"customer"},
  {id:"s1",code:"SUP-001",name:"PT Pangan Nusantara",phone:"081300000001",city:"Surabaya",type:"supplier"},
  {id:"s2",code:"SUP-002",name:"CV Mitra Distribusi",phone:"081300000002",city:"Pasuruan",type:"supplier"}
 ];
 const orders: Order[] = [
  {id:"o1",number:"INV-260001",kind:"sale",date:addDays(day,-6),partnerId:"c1",productId:"p1",qty:42,price:265000,paid:11130000,due:addDays(day,8),note:"Pengiriman reguler"},
  {id:"o2",number:"INV-260002",kind:"sale",date:addDays(day,-5),partnerId:"c2",productId:"p2",qty:100,price:76000,paid:3800000,due:addDays(day,6),note:"Termin 14 hari"},
  {id:"o3",number:"INV-260003",kind:"sale",date:addDays(day,-4),partnerId:"c3",productId:"p4",qty:180,price:61000,paid:10980000,due:addDays(day,8),note:"Tunai"},
  {id:"o4",number:"INV-260004",kind:"sale",date:addDays(day,-2),partnerId:"c4",productId:"p3",qty:65,price:205000,paid:0,due:addDays(day,4),note:"Belum dibayar"},
  {id:"o5",number:"INV-260005",kind:"sale",date:day,partnerId:"c1",productId:"p6",qty:30,price:240000,paid:3200000,due:addDays(day,14),note:"Order baru"},
  {id:"o6",number:"PO-260001",kind:"purchase",date:addDays(day,-5),partnerId:"s1",productId:"p1",qty:90,price:225000,paid:10250000,due:addDays(day,9),note:"Restock"},
  {id:"o7",number:"PO-260002",kind:"purchase",date:addDays(day,-3),partnerId:"s2",productId:"p4",qty:240,price:44000,paid:10560000,due:addDays(day,8),note:"Restock"},
  {id:"o8",number:"PO-260003",kind:"purchase",date:addDays(day,-1),partnerId:"s1",productId:"p3",qty:100,price:168000,paid:0,due:addDays(day,14),note:"Pembelian tempo"}
 ];
 const deliveries: Delivery[] = [
  {id:"d1",orderId:"o1",driver:"Pak Budi",vehicle:"L 1234 AB",destination:"Surabaya",status:"Terkirim",date:addDays(day,-5)},
  {id:"d2",orderId:"o2",driver:"Pak Anton",vehicle:"W 2401 CD",destination:"Sidoarjo",status:"Terkirim",date:addDays(day,-4)},
  {id:"d3",orderId:"o4",driver:"Pak Budi",vehicle:"L 1234 AB",destination:"Malang",status:"Dalam Perjalanan",date:day},
  {id:"d4",orderId:"o5",driver:"Pak Anton",vehicle:"W 2401 CD",destination:"Surabaya",status:"Dijadwalkan",date:addDays(day,1)}
 ];
 const payments: Payment[] = orders.filter(o=>o.paid>0).map(o=>({id:"pay-"+o.id,orderId:o.id,date:o.date,amount:o.paid,method:"Data awal",reference:"Simulasi"}));
 return {products, partners, orders, deliveries, adjustments:[], payments};
}
export function csvDownload(name: string, rows: (string|number)[][]) {
 const csv = "\uFEFF" + rows.map(row => row.map(cell => '"' + String(cell).replace(/"/g,'""') + '"').join(",")).join("\r\n");
 const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
 const link = document.createElement("a"); link.href=URL.createObjectURL(blob); link.download=name; link.click();
 URL.revokeObjectURL(link.href);
}