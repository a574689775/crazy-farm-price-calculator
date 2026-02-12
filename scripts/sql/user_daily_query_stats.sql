-- 用户每日查询次数统计（含作物维度）
-- 点击作物进入计算器 = 1 次查询，按用户、按日、按作物累加
-- 支持：总查询排行、按作物排行、用户查过哪些作物（后续可做）
-- 只保留最近 3 天数据，pg_cron 每日自动清理
-- 在 Supabase Dashboard → SQL Editor 中新建查询，粘贴本文件内容后执行。
-- 依赖：auth.users（Supabase 自带）

-- ========== 1. 表结构 ==========
-- 若手动删表后建不出，先单独执行下面这行清掉残留，再执行本脚本：
--   drop table if exists public.user_daily_crop_query_stats cascade;
create table if not exists public.user_daily_crop_query_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query_date date not null,
  crop_name text not null,
  query_count integer not null default 0,
  constraint user_daily_crop_query_stats_user_date_crop_key unique (user_id, query_date, crop_name),
  constraint user_daily_crop_query_stats_query_count_check check (query_count >= 0)
);

comment on table public.user_daily_crop_query_stats is '用户每日按作物查询次数（点击作物=1次，保留3天）';
create index if not exists idx_user_daily_crop_query_stats_date_user
  on public.user_daily_crop_query_stats (query_date, user_id);
create index if not exists idx_user_daily_crop_query_stats_date_crop_count
  on public.user_daily_crop_query_stats (query_date, crop_name, query_count desc);

-- ========== 2. 启用 RLS ==========
alter table public.user_daily_crop_query_stats enable row level security;

-- ========== 3. RLS 策略 ==========
drop policy if exists "user_daily_crop_query_stats_select_all" on public.user_daily_crop_query_stats;
create policy "user_daily_crop_query_stats_select_all"
  on public.user_daily_crop_query_stats for select
  using (true);

