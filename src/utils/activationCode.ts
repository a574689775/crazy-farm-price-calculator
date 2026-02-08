/**
 * 激活码校验（Ed25519 签名，仅前端验证）
 * 公钥来自 scripts/generate-keypair.cjs 生成后填入，私钥仅用于本地生成脚本，不暴露
 */

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

async function getPublicKey(): Promise<CryptoKey> {
  if (!PUBLIC_KEY_BASE64 || PUBLIC_KEY_BASE64.includes('REPLACE')) {
    throw new Error('激活码公钥未配置，无法验证')
  }
  const raw = base64UrlDecode(PUBLIC_KEY_BASE64)
  const rawCopy = new Uint8Array(raw)
  return crypto.subtle.importKey('raw', rawCopy.buffer as ArrayBuffer, { name: 'Ed25519' }, false, ['verify'])
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
  const key = await getPublicKey()
  const sigCopy = new Uint8Array(sigBytes)
  const payloadCopy = new Uint8Array(payloadBytes)
  const valid = await crypto.subtle.verify(
    'Ed25519',
    key,
    sigCopy as unknown as ArrayBuffer,
    payloadCopy as unknown as ArrayBuffer
  )
  if (!valid) {
    return { valid: false, error: '激活码无效或已被篡改' }
  }
  return { valid: true, days }
}
