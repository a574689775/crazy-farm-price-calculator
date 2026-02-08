# Supabase 操作说明（会员已上线）

下面按「必须做」和「按需做」列出来，你在 Supabase Dashboard 里照着做即可。

---

## 一、必须做：更新 Edge Function（续费逻辑）

当前线上激活/续费走的是 **Edge Function**，要生效「续费后日期正确顺延」，必须更新函数代码。

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目 → **Edge Functions**。
2. 找到 **activate-subscription**，点进去。
3. 用本仓库 **`scripts/edge-function-activate-subscription.ts`** 的**完整内容**覆盖编辑器里的代码（复制粘贴）。
4. 点 **Deploy** 部署。
5. 环境变量不用改：**ACTIVATION_PUBLIC_KEY**、**SUPABASE_URL**、**SUPABASE_ANON_KEY**、**SUPABASE_SERVICE_ROLE_KEY** 保持原样即可。

之后用户续费就会在「当前到期日之后」顺延，不会出现续费几次日期都不变的问题。

---

## 二、按需做：其他 SQL / 设置

### 1. 表与 RPC 是否已存在

会员系统若一开始就是按本仓库思路建的，Supabase 里一般已经有：

- 表：**user_subscriptions**（字段含 `user_id`、`subscription_end_at`）
- 表：**used_activation_codes**（字段含 `code_hash`、`user_id`）
- RPC：**get_my_subscription**（返回当前用户会员状态）

如果**已经有**且运行正常：**不用再执行任何建表/建 RPC 的 SQL**。

如果**没有**（例如当时只建了表、没建 `get_my_subscription`）：

- 在 Dashboard → **SQL Editor** 里新建查询，把仓库里对应 SQL 文件的内容粘贴进去执行。  
- 表结构参考：`scripts/sql/used_activation_codes.sql`；`user_subscriptions` 和 `get_my_subscription` 若仓库里有单独 SQL 文件，就执行那个文件（没有的话就保持你现有表结构，只补建 `get_my_subscription` 函数即可）。

### 2. 旧 RPC `activate_subscription`（可选）

当前前端只调用 Edge Function，不调用 SQL 里的 `activate_subscription`。  
如果你**从没在别处用过**这个 RPC：**可以不做任何事**。

如果你**曾经或现在**有地方调这个 RPC，希望续费逻辑和 Edge Function 一致：

- 在 **SQL Editor** 里打开或新建查询，执行 **`scripts/sql/activate_subscription_rpc.sql`** 的完整内容（会 `CREATE OR REPLACE FUNCTION`，覆盖旧定义）。

### 3. 北京时间「今日」逻辑（可选）

若你有按「天」统计或限制的 RPC（例如 **use_free_query**、按日统计等），并且希望「今天」按**北京时间**算：

- 打开 **SQL Editor**，编辑对应的 `CREATE OR REPLACE FUNCTION ...`。
- 把里面用「今天」的地方（例如 `current_date`、`now()::date`）改成：  
  **`(now() at time zone 'Asia/Shanghai')::date`**
- 保存并执行该函数定义。

参考写法见：**`scripts/sql/timezone-beijing.sql`**（里面只有注释和示例，没有必须执行的建表语句）。

---

## 三、不需要在 Supabase 里做的

- **前端改动**（北京时间展示、getLocalTodayDate、错误提示、续费弹窗等）：只影响你部署的前端代码，**重新构建并部署前端**即可，Supabase 无需操作。
- **used_activation_codes** 表结构：没有改，无需动。
- **CORS / JWT**：若你之前已按说明关掉该 Edge Function 的「Enforce JWT verification」，不用再改。

---

## 四、建议顺序

1. **先做「一、必须做」**：更新并部署 Edge Function，保证续费日期正确。
2. 确认表与 **get_my_subscription** 存在且正常；缺哪个再按「二、1」补。
3. 若有按日统计/免费次数等 RPC，再按「二、3」把「今天」改成北京时间。

做完第一步并重新部署前端后，会员续费与北京时间展示就会按当前代码生效。
