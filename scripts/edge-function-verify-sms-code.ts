// @ts-nocheck
// Edge Function: verify-sms-code
// 用途：
// - scene = 'register'：校验手机号验证码，创建 Supabase 账号（虚拟邮箱 + 用户设置的密码）并返回会话。
// - scene = 'reset_password'：校验手机号验证码，为该手机号对应账号重置密码。
// - scene = 'bind'：在已登录前提下校验验证码，给当前用户绑定手机号。

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 创建 Supabase admin client（Service Role，不受 RLS 限制）
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

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!auth) return null
  const parts = auth.split(' ')
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1]
  }
  return null
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
    const body = (await req.json()) as {
      phone?: string
      code?: string
      scene?: string
      password?: string
      newPassword?: string
    }
    const { phone, code, scene } = body
    const password = body.password ?? body.newPassword

    if (!phone || !code || !scene) {
      return new Response(JSON.stringify({ error: '缺少参数 phone / code / scene' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    if (!isValidChinaMobile(phone)) {
      return new Response(JSON.stringify({ error: '手机号格式不正确，仅支持中国大陆 11 位手机号' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    const allowedScenes = ['register', 'reset_password', 'bind']
    if (!allowedScenes.includes(scene)) {
      return new Response(JSON.stringify({ error: '不支持的 scene 类型' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    const nowIso = new Date().toISOString()

    // 1. 查找最近一条验证码记录
    const { data: records, error: queryError } = await supabaseAdmin
      .from('sms_codes')
      .select('id, code, expires_at, used_at, failed_attempts')
      .eq('phone', phone)
      .eq('scene', scene)
      .order('created_at', { ascending: false })
      .limit(1)

    if (queryError) {
      console.error('query sms_codes error', queryError)
      return new Response(JSON.stringify({ error: '服务暂不可用，请稍后再试（query）' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    const record = records?.[0]
    if (!record) {
      return new Response(JSON.stringify({ error: '验证码错误或已过期，请重新获取' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // 已使用或已过期
    if (record.used_at || record.expires_at <= nowIso || record.failed_attempts >= 5) {
      return new Response(JSON.stringify({ error: '验证码错误或已过期，请重新获取' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // 2. 校验验证码，错误计数 +1，>=5 作废
    if (record.code !== code) {
      const newFailed = (record.failed_attempts ?? 0) + 1
      const updates: any = { failed_attempts: newFailed }
      if (newFailed >= 5) {
        // 达到上限，视同过期
        updates.expires_at = nowIso
      }

      const { error: updateError } = await supabaseAdmin
        .from('sms_codes')
        .update(updates)
        .eq('id', record.id)

      if (updateError) {
        console.error('update sms_codes failed_attempts error', updateError)
      }

      return new Response(JSON.stringify({ error: '验证码错误，请重试' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // 3. 验证成功，标记 used_at
    const { error: markUsedError } = await supabaseAdmin
      .from('sms_codes')
      .update({ used_at: nowIso })
      .eq('id', record.id)

    if (markUsedError) {
      console.error('update sms_codes used_at error', markUsedError)
      // 不阻断后续流程，但记录日志
    }

    if (scene === 'register') {
      // ========== 注册场景：手机号未注册则创建账号（虚拟邮箱 + 用户密码），返回 session ==========
      if (!password || typeof password !== 'string' || password.length < 6) {
        return new Response(JSON.stringify({ error: '请设置至少 6 位密码' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      const { data: profs, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .eq('phone', phone)
        .limit(1)

      if (profileError) {
        console.error('query user_profiles by phone error', profileError)
        return new Response(JSON.stringify({ error: '服务暂不可用，请稍后再试（profile）' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      if (profs && profs.length > 0) {
        return new Response(JSON.stringify({ error: '该手机号已注册，请直接登录' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      const virtualEmail = `phone_${phone}@crazyfarm.local`
      const { data: userCreateRes, error: userCreateError } = await supabaseAdmin.auth.admin.createUser({
        email: virtualEmail,
        password: password,
        email_confirm: true,
      })

      if (userCreateError || !userCreateRes.user) {
        console.error('create auth user error', userCreateError)
        return new Response(JSON.stringify({ error: '创建用户失败，请稍后再试' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      const userId = userCreateRes.user.id
      const { error: profileInsertError } = await supabaseAdmin.from('user_profiles').insert({
        user_id: userId,
        phone,
        phone_verified_at: nowIso,
        sms_login_enabled: true,
      })

      if (profileInsertError) {
        console.error('insert user_profiles error', profileInsertError)
      }

      // supabase-js 2.39 无 auth.admin.createSession；刚 createUser 的邮箱+密码用 anon 登录即可拿到 session
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
      if (!anonKey) {
        console.error('missing SUPABASE_ANON_KEY for post-register signIn')
        return new Response(JSON.stringify({ error: '注册成功但登录失败，请使用手机号+密码登录' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }
      const supabaseAnon = createClient(SUPABASE_URL, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email: virtualEmail,
        password,
      })

      if (signInError || !signInData?.session) {
        console.error('signIn after register error', signInError)
        return new Response(JSON.stringify({ error: '注册成功但登录失败，请使用手机号+密码登录' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      return new Response(JSON.stringify({ ok: true, session: signInData.session }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    } else if (scene === 'reset_password') {
      // ========== 找回密码：根据手机号找到用户，重置密码 ==========
      if (!password || typeof password !== 'string' || password.length < 6) {
        return new Response(JSON.stringify({ error: '请设置至少 6 位新密码' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      const { data: profs, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .eq('phone', phone)
        .limit(1)

      if (profileError || !profs?.length) {
        return new Response(JSON.stringify({ error: '该手机号未注册或验证码错误' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      const userId = profs[0].user_id
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password })

      if (updateError) {
        console.error('updateUserById password error', updateError)
        return new Response(JSON.stringify({ error: '重置密码失败，请稍后再试' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    } else {
      // ========== 绑定场景：从 JWT 中解析当前用户，给其绑定手机号 ==========

      const accessToken = extractBearerToken(req)
      if (!accessToken) {
        return new Response(JSON.stringify({ error: '未检测到登录状态，无法绑定手机号' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      // 用前端传来的 access token 获取当前用户信息
      // 注意：不同 supabase-js 版本/运行时下，通过 global headers 注入 Authorization 可能导致 auth.getUser() 仍拿不到有效 jwt，
      // 因此改为直接把 token 传给 getUser(accessToken)。为了兼容可能的版本差异，这里也保留一次兜底重试。
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
      const supabaseUserClient = createClient(SUPABASE_URL, anonKey)

      let userInfoRes = await supabaseUserClient.auth.getUser(accessToken)

      // 兜底：如果当前 SDK 版本不支持 getUser(token)，则回退为注入 Authorization header 再调用一次
      if (userInfoRes.error) {
        const supabaseUserClientFallback = createClient(SUPABASE_URL, anonKey, {
          global: {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        })
        userInfoRes = await supabaseUserClientFallback.auth.getUser()
      }

      const userInfo = userInfoRes.data
      const userError = userInfoRes.error

      if (userError || !userInfo?.user) {
        console.error('getUser error in bind scene', userError)
        return new Response(JSON.stringify({ error: '登录状态无效，请重新登录后再绑定' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      const currentUserId = userInfo.user.id

      // 检查该手机号是否已被其他用户绑定
      const { data: existsProfiles, error: existsError } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .eq('phone', phone)
        .limit(1)

      if (existsError) {
        console.error('query user_profiles in bind scene error', existsError)
        return new Response(JSON.stringify({ error: '服务暂不可用，请稍后再试（bind check）' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      if (existsProfiles && existsProfiles.length > 0 && existsProfiles[0].user_id !== currentUserId) {
        return new Response(JSON.stringify({ error: '该手机号暂时无法绑定' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      // 绑定到当前用户
      const { error: bindError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          phone,
          phone_verified_at: nowIso,
          sms_login_enabled: true,
        })
        .eq('user_id', currentUserId)

      if (bindError) {
        console.error('update user_profiles bind phone error', bindError)
        return new Response(JSON.stringify({ error: '绑定手机号失败，请稍后再试' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }
  } catch (e) {
    console.error('unhandled error in verify-sms-code', e)
    return new Response(JSON.stringify({ error: '服务内部错误，请稍后再试' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(null) },
    })
  }
})

