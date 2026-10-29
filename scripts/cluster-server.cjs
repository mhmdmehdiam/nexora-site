/**
 * Nexora cluster — 4 Next.js workers behind a round-robin reverse proxy.
 *
 * Why not PM2? On Windows, PM2's cluster mode starts each worker in a
 * context where Next.js can't resolve the project root, so every worker
 * crashes with "Could not find a production build". This script uses
 * plain child processes instead — the same horizontal-scaling model,
 * fully portable, and it works in sandboxed environments.
 *
 * Topology:
 *   :3100  reverse proxy (public)
 *     ├── :3101  Next.js worker 1
 *     ├── :3102  Next.js worker 2
 *     ├── :3103  Next.js worker 3
 *     └── :3104  Next.js worker 4
 *
 * Each worker is a full Next.js server with its own Prisma pool
 * (connection_limit=30 → 4 × 30 = 120 connections, under PG's 300).
 *
 * Usage:
 *   npm run build          # build into .next
 *   node scripts/cluster-server.cjs [workers]
 */

const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const WORKERS = parseInt(process.argv[2] || '4', 10)
const BASE_PORT = 3101
const PUBLIC_PORT = 3100

const NEXT_BIN = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next')

const children = []
const ready = new Set()

function startWorker(i) {
  const port = BASE_PORT + i
  const child = spawn(process.execPath, [NEXT_BIN, 'start', '-p', String(port)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production' },
  })

  child.stdout.on('data', (buf) => {
    const text = buf.toString()
    process.stdout.write(`[w${i + 1}] ${text}`)
    if (text.includes('Ready') || text.includes('started server')) ready.add(port)
  })
  child.stderr.on('data', (buf) => process.stderr.write(`[w${i + 1}] ${buf}`))

  child.on('exit', (code) => {
    ready.delete(port)
    console.error(`[w${i + 1}] exited with ${code} — restarting in 2s`)
    setTimeout(() => startWorker(i), 2000)
  })

  children.push(child)
}

for (let i = 0; i < WORKERS; i++) startWorker(i)

/* ---------- round-robin reverse proxy ---------- */
let cursor = 0
const agent = new http.Agent({ keepAlive: true, maxSockets: 512 })

const proxy = http.createServer((req, res) => {
  // try each worker until one is ready
  let attempts = 0
  const forward = () => {
    const port = BASE_PORT + (cursor++ % WORKERS)
    if (!ready.has(port) && attempts < WORKERS) {
      attempts++
      return forward()
    }

    const upstream = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: `localhost:${PUBLIC_PORT}`,
          // Workers see their own port in req.nextUrl — forward the public
          // host so redirects and gateway callbacks point back at the proxy.
          'x-forwarded-host': req.headers.host || `localhost:${PUBLIC_PORT}`,
          'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'http',
        },
        agent,
      },
      (up) => {
        res.writeHead(up.statusCode || 502, up.headers)
        up.pipe(res)
      }
    )

    upstream.on('error', () => {
      if (attempts++ < WORKERS) return forward()
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' })
      res.end('upstream unavailable')
    })

    req.pipe(upstream)
  }
  forward()
})

proxy.listen(PUBLIC_PORT, () => {
  console.log(`\n  Nexora cluster ready`)
  console.log(`  proxy  → http://localhost:${PUBLIC_PORT}`)
  console.log(`  workers → ${Array.from({ length: WORKERS }, (_, i) => BASE_PORT + i).join(', ')}\n`)
})

function shutdown() {
  console.log('\nshutting down workers…')
  children.forEach((c) => c.kill('SIGTERM'))
  proxy.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 3000)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
