/**
 * Realistic 500-user benchmark — each virtual user pauses between requests
 * (think time), like a human clicking through the dashboard.
 *
 * Tight-loop benchmarks measure raw throughput; this one measures the
 * latency a real user actually experiences.
 *
 * Usage: node scripts/benchmark-realistic.cjs [users] [thinkMs] [durationSec]
 */

const http = require('http');

const HOST = 'localhost';
const PORT = 3100;
const USERS = parseInt(process.argv[2] || '500', 10);
const THINK_MS = parseInt(process.argv[3] || '2000', 10);
const DURATION_S = parseInt(process.argv[4] || '30', 10);

const agent = new http.Agent({ keepAlive: true, maxSockets: USERS });

function req(path, method = 'GET', body = null, cookie = null) {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const options = {
      hostname: HOST, port: PORT, path, method, agent,
      headers: { 'Content-Type': 'application/json' },
    };
    if (cookie) options.headers.Cookie = cookie;
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        let body = null;
        try { body = JSON.parse(data); } catch { /* html */ }
        resolve({ status: res.statusCode, ms, body });
      });
    });
    r.on('error', (err) => {
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      resolve({ status: 0, ms, error: err.code });
    });
    r.setTimeout(30000, () => r.destroy(new Error('timeout')));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function pct(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]);
}

const PAGES = [
  '/api/dashboard',
  '/api/customers?limit=20',
  '/api/products?limit=20',
  '/api/sales?limit=20',
  '/api/reports',
  '/api/auth/me',
];

async function main() {
  console.log(`\n=== Realistic benchmark — ${USERS} users, ${THINK_MS}ms think time, ${DURATION_S}s ===\n`);

  const accounts = [
    ['sara@modastyle.ir', 'demo123'],
    ['ali@digiland.ir', 'demo123'],
    ['admin@nexora.ir', 'admin123'],
  ];
  let cookie = null;
  for (const [email, password] of accounts) {
    const r = await req('/api/auth/login', 'POST', { email, password });
    if (r.status === 200) { cookie = `token=${r.body.token}`; break; }
    console.log(`  ${email} unavailable (${r.status}), trying next...`);
  }
  if (!cookie) throw new Error('all demo accounts rate-limited — restart the server');
  console.log('Authenticated.\n');

  const latencies = [];
  const byPage = new Map();
  let ok = 0, fail = 0;
  let stop = false;

  const start = Date.now();

  async function user() {
    while (!stop) {
      const path = PAGES[Math.floor(Math.random() * PAGES.length)];
      const r = await req(path, 'GET', null, cookie);
      latencies.push(r.ms);
      if (!byPage.has(path)) byPage.set(path, { n: 0, ok: 0, lat: [] });
      const s = byPage.get(path);
      s.n++;
      s.lat.push(r.ms);
      if (r.status >= 200 && r.status < 400) { ok++; s.ok++; } else fail++;

      // human pause
      await new Promise((res) => setTimeout(res, THINK_MS));
    }
  }

  const users = Array.from({ length: USERS }, () => user());

  const ticker = setInterval(() => {
    const el = Math.round((Date.now() - start) / 1000);
    process.stdout.write(`\r  ${el}s — ${latencies.length} requests`);
  }, 1000);

  await new Promise((r) => setTimeout(r, DURATION_S * 1000));
  stop = true;
  await Promise.all(users);
  clearInterval(ticker);

  const elapsed = Date.now() - start;
  const total = latencies.length;

  console.log(`\n\n=== Results ===`);
  console.log(`Users:           ${USERS} concurrent`);
  console.log(`Think time:      ${THINK_MS}ms between actions`);
  console.log(`Requests:        ${total} in ${(elapsed / 1000).toFixed(1)}s (${Math.round(total / (elapsed / 1000))} req/s)`);
  console.log(`Success:         ${ok} (${((ok / total) * 100).toFixed(1)}%)`);
  console.log(`Failed:          ${fail}`);
  console.log(`\nReal user latency:`);
  console.log(`  p50:  ${pct(latencies, 50)}ms`);
  console.log(`  p95:  ${pct(latencies, 95)}ms`);
  console.log(`  p99:  ${pct(latencies, 99)}ms`);
  console.log(`  max:  ${Math.round(Math.max(...latencies))}ms`);

  console.log(`\nPer page:`);
  for (const [path, s] of byPage) {
    console.log(`  ${path.padEnd(24)} n=${String(s.n).padStart(5)}  ok=${String(s.ok).padStart(5)}  p50=${pct(s.lat, 50)}ms  p95=${pct(s.lat, 95)}ms`);
  }

  agent.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
