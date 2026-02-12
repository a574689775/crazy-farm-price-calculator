import { createClient, FunctionsHttpError } from '@supabase/supabase-js'

// Supabase 配置 - ANON KEY 是安全的，设计用于前端暴露
// 配合 RLS (Row Level Security) 策略，只允许匿名用户插入数据
const supabaseUrl = 'https://nwacdthvbfukhxqyvuxh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53YWNkdGh2YmZ1a2h4cXl2dXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzg4MDYsImV4cCI6MjA4MzkxNDgwNn0.qc68CNG1oomnjHz7KRBGgiWLprDkKhrdQc2jnSKycQs'

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface FeedbackData {
  crop_name: string
  weight: number
  mutations: string[]
  calculated_price: number
  actual_price: number | null
  is_accurate: boolean
}

export const submitFeedback = async (data: FeedbackData) => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized. Please check your environment variables.')
  }

  const { error } = await supabase
    .from('price_feedback')
    .insert([data])

  if (error) {
    throw error
  }

  return true
}

// 删除反馈记录
export const deleteFeedback = async (id: number) => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized. Please check your environment variables.')
  }

  // 先查询记录是否存在
  const { data: existingData, error: queryError } = await supabase
    .from('price_feedback')
    .select('id')
    .eq('id', id)
    .single()

  if (queryError || !existingData) {
    throw new Error('记录不存在或已被删除')
  }

  // 执行删除
  const { error } = await supabase
    .from('price_feedback')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }

  return true
}

// 简单的每作物写入串行队列，避免快速点击导致写入丢失
const logQueue: Record<string, Promise<unknown>> = {}

/** 与数据库交互统一使用北京时间（Asia/Shanghai） */
const BEIJING_TZ = 'Asia/Shanghai'

/**
 * 获取北京时间的今日日期字符串（格式：YYYY-MM-DD），用于 crop_daily_stats.query_date 等
 */
const getLocalTodayDate = (): string => {
  return new Date().toLocaleDateString('en-CA', { timeZone: BEIJING_TZ }) // en-CA => YYYY-MM-DD
}

/**
 * 记录作物当日查询次数（若已有记录则 +1，否则创建新记录）
 * 本地开发环境不记录数据
 */
export const logCropQuery = async (cropName: string) => {
  // 只在非本地环境记录数据
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '') {
    return Promise.resolve()
  }

  const enqueue = async () => {
    if (!supabase) {
      throw new Error('Supabase client is not initialized. Please check your environment variables.')
    }

    // 使用本地时区日期字符串，格式 YYYY-MM-DD
    const todayDate = getLocalTodayDate()

    // 查询当日是否已有记录
    const { data: existingData, error: queryError } = await supabase
      .from('crop_daily_stats')
      .select('id, query_count')
      .eq('crop_name', cropName)
      .eq('query_date', todayDate)
      .maybeSingle()

    if (queryError) {
      throw queryError
    }

    if (existingData?.id) {
      const { error: updateError } = await supabase
        .from('crop_daily_stats')
        .update({
          query_count: (existingData.query_count ?? 0) + 1,
        })
        .eq('id', existingData.id)

      if (updateError) {
        throw updateError
      }
    } else {
      const { error: insertError } = await supabase
        .from('crop_daily_stats')
        .insert({
          crop_name: cropName,
          query_date: todayDate,
          query_count: 1,
        })

      if (insertError) {
        throw insertError
      }
    }
  }

  const prev = logQueue[cropName] ?? Promise.resolve()
  const next = prev.then(enqueue).catch(console.error)
  logQueue[cropName] = next
  return next
}

/** 用户每日查询统计：记录一次用户对某作物的查询（点击作物进入计算器时调用） */
const logUserQueryState = { p: Promise.resolve() as Promise<unknown> }
export const logUserQuery = async (cropName: string) => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '') {
    return Promise.resolve()
  }
  if (!supabase) return Promise.resolve()
  const prev = logUserQueryState.p
  const next = prev.then(async () => {
    try {
      await supabase.rpc('log_user_query', { p_crop_name: cropName || null })
    } catch (e) {
      console.error(e)
    }
  })
  logUserQueryState.p = next
  return next
}

/**
 * 获取当日所有作物的查询次数映射
 */
