-- OPSPIRY MVP: isolated personal workspace storage.
-- Execute ONLY on a dedicated OPSPIRY Supabase project.
-- RLS blocks access to every other user's payload.
-- No service-role key should ever be placed in a NEXT_PUBLIC variable.
begin;
create table if not exists public.opspiry_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"products":[],"partners":[],"orders":[],"deliveries":[],"adjustments":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint opspiry_payload_is_object check (jsonb_typeof(payload) = 'object'),
  constraint opspiry_payload_max_size check (octet_length(payload::text) <= 3000000)
);
alter table public.opspiry_user_data enable row level security;
revoke all on public.opspiry_user_data from anon;
grant select, insert, update on public.opspiry_user_data to authenticated;
drop policy if exists "opspiry_select_own" on public.opspiry_user_data;
drop policy if exists "opspiry_insert_own" on public.opspiry_user_data;
drop policy if exists "opspiry_update_own" on public.opspiry_user_data;
create policy "opspiry_select_own" on public.opspiry_user_data for select to authenticated using ((select auth.uid()) = user_id);
create policy "opspiry_insert_own" on public.opspiry_user_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "opspiry_update_own" on public.opspiry_user_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index if not exists opspiry_user_data_updated_at_idx on public.opspiry_user_data (updated_at desc);
commit;
-- Personal-workspace MVP only: no branch roles, concurrent transaction locking,
-- accounting journal, audit immutability, or production-grade inventory reconciliation.
-- Before multiuser production, replace the JSON snapshot model with normalized
-- transactional tables, tenant-scoped RLS, and server-side atomic posting.