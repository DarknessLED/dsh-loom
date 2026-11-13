import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const ROOT = join(homedir(), '.dsh', 'loom', 'campaigns')
let rounds = 0, a1 = 0, a2 = 0, rescue = 0, noPromo = 0
const byArm = { a1: 0, a2: 0 }
for (const c of readdirSync(ROOT)) {
  const f = join(ROOT, c, 'views', 'state.json')
  if (!existsSync(f)) continue
  let s
  try { s = JSON.parse(readFileSync(f, 'utf8')) } catch { continue }
  for (const r of s.rounds ?? []) {
    rounds++
    const atts = r.attempts ?? []
    const ok = (a) => a?.verifier?.ok === true
    const passed = atts.filter(ok).map((a) => a.id ?? a.arm)
    if (r.promotedAttemptId) {
      const m = /a(\d+)$/.exec(r.promotedAttemptId)
      const arm = m ? `a${m[1]}` : '?'
      byArm[arm] = (byArm[arm] ?? 0) + 1
      if (arm === 'a1') a1++
      if (arm === 'a2') a2++
    } else noPromo++
    if (atts.length > 1 && ok(atts[0]) === false && ok(atts[1]) === true) rescue++
  }
}
console.log(JSON.stringify({ rounds, promoted: a1 + a2, a1, a2, noPromo, rescuedBySecond: rescue, byArm }))