export const fetchTodayQueryCounts = async (): Promise<Record<string, number>> => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized. Please check your environment variables.')
  }

  // 使用本地时区日期字符串，格式 YYYY-MM-DD
  const todayDate = getLocalTodayDate()
  const { data, error } = await supabase
    .from('crop_daily_stats')
    .select('crop_name, query_count')
    .eq('query_date', todayDate)

  if (error) {
    throw error
  }

  const map: Record<string, number> = {}
  data?.forEach(row => {
    if (row.crop_name) {
      map[row.crop_name] = row.query_count ?? 0
    }
  })
  return map
}

/** Realtime 变更行类型（crop_daily_stats 表） */
type CropDailyStatsRow = { crop_name: string; query_date: string; query_count: number }

/**
 * 订阅当日作物查询次数（Supabase Realtime）
 * - 首次会拉取当日数据并回调
 * - 之后表 crop_daily_stats 有 INSERT/UPDATE/DELETE 时，仅当行属于「当日」则合并到本地并回调
 *
 * Supabase 里需要做的设置（否则收不到实时推送）：
 * 1. 打开 Supabase 控制台 → Database → Replication
 * 2. 在 Publication「supabase_realtime」里，把表 crop_daily_stats 勾选上（ADD TABLE）
 * 或执行 SQL：ALTER PUBLICATION supabase_realtime ADD TABLE crop_daily_stats;
 *
 * @returns 取消订阅函数
 */
export const subscribeCropDailyStats = (
  onCounts: (counts: Record<string, number>) => void
): (() => void) => {
  if (!supabase) return () => {}

  const todayDate = getLocalTodayDate()
  let currentMap: Record<string, number> = {}

  const applyRow = (row: CropDailyStatsRow | null, isDelete: boolean) => {
    if (!row || row.query_date !== todayDate) return
    if (isDelete) {
      delete currentMap[row.crop_name]
    } else {
      currentMap[row.crop_name] = row.query_count ?? 0
    }
    onCounts({ ...currentMap })
  }

  fetchTodayQueryCounts()
    .then((map) => {
      currentMap = { ...map }
      onCounts(map)
    })
    .catch(console.error)

  const ch = supabase.channel('crop_daily_stats_realtime')
  // postgres_changes 在部分 @supabase/supabase-js 版本的类型里未正确暴露
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(ch as any).on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'crop_daily_stats' },
    (payload: { eventType: string; new?: CropDailyStatsRow; old?: CropDailyStatsRow }) => {
      if (payload.eventType === 'DELETE' && payload.old) {
        applyRow(payload.old, true)
      } else if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new) {
        applyRow(payload.new, false)
      }
    }
  ).subscribe()

  return () => {
    supabase.removeChannel(ch)
  }
}

/**
 * 提交用户反馈
 */
export interface UserFeedback {
  content: string
  created_at?: string
}

export const submitUserFeedback = async (content: string): Promise<boolean> => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.')
  }

  const { error } = await supabase
    .from('user_feedback')
    .insert([{ content }])

  if (error) {
    throw error
  }

  return true
}

/**
 * 认证相关函数
 */

// 注册新用户
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data
}

// 登录
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data
}

// 登出
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

// 获取当前会话
export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// 获取当前用户
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** 从 user 或 user_metadata 取展示用昵称（优先 display_name，否则 email 前缀） */
export const getDisplayName = (user: { email?: string | null; user_metadata?: Record<string, unknown> } | null): string | null => {
  if (!user) return null
  const name = user.user_metadata?.display_name
  if (typeof name === 'string' && name.trim()) return name.trim()
  return user.email ?? null
}

/**
 * 更新当前用户昵称（写入 auth.users.raw_user_meta_data.display_name）
 */
export const updateUserDisplayName = async (displayName: string): Promise<{ ok: boolean; error?: string }> => {
  const trimmed = displayName.trim()
  const { data, error } = await supabase.rpc('set_display_name', {
    p_display_name: trimmed,
  })
  if (error) {
    return { ok: false, error: error.message || '保存失败' }
  }
  const ok = (data as { ok?: boolean } | null)?.ok === true
  if (!ok) {
    const code = (data as { error?: string } | null)?.error
    let msg = '保存失败'
    if (code === 'taken') msg = '该昵称已被其他用户占用'
    else if (code === 'empty') msg = '请输入昵称'
    else if (code === 'not_authenticated') msg = '请先登录后再修改昵称'
    return { ok: false, error: msg }
  }
  return { ok: true }
}

/**
 * 更新当前用户头像编号（写入 auth.users.raw_user_meta_data.avatar_index，范围 1~18）
 */
