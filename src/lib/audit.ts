import { prisma } from './db'

/**
 * Security audit trail. Writes to the ActivityLog table and never breaks the
 * request flow — a failed log write must not fail the operation.
 *
 * Events worth recording: login success/failure, registration, Google link,
 * role changes, cross-tenant rejections (404 on foreign IDs), rate-limit hits.
 */
export async function audit(entry: {
  businessId?: string | null
  userId?: string | null
  action: string
  entity?: string
  entityId?: string | null
  detail?: string
  req?: Request
}) {
  try {
    const ip =
      entry.req?.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      entry.req?.headers.get('x-real-ip') ||
      null
    await prisma.activityLog.create({
      data: {
        businessId: entry.businessId || null,
        userId: entry.userId || null,
        action: entry.action,
        entity: entry.entity || 'security',
        entityId: entry.entityId || null,
        details: [entry.detail, ip ? `ip=${ip}` : null].filter(Boolean).join(' | ') || null,
      },
    })
  } catch (err) {
    console.error('[audit] failed to record', entry.action, err)
  }
}
