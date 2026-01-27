import { createClient } from '@supabase/supabase-js'

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

/**
 * 获取本地时区的今日日期字符串（格式：YYYY-MM-DD）
 */
const getLocalTodayDate = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

