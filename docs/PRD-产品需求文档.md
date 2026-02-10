# 疯狂农场价格计算器 - 产品需求文档（PRD）

**文档版本**：1.0  
**产品名称**：疯狂农场价格计算器（fknc.top）  
**目标产品**：《蛋仔派对》疯狂农场玩法  
**最后更新**：基于当前代码库梳理

---

## 一、产品概述

### 1.1 产品定位

面向《蛋仔派对》「疯狂农场」玩法的**在线价格计算工具**。用户选择作物、输入重量与突变组合，即可得到作物售价；支持按价格反推重量、历史记录、分享链接与价格反馈，用于校准游戏内价格公式的基数。

### 1.2 目标用户

- 玩疯狂农场的蛋仔玩家  
- 需要快速查价、比价、反推重量的用户  
- 运营方（通过反馈数据与最优基数校准售价）

### 1.3 核心价值

- **算价准确**：基于游戏公式（基础系数 × 先天突变 × 重量^1.5 × (天气突变和+1) × 异形突变）计算价格。  
- **体验顺畅**：作物按热度排序、突变分组、支持历史回填与分享复现。  
- **可校准**：用户反馈实际价格 → 反馈数据页计算最优基数 → 提升长期准确率。

### 1.4 访问与部署

- **正式地址**：https://fknc.top（推荐），www.fknc.top  
- **部署方式**：静态站点，push main 触发 GitHub Actions 构建并 rsync 至自有服务器。  
- **域名策略**：非 fknc.top 域名访问时展示「域名迁移」提示页，引导至 fknc.top。

---

## 二、功能架构

### 2.1 功能总览

| 模块           | 功能简述                           | 是否需登录 |
|----------------|------------------------------------|------------|
| 登录/注册      | 邮箱验证码登录、注册、找回密码     | 否（使用前需登录） |
| 作物选择       | 月球/普通分类、按热度排序、热度展示 | 是         |
| 价格计算       | 重量+突变 → 价格；价格 → 反推重量  | 是         |
| 计算历史       | 本地最近 20 条、从历史回填         | 是         |
| 分享           | 生成短链，他人打开复现作物+重量+突变 | 是         |
| 价格反馈       | 标记是否准确、填写实际价格         | 是         |
| 反馈数据页     | 列表、按作物筛选、最优基数、误差/准确率 | 是         |
| 会员与激活码   | 日/周/月/季/年/三年卡、激活与续费  | 是         |
| 免费次数       | 未开通会员时每日 1 次进入计算器    | 是         |

### 2.2 用户流程概览

```
访问 fknc.top
    → 未登录：仅展示登录页（Footer 无会员入口）
    → 已登录：进入「作物选择」页
        → 选择作物进入「计算器」（扣免费次数或使用会员）
        → 输入重量、勾选突变 → 查看价格 / 反推重量
        → 可提交价格反馈、保存到历史、生成分享链接
        → 可打开「计算历史」从某条记录回填
    → 页脚可进入：反馈数据页、会员/续费、联系我们、免责声明、更新日志
```

---

## 三、功能详细说明

### 3.1 登录与账号

- **方式**：邮箱 + 验证码（Supabase Auth OTP）；支持注册、登录、找回密码。  
- **持久化**：登录后 session 由 Supabase 管理，前端可读取 getSession、onAuthStateChange。  
- **限制**：未登录只能看到登录页，无法进入选择页与计算器；登录页 Footer 不展示会员入口。

### 3.2 作物选择页

- **数据来源**：前端静态配置 `crops`（普通 + 月球），每作物含：name、priceCoefficient、maxWeight、growthSpeed、type、specialMutations（可选）。  
- **展示**：  
  - 分类：月球作物 / 普通作物。  
  - 排序：按「当日查询次数」热度排序（来自 Supabase `crop_daily_stats` + Realtime 订阅）。  
- **交互**：点击作物进入计算器（触发免费次数校验或会员放行）。  
- **其他入口**：计算历史、分享链接（带 crop/s 参数）可跳转到计算器并回填。

### 3.3 价格计算器

**输入**

- 作物：由选择页或链接带入。  
- 重量：数字输入，单位 kg，支持小数；受作物 maxWeight 限制。  
- 突变：多组多选（见下），部分为互斥（品质突变仅选一）。

**突变分组与规则**

