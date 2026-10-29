/**
 * End-to-end sales API test: posts real sales, checks every stored number
 * against hand-computed expectations, then rolls the data back.
 *
 *   npx tsx scripts/test-sales-api.ts
 */
import { PrismaClient } from '@prisma/client'
import { roundHalfUp } from '../src/lib/money'

const BASE = 'http://localhost:3100'
const prisma = new PrismaClient()

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = '') {
  if (cond) passed++
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
}

function eq(name: string, actual: unknown, expected: unknown) {
  check(name, actual === expected, `expected ${expected}, got ${actual}`)
}

async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const cookie = res.headers.get('set-cookie') || ''
  return { ok: res.ok, cookie: cookie.split(';')[0] }
}

async function api(path: string, cookie: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', cookie, ...(init?.headers || {}) },
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

;(async () => {
  const auth = await login('ali@digiland.ir', 'demo123')
  if (!auth.ok) throw new Error('login failed')

  const me = await api('/api/auth/me', auth.cookie)
  const businessId = me.json.user.businessId

  const customers = (await api('/api/customers', auth.cookie)).json.customers || []
  const products = (await api('/api/products', auth.cookie)).json.products || []
  const customer = customers[0]
  const product = products.find((p: any) => p.stock >= 5 && p.isActive !== false) || products[0]

  if (!customer || !product) throw new Error('no seed data')

  const stockBefore = product.stock
  const spentBefore = customer.totalSpent || 0
  const created: string[] = []

  try {
    /* ---------------- happy path ---------------- */
    const qty = 3
    const expectedSubtotal = product.price * qty
    const expectedTax = roundHalfUp((expectedSubtotal * 10) / 100)
    const expectedTotal = expectedSubtotal + expectedTax

    const res = await api('/api/sales', auth.cookie, {
      method: 'POST',
      body: JSON.stringify({
        customerId: customer.id,
        items: [{ productId: product.id, quantity: qty, unitPrice: product.price }],
        discount: 0,
        paidAmount: expectedTotal,
        paymentMethod: 'cash',
      }),
    })

    eq('POST /api/sales status', res.status, 201)
    const sale = res.json.sale
    created.push(sale?.id)

    eq('subtotal', sale?.totalAmount, expectedSubtotal)
    eq('tax', sale?.tax, expectedTax)
    eq('finalAmount', sale?.finalAmount, expectedTotal)
    eq('paidAmount', sale?.paidAmount, expectedTotal)
    eq('status = paid', sale?.status, 'paid')
    eq('line total', sale?.items?.[0]?.total, expectedSubtotal)
    check('invoice number format', /^INV-\d{4}\d{3,}$/.test(sale?.invoiceNumber || ''), sale?.invoiceNumber)

    /* ---------------- stock + customer updated ---------------- */
    const afterProduct = await prisma.product.findUnique({ where: { id: product.id } })
    const afterCustomer = await prisma.customer.findUnique({ where: { id: customer.id } })
    eq('stock decremented', afterProduct?.stock, stockBefore - qty)
    eq('customer totalSpent incremented', afterCustomer?.totalSpent, spentBefore + expectedTotal)

    /* ---------------- discount is applied before tax ---------------- */
    const discount = 1000
    const base = expectedSubtotal - discount
    const dRes = await api('/api/sales', auth.cookie, {
      method: 'POST',
      body: JSON.stringify({
        customerId: customer.id,
        items: [{ productId: product.id, quantity: 1, unitPrice: product.price }],
        discount,
        paidAmount: 0,
      }),
    })
    eq('discount sale status', dRes.status, 201)
    created.push(dRes.json.sale?.id)
    eq('discount: subtotal', dRes.json.sale?.totalAmount, product.price)
    eq('discount: tax on discounted base', dRes.json.sale?.tax, roundHalfUp(((product.price - discount) * 10) / 100))
    eq('discount: total', dRes.json.sale?.finalAmount, product.price - discount + roundHalfUp(((product.price - discount) * 10) / 100))
    eq('discount: unpaid status', dRes.json.sale?.status, 'pending')

    /* ---------------- validation guards ---------------- */
    const overDiscount = await api('/api/sales', auth.cookie, {
      method: 'POST',
      body: JSON.stringify({
        customerId: customer.id,
        items: [{ productId: product.id, quantity: 1, unitPrice: 1000 }],
        discount: 5000,
      }),
    })
    eq('over-discount rejected', overDiscount.status, 400)

    const noItems = await api('/api/sales', auth.cookie, {
      method: 'POST',
      body: JSON.stringify({ customerId: customer.id, items: [] }),
    })
    eq('empty items rejected', noItems.status, 400)

    const fracQty = await api('/api/sales', auth.cookie, {
      method: 'POST',
      body: JSON.stringify({
        customerId: customer.id,
        items: [{ productId: product.id, quantity: 1.5, unitPrice: 1000 }],
      }),
    })
    eq('fractional quantity rejected', fracQty.status, 400)

    const tooMany = await api('/api/sales', auth.cookie, {
      method: 'POST',
      body: JSON.stringify({
        customerId: customer.id,
        items: [{ productId: product.id, quantity: 999999, unitPrice: 1000 }],
      }),
    })
    eq('insufficient stock rejected', tooMany.status, 400)

    const badCustomer = await api('/api/sales', auth.cookie, {
      method: 'POST',
      body: JSON.stringify({
        customerId: 'does-not-exist',
        items: [{ productId: product.id, quantity: 1, unitPrice: 1000 }],
      }),
    })
    eq('unknown customer rejected', badCustomer.status, 404)

    const zeroQty = await api('/api/sales', auth.cookie, {
      method: 'POST',
      body: JSON.stringify({
        customerId: customer.id,
        items: [{ productId: product.id, quantity: 0, unitPrice: 1000 }],
      }),
    })
    eq('zero quantity rejected', zeroQty.status, 400)

    /* ---------------- analytics endpoints ---------------- */
    const dash = await api('/api/dashboard', auth.cookie)
    eq('dashboard status', dash.status, 200)
    eq('dashboard has 6 months', dash.json.monthlySales?.length, 6)
    check(
      'dashboard months are labelled',
      (dash.json.monthlySales || []).every((m: any) => typeof m.month === 'string' && m.month.length > 0),
      JSON.stringify(dash.json.monthlySales?.map((m: any) => m.month))
    )

    const rep = await api('/api/reports', auth.cookie)
    eq('reports status', rep.status, 200)
    eq('reports has 6 months', rep.json.monthlyComparison?.length, 6)
    check(
      'reports monthly keys present',
      (rep.json.monthlyComparison || []).every((m: any) => typeof m.key === 'string'),
      JSON.stringify(rep.json.monthlyComparison?.map((m: any) => m.key))
    )

    const totalRevenue = (rep.json.monthlyComparison || []).reduce(
      (s: number, m: any) => s + (m.revenue || 0),
      0
    )
    check('reports revenue is an integer', Number.isInteger(totalRevenue), String(totalRevenue))
  } finally {
    /* ---------------- rollback ---------------- */
    for (const id of created.filter(Boolean)) {
      const sale = await prisma.sale.findUnique({ where: { id }, include: { items: true } })
      if (!sale) continue
      for (const item of sale.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
      await prisma.customer.update({
        where: { id: sale.customerId },
        data: { totalSpent: { decrement: sale.finalAmount } },
      })
      await prisma.sale.delete({ where: { id } })
    }
    await prisma.$disconnect()
  }

  const total = passed + failures.length
  if (failures.length === 0) {
    console.log(`\n✓ ${passed}/${total} sales API checks passed\n`)
    process.exit(0)
  }
  console.log(`\n✗ ${failures.length} of ${total} failed\n`)
  for (const f of failures) console.log('  ✗ ' + f)
  process.exit(1)
})()
