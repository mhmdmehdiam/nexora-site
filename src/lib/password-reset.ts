import crypto from 'crypto'
import { prisma } from './db'

/**
 * Password-reset tokens.
 *
 * A reset link is a bearer credential — whoever holds it can take over the
 * account. So:
 *   - 32 random bytes, base64url (256 bits — not guessable)
 *   - only the SHA-256 hash is persisted; a database dump yields no usable links
 *   - single use (`usedAt`), 60-minute TTL
 *   - requesting a new link invalidates every earlier one for that user
 */

const TTL_MINUTES = 60

function hash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function createResetToken(
  userId: string,
  ip?: string | null
): Promise<{ token: string; expiresAt: Date }> {
  // one live link per account at a time
  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } })

  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: hash(token), expiresAt, ip: ip || null },
  })

  return { token, expiresAt }
}

export type ConsumeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' }

export async function consumeResetToken(token: string): Promise<ConsumeResult> {
  if (!token || token.length < 20) return { ok: false, reason: 'invalid' }

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hash(token) },
  })

  if (!row) return { ok: false, reason: 'invalid' }
  if (row.usedAt) return { ok: false, reason: 'used' }
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' }

  await prisma.passwordResetToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  })

  return { ok: true, userId: row.userId }
}

/** Housekeeping — safe to call from the reconcile cron. */
export async function pruneResetTokens(): Promise<number> {
  const { count } = await prisma.passwordResetToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] },
  })
  return count
}
