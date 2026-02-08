/**
 * 一次性运行：生成 Ed25519 密钥对，用于激活码签发/验证。
 * 运行：node scripts/generate-keypair.cjs
 *
 * 输出：
 * - 公钥（Base64）：复制到 Supabase Edge Function 的 ACTIVATION_PUBLIC_KEY
 * - 私钥（PEM）：复制到项目根目录 .env 中的 ACTIVATION_PRIVATE_KEY（不要提交 .env）
 */

const crypto = require('crypto')

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

// Ed25519 SPKI DER：公钥 raw 为最后 32 字节
const pubDer = publicKey
const rawPub = pubDer.subarray(pubDer.length - 32)
const publicKeyBase64 = base64url(rawPub)

const privateKeyPem = privateKey

console.log('========== 请妥善保存，不要泄露 ==========\n')
console.log('【公钥 Base64】复制到 Supabase Edge Function 的 ACTIVATION_PUBLIC_KEY：')
console.log(publicKeyBase64)
console.log('\n【私钥 PEM】复制到项目根目录 .env 文件中（若没有 .env 请新建）：')
console.log('ACTIVATION_PRIVATE_KEY="' + privateKeyPem.replace(/\n/g, '\\n') + '"')
console.log('\n或逐行复制下面整段到 .env（单行，用 \\n 表示换行）：')
console.log('---')
console.log('ACTIVATION_PRIVATE_KEY="' + privateKeyPem.trim().replace(/\n/g, '\\n') + '"')
console.log('---')
console.log('\n务必把 .env 加入 .gitignore，不要提交私钥。')
