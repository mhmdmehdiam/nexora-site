/**
 * Bring the existing demo accounts in line with the seed's password.
 *
 * The reset flow enforces an 8-character minimum, so a 7-character demo
 * password could never be restored through it. Run once after pulling:
 *
 *   node scripts/align-demo-passwords.cjs
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()
const TARGET = process.env.SEED_DEMO_PASSWORD || 'demo1234'
const EMAILS = ['ali@digiland.ir', 'sara@modastyle.ir']

async function main() {
  const hash = await bcrypt.hash(TARGET, 12)
  for (const email of EMAILS) {
    const user = await prisma.user.findFirst({ where: { email }, select: { id: true } })
    if (!user) {
      console.log('skip (not found):', email)
      continue
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, tokenVersion: { increment: 1 } },
    })
    console.log('updated:', email)
  }
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e.message)
  await prisma.$disconnect()
  process.exit(1)
})
