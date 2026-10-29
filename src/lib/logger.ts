/**
 * Structured logging + optional error forwarding.
 *
 * Design goals:
 *   1. ALWAYS work — even with zero configuration. Every log line goes to
 *      stdout as JSON, which every platform (Docker, PM2, Vercel, Railway)
 *      already collects.
 *   2. Forward to Sentry when SENTRY_DSN is set — without pulling in the
 *      ~2MB @sentry/nextjs SDK. Sentry's ingest API is a plain HTTP POST,
 *      which is all a server-side logger needs.
 *   3. Forward to Better Stack / Logtail when LOGTAIL_TOKEN is set.
 *
 * Nothing here throws: a logging failure must never take down a request.
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

const SERVICE = 'nexora'
const ENV = process.env.NODE_ENV || 'development'

/* ------------------------------------------------------------------ */
/* Sentry DSN parsing                                                  */
/* ------------------------------------------------------------------ */

interface SentryTarget {
  url: string
  auth: string
}

function parseSentryDsn(dsn: string): SentryTarget | null {
  try {
    // https://{publicKey}@{host}/{projectId}
    const u = new URL(dsn)
    const publicKey = u.username
    const projectId = u.pathname.replace(/^\//, '')
    if (!publicKey || !projectId) return null
    return {
      url: `${u.protocol}//${u.host}/api/${projectId}/store/`,
      auth: `Sentry sentry_version=7, sentry_client=${SERVICE}/1.0, sentry_key=${publicKey}`,
    }
  } catch {
    return null
  }
}

const sentry = process.env.SENTRY_DSN ? parseSentryDsn(process.env.SENTRY_DSN) : null

/* ------------------------------------------------------------------ */
/* Core write                                                          */
/* ------------------------------------------------------------------ */

function write(level: Level, message: string, context?: LogContext) {
  const line = {
    ts: new Date().toISOString(),
    level,
    service: SERVICE,
    env: ENV,
    msg: message,
    ...(context || {}),
  }

  // stdout — the universal sink
  const out = level === 'error' || level === 'warn' ? process.stderr : process.stdout
  try {
    out.write(JSON.stringify(line) + '\n')
  } catch {
    /* never throw from a logger */
  }

  // Logtail / Better Stack
  const logtail = process.env.LOGTAIL_TOKEN
  if (logtail) {
    fetch('https://in.logtail.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${logtail}`,
      },
      body: JSON.stringify(line),
    }).catch(() => {})
  }
}

/* ------------------------------------------------------------------ */
/* Sentry event                                                        */
/* ------------------------------------------------------------------ */

function sendToSentry(level: Level, message: string, error?: unknown, context?: LogContext) {
  if (!sentry) return

  const err = error instanceof Error ? error : null
  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    platform: 'node',
    level: level === 'warn' ? 'warning' : level,
    server_name: process.env.HOSTNAME || 'nexora',
    environment: ENV,
    logger: SERVICE,
    message: err ? undefined : message,
    exception: err
      ? {
          values: [
            {
              type: err.name || 'Error',
              value: err.message,
              stacktrace: err.stack
                ? { frames: err.stack.split('\n').slice(0, 20).map((l) => ({ filename: l.trim() })) }
                : undefined,
            },
          ],
        }
      : undefined,
    extra: { ...(context || {}), raw: err ? String(error) : undefined },
  }

  fetch(sentry.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': sentry.auth,
    },
    body: JSON.stringify(event),
  }).catch(() => {})
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export const log = {
  debug: (msg: string, ctx?: LogContext) => write('debug', msg, ctx),
  info: (msg: string, ctx?: LogContext) => write('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext) => {
    write('warn', msg, ctx)
    sendToSentry('warn', msg, undefined, ctx)
  },
  error: (msg: string, error?: unknown, ctx?: LogContext) => {
    const detail =
      error instanceof Error
        ? {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack?.split('\n').slice(0, 6).join('\n'),
          }
        : error !== undefined && error !== null
          ? { error: String(error) }
          : {}
    write('error', msg, { ...ctx, ...detail })
    sendToSentry('error', msg, error, ctx)
  },
}

/** True when at least one remote sink is configured. */
export const remoteLoggingEnabled = Boolean(sentry || process.env.LOGTAIL_TOKEN)
