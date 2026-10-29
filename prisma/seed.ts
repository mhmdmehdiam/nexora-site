import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/**
 * Demo data must never reach a real deployment: the seeded accounts use
 * passwords that are printed in this file, so anyone could sign in.
 *   - production  → only the platform admin, with a password from the env
 *   - dev / CI    → full demo dataset
 * Override either way with SEED_DEMO=1 / SEED_DEMO=0.
 */
const IS_PROD = process.env.NODE_ENV === 'production'
const SEED_DEMO = process.env.SEED_DEMO === '1' || (process.env.SEED_DEMO !== '0' && !IS_PROD)

const ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD || (IS_PROD ? '' : 'admin123')

if (!ADMIN_PASSWORD) {
  throw new Error(
    'SEED_ADMIN_PASSWORD is required in production. Set it to a strong password before seeding.'
  )
}

/**
 * Demo account password. Must satisfy the app's own 8-character minimum —
 * otherwise these accounts can never be restored through the reset flow.
 */
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'demo1234'

async function main() {
  console.log('🌱 Seeding Nexora database...')

  // ===== NEXORA PLATFORM ADMIN =====
  const adminPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)
  const nexoraBiz = await prisma.business.upsert({
    where: { slug: 'nexora-platform' },
    update: {},
    create: {
      name: 'نکسورا',
      slug: 'nexora-platform',
      email: 'admin@nexora.ir',
      phone: '021-12345678',
      plan: 'enterprise',
      industry: 'technology',
    },
  })

  const admin = await prisma.user.upsert({
    where: { businessId_email: { businessId: nexoraBiz.id, email: 'admin@nexora.ir' } },
    update: {},
    create: {
      businessId: nexoraBiz.id,
      name: 'مدیر نکسورا',
      email: 'admin@nexora.ir',
      password: adminPassword,
      role: 'owner',
      phone: '09121234567',
    },
  })

  if (SEED_DEMO) {
  // ===== DEMO BUSINESS 1: Digital Shop =====
  const demoPassword = await bcrypt.hash(DEMO_PASSWORD, 12)
  const digiShop = await prisma.business.upsert({
    where: { slug: 'digi-land' },
    update: {},
    create: {
      name: 'دیجی‌لند',
      slug: 'digi-land',
      email: 'info@digiland.ir',
      phone: '021-88776655',
      address: 'خیابان ولیعصر، پلاک ۱۲۳',
      city: 'تهران',
      industry: 'electronics',
      plan: 'pro',
      planExpiresAt: new Date('2026-12-31'),
    },
  })

  const digiOwner = await prisma.user.upsert({
    where: { businessId_email: { businessId: digiShop.id, email: 'ali@digiland.ir' } },
    update: {},
    create: {
      businessId: digiShop.id,
      name: 'علی محمدی',
      email: 'ali@digiland.ir',
      password: demoPassword,
      role: 'owner',
      phone: '09131234567',
    },
  })

  // Customers for digiShop
  const cust1 = await prisma.customer.create({
    data: { businessId: digiShop.id, name: 'شرکت آسمان', email: 'info@aseman.ir', phone: '02188776655', city: 'تهران', tags: JSON.stringify(['عمده‌فروش', 'VIP']), totalSpent: 45000000, lastPurchase: new Date('2026-09-10') },
  })
  const cust2 = await prisma.customer.create({
    data: { businessId: digiShop.id, name: 'فروشگاه پارسیان', phone: '02177665544', city: 'تهران', tags: JSON.stringify(['خرده‌فروش']), totalSpent: 12500000, lastPurchase: new Date('2026-09-08') },
  })
  const cust3 = await prisma.customer.create({
    data: { businessId: digiShop.id, name: 'محمد رضایی', phone: '09131112233', city: 'اصفهان', totalSpent: 3200000, lastPurchase: new Date('2026-09-05') },
  })
  const cust4 = await prisma.customer.create({
    data: { businessId: digiShop.id, name: 'شرکت نوین تک', email: 'info@novintech.ir', phone: '03133445566', city: 'اصفهان', tags: JSON.stringify(['عمده‌فروش']), totalSpent: 78000000, lastPurchase: new Date('2026-09-11') },
  })
  const cust5 = await prisma.customer.create({
    data: { businessId: digiShop.id, name: 'سارا احمدی', phone: '09122223344', city: 'شیراز', totalSpent: 890000, lastPurchase: new Date('2026-08-20') },
  })
  const cust6 = await prisma.customer.create({
    data: { businessId: digiShop.id, name: 'مجتمع سپهر', phone: '02155443322', city: 'تهران', tags: JSON.stringify(['VIP']), totalSpent: 156000000, lastPurchase: new Date('2026-09-12') },
  })
  const customers = [cust1, cust2, cust3, cust4, cust5, cust6]

  // Products for digiShop
  const prod1 = await prisma.product.create({ data: { businessId: digiShop.id, name: 'لپ‌تاپ ایسوس', sku: 'LP-ASUS-001', category: 'الکترونیک', price: 45000000, cost: 38000000, stock: 25, minStock: 5 } })
  const prod2 = await prisma.product.create({ data: { businessId: digiShop.id, name: 'موبایل سامسونگ A54', sku: 'MB-SAM-A54', category: 'الکترونیک', price: 18000000, cost: 15000000, stock: 50, minStock: 10 } })
  const prod3 = await prisma.product.create({ data: { businessId: digiShop.id, name: 'هدفون سونی', sku: 'HP-SONY-001', category: 'لوازم جانبی', price: 8500000, cost: 6000000, stock: 30, minStock: 8 } })
  const prod4 = await prisma.product.create({ data: { businessId: digiShop.id, name: 'کیبورد مکانیکی', sku: 'KB-MEC-001', category: 'لوازم جانبی', price: 3500000, cost: 2200000, stock: 45, minStock: 10 } })
  const prod5 = await prisma.product.create({ data: { businessId: digiShop.id, name: 'مانیتور ۲۷ اینچ', sku: 'MN-27-001', category: 'الکترونیک', price: 12000000, cost: 9500000, stock: 15, minStock: 3 } })
  const prod6 = await prisma.product.create({ data: { businessId: digiShop.id, name: 'ماوس بی‌سیم', sku: 'MS-WL-001', category: 'لوازم جانبی', price: 1200000, cost: 700000, stock: 100, minStock: 20 } })
  const prod7 = await prisma.product.create({ data: { businessId: digiShop.id, name: 'هارد اکسترنال ۲TB', sku: 'HD-EXT-2TB', category: 'ذخیره‌سازی', price: 4500000, cost: 3200000, stock: 35, minStock: 5 } })
  const prod8 = await prisma.product.create({ data: { businessId: digiShop.id, name: 'پرینتر اچ‌پی', sku: 'PR-HP-001', category: 'اداری', price: 9800000, cost: 7500000, stock: 8, minStock: 2 } })
  const products = [prod1, prod2, prod3, prod4, prod5, prod6, prod7, prod8]

  // Sales
  const statuses = ['paid', 'paid', 'paid', 'partial', 'pending']
  const paymentMethods = ['cash', 'card', 'transfer', 'card', 'cash']
  for (let i = 0; i < 25; i++) {
    const monthsAgo = Math.floor(Math.random() * 6)
    const day = Math.floor(Math.random() * 28) + 1
    const date = new Date(2026, 8 - monthsAgo, day)
    const custIdx = Math.floor(Math.random() * customers.length)
    const p1 = products[Math.floor(Math.random() * products.length)]
    const p2 = products[Math.floor(Math.random() * products.length)]
    const q1 = Math.floor(Math.random() * 5) + 1
    const q2 = Math.floor(Math.random() * 3) + 1
    const totalAmount = p1.price * q1 + p2.price * q2
    const discount = Math.random() > 0.7 ? Math.floor(totalAmount * 0.05) : 0
    const tax = Math.floor((totalAmount - discount) * 0.1)
    const finalAmount = totalAmount - discount + tax
    const si = Math.floor(Math.random() * statuses.length)
    const paidAmount = statuses[si] === 'paid' ? finalAmount : statuses[si] === 'partial' ? Math.floor(finalAmount * 0.5) : 0

    await prisma.sale.create({
      data: {
        businessId: digiShop.id,
        invoiceNumber: `INV-${String(2026000 + i).padStart(7, '0')}`,
        customerId: customers[custIdx].id,
        userId: digiOwner.id,
        totalAmount, discount, tax, finalAmount, paidAmount,
        status: statuses[si],
        paymentMethod: paymentMethods[si],
        saleDate: date,
        items: {
          create: [
            { productId: p1.id, quantity: q1, unitPrice: p1.price, total: p1.price * q1 },
            { productId: p2.id, quantity: q2, unitPrice: p2.price, total: p2.price * q2 },
          ],
        },
      },
    })
  }

  // ===== DEMO BUSINESS 2: Clothing Store (Free plan) =====
  const clothShop = await prisma.business.upsert({
    where: { slug: 'moda-style' },
    update: {},
    create: {
      name: 'مُدا استایل',
      slug: 'moda-style',
      phone: '021-77665544',
      city: 'تهران',
      industry: 'fashion',
      plan: 'free',
    },
  })

  await prisma.user.upsert({
    where: { businessId_email: { businessId: clothShop.id, email: 'sara@modastyle.ir' } },
    update: {},
    create: {
      businessId: clothShop.id,
      name: 'سارا کریمی',
      email: 'sara@modastyle.ir',
      password: demoPassword,
      role: 'owner',
    },
  })

  // ===== SUBSCRIPTIONS =====
  await prisma.subscription.create({
    data: { businessId: digiShop.id, plan: 'pro', amount: 499000, status: 'active', endDate: new Date('2026-12-31') },
  })
  await prisma.subscription.create({
    data: { businessId: clothShop.id, plan: 'free', amount: 0, status: 'active' },
  })

  // Reminders
  await prisma.paymentReminder.create({
    data: { businessId: digiShop.id, customerId: cust2.id, userId: digiOwner.id, amount: 5000000, description: 'باقیمانده فاکتور', dueDate: new Date('2026-09-20') },
  })
  } // end SEED_DEMO

  // ===== PLATFORM SETTINGS =====
  const settingsData = [
    { key: 'platform_name', value: 'نکسورا' },
    { key: 'platform_name_en', value: 'Nexora' },
    { key: 'platform_phone', value: '021-12345678' },
    { key: 'platform_email', value: 'support@nexora.ir' },
    { key: 'tax_rate', value: '10' },
    { key: 'currency', value: 'تومان' },
    { key: 'free_plan_max_customers', value: '50' },
    { key: 'free_plan_max_products', value: '30' },
    { key: 'pro_plan_price', value: '499000' },
    { key: 'enterprise_plan_price', value: '1499000' },
  ]
  for (const s of settingsData) {
    await prisma.setting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s })
  }

  console.log('✅ Nexora seed complete!')
  console.log('   🏢 Platform admin: admin@nexora.ir')
  if (SEED_DEMO) {
    console.log('   🏪 Demo: دیجی‌لند (ali@digiland.ir / demo1234)')
    console.log('   👗 Demo: مُدا استایل (sara@modastyle.ir / demo1234)')
    console.log('   👥 Customers: 6 | 📦 Products: 8 | 💰 Sales: 25')
  } else {
    console.log('   ⏭  Demo data skipped (production)')
  }
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
