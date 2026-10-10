-- Operator accounts store a password hash. First admin is created at /admin/login.
alter table admins add column if not exists name text not null default 'Operator';
alter table admins add column if not exists password_hash text not null default '';
alter table admins add column if not exists updated_at timestamptz not null default now();