- **品质突变**（互斥）：星空、流光、水晶、金、银。  
- **异形突变**：薯片、方形、糖葫芦、连体、黄瓜蛇、万圣夜、香蕉猴、笑日葵；仅部分作物显示对应异形。  
- **月球突变**：流火、日蚀、暗雾、陨石（仅月球作物显示）。  
- **常见突变**：瓷化、亮晶晶、星环、落雷、冰冻、颤栗、覆雪、潮湿、迷雾、生机。  
- **中间状态突变**：陶化、沙尘、灼热、结霜（+ 月球时含太阳耀斑）；不展示勾选，由合成规则自动参与。  
- **罕见突变**：霓虹、血月、彩虹、荧光。  
- **往期突变**：极光、幽魂、惊魂夜。  
- **合成规则**（自动）：  
  - 沙尘+潮湿→陶化；陶化+灼热→瓷化；潮湿+结霜→冰冻；太阳耀斑+灼热→流火。

**计算公式**

- 价格 = 基础系数 × 先天突变倍数 × (重量^1.5) × (天气突变总倍数 + 1) × 异形突变倍数。  
- 先天突变取选中中的最大倍数；天气突变为除先天、异形外的倍数相加；异形取最大倍数。

**输出**

- 计算价格：格式化为「元/万/亿」展示。  
- 反推重量：用户输入目标价格（可带单位），反推重量并限制在 [0, maxWeight]。

**其他**

- 可提交「价格反馈」（是否准确 + 实际价格）。  
- 每次计算可写入本地历史（最近 20 条）。  
- 可生成分享链接（编码作物、重量、突变等），他人打开可复现。

### 3.4 计算历史

- **存储**：本地 localStorage，key 固定，最多 20 条，按时间倒序。  
- **内容**：作物名、重量、突变列表、计算价格、时间戳。  
- **交互**：从选择页进入「历史」层，点击某条可回填到计算器（需再次占用免费次数或会员）。

### 3.5 分享

- **编码**：作物索引 + 重量 + 突变位图等，经 Base64URL 压缩为 URL 参数 `crop`、`s`。  
- **解码**：打开带参数的链接时解析并恢复作物、重量、突变，直接进入计算器；若未登录或免费次数不足，按现有规则拦截或扣次数。

### 3.6 价格反馈

- **提交**：计算器内提交，内容包含：crop_name、weight、mutations、calculated_price、actual_price（可选）、is_accurate。  
- **存储**：Supabase 表 `price_feedback`。  
- **用途**：供「反馈数据页」做基数校准与误差分析。

### 3.7 反馈数据页

- **权限**：仅登录用户可进入（与主应用同账号体系）。  
- **数据**：从 `price_feedback` 拉取列表，支持按作物筛选。  
- **功能**：  
  - 单作物：根据反馈样本计算「最优基数」（如加权中位数使误差和最小），展示默认基数 vs 最优基数、平均误差、准确率等。  
  - 批量：一键计算全部作物的最优基数与误差/准确率变化，支持按准确率排序、导出或复制结果。  
- **操作**：可删除单条反馈记录（需权限/策略与后端一致）。

### 3.8 会员与计费

**档位与价格（展示）**

- 日卡 0.19 元、周卡 0.99 元、月卡 1.99 元、季卡 4.99 元、年卡 9.99 元、三年 19.9 元。

**规则**

- 未登录：仅能访问登录页，无会员入口。  
- 已登录未开通：每日 1 次免费进入计算器（RPC `use_free_query`，按北京时间「今日」）；用尽后弹窗引导开通会员。  
- 已开通会员：不限次数进入计算器；Footer 显示「续费会员」，弹窗内展示到期日、剩余天数、购买链接与激活码输入。

**激活码**

- 格式：`CF-{Base64(payload)}.{Base64(Ed25519签名)}`，payload 含 days、v:2、随机 nonce。  
- 验证与写库：Supabase Edge Function `activate-subscription`（验签、查重、写 `user_subscriptions` 与 `used_activation_codes`）。  
- 续费逻辑：在当前到期日之后顺延 N 天；若已过期则从当前时间起算 N 天。  
- 生成：本地/脚本生成（`generate-code.html`、`generate-activation-code.cjs`、`generate-batch-50-20.cjs` 等），私钥不提交仓库。

**数据与接口**

- 会员状态：RPC `get_my_subscription` 返回 subscription_end_at、is_active（服务端按当前时间判断）。  
- 时区：与数据库、前端展示统一使用北京时间（Asia/Shanghai）。

### 3.9 其他全局能力

- **作物热度**：`crop_daily_stats` 按日（北京时间）统计每作物查询次数；Realtime 订阅实现多端实时更新。  
- **备案与免责**：页脚展示 ICP、公安备案号；免责声明弹窗。  
- **更新日志**：从 `changelog` 数据渲染，弹窗展示。  
- **联系我们**：弹窗内反馈入口与说明。

