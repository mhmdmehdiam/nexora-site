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
        try { resolve({ status: res.statusCode, body: JSON.parse(data), cookie: res.headers['set-cookie'] }); }
        catch { resolve({ status: res.statusCode, body: data, cookie: res.headers['set-cookie'] }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function run() {
  // 1. login as demo admin
  const loginRes = await req('/api/auth/login', 'POST', { email: 'admin@nexora.ir', password: 'admin123' });
  if (loginRes.status !== 200) {
    console.log('Login failed:', loginRes.status, loginRes.body);
    return;
  }
  const cookie = loginRes.cookie ? loginRes.cookie[0].split(';')[0] : '';
  console.log('Login OK, cookie:', cookie.slice(0, 30) + '...');

  // 2. verify /me
  const me = await req('/api/auth/me', 'GET', null, cookie);
  console.log('/me:', me.status, me.body.user?.email || me.body.error);

  // 3. load test — 20 concurrent requests to /api/auth/me
  const concurrent = 20;
  const start = Date.now();
  const reqs = Array.from({ length: concurrent }, () => req('/api/auth/me', 'GET', null, cookie));
  const results = await Promise.all(reqs);
  const elapsed = Date.now() - start;
  const ok = results.filter((r) => r.status === 200).length;
  console.log(`\nConcurrent /me test: ${concurrent} reqs in ${elapsed}ms | ${ok}/${concurrent} OK | avg ${Math.round(elapsed / concurrent)}ms`);

  // 4. sequential stress — 50 sequential requests
  let seqOk = 0;
  const seqStart = Date.now();
  for (let i = 0; i < 50; i++) {
    const r = await req('/api/auth/me', 'GET', null, cookie);
    if (r.status === 200) seqOk++;
  }
  const seqElapsed = Date.now() - seqStart;
  console.log(`Sequential /me test: 50 reqs in ${seqElapsed}ms | ${seqOk}/50 OK | avg ${Math.round(seqElapsed / 50)}ms`);

  // 5. try a heavier dashboard endpoint if it exists
  const customers = await req('/api/dashboard/customers', 'GET', null, cookie);
  console.log('\n/dashboard/customers:', customers.status, typeof customers.body === 'string' ? customers.body.slice(0, 60) : JSON.stringify(customers.body).slice(0, 80));

  // 6. landing page concurrent load (static)
  const landStart = Date.now();
  const landReqs = Array.from({ length: 10 }, () => req('/'));
  const landRes = await Promise.all(landReqs);
  const landOk = landRes.filter((r) => r.status === 200).length;
  console.log(`\nLanding concurrent: 10 reqs in ${Date.now() - landStart}ms | ${landOk}/10 OK`);
}

run().catch(console.error);