-- ========== 4. RPC：记录一次用户查询（点击作物时调用，传入作物名） ==========
create or replace function public.log_user_query(p_crop_name text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_today date;
  v_crop text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  v_crop := nullif(trim(coalesce(p_crop_name, '')), '');
  if v_crop = '' then
    v_crop := '未知';  -- 兼容未传作物名的旧调用
  end if;

  v_today := (now() at time zone 'Asia/Shanghai')::date;

  insert into public.user_daily_crop_query_stats (user_id, query_date, crop_name, query_count)
  values (v_uid, v_today, v_crop, 1)
  on conflict (user_id, query_date, crop_name)
  do update set query_count = user_daily_crop_query_stats.query_count + 1;

  return json_build_object('ok', true);
end;
$$;

comment on function public.log_user_query is '记录当前用户今日对某作物的查询 +1，按北京时间';

-- ========== 5. RPC：总查询排行榜（按用户当日总次数，前100） ==========
create or replace function public.get_user_query_leaderboard(
  p_query_date date default null,
  p_limit int default 100
)
returns table (
  user_id uuid,
  display_name text,
  email text,
  avatar_index int,
  query_count bigint,
  rank_pos int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_limit int;
begin
  v_date := coalesce(p_query_date, (now() at time zone 'Asia/Shanghai')::date);
  v_limit := least(greatest(coalesce(p_limit, 100), 1), 200);

  return query
  with agg as (
    select s.user_id as uid, sum(s.query_count)::bigint as total
    from public.user_daily_crop_query_stats s
    where s.query_date = v_date
    group by s.user_id
    having sum(s.query_count) > 0
    order by total desc, uid
    limit v_limit
  ),
  ranked as (
    select a.uid, a.total, row_number() over (order by a.total desc, a.uid)::int as rn
    from agg a
  )
  select
    r.uid as user_id,
    (u.raw_user_meta_data->>'display_name')::text as display_name,
    u.email::text as email,
    coalesce((u.raw_user_meta_data->>'avatar_index')::int, 1)::int as avatar_index,
    r.total as query_count,
    r.rn as rank_pos
  from ranked r
  left join auth.users u on u.id = r.uid
  order by r.rn;
end;
$$;

comment on function public.get_user_query_leaderboard is '总查询次数排行榜（默认今天北京时间，前100）';

-- ========== 6. RPC：按作物查询排行榜（某作物当日 top 用户） ==========
create or replace function public.get_user_query_leaderboard_by_crop(
  p_crop_name text,
  p_query_date date default null,
  p_limit int default 100
)
returns table (
  user_id uuid,
  display_name text,
  email text,
  avatar_index int,
  query_count bigint,
  rank_pos int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_limit int;
  v_crop text;
begin
  v_crop := nullif(trim(coalesce(p_crop_name, '')), '');
  if v_crop = '' then
    return;
  end if;

  v_date := coalesce(p_query_date, (now() at time zone 'Asia/Shanghai')::date);
  v_limit := least(greatest(coalesce(p_limit, 100), 1), 200);

  return query
  with ranked as (
    select
      s.user_id as uid,
      s.query_count as qc,
      row_number() over (order by s.query_count desc, s.user_id)::int as rn
    from public.user_daily_crop_query_stats s
    where s.query_date = v_date and s.crop_name = v_crop and s.query_count > 0
    order by s.query_count desc, s.user_id
    limit v_limit
  )
  select
    r.uid as user_id,
    (u.raw_user_meta_data->>'display_name')::text as display_name,
    u.email::text as email,
    coalesce((u.raw_user_meta_data->>'avatar_index')::int, 1)::int as avatar_index,
    r.qc::bigint as query_count,
    r.rn as rank_pos
  from ranked r
  left join auth.users u on u.id = r.uid
  order by r.rn;
end;
$$;

comment on function public.get_user_query_leaderboard_by_crop is '按作物查询排行榜（后续前端可做）';

-- ========== 7. RPC：当前用户今日总查询次数 ==========
create or replace function public.get_my_daily_query_count()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_today date;
  v_count bigint;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return json_build_object('ok', false, 'query_count', 0);
  end if;

  v_today := (now() at time zone 'Asia/Shanghai')::date;

  select coalesce(sum(s.query_count), 0)::bigint into v_count
  from public.user_daily_crop_query_stats s
  where s.user_id = v_uid and s.query_date = v_today;

  return json_build_object('ok', true, 'query_count', v_count);
end;
$$;

comment on function public.get_my_daily_query_count is '获取当前用户今日总查询次数';

-- ========== 8. RPC：当前用户今日查过的作物列表（后续可做「我查过的」展示） ==========
create or replace function public.get_my_queried_crops(p_query_date date default null)
returns table (crop_name text, query_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_date date;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return;
  end if;

  v_date := coalesce(p_query_date, (now() at time zone 'Asia/Shanghai')::date);

  return query
  select s.crop_name::text, s.query_count::bigint
  from public.user_daily_crop_query_stats s
  where s.user_id = v_uid and s.query_date = v_date and s.query_count > 0
  order by s.query_count desc, s.crop_name;
end;
$$;

comment on function public.get_my_queried_crops is '获取当前用户指定日期查过的作物及次数（后续前端可做）';

-- ========== 9. 定时清理：只保留最近 3 天数据 ==========
-- 需先在 Supabase Dashboard → Database → Extensions 启用 pg_cron
-- 先尝试取消旧任务（不存在则忽略），再创建新任务
do $$
begin
  perform cron.unschedule('delete-old-user-query-stats');
exception when others then
  null;  -- 任务不存在则忽略
end;
$$;
do $$
begin
  perform cron.unschedule('delete-old-user-crop-query-stats');
exception when others then
  null;  -- 任务不存在则忽略
end;
$$;
select cron.schedule(
  'delete-old-user-crop-query-stats',
  '0 0 * * *',
  $$delete from public.user_daily_crop_query_stats where query_date < (now() at time zone 'Asia/Shanghai')::date - interval '3 days'$$
);
