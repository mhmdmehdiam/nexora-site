const http = require('http');

const HOST = 'localhost';
const PORT = 3100;

function req(path, method = 'GET', body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (cookie) options.headers.Cookie = cookie;
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data), len: data.length }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: data.slice(0, 120), len: data.length }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function burst(path, count, cookie) {
  const start = Date.now();
  const reqs = Array.from({ length: count }, () => req(path, 'GET', null, cookie));
  const results = await Promise.all(reqs);
  const elapsed = Date.now() - start;
  const ok = results.filter((r) => r.status === 200).length;
  return { path, count, elapsed, ok, avg: Math.round(elapsed / count) };
}

async function seq(path, count, cookie) {
  const start = Date.now();
  let ok = 0;
  for (let i = 0; i < count; i++) {
    const r = await req(path, 'GET', null, cookie);
    if (r.status === 200) ok++;
  }
  return { path, count, elapsed: Date.now() - start, ok, avg: Math.round((Date.now() - start) / count) };
}

async function run() {
  const login = await req('/api/auth/login', 'POST', { email: 'admin@nexora.ir', password: 'admin123' });
  if (login.status !== 200) { console.log('Login fail', login.status); return; }
  const cookie = login.headers['set-cookie'][0].split(';')[0];

  console.log('=== Burst tests (concurrent) ===');
  for (const endpoint of ['/api/auth/me', '/api/customers', '/api/products', '/api/sales', '/api/reports']) {
    const r = await burst(endpoint, 15, cookie);
    console.log(`${r.path}: ${r.count} concurrent → ${r.elapsed}ms | ${r.ok}/${r.count} OK | avg ${r.avg}ms`);
  }

  console.log('\n=== Sequential tests (1-by-1) ===');
  for (const endpoint of ['/api/customers', '/api/products', '/api/sales']) {
    const r = await seq(endpoint, 20, cookie);
    console.log(`${r.path}: ${r.count} seq → ${r.elapsed}ms | ${r.ok}/${r.count} OK | avg ${r.avg}ms`);
  }

  // write-heavy test: simulate many users adding sales simultaneously
  console.log('\n=== Write stress (20 concurrent sale creates) ===');
  const body = { customerId: 'demo', items: [{ productId: 'demo', quantity: 1, price: 100000 }] };
  const wStart = Date.now();
  const writes = Array.from({ length: 20 }, () => req('/api/sales', 'POST', body, cookie));
  const wRes = await Promise.all(writes);
  const wOk = wRes.filter((r) => r.status === 200 || r.status === 201).length;
  console.log(`POST /api/sales: 20 concurrent → ${Date.now() - wStart}ms | ${wOk}/20 OK`);
}

run().catch(console.error);
