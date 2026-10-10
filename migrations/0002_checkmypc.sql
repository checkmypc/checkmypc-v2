-- CHECKMYPC production schema. Unowned shared rows; admin auth is cookie + env, not user_id.
create table if not exists app_meta (
  key text primary key,
  value text not null
);

create table if not exists admins (
  id text primary key,
  email text not null unique,
  name text not null default 'Operator',
  role text not null default 'admin',
  password_hash text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id text primary key,
  category text not null,
  name text not null,
  brand text not null,
  image text not null default '',
  images jsonb not null default '[]'::jsonb,
  description text not null default '',
  msrp integer not null default 0,
  best_price integer not null default 0,
  used_price integer not null default 0,
  in_stock boolean not null default true,
  store_count integer not null default 0,
  power_draw integer not null default 0,
  specs jsonb not null default '{}'::jsonb,
  offers jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on products (category);

create table if not exists prebuilts (
  id text primary key,
  title text not null,
  parts jsonb not null default '[]'::jsonb,
  condition text not null default 'new',
  store text not null default '',
  city text not null default '',
  description text not null default '',
  image text not null default '',
  usage text not null default '',
  available boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists used_listings (
  id text primary key,
  title text not null,
  city text not null,
  asking integer not null default 0,
  fair_value integer not null default 0,
  condition text not null default '',
  cpu text not null default '',
  gpu text not null default '',
  ram text not null default '',
  storage text not null default '',
  inspected boolean not null default false,
  verdict text,
  risk text not null default 'medium',
  notes text not null default '',
  temps jsonb,
  ssd_health integer,
  images jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists technicians (
  id text primary key,
  name text not null,
  city text not null,
  phone text not null default '',
  skills jsonb not null default '[]'::jsonb,
  active boolean not null default true
);

create table if not exists bookings (
  id text primary key,
  kind text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text not null default '',
  city text not null,
  package_id text,
  notes text not null default '',
  listing_url text not null default '',
  machine_type text not null default '',
  status text not null default 'new',
  assigned_to text,
  quoted_price integer,
  paid_amount integer,
  scheduled_at text,
  preferred_date text,
  preferred_time text,
  internal_notes text not null default ''
);
create index if not exists bookings_status_idx on bookings (status);
create index if not exists bookings_created_idx on bookings (created_at desc);

create table if not exists inspection_reports (
  id text primary key,
  public_id text not null unique,
  listing_id text,
  booking_id text,
  title text not null,
  date text not null,
  city text not null,
  technician text not null default '',
  customer_name text not null default '',
  verdict text not null,
  risk text not null default 'medium',
  asking integer not null default 0,
  fair_value integer not null default 0,
  suggest_offer integer not null default 0,
  hardware jsonb not null default '[]'::jsonb,
  temps jsonb not null default '{}'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  tests jsonb,
  photos jsonb not null default '[]'::jsonb,
  notes text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reports_public_id_idx on inspection_reports (public_id);

create table if not exists service_prices (
  id text primary key,
  price integer not null
);

create table if not exists site_settings (
  id text primary key,
  email text not null,
  phone text not null,
  hours text not null,
  whatsapp text not null,
  instagram text not null default '',
  tiktok text not null default '',
  facebook text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id text primary key,
  at timestamptz not null default now(),
  text text not null,
  actor text not null default ''
);
create index if not exists activity_at_idx on activity_logs (at desc);

create table if not exists media (
  id text primary key,
  filename text not null,
  content_type text not null,
  bytes bytea not null,
  byte_size integer not null default 0,
  created_at timestamptz not null default now()
);
