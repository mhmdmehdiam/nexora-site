const fs = require('fs')
const path = require('path')

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    const s = fs.statSync(p)
    if (s.isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(p)) out.push(p)
  }
  return out
}

const files = [...walk('src/app/admin'), ...walk('src/app/dashboard')]

// A closing quote immediately followed by a statement keyword means the
// newline between them was swallowed. Put it back.
const KEYWORDS =
  'import|export|const|let|var|function|interface|type|async|class|if|for|return|switch|try|while|throw|new'
const rule = new RegExp(
  `([A-Za-z0-9_}\\])])(['"])(?=(?:${KEYWORDS})\\b)`,
  'g'
)

let changed = 0
for (const f of files) {
  const before = fs.readFileSync(f, 'utf8')
  let after = before.replace(rule, (_m, pre, q) => `${pre}${q}\n\n`)
  if (after !== before) {
    fs.writeFileSync(f, after)
    changed++
  }
}
console.log('repaired boundaries in', changed, 'files')
