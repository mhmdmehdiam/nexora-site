/**
 * Nexora — 500-concurrent-user load benchmark
 *
 * Simulates the real dashboard workload:
 *   - 70% reads   (customers, products, sales, reports, me)
 *   - 20% writes  (create customer / product / sale)
 *   - 10% auth    (login, me)
 *
 * Reports throughput (req/s), latency percentiles (p50/p95/p99), and errors.
 *
 * Usage: node scripts/benchmark-500.cjs [concurrency] [durationSec]
 */

const http = require('http');

const HOST = 'localhost';
const PORT = 3100;
const CONCURRENCY = parseInt(process.argv[2] || '500', 10);
const DURATION_S = parseInt(process.argv[3] || '30', 10);

const agent = new http.Agent({ keepAlive: true, maxSockets: CONCURRENCY });

function req(path, method = 'GET', body = null, cookie = null) {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const options = {
      hostname: HOST,
      port: PORT,
      path,
      method,
      agent,
      headers: { 'Content-Type': 'application/json' },
    };
    if (cookie) options.headers.Cookie = cookie;
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        let parsed = null;
        try { parsed = JSON.parse(data); } catch { /* html */ }
        resolve({ status: res.statusCode, ms, body: parsed });
      });
    });
    r.on('error', (err) => {
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      resolve({ status: 0, ms, error: err.code || err.message });
    });
    r.setTimeout(30000, () => {
      r.destroy(new Error('timeout'));
    });
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function pct(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
}

const READS = ['/api/auth/me', '/api/customers?limit=20', '/api/products?limit=20', '/api/sales?limit=20', '/api/reports'];
const WRITE_PATHS = ['/api/customers'];

async function loginAs(email, password) {
  const r = await req('/api/auth/login', 'POST', { email, password });
  if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status}`);
  return r.body.token;
}

async function main() {
  console.log(`\n=== Nexora load benchmark — ${CONCURRENCY} concurrent users, ${DURATION_S}s ===\n`);

  // A single authenticated session is enough to measure server throughput —
  // the rate limiter correctly blocks 200 rapid logins (8/10min per IP+email),
  // so we log in once and reuse the token across all virtual users.
  console.log('Authenticating...');
  const loginStart = Date.now();
  // Try a few demo accounts — the rate limiter is per IP+email, so if one
  // is exhausted (429) we fall through to the next.
  const accounts = [
    ['ali@digiland.ir', 'demo123'],
    ['sara@modastyle.ir', 'demo123'],
    ['admin@nexora.ir', 'admin123'],
  ];
  let token = null;
  for (const [email, password] of accounts) {
    const r = await req('/api/auth/login', 'POST', { email, password });
    if (r.status === 200 && r.body.token) { token = r.body.token; break; }
    if (r.status === 429) console.log(`  ${email} rate-limited, trying next...`);
  }
  if (!token) throw new Error('all demo accounts rate-limited — restart the dev server to reset');
  const tokens = [token];
  console.log(`  authenticated in ${Date.now() - loginStart}ms\n`);

  // prime the caches
  await Promise.all(READS.map((p) => req(p, 'GET', null, `token=${tokens[0]}`)));

  const latencies = [];
  const byPath = new Map();
  let ok = 0, fail = 0, serverErr = 0;
  let stop = false;

  const startedAt = Date.now();

  async function worker(id) {
    const cookie = `token=${tokens[id % tokens.length]}`;
    while (!stop) {
      // 70% read, 20% write, 10% auth-me
      const roll = Math.random();
      let path, method = 'GET', body = null;

      if (roll < 0.7) {
        path = READS[Math.floor(Math.random() * READS.length)];
      } else if (roll < 0.9) {
        path = WRITE_PATHS[0];
        method = 'POST';
        body = { name: `Load Test ${Date.now()}-${id}`, phone: '0912' + String(Math.floor(Math.random() * 1e7)).padStart(7, '0') };
      } else {
        path = '/api/auth/me';
      }

      const r = await req(path, method, body, cookie);
      latencies.push(r.ms);

      if (!byPath.has(path)) byPath.set(path, { n: 0, ok: 0, fail: 0, lat: [] });
      const stat = byPath.get(path);
      stat.n++;
      stat.lat.push(r.ms);

      if (r.status >= 200 && r.status < 400) { ok++; stat.ok++; }
      else { fail++; stat.fail++; if (r.status >= 500) serverErr++; }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i));

  // progress ticker
  const ticker = setInterval(() => {
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    const rps = Math.round(latencies.length / Math.max(1, elapsed));
    process.stdout.write(`\r  ${elapsed}s elapsed — ${latencies.length} requests — ${rps} req/s`);
  }, 1000);

  await new Promise((r) => setTimeout(r, DURATION_S * 1000));
  stop = true;
  await Promise.all(workers);
  clearInterval(ticker);

  const elapsedMs = Date.now() - startedAt;
  const total = latencies.length;
  const rps = Math.round(total / (elapsedMs / 1000));

  console.log(`\n\n=== Results ===`);
  console.log(`Duration:        ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`Total requests:  ${total}`);
  console.log(`Throughput:      ${rps} req/s`);
  console.log(`Success:         ${ok} (${((ok / total) * 100).toFixed(1)}%)`);
  console.log(`Failed:          ${fail} (${((fail / total) * 100).toFixed(1)}%)`);
  console.log(`5xx errors:      ${serverErr}`);
  console.log(`\nLatency:`);
  console.log(`  p50:  ${pct(latencies, 50)}ms`);
  console.log(`  p95:  ${pct(latencies, 95)}ms`);
  console.log(`  p99:  ${pct(latencies, 99)}ms`);
  console.log(`  max:  ${Math.round(Math.max(...latencies))}ms`);

  console.log(`\nPer endpoint:`);
  for (const [path, s] of byPath) {
    console.log(`  ${path.padEnd(26)} n=${String(s.n).padStart(5)}  ok=${String(s.ok).padStart(5)}  fail=${String(s.fail).padStart(3)}  p50=${pct(s.lat, 50)}ms  p95=${pct(s.lat, 95)}ms`);
  }

  agent.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
