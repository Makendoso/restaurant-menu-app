create extension if not exists "pgcrypto";

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default 'utensils',
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric not null check (price >= 0),
  image text not null default '',
  "categoryId" uuid references public.categories(id) on delete set null,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "whatsappNumber" text not null,
  currency text not null default 'MXN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique,
  qr_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.order_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.restaurant_tables(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'closed', 'expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 minutes'),
  created_at timestamptz not null default now()
);

create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  "orderNumber" integer not null unique default nextval('public.order_number_seq'),
  "customerName" text not null,
  "tableNumber" text,
  items jsonb not null default '[]'::jsonb,
  total numeric not null check (total >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  "isPaid" boolean not null default false,
  notes text,
  table_id uuid references public.restaurant_tables(id) on delete set null,
  session_id uuid references public.order_sessions(id) on delete set null,
  editable_until timestamptz,
  "createdAt" timestamptz not null default now()
);

alter table public.orders
  add column if not exists table_id uuid references public.restaurant_tables(id) on delete set null,
  add column if not exists session_id uuid references public.order_sessions(id) on delete set null,
  add column if not exists editable_until timestamptz;

alter table public.orders
  alter column status set default 'pending';

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'preparing', 'ready', 'delivered', 'cancelled'));

select setval(
  'public.order_number_seq',
  greatest(
    1000,
    coalesce((select max("orderNumber") from public.orders), 1000)
  )
);

alter table public.orders
  alter column "orderNumber" set default nextval('public.order_number_seq');

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.settings enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.order_sessions enable row level security;
alter table public.orders enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.settings to anon, authenticated;
grant select, insert, update, delete on public.categories, public.products, public.settings to authenticated;
grant select, insert, update, delete on public.restaurant_tables, public.order_sessions to authenticated;
grant select, update, delete on public.orders to authenticated;

grant usage, select on sequence public.order_number_seq to anon, authenticated;

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories"
  on public.categories for select
  using (true);

drop policy if exists "Public read products" on public.products;
create policy "Public read products"
  on public.products for select
  using (true);

drop policy if exists "Public read settings" on public.settings;
create policy "Public read settings"
  on public.settings for select
  using (true);

drop policy if exists "Anon manage categories" on public.categories;
drop policy if exists "Authenticated manage categories" on public.categories;
create policy "Authenticated manage categories"
  on public.categories for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Anon manage products" on public.products;
drop policy if exists "Authenticated manage products" on public.products;
create policy "Authenticated manage products"
  on public.products for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Anon manage settings" on public.settings;
drop policy if exists "Authenticated manage settings" on public.settings;
create policy "Authenticated manage settings"
  on public.settings for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated manage restaurant tables" on public.restaurant_tables;
create policy "Authenticated manage restaurant tables"
  on public.restaurant_tables for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated manage order sessions" on public.order_sessions;
create policy "Authenticated manage order sessions"
  on public.order_sessions for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Anon manage orders" on public.orders;
drop policy if exists "Public create orders" on public.orders;

create or replace function public.expire_order_sessions()
returns void
language sql
security definer
set search_path = public
as $$
  update public.order_sessions
  set status = 'expired'
  where status = 'active'
    and expires_at <= now();
$$;

grant execute on function public.expire_order_sessions() to anon, authenticated;

