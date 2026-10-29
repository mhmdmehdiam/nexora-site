const http = require('http');

function req(path, method, body, cookie) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost', port: 3100, path, method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (cookie) options.headers.Cookie = cookie;
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function run() {
  const login = await req('/api/auth/login', 'POST', { email: 'admin@nexora.ir', password: 'admin123' });
  const cookie = login.headers['set-cookie'][0].split(';')[0];

  // single write
  const body = { customerId: 'demo', items: [{ productId: 'demo', quantity: 1, price: 100000 }] };
  const single = await req('/api/sales', 'POST', body, cookie);
  console.log('Single write status:', single.status);
  console.log('Body:', JSON.stringify(single.body, null, 2));

  // two concurrent
  const [a, b] = await Promise.all([
    req('/api/sales', 'POST', body, cookie),
    req('/api/sales', 'POST', body, cookie),
  ]);
  console.log('Concurrent #1:', a.status, a.body.error || 'OK');
  console.log('Concurrent #2:', b.status, b.body.error || 'OK');
}

run();
