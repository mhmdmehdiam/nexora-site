import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * Sign out everywhere.
 *
 * Bumping tokenVersion invalidates every JWT issued before now — including
 * the caller's own. The cookie is cleared here too so the current browser
 * lands on /login immediately instead of bouncing off a 401.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.user.update({
    where: { id: user.id },
    data: { tokenVersion: { increment: 1 } },
  })

  await audit({
    businessId: user.businessId,
    userId: user.id,
    action: 'session.revoked',
    detail: 'signed out of all devices',
    req,
  })

  const res = NextResponse.json({ ok: true })
  res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
