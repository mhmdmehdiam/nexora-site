import { NextRequest } from 'next/server'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './db'

// Secret resolution order:
//  1. JWT_SECRET env (the production path — set a strong ≥24 char secret)
//  2. a persisted random secret generated once per installation
//     (sandbox/hosting environments without a secret manager)
// There is NO static fallback value — a hard-coded secret would defeat the
// whole signature check.
//
// A secret that *looks* like a placeholder ("change-me", "super-secret", …)
// is rejected in production: shipping one would let anyone who has read the
// repository forge a token for any account, including the platform admin.
const PLACEHOLDER_SECRET =
  /(change[_-]?me|super[_-]?secret|your[_-]?secret|dev[_-]?secret|placeholder|example|bizflow|xxx+)/i

function resolveJwtSecret(): string {
  const env = process.env.JWT_SECRET

  if (env && env.length >= 24) {
    if (process.env.NODE_ENV === 'production' && PLACEHOLDER_SECRET.test(env)) {
      throw new Error(
        '[auth] JWT_SECRET looks like a placeholder value. Generate a real one:\n' +
          "  node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\""
      )
    }
    return env
  }

  if (process.env.NODE_ENV === 'production' && env) {
    throw new Error('[auth] JWT_SECRET is shorter than 24 characters — refusing to start.')
  }

  const secretFile = path.join(process.cwd(), '.jwt-secret')
  try {
    if (fs.existsSync(secretFile)) {
      const persisted = fs.readFileSync(secretFile, 'utf8').trim()
      if (persisted.length >= 24) return persisted
    }
    const generated = crypto.randomBytes(48).toString('base64url')
    fs.writeFileSync(secretFile, generated, { mode: 0o600 })
    console.warn('[auth] JWT_SECRET env missing — generated and persisted a random secret to .jwt-secret')
    return generated
  } catch {
    // read-only filesystem → ephemeral secret (sessions reset on restart)
    console.warn('[auth] JWT_SECRET env missing and secret file unwritable — using an ephemeral random secret')
    return crypto.randomBytes(48).toString('base64url')
  }
}

const JWT_SECRET = resolveJwtSecret()

const JWT_ISSUER = 'nexora'

export interface AuthUser {
  id: string
  businessId: string
  name: string
  email: string
  role: string
  businessSlug: string
  businessPlan: string
}

export interface JWTPayload {
  userId: string
  businessId: string
  email: string
  role: string
  /** mirrors User.tokenVersion — bump it to invalidate every issued token */
  tv?: number
  iat?: number
  exp?: number
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(user: AuthUser, tokenVersion = 0): string {
  return jwt.sign(
    {
      userId: user.id,
      businessId: user.businessId,
      email: user.email,
      role: user.role,
      tv: tokenVersion,
    },
    JWT_SECRET as string,
    { expiresIn: '7d', issuer: JWT_ISSUER }
  )
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET as string, { issuer: JWT_ISSUER }) as JWTPayload
  } catch {
    return null
  }
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const token = req.cookies.get('token')?.value || req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { business: { select: { id: true, slug: true, plan: true, isActive: true } } },
  })

  if (!user || !user.isActive || !user.business.isActive) return null

  // A token issued before the last password change (or a forced sign-out) is
  // no longer valid, even though its signature still checks out.
  if ((payload.tv ?? 0) !== user.tokenVersion) return null

  return {
    id: user.id,
    businessId: user.businessId,
    name: user.name,
    email: user.email,
    role: user.role,
    businessSlug: user.business.slug,
    businessPlan: user.business.plan,
  }
}

// Check if business is platform admin
export function isPlatformAdmin(user: AuthUser): boolean {
  return user.businessSlug === 'nexora-platform' && user.role === 'owner'
}

// Guard for admin API routes: returns the user only when it's a platform admin.
export async function requirePlatformAdmin(req: NextRequest): Promise<AuthUser | null> {
  const user = await getAuthUser(req)
  if (!user) return null
  if (!isPlatformAdmin(user)) return null
  return user
}

// Plan limits
export const PLAN_LIMITS = {
  free: { maxCustomers: 50, maxProducts: 30, maxUsers: 2, sms: false, ai: false, reports: false },
  pro: { maxCustomers: 500, maxProducts: 300, maxUsers: 10, sms: true, ai: true, reports: true },
  enterprise: { maxCustomers: -1, maxProducts: -1, maxUsers: -1, sms: true, ai: true, reports: true },
}

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free
}
