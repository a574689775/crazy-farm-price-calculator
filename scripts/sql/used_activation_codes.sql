-- 已使用的激活码哈希，用于一次性校验
-- 在 Supabase SQL 编辑器中执行此文件（需在 activate_subscription_rpc.sql 之前或同时执行）

create table if not exists public.used_activation_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  used_at timestamptz not null default now(),
  user_id uuid not null
);

comment on table public.used_activation_codes is '已使用过的激活码 SHA-256 哈希，用于一次性校验';
create index if not exists idx_used_activation_codes_code_hash on public.used_activation_codes (code_hash);

alter table public.used_activation_codes enable row level security;
