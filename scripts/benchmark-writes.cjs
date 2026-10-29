/**
 * Write-stress benchmark — concurrent sale creation (the heaviest write path).
 * Verifies that PostgreSQL handles many simultaneous transactions with the
 * invoice-number retry loop in place.
 */

const http = require('http');

const HOST = 'localhost';
const PORT = 3100;
const CONCURRENCY = parseInt(process.argv[2] || '50', 10);
const ROUNDS = parseInt(process.argv[3] || '4', 10);

const agent = new http.Agent({ keepAlive: true, maxSockets: CONCURRENCY });

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
        let parsed = null;
        try { parsed = JSON.parse(data); } catch { /* html */ }
        resolve({ status: res.statusCode, ms, body: parsed });
      });
    });
    r.on('error', (err) => resolve({ status: 0, ms: 0, error: err.code }));
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

async function main() {
  console.log(`\n=== Write stress — ${CONCURRENCY} concurrent sale creates × ${ROUNDS} rounds ===\n`);

  // Demo businesses (digiland / modastyle) own the seed customers+products;
  // the platform admin account is empty, so try the demo tenants first.
  const accounts = [
    ['ali@digiland.ir', 'demo123'],
    ['sara@modastyle.ir', 'demo123'],
    ['admin@nexora.ir', 'admin123'],
  ];
  let cookie = null;
  let customerId = null;
  let productId = null;
  for (const [email, password] of accounts) {
    const r = await req('/api/auth/login', 'POST', { email, password });
    if (r.status !== 200) continue;
    const ck = `token=${r.body.token}`;
    const customers = await req('/api/customers?limit=1', 'GET', null, ck);
    const products = await req('/api/products?limit=1', 'GET', null, ck);
    const cid = customers.body?.customers?.[0]?.id;
    const pid = products.body?.products?.[0]?.id;
    if (cid && pid) {
      cookie = ck; customerId = cid; productId = pid;
      console.log(`Logged in as ${email}`);
      break;
    }
  }
  if (!cookie) throw new Error('no demo business with seed data');

  console.log(`Using customer=${customerId.slice(0, 8)}… product=${productId.slice(0, 8)}…\n`);

  const latencies = [];
  let ok = 0, fail = 0;
  const errors = new Map();

  for (let round = 0; round < ROUNDS; round++) {
    const started = Date.now();
    const calls = Array.from({ length: CONCURRENCY }, (_, i) =>
      req('/api/sales', 'POST', {
        customerId,
        items: [{ productId, quantity: 1, unitPrice: 100000 }],
        paidAmount: 100000,
        paymentMethod: 'cash',
      }, cookie)
    );
    const results = await Promise.all(calls);
    const elapsed = Date.now() - started;

    let roundOk = 0;
    for (const r of results) {
      latencies.push(r.ms);
      if (r.status === 201) { ok++; roundOk++; }
      else {
        fail++;
        const key = r.body?.error || r.error || `HTTP ${r.status}`;
        errors.set(key, (errors.get(key) || 0) + 1);
      }
    }
    console.log(`  round ${round + 1}: ${roundOk}/${CONCURRENCY} created in ${elapsed}ms (${Math.round(CONCURRENCY / (elapsed / 1000))} writes/s)`);
  }

  console.log(`\n=== Results ===`);
  console.log(`Total writes:  ${ok + fail}`);
  console.log(`Succeeded:     ${ok} (${((ok / (ok + fail)) * 100).toFixed(1)}%)`);
  console.log(`Failed:        ${fail}`);
  console.log(`\nLatency:`);
  console.log(`  p50:  ${pct(latencies, 50)}ms`);
  console.log(`  p95:  ${pct(latencies, 95)}ms`);
  console.log(`  p99:  ${pct(latencies, 99)}ms`);
  console.log(`  max:  ${Math.round(Math.max(...latencies))}ms`);

  if (errors.size) {
    console.log(`\nErrors:`);
    for (const [msg, n] of errors) console.log(`  ${n}× ${msg}`);
  }

  agent.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
