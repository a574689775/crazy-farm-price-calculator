-- 【可选】一次性为所有「无昵称」的存量用户批量生成随机中文昵称
-- 执行前请先部署 assign_random_display_name.sql 中的前缀/后缀词库逻辑（本脚本内联了相同词库）
-- 在 Supabase Dashboard → SQL Editor 中执行。依赖：auth.users
-- 说明：不执行本脚本也可以——存量用户会在「下次登录」时由前端触发 assign_random_display_name 自动获得昵称。

do $$
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
  rec record;
  new_name text;
  attempt int;
  used_names text[] := array[]::text[];
  v_hash int;
  v_num int;
begin
  for rec in
    select id, raw_user_meta_data
    from auth.users
    where coalesce(trim(raw_user_meta_data->>'display_name'), '') = ''
  loop
    attempt := 0;
    loop
      new_name :=
        prefixes[1 + floor(random() * array_length(prefixes, 1))::int] ||
        '的' ||
        suffixes[1 + floor(random() * array_length(suffixes, 1))::int] ||
        lpad((floor(random() * 10000))::int::text, 4, '0');
      if new_name = any(used_names) or exists (
        select 1 from auth.users
        where (raw_user_meta_data->>'display_name') is not null
          and trim(raw_user_meta_data->>'display_name') = new_name
      ) then
        attempt := attempt + 1;
        if attempt >= 20 then
          -- 极端情况下仍然撞名时，使用基于用户 ID hash 的 4 位编号，理论上全局唯一概率极高
          v_hash := abs(hashtext(rec.id::text));
          v_num := 1000 + (v_hash % 9000);
          new_name := '农场好友' || lpad(v_num::text, 4, '0');
          if exists (
            select 1 from auth.users
            where (raw_user_meta_data->>'display_name') is not null
              and trim(raw_user_meta_data->>'display_name') = new_name
          ) then
            raise exception 'failed to generate unique display_name for user %', rec.id;
          end if;
          exit;
        end if;
        continue;
      end if;
      exit;
    end loop;
    used_names := array_append(used_names, new_name);
    update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('display_name', new_name)
    where id = rec.id;
  end loop;
end;
$$;
