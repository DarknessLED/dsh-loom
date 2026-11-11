// How much coverage does the autopilot guard actually watch?
// test-all.mjs deliberately excludes tests/self*/ (campaign specs). Once a
// campaign is done, those specs are the ONLY tests for modules the loop added.
// This runs every one of them and tallies.
import { readdirSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
const root = 'C:/Projects/RSI'
const NODE = process.env.MUT_NODE
const dirs = readdirSync(join(root, 'tests')).filter((d) => /^self\d*$/.test(d)).sort()
const rows = []
for (const d of dirs) {
  for (const f of readdirSync(join(root, 'tests', d)).filter((n) => n.endsWith('.test.mjs')).sort()) {
    const rel = 'tests/' + d + '/' + f
    const r = spawnSync('"' + NODE + '" "' + rel + '"', { cwd: root, shell: true, encoding: 'utf8', timeout: 300000 })
    const out = (r.stdout || '') + (r.stderr || '')
    const m = out.match(/(\d+)\/(\d+) passed/)
    const fails = (out.match(/^FAIL /gm) || []).length
    rows.push({ spec: rel, exit: r.status, passed: m ? +m[1] : null, total: m ? +m[2] : null, fails })
  }
}
const failing = rows.filter((r) => r.exit !== 0 || (r.fails || 0) > 0)
console.log(JSON.stringify({
  specs: rows.length,
  greenSpecs: rows.length - failing.length,
  failingSpecs: failing.length,
  totalAssertions: rows.reduce((a, r) => a + (r.total || 0), 0),
  failing: failing.map((r) => r.spec + ' ' + (r.passed ?? '?') + '/' + (r.total ?? '?') + ' exit=' + r.exit),
}, null, 2))
