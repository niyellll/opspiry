import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { AppData } from "./data";

let client: SupabaseClient | null = null;
export const cloudConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export function getCloud(): SupabaseClient | null {
 if (!cloudConfigured()) return null;
 if (!client) client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {auth:{persistSession:true,autoRefreshToken:true}});
 return client;
}
export type Workspace = { payload: AppData; revision: number };
export class SyncConflict extends Error {}

export async function loadRemote(userId: string): Promise<Workspace | null> {
 const db = getCloud();
 if (!db) throw new Error("Database belum dikonfigurasi");
 const { data, error } = await db.from("opspiry_user_data").select("payload,revision").eq("user_id",userId).maybeSingle();
 if (error) throw new Error(error.message);
 return data as Workspace | null;
}

export async function saveRemote(revision: number, payload: AppData, mutationId: string): Promise<Workspace> {
 const db = getCloud();
 if (!db) throw new Error("Database belum dikonfigurasi");
 const { data, error } = await db.rpc("opspiry_save_workspace", {
  expected_revision: revision, next_payload: payload, mutation_id: mutationId,
 });
 if (error?.code === "PT409") throw new SyncConflict(error.message);
 if (error) {
  if (error.code === "22023" || error.code === "23514") throw new StockValidationError(error.message);
  throw new Error(error.message);
 }
 return data as Workspace;
}

export class StockValidationError extends Error {}
