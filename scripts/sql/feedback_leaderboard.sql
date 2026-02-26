-- 反馈排行：按用户每日「有效反馈」次数排名，并给前 3 名发放会员天数奖励
-- 在 Supabase Dashboard → SQL Editor 中新建查询，粘贴本文件内容后执行。
-- 依赖：
--   - auth.users（Supabase 自带）
--   - user_subscriptions 表（会员到期时间）
--   - price_feedback 表（价格反馈）
--   - 已启用 pg_cron 扩展（用于每日定时结算）
--
-- 概念约定：
--   - 「有效反馈」= 写入 price_feedback 的记录（前端已在 supabase.ts 做了准确率≥98% 的过滤）
--   - 统计维度：按用户、按北京时间自然日
--   - 每日北京时间 0 点结算前一日的数据：第 1 名奖励 3 天会员，第 2 名 2 天，第 3 名 1 天

-- ========== 1. 为 price_feedback 增加 user_id（如已存在则跳过） ==========
alter table public.price_feedback
  add column if not exists user_id uuid references auth.users(id);

create index if not exists idx_price_feedback_user_id_created_at
  on public.price_feedback (user_id, created_at desc);

comment on column public.price_feedback.user_id is '提交该反馈的用户 ID（用于反馈排行与奖励）';

-- ========== 2. 每日用户有效反馈统计表 ==========
create table if not exists public.user_daily_feedback_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stats_date date not null,
  valid_feedback_count integer not null default 0,
  constraint user_daily_feedback_stats_user_date_key unique (user_id, stats_date),
  constraint user_daily_feedback_stats_count_check check (valid_feedback_count >= 0)
);

comment on table public.user_daily_feedback_stats is '用户每日有效反馈次数统计（按北京时间自然日）';

create index if not exists idx_user_daily_feedback_stats_date_user
  on public.user_daily_feedback_stats (stats_date, user_id);

create index if not exists idx_user_daily_feedback_stats_date_count
  on public.user_daily_feedback_stats (stats_date, valid_feedback_count desc);

-- 启用 RLS，仅允许读取排行榜（不暴露具体策略，这里先开放只读）
alter table public.user_daily_feedback_stats enable row level security;

drop policy if exists "user_daily_feedback_stats_select_all" on public.user_daily_feedback_stats;
create policy "user_daily_feedback_stats_select_all"
  on public.user_daily_feedback_stats for select
  using (true);

-- ========== 3. 插入价格反馈时自动累加每日有效反馈次数（按北京时间） ==========
create or replace function public.log_user_daily_feedback_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_date date;
begin
  v_uid := new.user_id;
  if v_uid is null then
    -- 旧数据或匿名数据：不计入反馈排行
    return new;
  end if;

  -- 以北京时间自然日统计
  v_date := coalesce(
    (new.created_at at time zone 'Asia/Shanghai')::date,
    (now() at time zone 'Asia/Shanghai')::date
  );

  insert into public.user_daily_feedback_stats (user_id, stats_date, valid_feedback_count)
  values (v_uid, v_date, 1)
  on conflict (user_id, stats_date)
  do update set valid_feedback_count = public.user_daily_feedback_stats.valid_feedback_count + 1;

  return new;
end;
$$;

drop trigger if exists trg_price_feedback_log_daily_stats on public.price_feedback;
create trigger trg_price_feedback_log_daily_stats
  after insert on public.price_feedback
  for each row
  execute function public.log_user_daily_feedback_stats();

comment on function public.log_user_daily_feedback_stats is 'price_feedback 插入后，按北京时间为该用户的当日有效反馈数 +1';

