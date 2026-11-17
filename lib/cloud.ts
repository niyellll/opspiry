import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { AppData } from "./data";

let client: SupabaseClient | null = null;
export const cloudConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export function getCloud(): SupabaseClient | null {
 if (!cloudConfigured()) return null;
 if (!client) client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {auth:{persistSession:true,autoRefreshToken:true}});
 return client;
}
export async function loadRemote(userId: string): Promise<AppData | null> {
 const db = getCloud();
 if (!db) return null;
 const { data, error } = await db.from("opspiry_user_data").select("payload").eq("user_id",userId).maybeSingle();
 if (error) throw new Error(error.message);
 return data?.payload as AppData || null;
}
export async function saveRemote(userId: string, payload: AppData) {
 const db = getCloud();
 if (!db) throw new Error("Database belum dikonfigurasi");
 const { error } = await db.from("opspiry_user_data").upsert({user_id:userId,payload,updated_at:new Date().toISOString()},{onConflict:"user_id"});
 if (error) throw new Error(error.message);
}