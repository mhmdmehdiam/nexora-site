// One-off smoke test for the admin panel APIs.
const BASE = 'http://localhost:3100'

async function login(email, password) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const d = await r.json()
  return d.token
}

const main = async () => {
  const adminToken = await login('admin@nexora.ir', 'admin123')
  const H = { Cookie: `token=${adminToken}`, 'Content-Type': 'application/json' }

  // 1) read content, tweak hero badge, save
  const c = await (await fetch(`${BASE}/api/admin/content`, { headers: H })).json()
  const original = c.content.hero.badge
  c.content.hero.badge = 'ویرایش شد از پنل مدیریت ✅'
  const put = await fetch(`${BASE}/api/admin/content`, { method: 'PUT', headers: H, body: JSON.stringify({ content: c.content }) })
  console.log('PUT content ->', put.status)

  const pub = await (await fetch(`${BASE}/api/site/content`)).json()
  console.log('public badge now =', pub.content.hero.badge)

  // restore
  c.content.hero.badge = original
  await fetch(`${BASE}/api/admin/content`, { method: 'PUT', headers: H, body: JSON.stringify({ content: c.content }) })

  // 2) create a post
  const p = await fetch(`${BASE}/api/admin/posts`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ title: 'اولین مقاله تست', content: 'محتوای آزمایشی', status: 'published', category: 'عمومی' }),
  })
  const pj = await p.json()
  console.log('POST post ->', p.status, pj.post ? `id=${pj.post.id} slug=${pj.post.slug}` : JSON.stringify(pj))

  // 3) update settings
  const s = await fetch(`${BASE}/api/admin/settings`, { method: 'PUT', headers: H, body: JSON.stringify({ settings: { platform_name: 'نکسورا' } }) })
  console.log('PUT settings ->', s.status)

  // 4) non-admin must be blocked
  const userToken = await login('ali@digiland.ir', 'demo123')
  const blocked = await fetch(`${BASE}/api/admin/stats`, { headers: { Cookie: `token=${userToken}` } })
  console.log('non-admin GET /api/admin/stats ->', blocked.status, '(expected 401)')

  // 5) unauthenticated must be blocked
  const anon = await fetch(`${BASE}/api/admin/stats`)
  console.log('anonymous GET /api/admin/stats ->', anon.status, '(expected 401)')
}

main().catch(e => { console.error('SMOKE ERROR', e); process.exit(1) })
