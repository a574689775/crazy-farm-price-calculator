// @ts-nocheck
// Edge Function: get-email-by-phone
// 用途：根据手机号查询对应用户的虚拟邮箱，供前端使用「手机号+密码」登录时调用 signInWithPassword(email, password)。
// 仅当该手机号已注册时返回 email，否则返回通用错误，避免枚举。

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    'Access-Control-Max-Age': '86400',
  }
}

function isValidChinaMobile(phone: string): boolean {
  return /^1[3-9][0-9]{9}$/.test(phone)
}

serve(async (req) => {
  const origin = req.headers.get('Origin')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  }

  try {
    const { phone } = (await req.json()) as { phone?: string }
    const trimmed = (phone ?? '').trim()

    if (!trimmed) {
      return new Response(JSON.stringify({ ok: false, error: '请输入手机号' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    if (!isValidChinaMobile(trimmed)) {
      return new Response(JSON.stringify({ ok: false, error: '手机号格式不正确' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    const { data: profs, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('phone', trimmed)
      .limit(1)

    if (profileError) {
      console.error('get-email-by-phone query user_profiles error', profileError)
      return new Response(JSON.stringify({ ok: false, error: '服务暂不可用，请稍后再试' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    if (!profs?.length) {
      return new Response(JSON.stringify({ ok: false, error: '该手机号未注册' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    const userId = profs[0].user_id
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (userError || !userData?.user?.email) {
      console.error('get-email-by-phone getUserById error', userError)
      return new Response(JSON.stringify({ ok: false, error: '服务暂不可用，请稍后再试' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    return new Response(JSON.stringify({ ok: true, email: userData.user.email }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  } catch (e) {
    console.error('get-email-by-phone unhandled error', e)
    return new Response(JSON.stringify({ ok: false, error: '服务内部错误，请稍后再试' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(null) },
    })
  }
})
