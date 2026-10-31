// Fails if any interface string or glossary entry exists in one language but not the other.
import { T } from '../site/i18n/strings.js'
import { GLOSSARY } from '../site/i18n/glossary.js'

function keys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

let failed = false
for (const [name, table] of [
  ['strings', T],
  ['glossary', GLOSSARY],
]) {
  const vi = new Set(keys(table.vi))
  const en = new Set(keys(table.en))
  const onlyVi = [...vi].filter((k) => !en.has(k))
  const onlyEn = [...en].filter((k) => !vi.has(k))
  if (onlyVi.length || onlyEn.length) {
    failed = true
    console.log(`${name}: only in vi → ${onlyVi.join(', ') || '-'}; only in en → ${onlyEn.join(', ') || '-'}`)
  } else console.log(`${name}: ${vi.size} keys, both languages match`)
}
process.exit(failed ? 1 : 0)
