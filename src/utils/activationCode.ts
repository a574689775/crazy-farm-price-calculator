/**
 * 激活码校验（Ed25519 签名，仅前端验证）
 * 公钥来自 scripts/generate-keypair.cjs 生成后填入，私钥仅用于本地生成脚本，不暴露
 * 优先使用原生 Web Crypto API，不支持时回退到 @noble/ed25519（兼容旧版/微信等浏览器）
 */

import * as ed25519 from '@noble/ed25519'

// 运行 node scripts/generate-keypair.cjs 后，将输出的「公钥 Base64」替换下面占位符
// 也可通过环境变量 VITE_ACTIVATION_PUBLIC_KEY 注入（构建时）
const PUBLIC_KEY_BASE64 =
  (typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_ACTIVATION_PUBLIC_KEY?: string } }).env?.VITE_ACTIVATION_PUBLIC_KEY) ||
  'MiRmQfcTtPIbmdD9ms9Hrdt5L08p1W3LpZRL_VEOuBo'

const PAYLOAD_VERSION = 2
const CODE_PREFIX = 'CF-'

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  if (pad) base64 += '='.repeat(4 - pad)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function isEd25519Unsupported(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /unrecognized|ed25519|algorithm/i.test(msg)
}

async function verifyWithNative(sigBytes: Uint8Array, payloadBytes: Uint8Array): Promise<boolean> {
  const raw = base64UrlDecode(PUBLIC_KEY_BASE64)
  const rawBuf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer
  const key = await crypto.subtle.importKey('raw', rawBuf, { name: 'Ed25519' }, false, ['verify'])
  const sigBuf = sigBytes.buffer.slice(sigBytes.byteOffset, sigBytes.byteOffset + sigBytes.byteLength) as ArrayBuffer
  const payloadBuf = payloadBytes.buffer.slice(payloadBytes.byteOffset, payloadBytes.byteOffset + payloadBytes.byteLength) as ArrayBuffer
  return crypto.subtle.verify('Ed25519', key, sigBuf, payloadBuf)
}

async function verifyWithNoble(sigBytes: Uint8Array, payloadBytes: Uint8Array): Promise<boolean> {
  const pubKeyBytes = base64UrlDecode(PUBLIC_KEY_BASE64)
  return ed25519.verifyAsync(sigBytes, payloadBytes, pubKeyBytes)
}

export interface ActivationResult {
  valid: boolean
  /** 会员天数（按激活起算，v2 格式） */
  days?: number
  error?: string
}

/**
 * 验证激活码，返回是否有效及会员天数（v2：按激活起算）
 */
export async function verifyActivationCode(code: string): Promise<ActivationResult> {
  const raw = (code || '').trim()
  if (!raw.startsWith(CODE_PREFIX)) {
    return { valid: false, error: '激活码格式不正确（应以 CF- 开头）' }
  }
  const rest = raw.slice(CODE_PREFIX.length)
  const dot = rest.indexOf('.')
  if (dot <= 0 || dot === rest.length - 1) {
    return { valid: false, error: '激活码格式不正确' }
  }
  const payloadB64 = rest.slice(0, dot)
  const sigB64 = rest.slice(dot + 1)
  let payloadBytes: Uint8Array
  let sigBytes: Uint8Array
  try {
    payloadBytes = base64UrlDecode(payloadB64)
    sigBytes = base64UrlDecode(sigB64)
  } catch {
    return { valid: false, error: '激活码编码错误' }
  }
  let payloadObj: { days?: number; v?: number }
  try {
    const text = new TextDecoder().decode(payloadBytes)
    payloadObj = JSON.parse(text) as { days?: number; v?: number }
  } catch {
    return { valid: false, error: '激活码内容无效' }
  }
  if (payloadObj.v !== PAYLOAD_VERSION || typeof payloadObj.days !== 'number' || payloadObj.days < 1) {
    return { valid: false, error: '激活码版本不支持或格式无效' }
  }
  const days = Math.floor(payloadObj.days)
  if (!PUBLIC_KEY_BASE64 || PUBLIC_KEY_BASE64.includes('REPLACE')) {
    return { valid: false, error: '激活码公钥未配置，无法验证' }
  }

  let valid: boolean
  try {
    valid = await verifyWithNative(sigBytes, payloadBytes)
  } catch (e) {
    if (isEd25519Unsupported(e)) {
      try {
        valid = await verifyWithNoble(sigBytes, payloadBytes)
      } catch {
        return { valid: false, error: '激活码验证失败，请更新浏览器后重试' }
      }
    } else {
      throw e
    }
  }
  if (!valid) {
    return { valid: false, error: '激活码无效或已被篡改' }
  }
  return { valid: true, days }
}
