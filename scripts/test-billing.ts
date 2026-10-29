/**
 * Billing flow test — runs against the live dev server (mock gateway).
 * Covers: checkout → simulate → callback OK → plan activation (DB-verified),
 * cancel path, idempotent callback, foreign-authority rejection.
 */
import { PrismaClient } from '@prisma/client'

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
  return { status: r.status, cookie: r.headers.get('set-cookie')?.split(';')[0] || '' }
}

async function main() {
  await new Promise((r) => setTimeout(r, 6000))
  const stamp = Date.now().toString(36)

  console.log('== bootstrap ==')
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: `Billing Test ${stamp}`,
      ownerName: 'Billing Tester',
      email: `bill-${stamp}@example.com`,
      password: 'Test1234x',
    }),
  })
  check('test business registered', reg.status === 201, `got ${reg.status}`)

  const s = await login(`bill-${stamp}@example.com`, 'Test1234x')
  check('test business logs in', s.status === 200)
  const cookie = s.cookie

  const me = await (await fetch(`${BASE}/api/auth/me`, { headers: { cookie } })).json()
  const bizId = me.user?.businessId
  check('session has business', !!bizId)

  console.log('\n== checkout (mock gateway) ==')
  const invalid = await fetch(`${BASE}/api/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ plan: 'free' }),
  })
  check('free plan checkout rejected (400)', invalid.status === 400, `got ${invalid.status}`)

  const co = await fetch(`${BASE}/api/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ plan: 'pro' }),
  })
  const coBody = await co.json()
  check('checkout returns redirect (201)', co.status === 201, `got ${co.status}`)
  check('redirect is the simulate page (mock mode)', coBody.redirectUrl?.includes('/billing/simulate'), coBody.redirectUrl)

  const payUrl = new URL(coBody.redirectUrl, BASE)
  const paymentId = payUrl.searchParams.get('payment') || ''
  const authority = payUrl.searchParams.get('authority') || ''

  const row = await prisma.payment.findUnique({ where: { id: paymentId } })
  check('payment row pending, amount=299000, gateway=mock', !!row && row.status === 'pending' && row.amount === 299000 && row.gateway === 'mock')

  console.log('\n== cancel path ==')
  const cancel = await fetch(`${BASE}/api/billing/callback?Authority=${authority}&Status=NOK`, {
    headers: { cookie },
    redirect: 'manual',
  })
  check('NOK → redirect to dashboard', cancel.status === 307, `got ${cancel.status}`)
  const afterCancel = await prisma.payment.findUnique({ where: { id: paymentId } })
  check('payment marked canceled', afterCancel?.status === 'canceled')

  console.log('\n== success path (new checkout) ==')
  const co2 = await fetch(`${BASE}/api/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ plan: 'pro' }),
  })
  const co2Body = await co2.json()
  const u2 = new URL(co2Body.redirectUrl, BASE)
  const authority2 = u2.searchParams.get('authority') || ''

  const ok = await fetch(
    `${BASE}/api/billing/callback?Authority=${authority2}&Status=OK`,
    { headers: { cookie }, redirect: 'manual' }
  )
  check('OK → redirect to dashboard?billing=paid', (ok.headers.get('location') || '').includes('billing=paid'), ok.headers.get('location') || '')

  const paid = await prisma.payment.findUnique({ where: { id: u2.searchParams.get('payment') || '' } })
  check('payment marked paid with refId', paid?.status === 'paid' && !!paid?.refId?.startsWith('MOCKREF'))

  const biz = await prisma.business.findUnique({ where: { id: bizId! } })
  check('business plan upgraded to pro', biz?.plan === 'pro')
  check('planExpiresAt set ~30 days ahead', !!biz?.planExpiresAt && (biz.planExpiresAt.getTime() - Date.now()) > 29 * 24 * 3600 * 1000)

  const subs = await prisma.subscription.findMany({
    where: { businessId: bizId! },
    orderBy: { createdAt: 'desc' },
  })
  check('new active subscription created', subs[0]?.plan === 'pro' && subs[0]?.status === 'active')

  console.log('\n== idempotent callback ==')
  const again = await fetch(
    `${BASE}/api/billing/callback?Authority=${authority2}&Status=OK`,
    { headers: { cookie }, redirect: 'manual' }
  )
  check('re-visit redirects billing=already', (again.headers.get('location') || '').includes('billing=already'))

  console.log('\n== foreign authority rejected ==')
  const A = await login('ali@digiland.ir', 'demo123')
  const foreign = await fetch(
    `${BASE}/api/billing/callback?Authority=${authority2}&Status=OK`,
    { headers: { cookie: A.cookie }, redirect: 'manual' }
  )
  check('other tenant gets billing=invalid', (foreign.headers.get('location') || '').includes('billing=invalid'))

  console.log('\n== history ==')
  const hist = await (await fetch(`${BASE}/api/billing/history`, { headers: { cookie } })).json()
  check('history lists payments', (hist.payments?.length || 0) >= 2)
  check('history gateway=mock', hist.gateway === 'mock')

  console.log(`\n===== ${pass} passed, ${fail} failed =====`)
  await prisma.$disconnect()
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
