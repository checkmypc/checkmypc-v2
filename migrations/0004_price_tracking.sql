create table if not exists price_collection_runs (
  id text primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'completed', 'partial', 'failed')),
  requested_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  unmapped_count integer not null default 0
);

create table if not exists price_observations (
  id bigint generated always as identity primary key,
  run_id text not null references price_collection_runs(id),
  source_id text not null,
  catalog_product_id text references products(id) on delete set null,
  store text not null,
  source_url text not null,
  observed_name text,
  price numeric(12, 2),
  currency text,
  availability text not null default 'unknown'
    check (availability in ('in_stock', 'out_of_stock', 'low_stock', 'unknown')),
  outcome text not null
    check (outcome in ('success', 'failure')),
  error text,
  observed_at timestamptz not null default now(),
  check (price is null or price > 0),
  check (price is null or currency = 'MAD')
);

create index if not exists price_observations_source_time_idx
  on price_observations (source_id, observed_at desc);
create index if not exists price_observations_valid_price_idx
  on price_observations (source_id, observed_at desc)
  where price is not null and availability in ('in_stock', 'low_stock');
create index if not exists price_collection_runs_started_idx
  on price_collection_runs (started_at desc);
