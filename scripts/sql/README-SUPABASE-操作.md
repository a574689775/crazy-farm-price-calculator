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

## 二、按需做：登录短信验证码 Edge Function（send-sms-code）

下面是「手机号登录」用到的短信发送函数，仅在你已经：

- 在 Supabase 里建好 `sms_codes` 表；
- 在腾讯云开通短信服务、配置好签名和模板；

的前提下再做。

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目 → **Edge Functions**。
2. 点击 **New Function**，名字填写：`send-sms-code`。
3. 在在线编辑器中，把本仓库 **`scripts/edge-function-send-sms-code.ts`** 的**完整内容**全部复制粘贴进去，覆盖默认代码。
4. 在该 Function 的 **Settings（或 Environment Variables）** 里配置如下环境变量（若已有则复用）：
   - `SUPABASE_URL`：你的项目 URL。
   - `SUPABASE_SERVICE_ROLE_KEY`：Service Role Key（仅用于后端，**不要暴露给前端**）。
   - `TENCENT_SMS_SECRET_ID`：腾讯云短信的 SecretId。
   - `TENCENT_SMS_SECRET_KEY`：腾讯云短信的 SecretKey。
   - `TENCENT_SMS_SDK_APP_ID`：短信应用的 SDK AppID。
   - `TENCENT_SMS_SIGN_NAME`：审核通过的短信签名明文（仅 ASCII 时最省事）。
   - `TENCENT_SMS_SIGN_NAME_UTF8_B64`（**推荐，与上一项二选一即可；若设此项则优先于明文**）：签名字符串按 **UTF-8 编码后的 Base64**，全 ASCII，可避免 Supabase Dashboard 保存中文 Secret 时把个别汉字变成 ``（U+FFFD）。本地生成示例（把引号内换成你的签名）：
     `node -e "console.log(Buffer.from('天津悦乐曦教育科技','utf8').toString('base64'))"`
   - `TENCENT_SMS_TEMPLATE_ID_LOGIN`：验证码短信模板 ID（登录 / 绑定共用）。
5. 在 Function 页面点击 **Deploy** 部署。
6. 部署成功后，可以在 Dashboard 的 **Functions → send-sms-code → Invoke** 中手动发起一次 `POST` 请求，
   传入示例 JSON：

   ```json
   {
     "phone": "13800138000",
     "scene": "register"
   }
   ```

   若返回 `{"ok": true}` 且该手机能收到验证码短信，则说明函数部署成功。

7. **查看发往腾讯云的参数**：Dashboard → **Edge Functions** → **send-sms-code** → **Logs**。控制台默认不会打印请求体；排障时在函数环境变量里临时增加 `DEBUG_SMS_PAYLOAD` = `1` 并重新部署，再触发一次发送，日志里会出现 `SignName` 字符串、各字码点及 UTF-8 十六进制（验证码在日志中已打码）。确认无误后删除该变量以免多打日志。

> 注意：  
> - `scene` 支持 `register`（手机号注册）、`reset_password`（手机号找回密码）、`bind`（个人中心绑定手机号）三种。  
> - 短信发送频率受 `sms_codes` 表和函数内逻辑限制：同一手机号 1 分钟 1 条；同一 IP 10 分钟最多 3 条。

## 三、按需做：验证短信验证码 Edge Function（verify-sms-code）

该函数负责：

- `scene = 'register'`：校验验证码，为该手机号创建账号（用户设置的密码），并返回 session。
- `scene = 'reset_password'`：校验验证码，为该手机号对应账号重置密码。
- `scene = 'bind'`：在用户已登录前提下校验验证码，并把手机号绑定到当前账号。

前置条件：

- 已建好 `sms_codes`、`user_profiles` 表。
- 已为 `send-sms-code` 函数配置好 Supabase 相关环境变量（本函数不依赖腾讯云环境变量）。

操作步骤：

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目 → **Edge Functions**。
2. 点击 **New Function**，名字填写：`verify-sms-code`。
3. 在在线编辑器中，把本仓库 **`scripts/edge-function-verify-sms-code.ts`** 的**完整内容**全部复制粘贴进去，覆盖默认代码。
4. 在该 Function 的 **Settings / Environment Variables** 中，确认至少有：
   - `SUPABASE_URL`：你的项目 URL。
   - `SUPABASE_SERVICE_ROLE_KEY`：Service Role Key。
   - `SUPABASE_ANON_KEY`：Anon Key（绑定场景用 JWT 解析当前用户；**注册场景**在 `createUser` 后用 `signInWithPassword` 换取 session，也需此项）。
5. 点击 **Deploy** 部署。
6. 部署成功后，可以在 Dashboard 中手动测试：
   - 注册场景示例 Body（需先对该手机号发过 `scene: "register"` 的验证码）：

     ```json
     {
       "phone": "13800138000",
       "code": "123456",
       "scene": "register",
       "password": "yourPassword6"
     }
     ```

   - 绑定场景示例 Body（需在请求 Header 里带上 `Authorization: Bearer <access_token>`）：

     ```json
     {
       "phone": "13800138000",
       "code": "123456",
       "scene": "bind"
     }
     ```

   返回 `{"ok": true, "session": ...}`（注册）/ `{"ok": true}`（绑定）即表示校验成功。

## 四、按需做：手机号查虚拟邮箱 Edge Function（get-email-by-phone）

前端「手机号 + 密码」登录时，需先用该接口根据手机号拿到对应用户的虚拟邮箱，再调用 Supabase 的 `signInWithPassword(email, password)`。

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目 → **Edge Functions**。
2. 点击 **New Function**，名字填写：`get-email-by-phone`。
3. 在在线编辑器中，把本仓库 **`scripts/edge-function-get-email-by-phone.ts`** 的**完整内容**全部复制粘贴进去。
4. 环境变量只需 Supabase 自带的 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`。
5. 点击 **Deploy** 部署。
6. 与 `send-sms-code`、`verify-sms-code` 一样，若遇 CORS 或 401，可在该函数设置中关闭「Enforce JWT verification」。

## 五、按需做：其他 SQL / 设置

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

## 六、不需要在 Supabase 里做的

- **前端改动**（北京时间展示、getLocalTodayDate、错误提示、续费弹窗等）：只影响你部署的前端代码，**重新构建并部署前端**即可，Supabase 无需操作。
- **used_activation_codes** 表结构：没有改，无需动。
- **CORS / JWT**：若你之前已按说明关掉该 Edge Function 的「Enforce JWT verification」，不用再改。

---

## 七、建议顺序

1. **先做「一、必须做」**：更新并部署会员续费相关 Edge Function，保证续费日期正确。
2. 如需开启手机号登录（手机号+密码，注册/找回密码才发短信），按「二」「三」「四」部署并更新 `send-sms-code`、`verify-sms-code`、`get-email-by-phone` 三个函数。
3. 确认表与 **get_my_subscription** 存在且正常；缺哪个再按「五、1」补。
4. 若有按日统计/免费次数等 RPC，再按「五、3」把「今天」改成北京时间。

做完对应步骤并重新部署前端后，会员续费和手机号登录等能力就会按当前代码生效。

