/**
 * Security test suite — runs against the live dev server on :3100.
 *
 * Covers: cross-tenant isolation (IDOR), AI tenant scoping + plan gating,
 * rate limiting, input validation, CSRF origin check, security headers,
 * password policy, and the audit trail.
 */
import { PrismaClient } from '@prisma/client'
import { isSameSiteOrigin } from '../src/lib/csrf'

const BASE = 'http://localhost:3100'
const prisma = new PrismaClient()

let pass = 0
let fail = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    console.log(`  ✗ ${name} ${extra}`)
  }
}

async function login(email: string, password: string) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const cookie = r.headers.get('set-cookie')?.split(';')[0] || ''
  return { status: r.status, cookie, body: await r.json().catch(() => ({})) }
}

async function api(
  method: string,
  path: string,
  cookie: string,
  body?: any,
  extraHeaders: Record<string, string> = {}
) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      cookie,
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: r.status, headers: r.headers, body: await r.json().catch(() => ({})) }
}

async function main() {
  await new Promise((r) => setTimeout(r, 6000)) // dev server boot

  console.log('\n== 1. session bootstrap ==')
  const A = await login('ali@digiland.ir', 'demo1234')
  check('tenant A (digiland) logs in', A.status === 200)

  const stamp = Date.now().toString(36)
  const reg = await api('POST', '/api/auth/register', '', {
    businessName: `Security Test ${stamp}`,
    ownerName: 'Tester B',
    email: `sectest-b-${stamp}@example.com`,
    password: 'Test1234x',
    phone: '09120000000',
  })
  check('tenant B registers', reg.status === 201, `got ${reg.status}`)

  const B = await login(`sectest-b-${stamp}@example.com`, 'Test1234x')
  check('tenant B logs in', B.status === 200)

  console.log('\n== 2. tenant B provisions data ==')
  const prod = await api('POST', '/api/products', B.cookie, {
    name: 'B-secret-product',
    price: '۱۲۳۴۵۶',
    stock: '5',
  })
  check('B creates product', prod.status === 201, `got ${prod.status}`)
  const productId = prod.body.product?.id

  const cust = await api('POST', '/api/customers', B.cookie, {
    name: 'B-secret-customer',
    phone: '09121112233',
  })
  check('B creates customer', cust.status === 201, `got ${cust.status}`)
  const customerId = cust.body.customer?.id

  console.log('\n== 3. cross-tenant isolation (IDOR) ==')
  const g1 = await api('GET', `/api/customers/${customerId}`, A.cookie)
  check('A cannot READ B customer (404)', g1.status === 404, `got ${g1.status}`)
  const p1 = await api('PUT', `/api/customers/${customerId}`, A.cookie, { name: 'hacked' })
  check('A cannot UPDATE B customer (404)', p1.status === 404, `got ${p1.status}`)
  const d1 = await api('DELETE', `/api/customers/${customerId}`, A.cookie)
  check('A cannot DELETE B customer (404)', d1.status === 404, `got ${d1.status}`)
  const g2 = await api('GET', `/api/products/${productId}`, A.cookie)
  check('A cannot READ B product (404)', g2.status === 404, `got ${g2.status}`)
  const p2 = await api('PUT', `/api/products/${productId}`, A.cookie, { name: 'hacked', price: '1' })
  check('A cannot UPDATE B product (404)', p2.status === 404, `got ${p2.status}`)
  const d2 = await api('DELETE', `/api/products/${productId}`, A.cookie)
  check('A cannot DELETE B product (404)', d2.status === 404, `got ${d2.status}`)
  // owner still works
  const own = await api('GET', `/api/customers/${customerId}`, B.cookie)
  check('B can still read own customer', own.status === 200)

  console.log('\n== 4. AI tenant scoping + plan gating ==')
  const aiA = await api('POST', '/api/ai', A.cookie, { type: 'full' })
  check('A (pro) gets AI analysis', aiA.status === 200, `got ${aiA.status}`)
  const aiB = await api('POST', '/api/ai', B.cookie, { type: 'full' })
  check('B (free) blocked from AI (403)', aiB.status === 403, `got ${aiB.status}`)

  // upgrade B to pro via platform admin, then verify A's data is not in B's report
  const admin = await login('admin@nexora.ir', 'admin123')
  check('platform admin logs in', admin.status === 200)
  const bizList = await api('GET', '/api/admin/businesses', admin.cookie)
  const bBiz = bizList.body.businesses?.find((x: any) => x.email === `sectest-b-${stamp}@example.com`)
  if (bBiz) {
    await api('PUT', `/api/admin/businesses/${bBiz.id}`, admin.cookie, { plan: 'pro' })
    const aiB2 = await api('POST', '/api/ai', B.cookie, { type: 'full' })
    check('B (upgraded to pro) reaches AI', aiB2.status === 200, `got ${aiB2.status}`)
    const names = JSON.stringify(aiB2.body.topProducts || [])
    check('B AI report does NOT contain A product names', !names.includes('لباس') && !names.includes('هدفون'), names.slice(0, 80))
    check('B AI revenue is zero (no cross-tenant leak)', (aiB2.body.summary?.recentRevenue ?? 1) === 0)
  } else {
    check('admin finds tenant B business', false)
  }

  console.log('\n== 5. rate limiting (brute force) ==')
  let saw429 = false
  for (let i = 0; i < 9; i++) {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ratelimit-probe@example.com', password: 'wrong' + i }),
    })
    if (r.status === 429) saw429 = true
  }
  check('login brute force hits 429', saw429)

  console.log('\n== 6. input validation (Zod) ==')
  const badSale = await api('POST', '/api/sales', A.cookie, {
    customerId: 'x',
    items: [],
    discount: 'abc',
  })
  check('empty sale items rejected (400)', badSale.status === 400, `got ${badSale.status}`)
  const weakReg = await api('POST', '/api/auth/register', '', {
    businessName: 'T',
    ownerName: 'T',
    email: `weak-${stamp}@example.com`,
    password: '12345678',
  })
  check('weak password (no letter) rejected', weakReg.status === 400, `got ${weakReg.status}`)
  const badEmail = await api('POST', '/api/auth/register', '', {
    businessName: 'T2',
    ownerName: 'T2',
    email: 'not-an-email',
    password: 'Good1234',
  })
  check('invalid email rejected', badEmail.status === 400, `got ${badEmail.status}`)
  const badSms = await api('POST', '/api/sms', A.cookie, {
    customerId: 'whatever',
    phone: 'abc',
    message: 'hi',
  })
  check('invalid phone rejected (400)', badSms.status === 400, `got ${badSms.status}`)

  console.log('\n== 7. CSRF origin check ==')
  const evil = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ email: 'x@example.com', password: 'y' }),
  })
  check('cross-site POST blocked (403)', evil.status === 403, `got ${evil.status}`)

  console.log('\n== 8. security headers ==')
  const anyRes = await fetch(`${BASE}/api/dashboard`, { headers: { cookie: A.cookie } })
  check('X-Frame-Options: DENY', anyRes.headers.get('x-frame-options') === 'DENY')
  check('X-Content-Type-Options: nosniff', anyRes.headers.get('x-content-type-options') === 'nosniff')
  check('Referrer-Policy present', !!anyRes.headers.get('referrer-policy'))
  check('Permissions-Policy present', !!anyRes.headers.get('permissions-policy'))

  console.log('\n== 9. plan gating (SMS) ==')
  const sara = await login('sara@modastyle.ir', 'demo1234')
  check('tenant C (free) logs in', sara.status === 200)
  const smsC = await api('POST', '/api/sms', sara.cookie, {
    customerId: 'x',
    phone: '09120000000',
    message: 'test',
  })
  check('C (free) blocked from SMS (403)', smsC.status === 403, `got ${smsC.status}`)

  console.log('\n== 10. audit trail ==')
  const failedLogins = await prisma.activityLog.count({
    where: { action: 'login.failed' },
  })
  check('failed logins recorded in audit log', failedLogins > 0, `count=${failedLogins}`)
  const rateHits = await prisma.activityLog.count({
    where: { action: 'login.rate_limited' },
  })
  check('rate-limit hits recorded', rateHits > 0, `count=${rateHits}`)

  console.log('\n== 11. CSP hardening ==')
  const csp = anyRes.headers.get('content-security-policy') || ''
  check('CSP present', csp.length > 0)
  check(
    "no 'unsafe-eval' in production script-src",
    !/script-src[^;]*'unsafe-eval'/.test(csp),
    'unsafe-eval present — any injection becomes code execution'
  )
  check('CSP reports somewhere', /report-uri|report-to/.test(csp))
  check('frame-ancestors none', /frame-ancestors 'none'/.test(csp))
  check('Cross-Origin-Opener-Policy set', anyRes.headers.get('cross-origin-opener-policy') === 'same-origin')
  check('Cross-Origin-Resource-Policy set', !!anyRes.headers.get('cross-origin-resource-policy'))

  console.log('\n== 12. security.txt ==')
  const secTxt = await fetch(`${BASE}/.well-known/security.txt`)
  const secBody = await secTxt.text()
  check('security.txt served (200)', secTxt.status === 200, `got ${secTxt.status}`)
  check('has Contact:', /^Contact:\s*mailto:/m.test(secBody))
  check('has Expires:', /^Expires:/m.test(secBody))

  console.log('\n== 13. oversized body rejected ==')
  const huge = 'x'.repeat(3 * 1024 * 1024)
  const bigRes = await fetch(`${BASE}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: huge, email: 'a@b.c', subject: 's', message: 'm' }),
  })
  check('3 MB body rejected (413)', bigRes.status === 413, `got ${bigRes.status}`)

  console.log('\n== 14. rate limit is shared across workers ==')
  // 8 allowed per IP+email. With a per-process Map behind 4 workers an attacker
  // would get 32. Getting 429 inside 10 proves the window is global.
  const rlEmail = `rl-${Date.now().toString(36)}@example.com`
  let saw429Shared = 0
  let attempts = 0
  for (let i = 0; i < 10; i++) {
    attempts++
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: rlEmail, password: 'Wrong123x' }),
    })
    if (r.status === 429) {
      saw429Shared++
      break
    }
  }
  check('429 arrives within 10 attempts', saw429Shared > 0, `no 429 after ${attempts} attempts`)

  console.log('\n== 15. account lockout (IP-independent) ==')
  const lockEmail = `lock-${Date.now().toString(36)}@example.com`
  await prisma.$executeRaw`
    INSERT INTO "RateLimit" ("key", "count", "windowStart", "expiresAt")
    VALUES (${'login-fail:' + lockEmail}, 25, NOW(), NOW() + INTERVAL '10 minutes')
    ON CONFLICT ("key") DO UPDATE SET "count" = 25, "expiresAt" = NOW() + INTERVAL '10 minutes'
  `
  const locked = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: lockEmail, password: 'Wrong123x' }),
  })
  check('locked account returns 423', locked.status === 423, `got ${locked.status}`)
  await prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "key" = ${'login-fail:' + lockEmail}`

  console.log('\n== 16. client IP is not client-controlled ==')
  // A spoofed leftmost hop must not become the rate-limit identity.
  const spoofEmail = `spoof-${Date.now().toString(36)}@example.com`
  let spoofBypassed = true
  for (let i = 0; i < 12; i++) {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // attacker-chosen hop on the left, real hop on the right
        'x-forwarded-for': `10.0.0.${i}, 203.0.113.9`,
      },
      body: JSON.stringify({ email: spoofEmail, password: 'Wrong123x' }),
    })
    if (r.status === 429) {
      spoofBypassed = false
      break
    }
  }
  check(
    'rotating x-forwarded-for does not bypass the limit',
    !spoofBypassed,
    'attacker can mint a new identity per request'
  )

  console.log('\n== 17. CSRF behind a proxy (the production topology) ==')
  // The worker sees Host: localhost:3100 (the proxy rewrites it for internal
  // routing) while the browser sends Origin: https://<domain>. Comparing those
  // two rejected every legitimate POST in production and passed locally only
  // because there they match. The HTTP path cannot be tested here — fetch will
  // not let us forge Host — so the decision is a pure function and tested as
  // one.
  check(
    'domain Origin + domain forwarded-host is same-site',
    isSameSiteOrigin('https://nexora.ir', 'nexora.ir', 'localhost:3100') === true,
    'production logins would be 403'
  )
  check(
    'domain Origin + worker Host (no forwarded header) still matches via Host',
    isSameSiteOrigin('https://nexora.ir', null, 'nexora.ir') === true
  )
  check(
    'cross-site Origin with domain forwarded-host is rejected',
    isSameSiteOrigin('https://evil.example', 'nexora.ir', 'localhost:3100') === false
  )
  check(
    'localhost dev origin still accepted',
    isSameSiteOrigin('http://localhost:3100', 'localhost:3100', 'localhost:3100') === true
  )
  check(
    'multi-hop x-forwarded-host uses the first hop',
    isSameSiteOrigin('https://nexora.ir', 'nexora.ir, internal.proxy', 'localhost:3100') === true
  )
  check('no Origin (non-browser client) is allowed', isSameSiteOrigin(null, 'nexora.ir', 'x') === true)
  check('malformed Origin is rejected', isSameSiteOrigin('not-a-url', 'nexora.ir', 'x') === false)

  console.log(`\n===== ${pass} passed, ${fail} failed =====`)
  await prisma.$disconnect()
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
