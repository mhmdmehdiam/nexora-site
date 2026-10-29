// Idempotent: adds default header/footer menu items if the table is empty.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const HEADER = [
  { label: 'امکانات', url: '#features', order: 0 },
  { label: 'قیمت‌گذاری', url: '#pricing', order: 1 },
  { label: 'نظرات', url: '#testimonials', order: 2 },
  { label: 'سوالات', url: '#faq', order: 3 },
]

const FOOTER = [
  { label: 'بلاگ', url: '/blog', order: 0 },
  { label: 'درباره ما', url: '#', order: 1 },
  { label: 'تماس', url: '#', order: 2 },
]

async function main() {
  const count = await prisma.menuItem.count()
  if (count > 0) {
    console.log(`menu items already exist (${count}), skipping.`)
    return
  }
  await prisma.menuItem.createMany({
    data: [
      ...HEADER.map(i => ({ ...i, location: 'header', isActive: true })),
      ...FOOTER.map(i => ({ ...i, location: 'footer', isActive: true })),
    ],
  })
  console.log('✅ default menu items seeded.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
