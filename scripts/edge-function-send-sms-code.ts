// @ts-nocheck
// Edge Function: send-sms-code
// 用途：给指定手机号发送登录/绑定验证码（调用腾讯云短信），并写入 sms_codes 表做限流与校验。

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// 环境变量（在 Supabase Dashboard 的 Edge Functions Settings 里配置）
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TENCENT_SMS_SECRET_ID = Deno.env.get('TENCENT_SMS_SECRET_ID')!
const TENCENT_SMS_SECRET_KEY = Deno.env.get('TENCENT_SMS_SECRET_KEY')!
const TENCENT_SMS_SDK_APP_ID = Deno.env.get('TENCENT_SMS_SDK_APP_ID')!
const TENCENT_SMS_TEMPLATE_ID_LOGIN = Deno.env.get('TENCENT_SMS_TEMPLATE_ID_LOGIN')!

// 创建 Supabase admin client（使用 Service Role，不受 RLS 限制）
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ===== Tencent Cloud TC3-HMAC-SHA256 工具函数 =====

async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bufferToHex(digest)
}

/** 与 HTTP body 字节完全一致地计算 SHA256（TC3 签名必须与发送字节相同） */
async function sha256HexBytes(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bufferToHex(digest)
}

async function hmacSHA256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message))
  return new Uint8Array(sig)
}

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function signTC3Request(payloadBytes: Uint8Array, timestamp: number) {
  const service = 'sms'
  const host = 'sms.tencentcloudapi.com'
  const region = 'ap-guangzhou'
  const algorithm = 'TC3-HMAC-SHA256'
  const httpRequestMethod = 'POST'
  const canonicalUri = '/'
  const canonicalQueryString = ''
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\n`
  const signedHeaders = 'content-type;host'

  const hashedRequestPayload = await sha256HexBytes(payloadBytes)

  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload,
  ].join('\n')

  const date = new Date(timestamp * 1000).toISOString().slice(0, 10)
  const credentialScope = `${date}/${service}/tc3_request`
  const hashedCanonicalRequest = await sha256Hex(canonicalRequest)

  const stringToSign = [
    algorithm,
    String(timestamp),
    credentialScope,
    hashedCanonicalRequest,
  ].join('\n')

  const kDate = await hmacSHA256(
    new TextEncoder().encode('TC3' + TENCENT_SMS_SECRET_KEY),
    date,
  )
  const kService = await hmacSHA256(kDate, service)
  const kSigning = await hmacSHA256(kService, 'tc3_request')
  const signature = bufferToHex(await hmacSHA256(kSigning, stringToSign))

  const authorization = `${algorithm} Credential=${TENCENT_SMS_SECRET_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  return {
    authorization,
    host,
    region,
  }
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    return xff.split(',')[0].trim()
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp
  return null
}

function isValidChinaMobile(phone: string): boolean {
  return /^1[3-9][0-9]{9}$/.test(phone)
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * 腾讯云 SignName 应为签名内容本身，不含「【】」（控制台展示时会自动加括号）。
 * 若环境变量误带全角括号，去掉以免与模板重复或产生异常展示。
 */
function normalizeSignName(sign: string): string {
  let s = sign.trim()
  if (s.startsWith('【') && s.endsWith('】')) {
    s = s.slice(1, -1).trim()
  }
  return s
}

/**
 * Supabase Dashboard 里部分中文 Secret 在保存/注入时会被破坏成 U+FFFD（日志里 utf8 为 ef bf bd）。
 * 优先使用 TENCENT_SMS_SIGN_NAME_UTF8_B64：本地对签名做 UTF-8 再 Base64，仅 ASCII，不会被乱改。
 */
function resolveSignName(): string {
  const b64 = Deno.env.get('TENCENT_SMS_SIGN_NAME_UTF8_B64')?.trim()
  if (b64) {
    try {
      const bin = atob(b64.replace(/\s/g, ''))
      const u8 = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
      return normalizeSignName(new TextDecoder('utf-8').decode(u8))
    } catch (e) {
      console.error('TENCENT_SMS_SIGN_NAME_UTF8_B64 decode failed', e)
    }
  }
  const plain = Deno.env.get('TENCENT_SMS_SIGN_NAME')?.trim()
  if (!plain) {
    throw new Error('缺少 TENCENT_SMS_SIGN_NAME 或 TENCENT_SMS_SIGN_NAME_UTF8_B64')
  }
  if (plain.includes('\uFFFD')) {
    console.warn(
      'TENCENT_SMS_SIGN_NAME 含替换字符：Supabase Secret 可能已损坏 UTF-8，请改用 TENCENT_SMS_SIGN_NAME_UTF8_B64',
    )
  }
  return normalizeSignName(plain)
}

/** UTF-8 十六进制，用于核对「教」等字是否为 e6 95 99（排障后关闭 DEBUG_SMS_PAYLOAD） */
function utf8Hex(s: string): string {
  return [...new TextEncoder().encode(s)].map((b) => b.toString(16).padStart(2, '0')).join(' ')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  try {
    const { phone, scene } = (await req.json()) as { phone?: string; scene?: string }

    if (!phone || !scene) {
      return new Response(JSON.stringify({ error: '缺少参数 phone 或 scene' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (!isValidChinaMobile(phone)) {
      return new Response(JSON.stringify({ error: '手机号格式不正确，仅支持中国大陆 11 位手机号' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const allowedScenes = ['register', 'reset_password', 'bind']
    if (!allowedScenes.includes(scene)) {
      return new Response(JSON.stringify({ error: '不支持的 scene 类型' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const ip = getClientIp(req)

    // 1. 生成验证码 & 写入数据库
    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 分钟

    const { error: insertError } = await supabaseAdmin.from('sms_codes').insert({
      phone,
      code,
      scene,
      expires_at: expiresAt,
      ip,
    })

    if (insertError) {
      console.error('insert sms_codes error', insertError)
      return new Response(JSON.stringify({ error: '服务暂不可用，请稍后再试（db insert）' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // 4. 调用腾讯云短信发送（直接走 HTTP + TC3 签名）
    const signName = resolveSignName()
    const payloadObj = {
      SmsSdkAppId: TENCENT_SMS_SDK_APP_ID,
      SignName: signName,
      TemplateId: TENCENT_SMS_TEMPLATE_ID_LOGIN,
      // 模板示例：您的验证码为{1}，{2}分钟内有效。
      TemplateParamSet: [code, '10'],
      PhoneNumberSet: [`+86${phone}`],
    }
    const payloadJson = JSON.stringify(payloadObj)
    // 与 TC3 签名使用同一 UTF-8 字节序列，避免 string→body 与哈希不一致；中文签名需保证密钥为 UTF-8 保存
    const payloadBytes = new TextEncoder().encode(payloadJson)

    if (Deno.env.get('DEBUG_SMS_PAYLOAD') === '1') {
      const masked = {
        ...payloadObj,
        TemplateParamSet: ['******', payloadObj.TemplateParamSet[1]],
      }
      console.log('[DEBUG_SMS_PAYLOAD] SignName string:', signName)
      console.log('[DEBUG_SMS_PAYLOAD] SignName codePoints:', [...signName].map((c) => c.codePointAt(0)!.toString(16)))
      console.log('[DEBUG_SMS_PAYLOAD] SignName utf8 hex:', utf8Hex(signName))
      console.log('[DEBUG_SMS_PAYLOAD] tencent body (code masked):', JSON.stringify(masked))
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const { authorization, host, region } = await signTC3Request(payloadBytes, timestamp)

    const headers = {
      Authorization: authorization,
      'Content-Type': 'application/json; charset=utf-8',
      Host: host,
      'X-TC-Action': 'SendSms',
      'X-TC-Version': '2021-01-11',
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Region': region,
    }

    try {
      const resp = await fetch(`https://${host}`, {
        method: 'POST',
        headers,
        body: payloadBytes,
      })
      const text = await resp.text()
      let json: any
      try {
        json = JSON.parse(text)
      } catch {
        console.error('tencent sms invalid json', text)
        return new Response(JSON.stringify({ error: '短信服务返回异常，请稍后再试' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      const status = json.Response?.SendStatusSet?.[0]
      if (!status || status.Code !== 'Ok') {
        console.error('tencent sms send failed', json)
        return new Response(JSON.stringify({ error: '短信发送失败，请稍后再试' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
    } catch (e) {
      console.error('tencent sms exception', e)
      return new Response(JSON.stringify({ error: '短信发送异常，请稍后再试' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('unhandled error in send-sms-code', e)
    return new Response(JSON.stringify({ error: '服务内部错误，请稍后再试' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})

