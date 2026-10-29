/**
 * Next.js instrumentation hook — runs once per server process, before the
 * first request. Used to install process-level error handlers so crashes
 * that escape a route handler still reach the logger (and Sentry).
 *
 * Requires `experimental.instrumentationHook: true` in next.config.js
 * (Next.js 14).
 */

/**
 * Config sanity checks.
 *
 * These catch the mistakes that do not crash anything — they just quietly
 * break one feature in production, which is worse than a crash because nobody
 * notices until a user complains. Each one is a warning, never a throw: a
 * misconfigured OAuth client must not take the whole site down.
 */
function checkConfig(log: {
  warn: (msg: string, ctx?: Record<string, unknown>) => void
}): void {
  const isProd = process.env.NODE_ENV === 'production'
  const base = (process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  )

  if (!base && isProd) {
    log.warn('config: base_url_missing', {
      detail:
        'Neither PUBLIC_BASE_URL nor NEXT_PUBLIC_SITE_URL is set. Canonical URLs, the ' +
        'sitemap, OG images and the payment callback will all point at localhost.',
    })
  }

  if (!googleConfigured) return

  if (!base) {
    log.warn('config: google_oauth_without_base_url', {
      detail:
        'GOOGLE_CLIENT_ID is set but no base URL is configured. The redirect URI falls ' +
        'back to the request origin, which behind nginx or the worker cluster is an ' +
        'internal port — Google answers redirect_uri_mismatch.',
    })
    return
  }

  if (isProd && /localhost|127\.0\.0\.1/.test(base)) {
    log.warn('config: google_oauth_points_at_localhost', {
      detail:
        `PUBLIC_BASE_URL is "${base}" in production, so Google sign-in will send users ` +
        `there. Set it to the public domain and add ` +
        `${base.replace(/\/+$/, '')}/api/auth/google/callback to the OAuth client's ` +
        'authorized redirect URIs.',
    })
  }
}

/**
 * Security posture at boot.
 *
 * Everything here is a misconfiguration that still lets the server start. That
 * is exactly the dangerous category: a site can look healthy, serve traffic,
 * and be wide open.
 */
function checkSecurity(log: {
  warn: (msg: string, ctx?: Record<string, unknown>) => void
  info: (msg: string, ctx?: Record<string, unknown>) => void
}): void {
  const isProd = process.env.NODE_ENV === 'production'
  if (!isProd) return

  if (!process.env.DATABASE_URL) {
    log.warn('security: database_url_missing', {
      detail: 'DATABASE_URL is unset — every query will fail at runtime.',
    })
  }

  /* JWT secret.
   *
   * auth.ts refuses to boot on a short or placeholder secret, so anything that
   * reaches here is absent or long. Absent is still a problem: the library
   * then generates a random secret per process. Behind the 4-worker cluster
   * that means four different signing keys, so a token issued by one worker is
   * rejected by the next — sessions break at random, and every restart logs
   * everyone out.
   */
  const jwt = process.env.JWT_SECRET
  if (!jwt) {
    log.warn('security: jwt_secret_missing', {
      detail:
        'JWT_SECRET is unset in production. A per-process random secret will be generated, ' +
        'so with more than one worker sessions fail intermittently and every restart logs ' +
        'all users out. Generate one: ' +
        "node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
    })
  } else if (jwt.length < 32) {
    log.warn('security: jwt_secret_short', {
      detail: `JWT_SECRET is ${jwt.length} characters. 32+ is the floor for HS256; 48+ is better.`,
    })
  }

  /* Password reset without SMTP.
   *
   * email.ts falls back to a mock that logs the link instead of sending it.
   * Fine in development, a silent dead end in production: the user waits for
   * a mail that never arrives and support has no idea why.
   */
  if (!process.env.SMTP_HOST) {
    log.warn('security: smtp_missing', {
      detail:
        'SMTP_HOST is unset — password-reset and verification mail will be written to the ' +
        'log instead of sent. Users who forget their password cannot recover the account.',
    })
  }

  /* Demo tenants.
   *
   * seed.ts already refuses to create demo users in production unless asked.
   * If someone asks anyway, the accounts have published passwords.
   */
  if (process.env.SEED_DEMO === '1') {
    log.warn('security: demo_seed_enabled', {
      detail:
        'SEED_DEMO=1 in production. Demo accounts use a well-known password — delete them ' +
        'or set SEED_DEMO=0 before going live.',
    })
  }

  log.info('security_posture', {
    jwtSecret: Boolean(jwt),
    smtp: Boolean(process.env.SMTP_HOST),
    googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    sentry: Boolean(process.env.SENTRY_DSN),
    rateLimitStore: 'postgres',
  })
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // dynamic import keeps the logger out of the edge bundle
  const { log } = await import('./lib/logger')

  checkConfig(log)
  checkSecurity(log)

  process.on('unhandledRejection', (reason) => {
    log.error('unhandledRejection', reason, { pid: process.pid })
  })

  process.on('uncaughtException', (err) => {
    log.error('uncaughtException', err, { pid: process.pid })
    // do NOT exit — Next.js keeps serving other requests; the crash is logged
  })

  log.info('server_started', {
    pid: process.pid,
    node: process.version,
    env: process.env.NODE_ENV,
    remoteLogging: Boolean(process.env.SENTRY_DSN || process.env.LOGTAIL_TOKEN),
  })
}
