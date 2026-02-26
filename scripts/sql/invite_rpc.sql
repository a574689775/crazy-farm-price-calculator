-- 邀请裂变：三个 RPC（获取/生成邀请码、绑定邀请关系、我的邀请统计）
-- 执行前需已执行 invite_tables.sql。
-- 在 Supabase Dashboard → SQL Editor 中新建查询，粘贴本文件内容后执行。

-- ========== 1. 生成 6 位邀请码（内部用，排除 0/O/1/I） ==========
create or replace function public.generate_invite_code_6()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result text := '';
  i int;
  r int;
begin
  for i in 1..6 loop
    r := floor(random() * length(chars) + 1)::int;
    result := result || substr(chars, r, 1);
  end loop;
  return result;
end;
$$;

-- ========== 2. 获取或生成我的邀请码 ==========
create or replace function public.get_or_create_invite_code()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_code text;
  v_existing text;
  v_attempt int := 0;
  max_attempts int := 20;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select invite_code into v_existing from public.user_invite_codes where user_id = v_uid;
  if v_existing is not null then
    return json_build_object('ok', true, 'invite_code', v_existing);
  end if;

  loop
    v_code := public.generate_invite_code_6();
    begin
      insert into public.user_invite_codes (user_id, invite_code, created_at)
      values (v_uid, v_code, now());
      return json_build_object('ok', true, 'invite_code', v_code);
    exception
      when unique_violation then
        v_attempt := v_attempt + 1;
        if v_attempt >= max_attempts then
          return json_build_object('ok', false, 'error', 'code_generation_failed');
        end if;
    end;
  end loop;
end;
$$;

-- ========== 3. 绑定邀请关系（被邀请人注册后调用，建立关系并立即给邀请人发 1 天会员） ==========
create or replace function public.bind_invite_relation(p_invite_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_inviter_id uuid;
  v_code_trim text;
  v_current_end timestamptz;
  v_new_end timestamptz;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  v_code_trim := nullif(trim(p_invite_code), '');
  if v_code_trim is null or length(v_code_trim) <> 6 then
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  select user_id into v_inviter_id from public.user_invite_codes where invite_code = v_code_trim;
  if v_inviter_id is null then
    return json_build_object('ok', false, 'error', 'code_not_found');
  end if;

  if v_inviter_id = v_uid then
    return json_build_object('ok', false, 'error', 'cannot_invite_self');
  end if;

  if exists (select 1 from public.invite_records where invitee_id = v_uid) then
    return json_build_object('ok', false, 'error', 'already_bound');
  end if;

  insert into public.invite_records (inviter_id, invitee_id, invite_code, reward_claimed_at, created_at)
  values (v_inviter_id, v_uid, v_code_trim, null, now());

  -- 新增：只要成功绑定邀请关系（拉新注册成功），立即为邀请人发放 1 天会员
  select subscription_end_at into v_current_end
  from public.user_subscriptions
  where user_id = v_inviter_id;

  if v_current_end is not null and v_current_end > now() then
    v_new_end := v_current_end + interval '1 day';
  else
    v_new_end := now() + interval '1 day';
  end if;

  insert into public.user_subscriptions (user_id, subscription_end_at)
  values (v_inviter_id, v_new_end)
  on conflict (user_id) do update
    set subscription_end_at = v_new_end;

  return json_build_object('ok', true);
exception
  when unique_violation then
    return json_build_object('ok', false, 'error', 'already_bound');
end;
$$;

-- ========== 4. 低一档映射：被邀请人充值天数 → 邀请人获得天数 ==========
-- 1->0, 7->1, 30->7, 90->30, 365->90, 1095->365，其他->0
create or replace function public.invite_reward_days_for_inviter(recharge_days int)
returns int
language sql
immutable
as $$
  select case recharge_days
    when 1 then 0
    when 7 then 1
    when 30 then 7
    when 90 then 30
    when 365 then 90
    when 1095 then 365
    else 0
  end;
$$;

-- ========== 5. 我的邀请统计（含拉新奖励 + 首充低一档奖励） ==========
create or replace function public.get_my_invite_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_count int;
  v_total_days int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  -- 已邀请人数：按绑定成功的邀请记录数计算（包含尚未首充的被邀请人）
  select count(*)::int into v_count
  from public.invite_records
  where inviter_id = v_uid;

  -- 已获得的奖励天数：仅统计「好友首次充值」时按低一档发放的会员天数总和
  -- 说明：注册立刻赠送的 1 天会员不计入该统计，避免对历史数据造成混淆
  select coalesce(sum(public.invite_reward_days_for_inviter(invitee_recharge_days)), 0)::int into v_total_days
  from public.invite_records
  where inviter_id = v_uid and reward_claimed_at is not null and invitee_recharge_days is not null;

  return json_build_object(
    'ok', true,
    'invited_count', v_count,
    'reward_days', v_total_days
  );
end;
$$;

-- ========== 6. 注释 ==========
comment on function public.get_or_create_invite_code is '获取或懒生成当前用户 6 位邀请码';
comment on function public.bind_invite_relation is '被邀请人注册后绑定邀请关系，并为邀请人发放 1 天会员';
comment on function public.get_my_invite_stats is '邀请人：已邀请人数、已获得奖励天数（拉新奖励+充值低一档奖励）';
