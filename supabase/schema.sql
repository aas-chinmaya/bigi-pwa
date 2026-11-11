-- InvoiceFlow — run once in NEW Supabase project SQL Editor
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null,
  email text, phone text, address text, gstin text, state text,
  invoice_prefix text not null default 'INV',
  default_notes text default 'Thank you for your business.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger businesses_upd before update on businesses
  for each row execute function set_updated_at();

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  local_uuid uuid,
  invoice_number text,
  status text not null default 'draft'
    check (status in ('draft','issued','paid','cancelled')),
  customer_name text not null,
  customer_email text, customer_phone text, customer_address text,
  customer_gstin text, customer_state text,
  invoice_date date not null default current_date,
  due_date date,
  notes text,
  subtotal numeric(14,2) not null default 0,
  cgst numeric(14,2) not null default 0,
  sgst numeric(14,2) not null default 0,
  igst numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index invoices_local on invoices(user_id, local_uuid) where local_uuid is not null;
create index invoices_user on invoices(user_id);
create trigger invoices_upd before update on invoices
  for each row execute function set_updated_at();

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  position int not null default 0,
  name text not null,
  hsn_sac text,
  unit text default 'NOS',
  quantity numeric(14,3) not null default 1,
  unit_price numeric(14,2) not null default 0,
  gst_rate numeric(5,2) not null default 18,
  taxable numeric(14,2) not null default 0,
  cgst numeric(14,2) not null default 0,
  sgst numeric(14,2) not null default 0,
  igst numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0
);

alter table profiles enable row level security;
alter table businesses enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;

create policy "own" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own" on businesses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own" on invoices for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own items" on invoice_items for all
  using (invoice_id in (select id from invoices where user_id = auth.uid()))
  with check (invoice_id in (select id from invoices where user_id = auth.uid()));
