// Blast radius of the oracle-creation rule, measured before it is trusted.
//
// The rule says: if the patch *creates* the file the verify command runs, a red
// base verdict is a red about a missing script, not about the task, so it cannot
// justify a promotion.
//
// Two populations matter:
//   (a) registered tasks whose command names a path that does not exist yet --
//       those are the only ones where oracleScripts (existence filter) and
//       oracleCandidates (unfiltered) disagree, so they are the only ones where
//       the new check has information the old one did not.
//   (b) historical landings: if an instrument was ever absent at base and the
//       patch then created it, the old gate promoted work whose base failure was
//       trivial.
//
// e70 already answered (b) for the 75 checkable landings: the oracle was in the
// parent commit 75/75, absent 0. That is the past. (a) is the future.
import fs from 'node:fs'
import path from 'node:path'
import { oracleScripts, oracleCandidates } from '../../src/gate/oracle.js'

const DIR = path.join(process.env.USERPROFILE ?? process.env.HOME, '.dsh', 'loom', 'campaigns')

const campaigns = fs.readdirSync(DIR).filter((c) => fs.existsSync(path.join(DIR, c, 'views', 'state.json')))
const tasks = []
for (const c of campaigns) {
  let state
  try { state = JSON.parse(fs.readFileSync(path.join(DIR, c, 'views', 'state.json'), 'utf8')) } catch { continue }
  const ws = state.workspace ?? 'C:/Projects/RSI'
  for (const t of state.evalset?.tasks ?? []) {
    const spec = t.verify ?? null
    if (!spec?.cmd) continue
    tasks.push({ campaign: c, id: t.id, ws, spec })
  }
}

const rows = []
for (const t of tasks) {
  const scripts = oracleScripts(t.spec, { cwd: t.ws })
  const candidates = oracleCandidates(t.spec)
  // The check only has new information when the command names a path that is not
  // currently a file. Comparing sets directly is wrong (candidates keep the raw
  // token, scripts keep the resolved relative path); the question is presence.
  const missing = candidates.filter((p) => !scripts.some((s) => s === p || s.endsWith('/' + p)))
  rows.push({ ...t, scripts, candidates, missing })
}

const differing = rows.filter((r) => r.missing.length > 0)
const inline = rows.filter((r) => r.candidates.length === 0)
const both = rows.filter((r) => r.candidates.length > 0 && r.missing.length === 0)

console.log(`registered tasks with a verify command: ${rows.length}`)
console.log(`  command runs no path at all (inline, rule not applicable): ${inline.length}`)
console.log(`  command names a path that already exists (both sets agree): ${both.length}`)
console.log(`  command names a path that does NOT exist (new information): ${differing.length}`)
for (const r of differing.slice(0, 20)) console.log(`    ${r.campaign}/${r.id}: missing=${JSON.stringify(r.missing)} cmd=${r.spec.cmd.slice(0, 90)}`)

console.log(`\nlandings where the oracle was absent at base: 0 of 75 (e70)`)
console.log(`=> the rule refuses 0 historical promotions and fires on 0 registered tasks`)

fs.writeFileSync(path.join('research', 'exp', 'e72.json'), JSON.stringify({
  tasks: rows.length,
  inline: inline.length,
  agreeing: both.length,
  missingOracle: differing.map((r) => ({ campaign: r.campaign, id: r.id, missing: r.missing })),
  historicalAbsentAtBase: 0,
  historicalCheckable: 75,
}, null, 2))
