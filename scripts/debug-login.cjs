const http = require('http');

function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3100,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
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
  console.log('Login status:', login.status);
  console.log('Headers:', JSON.stringify(login.headers, null, 2));
  console.log('Body:', JSON.stringify(login.body, null, 2));
}

run();
