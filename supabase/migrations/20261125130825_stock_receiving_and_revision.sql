begin;

alter table public.opspiry_user_data add column revision bigint not null default 0;
revoke insert, update, delete, truncate on public.opspiry_user_data from public, anon, authenticated;

create schema opspiry_internal;
revoke all on schema opspiry_internal from public;
grant usage on schema opspiry_internal to authenticated;

create table opspiry_internal.workspace_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  primary key (user_id, request_id)
);
alter table opspiry_internal.workspace_requests enable row level security;

create function opspiry_internal.validate_stock(previous jsonb, proposed jsonb)
returns void language plpgsql set search_path = '' as $$
declare
  collection text;
begin
  if jsonb_typeof(proposed) is distinct from 'object'
     or octet_length(proposed::text) > 3000000 then
    raise exception using errcode = '22023', message = 'Data ruang kerja tidak valid atau terlalu besar.';
  end if;

  foreach collection in array array['products','orders','adjustments','receipts','partners','deliveries','payments']
  loop
    if collection in ('receipts','payments') and not (proposed ? collection) then
      continue;
    end if;
    if jsonb_typeof(proposed->collection) is distinct from 'array' then
      raise exception using errcode = '22023', message = 'Struktur data ruang kerja tidak valid.';
    end if;
    if exists (
      select 1 from jsonb_array_elements(proposed->collection) as item
      group by item->>'id'
      having count(*) > 1 or coalesce(item->>'id', '') = ''
         or not bool_and(jsonb_typeof(item->'id') = 'string')
    ) then
      raise exception using errcode = '22023', message = 'ID kosong atau duplikat di ruang kerja.';
    end if;
  end loop;

  if exists (select 1 from jsonb_array_elements(proposed->'products') p
             where jsonb_typeof(p->'opening') is distinct from 'number'
                   or coalesce(p->>'opening','') !~ '^[0-9]{1,12}$')
     or exists (select 1 from jsonb_array_elements(proposed->'orders') o
                where jsonb_typeof(o->'qty') is distinct from 'number'
                   or coalesce(o->>'qty','') !~ '^[1-9][0-9]{0,11}$'
                   or coalesce(o->>'kind','') not in ('sale','purchase')
                   or (o ? 'requiresReceipt' and (o->'requiresReceipt' <> 'true'::jsonb or o->>'kind' <> 'purchase')))
     or exists (select 1 from jsonb_array_elements(proposed->'adjustments') a
                where jsonb_typeof(a->'qty') is distinct from 'number'
                   or coalesce(a->>'qty','') !~ '^-?[1-9][0-9]{0,11}$')
     or exists (select 1 from jsonb_array_elements(coalesce(proposed->'receipts','[]')) r
                where jsonb_typeof(r->'qty') is distinct from 'number'
                   or coalesce(r->>'qty','') !~ '^[1-9][0-9]{0,11}$'
                   or coalesce(r->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                   or not pg_input_is_valid(r->>'date', 'date')) then
    raise exception using errcode = '22023', message = 'Kuantitas, tanggal penerimaan, atau jenis mutasi tidak valid.';
  end if;

  if exists (
    with old_orders as (select o from jsonb_array_elements(previous->'orders') o),
         new_orders as (select o from jsonb_array_elements(proposed->'orders') o)
    select 1 from old_orders old
    full join new_orders new on old.o->>'id' = new.o->>'id'
    where (old.o is not null and (old.o - 'paid') is distinct from (new.o - 'paid'))
       or (old.o is null and new.o->>'kind' = 'purchase' and new.o->'requiresReceipt' is distinct from 'true'::jsonb)
  ) or not ((proposed->'products') @> (previous->'products'))
    or not ((proposed->'adjustments') @> (previous->'adjustments'))
    or not (coalesce(proposed->'receipts','[]') @> coalesce(previous->'receipts','[]')) then
    raise exception using errcode = '22023', message = 'Riwayat stok tidak bisa diubah. Pembelian baru harus dicatat melalui penerimaan.';
  end if;

  if exists (
    with products as (select p->>'id' as id from jsonb_array_elements(proposed->'products') p),
    movements as (
      select o->>'productId' as product_id from jsonb_array_elements(proposed->'orders') o
      union all
      select a->>'productId' from jsonb_array_elements(proposed->'adjustments') a
    )
    select 1 from movements m left join products p on p.id = m.product_id where p.id is null
  ) then
    raise exception using errcode = '22023', message = 'Produk dari mutasi stok tidak ditemukan.';
  end if;

  if exists (
    with purchase_orders as (
      select o->>'id' as id, (o->>'qty')::numeric as qty
      from jsonb_array_elements(proposed->'orders') o
      where o->>'kind' = 'purchase' and o->'requiresReceipt' = 'true'::jsonb
    ),
    receipts as (
      select r->>'orderId' as order_id, sum((r->>'qty')::numeric) as qty
      from jsonb_array_elements(coalesce(proposed->'receipts','[]')) r
      group by r->>'orderId'
    )
    select 1 from receipts r left join purchase_orders o on o.id = r.order_id
    where o.id is null or r.qty > o.qty
  ) then
    raise exception using errcode = '22023', message = 'Penerimaan melebihi sisa pembelian atau pembelian tidak valid.';
  end if;

  if exists (
    with orders as (
      select o->>'id' as id, o->>'productId' as product_id, o->>'kind' as kind,
             (o->>'qty')::numeric as qty, o ? 'requiresReceipt' as pending
      from jsonb_array_elements(proposed->'orders') o
    ), movements as (
      select p->>'id' as product_id, (p->>'opening')::numeric as qty
      from jsonb_array_elements(proposed->'products') p
      union all
      select product_id, case when kind = 'sale' then -qty else qty end from orders where not pending
      union all
      select o.product_id, (r->>'qty')::numeric
      from jsonb_array_elements(coalesce(proposed->'receipts','[]')) r join orders o on o.id = r->>'orderId'
      union all
      select a->>'productId', (a->>'qty')::numeric from jsonb_array_elements(proposed->'adjustments') a
    )
    select 1 from movements group by product_id having sum(qty) < 0
  ) then
    raise exception using errcode = '22023', message = 'Stok tidak mencukupi. Perubahan tidak disimpan.';
  end if;
end;
$$;

create function opspiry_internal.save_workspace(expected_revision bigint, next_payload jsonb, mutation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := auth.uid();
  workspace public.opspiry_user_data%rowtype;
begin
  if account_id is null then
    raise exception using errcode = '42501', message = 'Silakan masuk kembali.';
  end if;
  if expected_revision is null or expected_revision < 0 or mutation_id is null then
    raise exception using errcode = '22023', message = 'Revisi atau ID perubahan tidak valid.';
  end if;

  insert into public.opspiry_user_data (user_id) values (account_id) on conflict (user_id) do nothing;
  select * into strict workspace from public.opspiry_user_data where user_id = account_id for update;

  if exists (
    select 1 from opspiry_internal.workspace_requests
    where user_id = account_id and request_id = mutation_id
  ) then
    return jsonb_build_object('payload', workspace.payload, 'revision', workspace.revision);
  end if;
  if workspace.revision <> expected_revision then
    raise exception using errcode = 'PT409', message = 'Data sudah berubah di perangkat lain.';
  end if;

  perform opspiry_internal.validate_stock(workspace.payload, next_payload);
  update public.opspiry_user_data
  set payload = next_payload, revision = workspace.revision + 1, updated_at = now()
  where user_id = account_id
  returning * into workspace;
  insert into opspiry_internal.workspace_requests values (account_id, mutation_id);
  return jsonb_build_object('payload', workspace.payload, 'revision', workspace.revision);
end;
$$;

-- Only the thin invoker wrapper belongs to the API's exposed public schema.
create function public.opspiry_save_workspace(expected_revision bigint, next_payload jsonb, mutation_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select opspiry_internal.save_workspace(expected_revision, next_payload, mutation_id);
$$;

revoke all on function opspiry_internal.validate_stock(jsonb, jsonb) from public, anon, authenticated;
revoke all on function opspiry_internal.save_workspace(bigint, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.opspiry_save_workspace(bigint, jsonb, uuid) from public, anon, authenticated;
grant execute on function opspiry_internal.save_workspace(bigint, jsonb, uuid) to authenticated;
grant execute on function public.opspiry_save_workspace(bigint, jsonb, uuid) to authenticated;

commit;
