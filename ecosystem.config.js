/**
 * PM2 cluster config — horizontal scaling for Nexora.
 *
 * Each worker is a full Next.js server sharing the same port via Node's
 * cluster module (round-robin). PostgreSQL sees `instances × connection_limit`
 * connections; with 4 workers × 30 = 120, well under the 300 max.
 *
 * Usage:
 *   npm run build:prod              # build into .next-prod
 *   npx pm2 start ecosystem.config.js
 *   npx pm2 logs nexora
 *   npx pm2 monit                   # live CPU / memory per worker
 *   npx pm2 delete nexora
 *
 * Scale without downtime:
 *   npx pm2 scale nexora 8
 */

const path = require('path')

module.exports = {
  apps: [
    {
      name: 'nexora',
      // Absolute path — PM2 resolves relative script paths against its own
      // cwd, which breaks when the daemon is started from another folder.
      script: path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next'),
      args: 'start -p 3100',
      cwd: __dirname,

      // --- cluster mode ---
      exec_mode: 'cluster',
      // 4 workers is the sweet spot for 500–2000 users; raise with
      // `pm2 scale nexora N` when you add more CPU.
      instances: 4,

      // --- environment ---
      env: {
        NODE_ENV: 'production',
        PORT: '3100',
      },

      // --- resilience ---
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      max_memory_restart: '900M', // recycle a worker before it bloats
      kill_timeout: 5000, // let in-flight requests finish

      // --- logs ---
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '.pm2/error.log',
      out_file: '.pm2/out.log',
      merge_logs: true,

      // --- graceful shutdown ---
      wait_ready: false,
      listen_timeout: 10000,
    },
  ],
}
