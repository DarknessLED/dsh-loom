// q-audit: what is our verifier's false-accept rate on the promotions?
//
// The literature's audit design needs post-patch test artifacts and a revert run.
// This measures the two components that decide whether that audit can even find
// anything here:
//
//   (a) vacuous acceptance -- the task's own spec already passed on the base tree,
//       so the promotion proves nothing about the patch. Measured by e47 (7 of 71
//       commit-bearing promotions: the diff oracle would have refused them).
//   (b) fault-enforcing tests -- a patch that adds a test encoding the bug. This
//       needs the patch to add tests at all. If promotions essentially never touch
//       test files, this failure mode is structurally absent rather than rare.
//
// Component (b) is the one q-audit assumed was the risk. If it is absent by
// construction, the audit the literature prescribes cannot find its target, and the
// honest answer to q-audit is different from "unknown".
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const DIR = path.join(process.env.USERPROFILE ?? process.env.HOME, '.dsh', 'loom', 'campaigns')
const git = (args, cwd) => {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 26 }) } catch { return null }
}

const isTestPath = (p) => /^(tests?|__tests__|spec)\//.test(p) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(p)

const readJsonl = (f) => {
  const out = []
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try { out.push(JSON.parse(line)) } catch { /* torn tail */ }
  }
  return out
}

const landings = []
for (const c of fs.readdirSync(DIR)) {
  const f = path.join(DIR, c, 'events.jsonl')
  if (!fs.existsSync(f)) continue
  const stateFile = path.join(DIR, c, 'views', 'state.json')
  let state = null
  try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')) } catch { /* none */ }
  const repo = state?.workspace ?? 'C:/Projects/RSI'
  const events = readJsonl(f)
  const gateByRound = new Map()
  for (const e of events) {
    if (e.type === 'gate.evaluated') gateByRound.set(e.data.round, e.data)
    if (e.type === 'artifact.promoted') landings.push({ campaign: c, repo, kind: 'artifact', round: e.data.round, attemptId: e.data.attemptId, t: e.t })
    if (e.type === 'autopilot.applied' && e.data.commit) landings.push({ campaign: c, repo, kind: 'commit', round: e.data.round, commit: e.data.commit, t: e.t })
  }
}

// (b) how many promotions add lines to a test file?
const withCommit = landings.filter((l) => l.kind === 'commit')
let addedTestLines = 0
let touchedTestFile = 0
let missing = 0
const perCampaign = []
for (const l of withCommit) {
  const res = git(['show', '--numstat', '--format=', l.commit], l.repo)
  if (res === null) { missing += 1; continue }
  const rows = String(res).split('\n').filter(Boolean).map((line) => line.split('\t')).filter((r) => r.length >= 3)
  const testRows = rows.filter((r) => isTestPath(r[2]))
  if (testRows.length) {
    touchedTestFile += 1
    addedTestLines += testRows.reduce((sum, r) => sum + (Number(r[0]) || 0), 0)
    perCampaign.push({ campaign: l.campaign, round: l.round, files: testRows.map((r) => `${r[2]} +${r[0]}-${r[1]}`) })
  }
}

// (a) reproduced from e47's output so both components sit in one number.
let e47 = null
try { e47 = JSON.parse(fs.readFileSync(path.join('research', 'exp', 'e47.json'), 'utf8')) } catch { /* absent */ }
// e47's row field is baseOk, not baseGreen. The first version of this file read
// baseGreen, got undefined everywhere, and reported "0 of 71" -- a number that is
// indistinguishable from a real measurement of zero. Assert the field exists.
const rows = Array.isArray(e47?.rows) ? e47.rows : null
if (rows && rows.length && !Object.hasOwn(rows[0], 'baseOk')) {
  throw new Error(`e47 rows have no baseOk field (keys: ${Object.keys(rows[0]).join(', ')})`)
}
const baselineGreen = rows ? rows.filter((r) => r.baseOk === true).length : null
const baselineTotal = rows ? rows.length : null

console.log(`promotions in the ledger: ${landings.filter((l) => l.kind === 'artifact').length} artifact.promoted events`)
console.log(`  with a commit (checkable): ${withCommit.length}, unreadable: ${missing}`)
console.log(`\n(b) fault-enforcing tests:`)
console.log(`  promotions that added lines to a test file: ${touchedTestFile} of ${withCommit.length}`)
console.log(`  test lines added across all promotions: ${addedTestLines}`)
for (const p of perCampaign) console.log(`    ${p.campaign} r${p.round}: ${p.files.join(', ')}`)
console.log(`\n(a) vacuous acceptance (from e47):`)
console.log(`  base already green: ${baselineGreen} of ${baselineTotal} checkable`)
console.log(`  rate: ${baselineTotal ? ((baselineGreen / baselineTotal) * 100).toFixed(1) : '?'}%`)

console.log(`\n=> the audit q-audit prescribes looks for tests that encode the bug.`)
console.log(`   Our promotions add test lines in ${touchedTestFile} of ${withCommit.length} cases, so that`)
console.log(`   failure mode is structurally absent, not rare. The reachable false-accept risk is`)
console.log(`   "the spec was already satisfiable" (${baselineGreen}/${baselineTotal}) plus "the spec measures`)
console.log(`   the wrong thing", which no revert audit can see either.`)

fs.writeFileSync(path.join('research', 'exp', 'e75.json'), JSON.stringify({
  promotions: landings.filter((l) => l.kind === 'artifact').length,
  withCommit: withCommit.length,
  unreadable: missing,
  touchedTestFile,
  addedTestLines,
  perCampaign,
  baseGreenFromE47: baselineGreen,
  baseTotalFromE47: baselineTotal,
}, null, 2))
