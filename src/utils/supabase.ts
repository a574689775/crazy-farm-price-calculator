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

