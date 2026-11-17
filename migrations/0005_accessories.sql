create table if not exists accessories (
  id text primary key,
  name text not null,
  category text not null check (category in ('gpu-support', 'controller-stands', 'headphone-stands', 'cable-management')),
  manufacturer text not null default '',
  seller text not null default 'CHECKMYPC',
  seller_url text not null default '',
  images jsonb not null default '[]'::jsonb,
  description text not null default '',
  price integer not null check (price >= 0),
  material text not null default '',
  color text not null default '',
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  active boolean not null default true,
  specs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accessories_active_category_idx on accessories (active, category);
