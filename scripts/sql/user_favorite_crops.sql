-- 用户收藏作物表（绑定账号）
-- 在 Supabase Dashboard → SQL Editor 中执行。

create table if not exists public.user_favorite_crops (
  user_id uuid not null references auth.users(id) on delete cascade,
  crop_name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, crop_name)
);

comment on table public.user_favorite_crops is '用户收藏的作物，按 created_at 倒序展示（最新在前）';
create index if not exists idx_user_favorite_crops_user_created on public.user_favorite_crops (user_id, created_at desc);

alter table public.user_favorite_crops enable row level security;

-- 用户只能读写自己的收藏
create policy "user_favorite_crops_select_own" on public.user_favorite_crops
  for select using (auth.uid() = user_id);
create policy "user_favorite_crops_insert_own" on public.user_favorite_crops
  for insert with check (auth.uid() = user_id);
create policy "user_favorite_crops_update_own" on public.user_favorite_crops
  for update using (auth.uid() = user_id);
create policy "user_favorite_crops_delete_own" on public.user_favorite_crops
  for delete using (auth.uid() = user_id);
