-- 前端验证激活码后调用此 RPC 写入会员，按激活起算（到期时间 = 激活时间 + p_days 天），仅延长不缩短，激活码一次性使用
-- 在 Supabase SQL 编辑器中执行此文件
-- 需已存在 user_subscriptions 表、used_activation_codes 表（见 used_activation_codes.sql）

create or replace function public.activate_subscription(p_code_hash text, p_days integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_current_end timestamptz;
  v_new_end timestamptz;
  v_final_end timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;
  if p_code_hash is null or p_code_hash = '' then
    return json_build_object('ok', false, 'error', 'missing_code_hash');
  end if;
  if p_days is null or p_days < 1 then
    return json_build_object('ok', false, 'error', 'invalid_days');
  end if;

  -- 一次性校验：已使用的激活码不能再激活
  if exists (select 1 from used_activation_codes where code_hash = p_code_hash) then
    return json_build_object('ok', false, 'error', 'code_already_used');
  end if;

  v_new_end := now() + p_days * interval '1 day';
  select subscription_end_at into v_current_end from user_subscriptions where user_id = v_user_id;
  if v_current_end is not null and v_current_end > v_new_end then
    v_final_end := v_current_end;
  else
    v_final_end := v_new_end;
  end if;

  insert into user_subscriptions (user_id, subscription_end_at)
  values (v_user_id, v_final_end)
  on conflict (user_id) do update set subscription_end_at = v_final_end;

  insert into used_activation_codes (code_hash, user_id)
  values (p_code_hash, v_user_id);

  return json_build_object('ok', true);
exception
  when unique_violation then
    return json_build_object('ok', false, 'error', 'code_already_used');
end;
$$;
