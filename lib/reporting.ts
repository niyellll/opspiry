import { remaining, today, type Order } from "@/lib/data";
export type AgingBucket = {label:string; amount:number; count:number};
export function agingSummary(orders:Order[],kind:"sale"|"purchase"):AgingBucket[] {
 const buckets:AgingBucket[] = [{label:"Belum jatuh tempo",amount:0,count:0},{label:"Terlambat 1–30 hari",amount:0,count:0},{label:"Terlambat 31–60 hari",amount:0,count:0},{label:"Terlambat lebih dari 60 hari",amount:0,count:0}];
 const base=Date.parse(today()+"T12:00:00Z");
 for(const order of orders){ if(order.kind!==kind||remaining(order)<=0)continue;
  const days=Math.round((base-Date.parse(order.due+"T12:00:00Z"))/86400000);
  const n=days<=0?0:days<=30?1:days<=60?2:3;
  buckets[n].amount+=remaining(order);buckets[n].count+=1;
 }
 return buckets;
}