export const updateUserAvatarIndex = async (avatarIndex: number): Promise<{ ok: boolean; error?: string }> => {
  const n = Number.isFinite(avatarIndex) ? Math.floor(avatarIndex) : 1
  const safeIndex = Math.min(18, Math.max(1, n || 1))
  const { error } = await supabase.auth.updateUser({
    data: { avatar_index: safeIndex },
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * 免费用户每日 1 次查询：尝试使用 1 次当日免费次数。
 * 需在 Supabase 创建 daily_free_usage 表与 use_free_query RPC。
 * @returns { allowed: true } 表示已使用本次免费次数并允许进入；{ allowed: false } 表示今日已用完
 */
export const useFreeQuery = async (): Promise<{ allowed: boolean }> => {
  const { data, error } = await supabase.rpc('use_free_query')
  if (error) {
    if (error.code === 'PGRST202' || error.message?.includes('use_free_query')) {
      return { allowed: false }
    }
    throw error
  }
  const allowed = data?.allowed === true
  return { allowed }
}

/** 会员订阅状态（服务端判断是否有效，避免客户端改时间） */
export interface MySubscription {
  subscriptionEndAt: number | null
  isActive: boolean
}

/** 会员时长排行榜条目 */
export interface MembershipLeaderboardItem {
  userId: string
  displayName: string | null
  email: string | null
  avatarIndex: number
  daysLeft: number
}

/**
 * 获取当前用户的会员状态，由服务端根据当前时间判断 is_active。
 * 需在 Supabase 创建 user_subscriptions 表与 get_my_subscription RPC。
 */
export const getMySubscription = async (): Promise<MySubscription> => {
  const { data, error } = await supabase.rpc('get_my_subscription')
  if (error) {
    return { subscriptionEndAt: null, isActive: false }
  }
  const endAt = data?.subscription_end_at
  const isActive = data?.is_active === true
  const subscriptionEndAt =
    endAt != null ? new Date(endAt).getTime() : null
  return { subscriptionEndAt, isActive }
}

/** 会员时长排行榜：前若干名按剩余天数降序排列 */
export const getMembershipLeaderboard = async (): Promise<{
  ok: boolean
  items: MembershipLeaderboardItem[]
  error?: string
}> => {
  const { data, error } = await supabase.rpc('get_membership_leaderboard')
  if (error) {
    return { ok: false, items: [], error: error.message || '获取排行榜失败' }
  }
  const rows = (data as unknown as Array<{
    user_id?: string
    display_name?: string | null
    email?: string | null
    avatar_index?: number | string | null
    days_left?: number | string | null
  }>) ?? []

  const items: MembershipLeaderboardItem[] = rows.map((row, idx) => {
    const rawAvatar = row.avatar_index
    let avatar = 1
    if (rawAvatar !== undefined && rawAvatar !== null) {
      const n = typeof rawAvatar === 'number' ? rawAvatar : parseInt(String(rawAvatar), 10)
      if (Number.isFinite(n)) {
        avatar = Math.min(18, Math.max(1, n || 1))
      }
    }
    const rawDays = row.days_left
    let days = 0
    if (rawDays !== undefined && rawDays !== null) {
      const n = typeof rawDays === 'number' ? rawDays : parseInt(String(rawDays), 10)
      if (Number.isFinite(n)) {
        days = Math.max(0, n)
      }
    }
    return {
      userId: row.user_id ?? `unknown-${idx}`,
      displayName: row.display_name ?? null,
      email: row.email ?? null,
      avatarIndex: avatar,
      daysLeft: days,
    }
  })

  return { ok: true, items }
}

/** 今日查询排行榜条目 */
export interface QueryLeaderboardItem {
  userId: string
  displayName: string | null
  email: string | null
  avatarIndex: number
  queryCount: number
  rankPos: number
}

/** 今日查询排行榜：按用户当日总查询次数降序，前 100 名 */
export const getQueryLeaderboard = async (): Promise<{
  ok: boolean
  items: QueryLeaderboardItem[]
  error?: string
}> => {
  const { data, error } = await supabase.rpc('get_user_query_leaderboard', { p_limit: 100 })
  if (error) {
    return { ok: false, items: [], error: error.message || '获取排行榜失败' }
  }
  const rows = (data as unknown as Array<{
    user_id?: string
    display_name?: string | null
    email?: string | null
    avatar_index?: number | string | null
    query_count?: number | string | null
    rank_pos?: number | string | null
  }>) ?? []
  const items: QueryLeaderboardItem[] = rows.map((row, idx) => {
    const rawAvatar = row.avatar_index
    let avatar = 1
    if (rawAvatar !== undefined && rawAvatar !== null) {
      const n = typeof rawAvatar === 'number' ? rawAvatar : parseInt(String(rawAvatar), 10)
      if (Number.isFinite(n)) avatar = Math.min(18, Math.max(1, n || 1))
    }
    const rawCount = row.query_count
    let count = 0
    if (rawCount !== undefined && rawCount !== null) {
      const n = typeof rawCount === 'number' ? rawCount : parseInt(String(rawCount), 10)
      if (Number.isFinite(n)) count = Math.max(0, n)
    }
    const rawRank = row.rank_pos
    let rank = idx + 1
    if (rawRank !== undefined && rawRank !== null) {
      const n = typeof rawRank === 'number' ? rawRank : parseInt(String(rawRank), 10)
      if (Number.isFinite(n)) rank = n
    }
    return {
      userId: row.user_id ?? `unknown-${idx}`,
      displayName: row.display_name ?? null,
      email: row.email ?? null,
      avatarIndex: avatar,
      queryCount: count,
      rankPos: rank,
    }
  })
  return { ok: true, items }
}

/** 邀请：获取或懒生成当前用户 6 位邀请码 */
export const getOrCreateInviteCode = async (): Promise<{ ok: boolean; inviteCode?: string; error?: string }> => {
  const { data, error } = await supabase.rpc('get_or_create_invite_code')
  if (error) {
    return { ok: false, error: error.message || '获取邀请码失败' }
  }
  const ok = (data as { ok?: boolean })?.ok === true
  const inviteCode = (data as { invite_code?: string })?.invite_code
  if (!ok || !inviteCode) {
    return { ok: false, error: (data as { error?: string })?.error || '获取邀请码失败' }
  }
  return { ok: true, inviteCode }
}

/** 邀请：绑定邀请关系（被邀请人注册后调用，仅建立关系不发奖） */
export const bindInviteRelation = async (inviteCode: string): Promise<{ ok: boolean; error?: string }> => {
  const code = (inviteCode || '').trim()
  if (!code) return { ok: false, error: '请输入邀请码' }
  const { data, error } = await supabase.rpc('bind_invite_relation', { p_invite_code: code })
  if (error) {
    return { ok: false, error: error.message || '绑定失败' }
  }
  const ok = (data as { ok?: boolean })?.ok === true
  if (!ok) {
    const err = (data as { error?: string })?.error
    const msg =
      err === 'already_bound'
        ? '您已经绑定过邀请关系'
        : err === 'code_not_found'
          ? '邀请码无效或已失效'
          : err === 'cannot_invite_self'
            ? '不能填写自己的邀请码'
            : err === 'invalid_code'
              ? '请输入 6 位邀请码'
              : err || '绑定失败'
    return { ok: false, error: msg }
  }
  return { ok: true }
}

/** 邀请：我的邀请统计（已邀请人数、已获得奖励天数） */
export const getMyInviteStats = async (): Promise<{
  ok: boolean
  invitedCount?: number
  rewardDays?: number
  error?: string
}> => {
  const { data, error } = await supabase.rpc('get_my_invite_stats')
  if (error) {
    return { ok: false, error: error.message || '获取统计失败' }
  }
  const ok = (data as { ok?: boolean })?.ok === true
  if (!ok) {
    return { ok: false, error: (data as { error?: string })?.error || '获取统计失败' }
  }
  return {
    ok: true,
    invitedCount: (data as { invited_count?: number })?.invited_count ?? 0,
    rewardDays: (data as { reward_days?: number })?.reward_days ?? 0,
  }
}

/** 将 Edge Function 返回的 error 码映射为对用户展示的文案 */
function mapActivationErrorCode(err: string | undefined): string {
  return err === 'invalid_format' || err === 'invalid_encoding'
    ? '激活码格式不正确'
    : err === 'invalid_payload' || err === 'invalid_version_or_exp'
      ? '激活码内容无效'
      : err === 'invalid_signature'
        ? '激活码无效或已被篡改'
        : err === 'code_already_used'
          ? '该激活码已被使用'
          : err === 'missing_code'
            ? '请输入激活码'
            : err === 'unauthorized'
              ? '请先登录'
              : err === 'server_config'
                ? '服务未配置，请稍后重试'
                : err === 'db_error'
                  ? '写入失败，请重试'
                  : err || '激活失败'
}

/**
 * 通过 Edge Function 后端验证激活码并写入会员，无浏览器兼容问题。
 * 需部署 activate-subscription 并设置 ACTIVATION_PUBLIC_KEY（见 scripts/edge-function-activate-subscription.ts）。
 */
export const activateSubscriptionWithCode = async (activationCode: string): Promise<{ ok: boolean; error?: string }> => {
  const raw = (activationCode || '').trim()
  if (!raw) return { ok: false, error: '请输入激活码' }

  const { data, error } = await supabase.functions.invoke('activate-subscription', {
    body: { activation_code: raw },
  })

  // 4xx 时 Supabase 把响应体放在 error 里，需从 error.context 解析出 body 再映射文案
  if (error) {
    const msg = error.message || ''
    if (msg.includes('Failed to send') || msg.includes('fetch') || msg.includes('network')) {
      return {
        ok: false,
        error: '无法连接激活服务，请检查网络后重试。若在 Supabase 已创建 Edge Function「activate-subscription」，请确认已部署且配置了 ACTIVATION_PUBLIC_KEY。',
      }
    }
    let errCode: string | undefined
    if (error instanceof FunctionsHttpError && error.context) {
      try {
        const ctx = error.context as { json?: () => Promise<unknown>; body?: string }
        const body = ctx.json ? await ctx.json() : (typeof ctx.body === 'string' ? JSON.parse(ctx.body) : null)
        if (body && typeof body === 'object' && typeof (body as { error?: string }).error === 'string') {
          errCode = (body as { error: string }).error
        }
      } catch {
        // 解析失败则用下面 message
      }
    }
    return { ok: false, error: mapActivationErrorCode(errCode) || msg }
  }

  if (data?.ok === true) return { ok: true }
  return { ok: false, error: mapActivationErrorCode(data?.error) }
}

// 监听认证状态变化
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}

// 验证邮箱格式
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 检查是否为开发环境
const isDevelopment = (): boolean => {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
}

// 发送重置密码验证码
// 注意：需要在 Supabase Dashboard 的 Email Templates 中配置为显示验证码而不是链接
export const sendResetPasswordCode = async (email: string) => {
  // 验证邮箱格式
  if (!isValidEmail(email)) {
    throw new Error('邮箱格式不正确')
  }

  // 开发环境提示（但不阻止，因为可能需要测试真实邮箱）
  if (isDevelopment()) {
    console.warn('⚠️ 开发环境：正在发送邮件，请使用真实有效的邮箱地址')
  }

  // 使用 signInWithOtp 发送验证码，然后用户输入验证码后可以重置密码
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false, // 不创建新用户，只用于找回密码
    },
  })

  if (error) {
    throw error
  }

  return true
}

