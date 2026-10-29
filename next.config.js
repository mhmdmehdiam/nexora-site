/** @type {import('next').NextConfig} */
// DEPLOY_FAST=1: hosted sandboxes type-check separately (tsc in CI/tests);
// skipping in-build ts/eslint + fewer workers keeps the sandbox build alive.
const fast = process.env.DEPLOY_FAST === '1'

const nextConfig = {
  // Allow overriding the build dir so a stale `.next` can be left untouched.
  // Defaults to `.next` when NEXT_DIST_DIR is not set.
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // --- production hardening / scale ---
  poweredByHeader: false, // don't advertise the stack
  compress: true, // gzip/brotli responses
  reactStrictMode: true,

  experimental: {
    // Trim the client bundle: these libs are large and only used in a few pages.
    optimizePackageImports: ['recharts', 'gsap', 'three', 'date-fns', 'lucide-react'],
    // Runs src/instrumentation.ts once per server process — installs the
    // unhandled-rejection / uncaught-exception handlers that feed the logger.
    instrumentationHook: true,
    // fewer build workers inside resource-limited sandboxes
    ...(fast ? { cpus: 2 } : {}),
  },

  ...(fast
    ? {
        typescript: { ignoreBuildErrors: true },
        eslint: { ignoreDuringBuilds: true },
      }
    : {}),

  async rewrites() {
    // Route handlers live under /rpc (hosting packers sometimes strip /api
    // segments); the public surface stays /api/* exactly as before.
    return [{ source: '/api/:path*', destination: '/rpc/:path*' }]
  },
}

module.exports = nextConfig
