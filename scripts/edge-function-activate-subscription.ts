// @ts-nocheck
/**
 * Edge Function: activate-subscription（供 Supabase 控制台粘贴部署）
 *
 * 后端验签激活码并写入会员，无浏览器兼容问题。激活码格式 v2：{ days, v: 2 }，按激活起算。
 *
 * 配置：ACTIVATION_PUBLIC_KEY（公钥 Base64）
 * 表：user_subscriptions、used_activation_codes、invite_records（见 scripts/sql/）
 * 邀请奖励：被邀请人首次激活成功后，按低一档为邀请人加天数（1→0,7→1,30→7,90→30,365→90,1095→365）
 *
 * 若出现 CORS 错误：在 Supabase Edge Functions 设置中关闭此函数的「Enforce JWT verification」，
 * 否则网关在到达本函数前会返回 401，该响应不含 CORS 头。
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CODE_PREFIX = 'CF-'
const PAYLOAD_VERSION = 2

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  if (pad) base64 += '='.repeat(4 - pad)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getPublicKey(): Promise<CryptoKey> {
  const keyB64 = Deno.env.get('ACTIVATION_PUBLIC_KEY')
  if (!keyB64) throw new Error('ACTIVATION_PUBLIC_KEY not set')
  const raw = base64UrlDecode(keyB64)
  return crypto.subtle.importKey('raw', raw, { name: 'Ed25519' }, false, ['verify'])
}

function parseSubFromJwt(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.sub ?? null
  } catch {
    return null
  }
}

/** 被邀请人充值天数 → 邀请人获得天数（低一档），非标准档位为 0 */
function inviteRewardDaysForInviter(rechargeDays: number): number {
  const map: Record<number, number> = { 1: 0, 7: 1, 30: 7, 90: 30, 365: 90, 1095: 365 }
  return map[rechargeDays] ?? 0
}

function corsHeaders(origin: string | null) {
  const h: Record<string, string> = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    // supabase-js 会发送 x-client-info，必须加入否则预检失败
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    'Access-Control-Max-Age': '86400',
  }
  return h
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders(origin) })
  }

  const send = (status: number, body: object) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } })

  try {
    const auth = req.headers.get('Authorization')
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return send(401, { ok: false, error: 'unauthorized' })

    let userId: string | null = null
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser(token)
    if (user?.id) userId = user.id
    if (!userId) userId = parseSubFromJwt(token)
    if (!userId) return send(401, { ok: false, error: 'unauthorized' })

    const body = await req.json().catch(() => ({}))
    const raw = (body?.activation_code ?? '').trim()
    if (!raw) return send(400, { ok: false, error: 'missing_code' })
    if (!raw.startsWith(CODE_PREFIX)) return send(400, { ok: false, error: 'invalid_format' })

    const rest = raw.slice(CODE_PREFIX.length)
    const dot = rest.indexOf('.')
    if (dot <= 0 || dot === rest.length - 1) return send(400, { ok: false, error: 'invalid_format' })

    let payloadBytes: Uint8Array
    let sigBytes: Uint8Array
    try {
      payloadBytes = base64UrlDecode(rest.slice(0, dot))
      sigBytes = base64UrlDecode(rest.slice(dot + 1))
    } catch {
      return send(400, { ok: false, error: 'invalid_encoding' })
    }

    let payload: { days?: number; v?: number }
    try {
      payload = JSON.parse(new TextDecoder().decode(payloadBytes))
    } catch {
      return send(400, { ok: false, error: 'invalid_payload' })
    }
    if (payload.v !== PAYLOAD_VERSION || typeof payload.days !== 'number' || payload.days < 1) {
      return send(400, { ok: false, error: 'invalid_version_or_exp' })
    }
    const days = Math.floor(payload.days)

    const key = await getPublicKey()
    const valid = await crypto.subtle.verify('Ed25519', key, sigBytes, payloadBytes)
    if (!valid) return send(400, { ok: false, error: 'invalid_signature' })

    const codeHash = await sha256Hex(raw)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceRoleKey) return send(500, { ok: false, error: 'server_config' })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceRoleKey)

    if (await supabase.from('used_activation_codes').select('id').eq('code_hash', codeHash).maybeSingle().then((r) => !!r.data)) {
      return send(400, { ok: false, error: 'code_already_used' })
    }

    // 续费：在当前到期日之后顺延 days 天；若已过期或没有记录则从今天起算
    const nowMs = Date.now()
    const daysMs = days * 24 * 60 * 60 * 1000
    const { data: currentSub } = await supabase.from('user_subscriptions').select('subscription_end_at').eq('user_id', userId).maybeSingle()
    let finalEnd: string
    if (currentSub?.subscription_end_at) {
      const currentMs = new Date(currentSub.subscription_end_at).getTime()
      const baseMs = currentMs > nowMs ? currentMs : nowMs
      finalEnd = new Date(baseMs + daysMs).toISOString()
    } else {
      finalEnd = new Date(nowMs + daysMs).toISOString()
    }

    const { error: upsertErr } = await supabase.from('user_subscriptions').upsert(
      { user_id: userId, subscription_end_at: finalEnd },
      { onConflict: 'user_id' }
    )
    if (upsertErr) {
      console.error('upsert user_subscriptions', upsertErr)
      return send(500, { ok: false, error: 'db_error' })
    }

    const { error: insertErr } = await supabase.from('used_activation_codes').insert({ code_hash: codeHash, user_id: userId })
    if (insertErr) {
      if (insertErr.code === '23505') return send(400, { ok: false, error: 'code_already_used' })
      console.error('insert used_activation_codes', insertErr)
      return send(500, { ok: false, error: 'db_error' })
    }

    // 邀请奖励：当前用户（被邀请人）首次激活成功 → 为邀请人按低一档加天数
    const { data: inviteRow } = await supabase
      .from('invite_records')
      .select('id, inviter_id')
      .eq('invitee_id', userId)
      .is('reward_claimed_at', null)
      .maybeSingle()
    if (inviteRow?.inviter_id && inviteRow.inviter_id !== userId) {
      const inviterId = inviteRow.inviter_id as string
      const rewardDays = inviteRewardDaysForInviter(days)
      const nowIso = new Date().toISOString()
      const { error: updateRecordErr } = await supabase
        .from('invite_records')
        .update({ reward_claimed_at: nowIso, invitee_recharge_days: days })
        .eq('id', inviteRow.id)
      if (updateRecordErr) {
        console.error('update invite_records reward_claimed_at', updateRecordErr)
      } else if (rewardDays > 0) {
        const rewardMs = rewardDays * 24 * 60 * 60 * 1000
        const { data: inviterSub } = await supabase.from('user_subscriptions').select('subscription_end_at').eq('user_id', inviterId).maybeSingle()
        let inviterEnd: string
        if (inviterSub?.subscription_end_at) {
          const endMs = new Date(inviterSub.subscription_end_at).getTime()
          const baseMs = endMs > nowMs ? endMs : nowMs
          inviterEnd = new Date(baseMs + rewardMs).toISOString()
        } else {
          inviterEnd = new Date(nowMs + rewardMs).toISOString()
        }
        await supabase.from('user_subscriptions').upsert(
          { user_id: inviterId, subscription_end_at: inviterEnd },
          { onConflict: 'user_id' }
        )
      }
    }

    return send(200, { ok: true })
  } catch (e) {
    console.error('activate-subscription', e)
    return send(500, { ok: false, error: 'db_error' })
  }
})