-- ========== 4. 反馈排行：按用户当日有效反馈次数（默认统计北京时间「今天」） ==========
create or replace function public.get_feedback_leaderboard(
  p_stats_date date default null,
  p_limit int default 100
)
returns table (
  user_id uuid,
  display_name text,
  email text,
  avatar_index int,
  feedback_count bigint,
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
  -- 默认统计北京时间的「今天」
  v_date := coalesce(p_stats_date, (now() at time zone 'Asia/Shanghai')::date);
  v_limit := least(greatest(coalesce(p_limit, 100), 1), 200);

  return query
  with agg as (
    select s.user_id as uid, sum(s.valid_feedback_count)::bigint as total
    from public.user_daily_feedback_stats s
    where s.stats_date = v_date
    group by s.user_id
    having sum(s.valid_feedback_count) > 0
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
    r.total as feedback_count,
    r.rn as rank_pos
  from ranked r
  left join auth.users u on u.id = r.uid
  order by r.rn;
end;
$$;

comment on function public.get_feedback_leaderboard is '反馈排行：按用户当日有效反馈次数（默认今天北京时间，前100）';

-- ========== 5. 每日结算：前一日反馈排行前 3 名发放会员天数 ==========
create table if not exists public.feedback_daily_rewards (
  id uuid primary key default gen_random_uuid(),
  reward_date date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_days integer not null,
  created_at timestamptz not null default now(),
  constraint feedback_daily_rewards_date_user_key unique (reward_date, user_id),
  constraint feedback_daily_rewards_days_check check (reward_days > 0)
);

comment on table public.feedback_daily_rewards is '反馈排行每日发奖日志（防止重复发放）';

create index if not exists idx_feedback_daily_rewards_date_user
  on public.feedback_daily_rewards (reward_date, user_id);

-- 结算函数：默认在北京时间 0 点跑，结算「前一日」的数据，并给前 3 名发 3/2/1 天会员
create or replace function public.settle_feedback_rewards(
  p_settle_date date default null
)
returns table (
  reward_date date,
  user_id uuid,
  reward_days integer,
  rank_pos int,
  feedback_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_now timestamptz;
  v_rank int;
  v_reward_days int;
  v_current_end timestamptz;
  v_new_end timestamptz;
  rec record;
begin
  v_now := now();
  -- 结算日：默认取北京时间「今天-1」，即对刚结束的那一日做结算
  v_date := coalesce(p_settle_date, (v_now at time zone 'Asia/Shanghai')::date - interval '1 day');
  v_date := v_date::date;

  -- 避免重复对同一日期的同一用户发放奖励：利用 feedback_daily_rewards 上的唯一约束
  v_rank := 0;

  for rec in
    select
      s.user_id,
      sum(s.valid_feedback_count)::bigint as total
    from public.user_daily_feedback_stats s
    where s.stats_date = v_date
    group by s.user_id
    having sum(s.valid_feedback_count) > 0
    order by total desc, s.user_id
    limit 3
  loop
    v_rank := v_rank + 1;
    if v_rank = 1 then
      v_reward_days := 3;
    elsif v_rank = 2 then
      v_reward_days := 2;
    elsif v_rank = 3 then
      v_reward_days := 1;
    else
      v_reward_days := 0;
    end if;

    if v_reward_days <= 0 then
      continue;
    end if;

    -- 若该用户该日已发过奖，则跳过（防止重复结算）
    if exists (
      select 1 from public.feedback_daily_rewards
      where reward_date = v_date and user_id = rec.user_id
    ) then
      continue;
    end if;

    -- 续费规则：在当前到期日之后顺延 v_reward_days 天；若已过期或没有记录则从 now() 起算
    select subscription_end_at into v_current_end
    from public.user_subscriptions
    where user_id = rec.user_id;

    if v_current_end is not null and v_current_end > v_now then
      v_new_end := v_current_end + v_reward_days * interval '1 day';
    else
      v_new_end := v_now + v_reward_days * interval '1 day';
    end if;

    insert into public.user_subscriptions (user_id, subscription_end_at)
    values (rec.user_id, v_new_end)
    on conflict (user_id) do update
      set subscription_end_at = excluded.subscription_end_at;

    insert into public.feedback_daily_rewards (reward_date, user_id, reward_days)
    values (v_date, rec.user_id, v_reward_days)
    on conflict (reward_date, user_id) do nothing;

    return query
      select v_date, rec.user_id, v_reward_days, v_rank, rec.total;
  end loop;
end;
$$;

comment on function public.settle_feedback_rewards is '反馈排行每日结算：按北京时间对前一日反馈数 Top3 发放 3/2/1 天会员奖励';

-- ========== 6. 使用 pg_cron 每日北京时间 0:05 自动结算前一日反馈排行 ==========
do $$
begin
  perform cron.unschedule('settle-daily-feedback-rewards');
exception when others then
  null;  -- 任务不存在则忽略
end;
$$;

select cron.schedule(
  'settle-daily-feedback-rewards',
  '5 0 * * *',
  $$select public.settle_feedback_rewards();$$
);

