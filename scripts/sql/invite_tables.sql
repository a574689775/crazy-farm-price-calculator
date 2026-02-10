-- 邀请裂变：用户邀请码表 + 邀请记录表 + RLS
-- 在 Supabase Dashboard → SQL Editor 中新建查询，粘贴本文件内容后执行。
-- 依赖：无（不依赖 user_subscriptions，与现有表独立）

-- ========== 1. 用户邀请码表 ==========
create table if not exists public.user_invite_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  invite_code text not null,
  created_at timestamptz not null default now(),
  constraint user_invite_codes_invite_code_key unique (invite_code),
  constraint user_invite_codes_invite_code_len check (char_length(invite_code) = 6)
);

comment on table public.user_invite_codes is '用户唯一 6 位邀请码，懒生成';
create index if not exists idx_user_invite_codes_invite_code on public.user_invite_codes (invite_code);

-- ========== 2. 邀请记录表 ==========
create table if not exists public.invite_records (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null,
  reward_claimed_at timestamptz null,
  invitee_recharge_days integer null,
  created_at timestamptz not null default now(),
  constraint invite_records_invitee_id_key unique (invitee_id)
);

comment on table public.invite_records is '邀请关系：被邀请人注册时绑定，首次充值时发奖并更新 reward_claimed_at';
create index if not exists idx_invite_records_inviter_id on public.invite_records (inviter_id);
create index if not exists idx_invite_records_invitee_id on public.invite_records (invitee_id);
create index if not exists idx_invite_records_reward_claimed on public.invite_records (invitee_id, reward_claimed_at) where reward_claimed_at is null;

-- ========== 3. 启用 RLS ==========
alter table public.user_invite_codes enable row level security;
alter table public.invite_records enable row level security;

-- ========== 4. RLS 策略 ==========
-- 用户只能读自己的邀请码（插入由 RPC 懒生成，不开放直接 insert）
create policy "user_invite_codes_select_own" on public.user_invite_codes
  for select using (auth.uid() = user_id);

-- 邀请记录：邀请人只能读自己作为 inviter 的记录（用于统计展示）
create policy "invite_records_select_inviter" on public.invite_records
  for select using (auth.uid() = inviter_id);

-- 插入由 RPC bind_invite_relation 完成（SECURITY DEFINER），不开放直接 insert 策略
-- Edge Function 用 service_role 读写 invite_records，不经过 RLS
