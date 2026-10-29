// PM2 process config — Nexora production
// Usage: pm2 start deploy/ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: 'nexora',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: __dirname + '/..',
      // the platform injects PORT; PM2 passes it through to Next
      env: {
        NODE_ENV: 'production',
        NEXT_DIST_DIR: '.next',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '600M',
      // keep logs in one place
      out_file: './logs/out.log',
      error_file: './logs/err.log',
      merge_logs: true,
      time: true,
    },
  ],
}
