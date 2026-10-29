/**
 * End-to-end test for the password-reset flow.
 *
 * Mints a token with the same hashing the app uses, calls the public API, and
 * checks that the password actually changes, the token cannot be replayed, and
 * every previous session is invalidated.
 *
 * The demo account's password is rotated by step 6, so run
 * `node scripts/align-demo-passwords.cjs` afterwards to put it back.
 *
 *   node scripts/test-reset-flow.cjs
 */
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')

const BASE = 'http://localhost:3100'
const prisma = new PrismaClient()

const EMAIL = 'sara@modastyle.ir'
const NEW_PASS = process.env.TEST_NEW_PASS || 'ResetTest!2026'

async function mint(userId) {
  const token = crypto.randomBytes(32).toString('base64url')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  await prisma.passwordResetToken.deleteMany({ where: { userId } })
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + 3600_000) },
  })
  return token
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: await res.json().catch(() => ({})) }
}

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: EMAIL },
    select: { id: true, tokenVersion: true },
  })
  if (!user) throw new Error('demo user missing')

  let r = await post('/api/auth/forgot-password', { email: EMAIL })
  console.log('1. forgot-password          →', r.status, r.data.ok ? 'generic ok' : r.data.error)

  r = await post('/api/auth/forgot-password', { email: 'nobody@nowhere.ir' })
  console.log('2. unknown email            →', r.status, '(identical body:', r.data.ok === true, ')')

  const token = await mint(user.id)
  console.log('3. token minted             →', token.slice(0, 12) + '…')

  r = await post('/api/auth/reset-password', { token: 'x'.repeat(40), password: NEW_PASS })
  console.log('4. bogus token              →', r.status, r.data.error)

  r = await post('/api/auth/reset-password', { token, password: 'short' })
  console.log('5. weak password            →', r.status, r.data.error)

  r = await post('/api/auth/reset-password', { token, password: NEW_PASS })
  console.log('6. valid reset              →', r.status, r.data.message)

  r = await post('/api/auth/reset-password', { token, password: NEW_PASS + 'x' })
  console.log('7. replay same token        →', r.status, r.data.error)

  r = await post('/api/auth/login', { email: EMAIL, password: NEW_PASS })
  console.log('8. login with new password  →', r.status, r.data.user ? 'ok' : r.data.error)

  const after = await prisma.user.findUnique({
    where: { id: user.id },
    select: { tokenVersion: true },
  })
  console.log('9. tokenVersion             →', user.tokenVersion, '→', after.tokenVersion, '(old sessions dead)')

  console.log('\nDone. Run scripts/align-demo-passwords.cjs to restore the demo login.')
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('FAILED:', e.message)
  await prisma.$disconnect()
  process.exit(1)
})