create or replace function public.start_or_resume_order_session(
  qr_token_input text,
  existing_session_id uuid default null,
  session_minutes integer default 90
)
returns table (
  session_id uuid,
  table_id uuid,
  table_number integer,
  session_status text,
  started_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  found_table public.restaurant_tables%rowtype;
  found_session public.order_sessions%rowtype;
begin
  perform public.expire_order_sessions();

  select rt.*
  into found_table
  from public.restaurant_tables as rt
  where rt.qr_token = qr_token_input
    and rt.is_active = true
  limit 1;

  if not found then
    return;
  end if;

  if existing_session_id is not null then
    select os.*
    into found_session
    from public.order_sessions as os
    where os.id = existing_session_id
      and os.table_id = found_table.id
      and os.status = 'active'
      and os.expires_at > now()
    limit 1;
  end if;

  if found_session.id is null then
    select os.*
    into found_session
    from public.order_sessions as os
    where os.table_id = found_table.id
      and os.status = 'active'
      and os.expires_at > now()
    order by os.created_at desc
    limit 1;
  end if;

  if found_session.id is null then
    insert into public.order_sessions (table_id, status, expires_at)
    values (
      found_table.id,
      'active',
      now() + make_interval(mins => greatest(session_minutes, 1))
    )
    returning * into found_session;
  end if;

  return query
    select
      found_session.id,
      found_table.id,
      found_table.number,
      found_session.status,
      found_session.started_at,
      found_session.expires_at;
end;
$$;

grant execute on function public.start_or_resume_order_session(
  text,
  uuid,
  integer
) to anon, authenticated;

drop function if exists public.validate_table_session(uuid, uuid);

create or replace function public.validate_table_session(
  order_table_id uuid,
  order_session_id uuid
)
returns table (
  valid boolean,
  message text,
  table_id uuid,
  table_number integer,
  session_id uuid,
  session_status text,
  started_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  active_row record;
begin
  perform public.expire_order_sessions();

  if order_table_id is null or order_session_id is null then
    return query
      select
        false,
        'La sesión de esta mesa ya no está disponible. Escanea nuevamente el QR o solicita ayuda al personal.',
        null::uuid,
        null::integer,
        null::uuid,
        null::text,
        null::timestamptz,
        null::timestamptz;
    return;
  end if;

  select
    rt.id as table_id,
    rt.number as table_number,
    os.id as session_id,
    os.status as session_status,
    os.started_at,
    os.expires_at
  into active_row
  from public.order_sessions as os
  join public.restaurant_tables as rt on rt.id = os.table_id
  where rt.id = order_table_id
    and rt.is_active = true
    and os.id = order_session_id
    and os.table_id = order_table_id
    and os.status = 'active'
    and os.expires_at > now()
  limit 1;

  if not found then
    return query
      select
        false,
        'La sesión de esta mesa ya no está disponible. Escanea nuevamente el QR o solicita ayuda al personal.',
        null::uuid,
        null::integer,
        null::uuid,
        null::text,
        null::timestamptz,
        null::timestamptz;
    return;
  end if;

  return query
    select
      true,
      null::text,
      active_row.table_id,
      active_row.table_number,
      active_row.session_id,
      active_row.session_status,
      active_row.started_at,
      active_row.expires_at;
end;
$$;

grant execute on function public.validate_table_session(uuid, uuid) to anon, authenticated;

drop function if exists public.create_public_order(text, text, jsonb, numeric, text);
drop function if exists public.create_public_order(text, uuid, jsonb, numeric, text);
drop function if exists public.create_public_order(text, uuid, uuid, jsonb, numeric, text);

create or replace function public.create_public_order(
  customer_name text,
  order_table_id uuid,
  order_session_id uuid,
  order_items jsonb,
  order_total numeric,
  order_notes text default null
)
returns table (
  id uuid,
  "orderNumber" integer,
  "customerName" text,
  "tableNumber" text,
  table_id uuid,
  session_id uuid,
  items jsonb,
  total numeric,
  status text,
  "isPaid" boolean,
  notes text,
  editable_until timestamptz,
  "createdAt" timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  active_session public.order_sessions%rowtype;
  active_table public.restaurant_tables%rowtype;
  inserted_order public.orders%rowtype;
begin
  perform public.expire_order_sessions();

  if customer_name is null or length(trim(customer_name)) = 0 then
    raise exception 'customer_name is required';
  end if;

  if order_items is null or jsonb_typeof(order_items) <> 'array' or jsonb_array_length(order_items) = 0 then
    raise exception 'order_items must be a non-empty array';
  end if;

  if order_total is null or order_total < 0 then
    raise exception 'order_total must be zero or greater';
  end if;

  if order_table_id is null then
    raise exception 'table_id is required';
  end if;

  if order_session_id is null then
    raise exception 'session_id is required';
  end if;

  select os.*
  into active_session
  from public.order_sessions as os
  where os.id = order_session_id
    and os.table_id = order_table_id
    and os.status = 'active'
    and os.expires_at > now()
  limit 1;

  if active_session.id is null then
    raise exception 'active table session is required';
  end if;

  select rt.*
  into active_table
  from public.restaurant_tables as rt
  where rt.id = order_table_id
    and rt.is_active = true
  limit 1;

  if active_table.id is null then
    raise exception 'active table is required';
  end if;

  insert into public.orders (
    "customerName",
    "tableNumber",
    table_id,
    session_id,
    items,
    total,
    status,
    "isPaid",
    notes,
    editable_until
  )
  values (
    trim(customer_name),
    active_table.number::text,
    active_table.id,
    active_session.id,
    order_items,
    order_total,
    'pending',
    false,
    nullif(trim(coalesce(order_notes, '')), ''),
    now() + interval '3 minutes'
  )
  returning * into inserted_order;

  return query
    select
      inserted_order.id,
      inserted_order."orderNumber",
      inserted_order."customerName",
      inserted_order."tableNumber",
      inserted_order.table_id,
      inserted_order.session_id,
      inserted_order.items,
      inserted_order.total,
      inserted_order.status,
      inserted_order."isPaid",
      inserted_order.notes,
      inserted_order.editable_until,
      inserted_order."createdAt";
end;
$$;

grant execute on function public.create_public_order(
  text,
  uuid,
  uuid,
  jsonb,
  numeric,
  text
) to anon, authenticated;

drop function if exists public.get_public_session_orders(uuid, uuid);

create or replace function public.get_public_session_orders(
  order_table_id uuid,
  order_session_id uuid
)
returns table (
  id uuid,
  "orderNumber" integer,
  "customerName" text,
  "tableNumber" text,
  table_id uuid,
  session_id uuid,
  items jsonb,
  total numeric,
  status text,
  "isPaid" boolean,
  notes text,
  editable_until timestamptz,
  "createdAt" timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.expire_order_sessions();

  if not exists (
    select 1
    from public.order_sessions as os
    join public.restaurant_tables as rt on rt.id = os.table_id
    where os.id = order_session_id
      and os.table_id = order_table_id
      and os.status = 'active'
      and os.expires_at > now()
      and rt.is_active = true
  ) then
    raise exception 'active table session is required';
  end if;

  return query
    select
      o.id,
      o."orderNumber",
      o."customerName",
      o."tableNumber",
      o.table_id,
      o.session_id,
      o.items,
      o.total,
      o.status,
      o."isPaid",
      o.notes,
      o.editable_until,
      o."createdAt"
    from public.orders as o
    where o.table_id = order_table_id
      and o.session_id = order_session_id
      and o.status in ('pending', 'preparing', 'ready', 'delivered', 'cancelled')
    order by o."createdAt" desc;
end;
$$;

grant execute on function public.get_public_session_orders(uuid, uuid) to anon, authenticated;

drop function if exists public.update_public_order(uuid, uuid, uuid, jsonb, numeric, text);

create or replace function public.update_public_order(
  input_order_id uuid,
  input_table_id uuid,
  input_session_id uuid,
  input_items jsonb,
  input_total numeric,
  input_notes text default null
)
returns table (
  id uuid,
  "orderNumber" integer,
  "customerName" text,
  "tableNumber" text,
  table_id uuid,
  session_id uuid,
  items jsonb,
  total numeric,
  status text,
  "isPaid" boolean,
  notes text,
  editable_until timestamptz,
  "createdAt" timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_order public.orders%rowtype;
  updated_order public.orders%rowtype;
begin
  perform public.expire_order_sessions();

  if input_order_id is null then
    raise exception 'order_not_found';
  end if;

  if input_items is null or jsonb_typeof(input_items) <> 'array' or jsonb_array_length(input_items) = 0 then
    raise exception 'invalid_items';
  end if;

  if input_total is null or input_total < 0 then
    raise exception 'invalid_total';
  end if;

  if not exists (
    select 1
    from public.restaurant_tables as rt
    where rt.id = input_table_id
      and rt.is_active = true
  ) then
    raise exception 'table_inactive';
  end if;

  if not exists (
    select 1
    from public.order_sessions as os
    where os.id = input_session_id
      and os.table_id = input_table_id
      and os.status = 'active'
      and os.expires_at > now()
  ) then
    raise exception 'session_invalid';
  end if;

  select o.*
  into existing_order
  from public.orders as o
  where o.id = input_order_id
    and o.table_id = input_table_id
    and o.session_id = input_session_id
  limit 1;

  if existing_order.id is null then
    raise exception 'order_not_found';
  end if;

  if existing_order.status <> 'pending' then
    raise exception 'order_not_editable';
  end if;

  if existing_order.editable_until is null or existing_order.editable_until <= now() then
    raise exception 'edit_window_expired';
  end if;

  update public.orders
  set
    items = input_items,
    total = input_total,
    notes = nullif(trim(coalesce(input_notes, '')), '')
  where id = existing_order.id
  returning * into updated_order;

  return query
    select
      updated_order.id,
      updated_order."orderNumber",
      updated_order."customerName",
      updated_order."tableNumber",
      updated_order.table_id,
      updated_order.session_id,
      updated_order.items,
      updated_order.total,
      updated_order.status,
      updated_order."isPaid",
      updated_order.notes,
      updated_order.editable_until,
      updated_order."createdAt";
end;
$$;

grant execute on function public.update_public_order(
  uuid,
  uuid,
  uuid,
  jsonb,
  numeric,
  text
) to anon, authenticated;

drop policy if exists "Authenticated read orders" on public.orders;
create policy "Authenticated read orders"
  on public.orders for select
  to authenticated
  using (true);

drop policy if exists "Authenticated update orders" on public.orders;
create policy "Authenticated update orders"
  on public.orders for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated delete orders" on public.orders;
create policy "Authenticated delete orders"
  on public.orders for delete
  to authenticated
  using (true);