---

## 四、数据与后端

### 4.1 数据模型（概念）

| 概念           | 说明 |
|----------------|------|
| 用户           | Supabase Auth 用户（邮箱）；与 session 绑定。 |
| 作物配置       | 前端静态 crops：name、priceCoefficient、maxWeight、growthSpeed、type、specialMutations。 |
| 天气突变配置   | 前端静态 weatherMutations：name、color、multiplier。 |
| 计算历史       | 仅前端 localStorage，最多 20 条。 |
| 价格反馈       | price_feedback：crop_name、weight、mutations、calculated_price、actual_price、is_accurate、created_at 等。 |
| 作物每日统计   | crop_daily_stats：crop_name、query_date（北京日期）、query_count。 |
| 会员订阅       | user_subscriptions：user_id、subscription_end_at。 |
| 已用激活码     | used_activation_codes：code_hash、user_id、used_at。 |

### 4.2 主要接口与依赖

- **Supabase**  
  - Auth：getSession、onAuthStateChange、signIn、signOut、sendEmailOtp、verifyEmailOtp、sendResetPasswordCode、verifyResetPasswordCode。  
  - 表：price_feedback（增删查）、crop_daily_stats（增查、Realtime）。  
  - RPC：get_my_subscription、use_free_query（需在库内实现，use_free_query 与「今日」建议按北京时间）。  
  - Edge Function：activate-subscription（验签、写 user_subscriptions / used_activation_codes）。  
- **前端**  
  - 无自建后端；配置与公式均在前端，仅通过 Supabase 做持久化与鉴权。

### 4.3 安全与合规

- 激活码：Ed25519 验签，私钥仅生成端持有；服务端仅存公钥。  
- 会员与免费次数：服务端/Edge Function 与 RPC 校验，防止前端篡改。  
- 域名：仅 fknc.top（及 www）正常使用产品，其余域名展示迁移提示。

---

## 五、非功能需求

### 5.1 性能与体验

- 首屏：登录态检查后即展示选择页或登录页；作物与突变为静态数据，不阻塞首屏。  
- 计算：纯前端公式，无网络请求，即时结果。  
- 历史与分享：本地或 URL 参数，无额外加载。

### 5.2 兼容与适配

- 现代浏览器（支持 ES 模块、Supabase SDK、可选 Crypto Web API）。  
- 响应式布局，适配移动端与桌面端。

### 5.3 运维与发布

- 构建：Vite，输出静态资源。  
- 部署：GitHub Actions（main push / 手动）→ build → rsync 到服务器。  
- 配置：生产使用 fknc.top；Supabase 项目与密钥在环境/配置中管理，不写死敏感信息到仓库。

---

## 六、术语与缩写

| 术语     | 含义 |
|----------|------|
| 疯狂农场 | 《蛋仔派对》内玩法名称。 |
| 作物     | 游戏内可种植作物，对应配置中的 name、系数等。 |
| 突变     | 天气/品质/异形等状态，影响价格倍数。 |
| 基数     | 作物 priceCoefficient，用于价格公式。 |
| 最优基数 | 根据反馈数据拟合得到的、使误差更小的系数。 |
| 会员     | 已激活激活码、在 subscription_end_at 内的用户。 |
| 免费次数 | 未开通会员时，每日可进入计算器的次数（当前为 1 次/日）。 |

---

## 七、附录：关键文件索引

| 用途         | 路径/说明 |
|--------------|-----------|
| 应用入口与路由 | src/App/App.tsx |
| 作物与突变数据 | src/data/crops.ts、weatherMutations.ts |
| 价格公式与反推 | src/utils/priceCalculator.ts |
| 分享编解码   | src/utils/shareEncoder.ts |
| Supabase 与会员 | src/utils/supabase.ts |
| 突变分组与合成 | src/components/PriceCalculator/constants.ts |
| 计算器 UI    | src/components/PriceCalculator/* |
| 反馈数据页   | src/components/FeedbackDataView/FeedbackDataView.tsx |
| 会员弹窗与续费 | src/components/Footer/Footer.tsx |
| 激活码生成   | public/generate-code.html、scripts/generate-*.cjs |
| Edge Function | scripts/edge-function-activate-subscription.ts |
| SQL 与说明   | scripts/sql/* |
| 部署         | .github/workflows/deploy-server.yml |

---

*本文档基于当前代码库整理，用于产品与研发对齐；功能实现以代码为准，若有差异以代码为准并建议同步更新本文档。*
