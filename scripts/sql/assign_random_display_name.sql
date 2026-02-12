-- 为当前用户自动分配随机中文昵称（仅当 display_name 为空时）
-- 用于：新用户注册后自动获得昵称、存量用户首次登录时补发昵称
-- 在 Supabase Dashboard → SQL Editor 中执行。依赖：auth.users
-- 若你已有 set_display_name RPC，本 RPC 与之间互不依赖，仅做“无昵称时自动分配”。

create or replace function public.assign_random_display_name()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- 通用人格 / 氛围形容词
  prefixes text[] := array[
    '温柔','勇敢','开朗','安静','认真','细心','热情','可靠','乐观','机智',
    '稳重','随和','耐心','勤劳','阳光','幽默','可爱','酷酷','乖巧','清新',
    '香甜','清爽','温暖','宁静','灿烂','明亮','轻快','柔软','热闹','踏实'
  ];
  -- 以蔬菜 / 水果 / 动物为主的农场意象名词
  suffixes text[] := array[
    -- 蔬菜
    '黄瓜','西红柿','茄子','土豆','萝卜','南瓜','冬瓜','青椒','白菜','菠菜',
    -- 水果
    '苹果','香蕉','葡萄','草莓','樱桃','橙子','柠檬','桃子','梨子','蓝莓',
    '菠萝','西瓜','哈密瓜','芒果','山楂',
    -- 动物（偏农场风）
    '小牛','小羊','小猪','小鸡','小鸭','小鹅','小兔','小狗','小猫','小马',
    '蜜蜂','小鸟','松鼠','刺猬','小鹿'
  ];
  new_name text;
  uid uuid;
  attempt int := 0;
  max_attempts int := 15;
  cur_name text;
  v_hash int;
  v_num int;
begin
  uid := auth.uid();
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select trim(coalesce(raw_user_meta_data->>'display_name', ''))
  into cur_name
  from auth.users
  where id = uid;

  if cur_name is not null and cur_name <> '' then
    return jsonb_build_object('ok', true, 'display_name', cur_name);
  end if;

  loop
    -- 形如「阳光的西瓜1234」，结构为「前缀 + 的 + 后缀 + 4 位编号」
    new_name :=
      prefixes[1 + floor(random() * array_length(prefixes, 1))::int] ||
      '的' ||
      suffixes[1 + floor(random() * array_length(suffixes, 1))::int] ||
      lpad((floor(random() * 10000))::int::text, 4, '0');

    if not exists (
      select 1 from auth.users
      where (raw_user_meta_data->>'display_name') is not null
        and trim(raw_user_meta_data->>'display_name') = new_name
    ) then
      exit;
    end if;
    attempt := attempt + 1;
    if attempt >= max_attempts then
      -- 极端情况下仍然撞名时，使用基于用户 ID hash 的 4 位编号，理论上全局唯一概率极高
      v_hash := abs(hashtext(uid::text));
      v_num := 1000 + (v_hash % 9000);
      new_name := '农场好友' || lpad(v_num::text, 4, '0');
      -- 这里仍然做一次存在性检查，若极小概率撞名则抛错，方便你排查
      if exists (
        select 1 from auth.users
        where (raw_user_meta_data->>'display_name') is not null
          and trim(raw_user_meta_data->>'display_name') = new_name
      ) then
        raise exception 'failed to generate unique display_name for user %', uid;
      end if;
      exit;
    end if;
  end loop;

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('display_name', new_name)
  where id = uid;

  return jsonb_build_object('ok', true, 'display_name', new_name);
end;
$$;

comment on function public.assign_random_display_name is '为当前用户分配随机中文昵称（仅当 display_name 为空时）；新用户注册或存量用户首次登录时调用';