// 验证重置密码验证码并设置新密码
export const verifyResetPasswordCode = async (email: string, token: string, newPassword: string) => {
  // 先验证验证码
  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  if (verifyError) {
    throw verifyError
  }

  // 验证成功后，更新密码
  if (verifyData.user) {
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      // 如果更新密码失败，登出用户（因为 verifyOtp 已经创建了会话）
      await supabase.auth.signOut()
      throw updateError
    }
  }

  return verifyData
}

// 发送邮箱验证码（用于注册）
// 注意：需要在 Supabase Dashboard 的 Email Templates 中配置为显示验证码而不是链接
export const sendEmailOtp = async (email: string) => {
  // 验证邮箱格式
  if (!isValidEmail(email)) {
    throw new Error('邮箱格式不正确')
  }

  // 开发环境提示（但不阻止，因为可能需要测试真实邮箱）
  if (isDevelopment()) {
    console.warn('⚠️ 开发环境：正在发送邮件，请使用真实有效的邮箱地址')
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true, // 如果用户不存在则创建
      emailRedirectTo: undefined, // 不使用重定向链接
    },
  })

  if (error) {
    throw error
  }

  return true
}

// 验证邮箱验证码并注册
export const verifyEmailOtp = async (email: string, token: string, password: string) => {
  // 先验证验证码
  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  if (verifyError) {
    throw verifyError
  }

  // 验证成功后，更新密码
  if (verifyData.user) {
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    })

    if (updateError) {
      throw updateError
    }
  }

  return verifyData
}

