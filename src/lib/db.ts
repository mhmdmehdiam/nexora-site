import { PrismaClient } from '@prisma/client'

/*
 * Prisma Client — production-tuned for 500+ concurrent users.
 *
 * PostgreSQL connection pool settings:
 *   connection_limit  = 20   (max DB connections per Next.js instance)
 *   pool_timeout      = 10s  (wait before throwing pool exhausted)
 *
 * Next.js on Vercel runs in serverless functions → each function
 * gets its own Prisma Client. With connection_limit=20 and Vercel
 * concurrency of ~50 functions, you need PgBouncer/Supabase Pooler
 * in transaction mode (max 200 connections to PostgreSQL).
 *
 * For self-hosted (Docker / VPS), a single Next.js process with
 * connection_limit=20 handles 500 concurrent requests comfortably
 * because most are short reads (< 30ms).
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const connectionUrl = process.env.DATABASE_URL

// In development or when no pooler URL is set, use the raw DATABASE_URL.
// In production, set DATABASE_POOL_URL (PgBouncer / Supabase Pooler)
// which uses transaction mode and handles many more clients.
const dbUrl = process.env.DATABASE_POOL_URL || connectionUrl

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    // Log slow queries in development for tuning
    log:
      process.env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }]
        : undefined,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Log slow queries in dev (anything > 100ms)
if (process.env.NODE_ENV === 'development') {
  // @ts-expect-error Prisma emits query events in dev
  prisma.$on('query', (e: { duration: number; query: string }) => {
    if (e.duration > 100) {
      console.warn(`[prisma] slow query ${e.duration}ms: ${e.query.slice(0, 120)}`)
    }
  })
}
