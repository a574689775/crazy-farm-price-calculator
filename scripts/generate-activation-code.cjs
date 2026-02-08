/**
 * 生成单次订阅激活码（按激活起算）。
 * 运行前：在项目根目录创建 .env，并设置 ACTIVATION_PRIVATE_KEY（PEM 字符串）。
 *
 * 用法：
 *   node scripts/generate-activation-code.cjs           # 默认 7 天
 *   node scripts/generate-activation-code.cjs 7         # 周卡 7 天
 *   node scripts/generate-activation-code.cjs 30       # 月卡 30 天
 */

const crypto = require('crypto')
const path = require('path')
const fs = require('fs')

function base64url(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
  return b
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) {
    console.error('未找到 .env 文件，请在项目根目录创建并设置 ACTIVATION_PRIVATE_KEY')
    process.exit(1)
  }
  const content = fs.readFileSync(envPath, 'utf-8')
  const env = {}
  content.split('\n').forEach((line) => {
    const m = line.match(/^\s*ACTIVATION_PRIVATE_KEY\s*=\s*["']?([^"'\n]+)["']?\s*$/)
    if (m) {
      env.ACTIVATION_PRIVATE_KEY = m[1].replace(/\\n/g, '\n').trim()
    }
  })
  return env
}

const days = parseInt(process.argv[2] || '7', 10)
if (Number.isNaN(days) || days < 1) {
  console.error('用法: node scripts/generate-activation-code.cjs [天数]，例如 30 表示 30 天')
  process.exit(1)
}

const { ACTIVATION_PRIVATE_KEY } = loadEnv()
if (!ACTIVATION_PRIVATE_KEY || !ACTIVATION_PRIVATE_KEY.includes('BEGIN')) {
  console.error('.env 中 ACTIVATION_PRIVATE_KEY 格式有误，应为 PEM 私钥（含 -----BEGIN PRIVATE KEY-----）')
  process.exit(1)
}

const privateKey = crypto.createPrivateKey({
  key: ACTIVATION_PRIVATE_KEY,
  format: 'pem',
  type: 'pkcs8',
})

const payload = JSON.stringify({ days, v: 2 })
const payloadBuffer = Buffer.from(payload, 'utf-8')

const signature = crypto.sign(null, payloadBuffer, privateKey)
const code = 'CF-' + base64url(payloadBuffer) + '.' + base64url(signature)

console.log('激活码（' + days + ' 天，按激活起算）：')
console.log(code)
