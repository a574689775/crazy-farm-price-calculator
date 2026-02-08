/**
 * 批量生成激活码，每种档位 1 万个，保存为 txt 到项目根目录。
 * 运行前：在项目根目录创建 .env，并设置 ACTIVATION_PRIVATE_KEY（PEM 字符串）。
 *
 * 用法：node scripts/generate-batch-codes.cjs
 *
 * 输出：周卡.txt、月卡.txt、季卡.txt、年卡.txt（每行一个激活码）
 */

const crypto = require('crypto')
const path = require('path')
const fs = require('fs')

const BATCH_SIZE = 500

const TYPES = [
  { name: '周卡', days: 7, file: '周卡.txt' },
  { name: '月卡', days: 30, file: '月卡.txt' },
  { name: '季卡', days: 90, file: '季卡.txt' },
  { name: '年卡', days: 365, file: '年卡.txt' },
]

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

function generateOneCode(privateKey, days) {
  const nonce = crypto.randomBytes(16).toString('hex')
  const payload = JSON.stringify({ days, v: 2, n: nonce })
  const payloadBuffer = Buffer.from(payload, 'utf-8')
  const signature = crypto.sign(null, payloadBuffer, privateKey)
  return 'CF-' + base64url(payloadBuffer) + '.' + base64url(signature)
}

function main() {
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

  const rootDir = path.resolve(__dirname, '..')

  for (const { name, days, file } of TYPES) {
    console.log('生成 ' + name + ' (' + days + ' 天) x ' + BATCH_SIZE + ' 个...')
    const codes = []
    for (let i = 0; i < BATCH_SIZE; i++) {
      codes.push(generateOneCode(privateKey, days))
      if ((i + 1) % 2000 === 0) {
        process.stdout.write('  ' + (i + 1) + '/' + BATCH_SIZE + '\r')
      }
    }
    const outPath = path.join(rootDir, file)
    fs.writeFileSync(outPath, codes.join('\n') + '\n', 'utf-8')
    console.log('  已写入 ' + file)
  }

  console.log('\n完成，共生成 ' + (TYPES.length * BATCH_SIZE) + ' 个激活码。')
}

main()
