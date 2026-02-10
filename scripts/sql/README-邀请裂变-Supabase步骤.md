# 邀请裂变：Supabase 改造步骤

按下面顺序在 Supabase 里做完，**只动数据库和 RPC**；Edge Function 的邀请发奖逻辑在下一步再改。

---

## 第一步：建表 + RLS

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目 → **SQL Editor**。
2. 点击 **New query**，新建一个查询。
3. 打开本仓库里的 **`scripts/sql/invite_tables.sql`**，**全选复制**其全部内容，粘贴到 SQL Editor 里。
4. 点击 **Run**（或 Ctrl/Cmd + Enter）执行。
5. 确认无报错；若有报错，检查是否已存在同名表（可先到 Table Editor 里看是否已有 `user_invite_codes`、`invite_records`，有则说明执行过了）。

**这一步会创建：**

- 表 **`user_invite_codes`**：`user_id`、`invite_code`（6 位唯一）、`created_at`
- 表 **`invite_records`**：`id`、`inviter_id`、`invitee_id`、`invite_code`、`reward_claimed_at`、`invitee_recharge_days`、`created_at`，且 `invitee_id` 唯一
- 两张表的 RLS 及策略（用户只能读自己的邀请码、邀请人只能读自己作为 inviter 的记录）

---

## 第二步：建 RPC（三个接口 + 一个内部函数）

1. 仍在 **SQL Editor** 里，再点 **New query**，新建**另一个**查询。
2. 打开本仓库里的 **`scripts/sql/invite_rpc.sql`**，**全选复制**其全部内容，粘贴到 SQL Editor 里。
3. 点击 **Run** 执行。
4. 确认无报错。

**这一步会创建：**

- **`get_or_create_invite_code()`**  
  - 返回：`{ "ok": true, "invite_code": "XXXXXX" }` 或 `{ "ok": false, "error": "..." }`  
  - 无入参；以当前登录用户为准，没有则懒生成 6 位码并写入 `user_invite_codes`，有则直接返回。

- **`bind_invite_relation(p_invite_code text)`**  
  - 返回：`{ "ok": true }` 或 `{ "ok": false, "error": "code_not_found" | "already_bound" | "cannot_invite_self" | "invalid_code" }`  
  - 被邀请人注册后调用，传入 6 位邀请码；校验通过后插入一条 `invite_records`，不发奖。

- **`get_my_invite_stats()`**  
  - 返回：`{ "ok": true, "invited_count": N, "reward_days": M }`  
  - 无入参；统计当前用户作为邀请人的「已邀请人数」和「已获得奖励天数」（按低一档换算）。

- 内部函数 **`invite_reward_days_for_inviter(recharge_days int)`**、**`generate_invite_code_6()`**（仅被 RPC 使用，不对外调用）。

---

## 第三步：自检（可选）

在 SQL Editor 里可以跑几句简单检查（把 `'你的-user-id'` 换成真实 uuid 再跑，或跳过）：

```sql
-- 看表是否存在
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('user_invite_codes', 'invite_records');

-- 看 RPC 是否存在
select routine_name from information_schema.routines
where routine_schema = 'public'
and routine_name in ('get_or_create_invite_code', 'bind_invite_relation', 'get_my_invite_stats');
```

---

## 做完 Supabase 改造之后

- **表与 RPC**：到这一步就齐了；前端和 Edge Function 还没改，所以暂时不会有人调这些 RPC，不会影响现有功能。
- **下一步**：改 **Edge Function `activate-subscription`**，在「当前用户激活成功写库」之后，增加「查 invite_records、给邀请人发奖（低一档）、更新 reward_claimed_at 和 invitee_recharge_days」的逻辑。改完再部署 Edge Function。
- 再下一步：**前端**（注册页邀请码输入、选择页 fix 图标 + 邀请有礼弹窗、免费次数用尽时的邀请入口、调用上述三个 RPC）。

---

## 错误码与前端对应（绑定邀请关系）

| 后端返回 `error` | 含义           | 前端建议文案               |
|------------------|----------------|----------------------------|
| `unauthorized`   | 未登录         | 请先登录                   |
| `invalid_code`   | 邀请码格式不对 | 请输入 6 位邀请码          |
| `code_not_found` | 邀请码不存在   | 邀请码无效或已失效         |
| `cannot_invite_self` | 填了自己的码 | 不能填写自己的邀请码       |
| `already_bound`  | 已经绑定过     | 您已经绑定过邀请关系       |
