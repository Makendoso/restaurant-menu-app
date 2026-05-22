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

create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  "orderNumber" integer not null unique default nextval('public.order_number_seq'),
  "customerName" text not null,
  "tableNumber" text,
  items jsonb not null default '[]'::jsonb,
  total numeric not null check (total >= 0),
  status text not null default 'preparing'
    check (status in ('preparing', 'ready', 'delivered')),
  "isPaid" boolean not null default false,
  notes text,
  "createdAt" timestamptz not null default now()
);

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
alter table public.orders enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.settings to anon, authenticated;
grant select, insert, update, delete on public.categories, public.products, public.settings to authenticated;
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

drop policy if exists "Anon manage orders" on public.orders;
drop policy if exists "Public create orders" on public.orders;

create or replace function public.create_public_order(
  customer_name text,
  table_number text,
  order_items jsonb,
  order_total numeric,
  order_notes text default null
)
returns table (
  id uuid,
  "orderNumber" integer,
  "customerName" text,
  "tableNumber" text,
  items jsonb,
  total numeric,
  status text,
  "isPaid" boolean,
  notes text,
  "createdAt" timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if customer_name is null or length(trim(customer_name)) = 0 then
    raise exception 'customer_name is required';
  end if;

  if order_items is null or jsonb_typeof(order_items) <> 'array' or jsonb_array_length(order_items) = 0 then
    raise exception 'order_items must be a non-empty array';
  end if;

  if order_total is null or order_total < 0 then
    raise exception 'order_total must be zero or greater';
  end if;

  return query
    insert into public.orders (
      "customerName",
      "tableNumber",
      items,
      total,
      status,
      "isPaid",
      notes
    )
    values (
      trim(customer_name),
      nullif(trim(coalesce(table_number, '')), ''),
      order_items,
      order_total,
      'preparing',
      false,
      nullif(trim(coalesce(order_notes, '')), '')
    )
    returning
      orders.id,
      orders."orderNumber",
      orders."customerName",
      orders."tableNumber",
      orders.items,
      orders.total,
      orders.status,
      orders."isPaid",
      orders.notes,
      orders."createdAt";
end;
$$;

grant execute on function public.create_public_order(
  text,
  text,
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
