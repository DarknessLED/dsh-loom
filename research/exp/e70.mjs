import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

// q-verifier-order: does the verifier run tests that were frozen before the patch existed?
// Three questions, cheapest first:
//   (a) did the promoted patch touch the oracle at all     -- testsClean / oracleClean
//   (b) did the oracle exist in the parent commit          -- git, per campaign repo
//   (c) if a promotion did touch a test file, was the rule that forbids it even switched on yet?
// (c) matters because a rule added later cannot have been violated earlier -- the same era
// distinction that turned a false finding into a true one in exp-gap-006.

const DIR = 'C:/Users/Darkness/.dsh/loom/campaigns'

const git = (args, cwd) => {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 26 }).trim() } catch { return null }
}

function readJsonl(f) {
  const out = []
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try { out.push(JSON.parse(line)) } catch { /* torn tail */ }
  }
  return out
}

const stateOf = (c) => {
  const f = path.join(DIR, c, 'views', 'state.json')
  if (!fs.existsSync(f)) return null
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null }
}

// Era boundaries, derived from the log rather than remembered (ana-024).
const allEvents = []
for (const c of fs.readdirSync(DIR)) {
  const f = path.join(DIR, c, 'events.jsonl')
  if (!fs.existsSync(f)) continue
  for (const e of readJsonl(f)) allEvents.push({ campaign: c, ...e })
}
const gates = allEvents.filter((e) => e.type === 'gate.evaluated')
const firstWithTestsClean = Math.min(...gates.filter((g) => g.data.checks && 'testsClean' in g.data.checks).map((g) => g.t))
const firstWithOracleClean = Math.min(...gates.filter((g) => g.data.checks && 'oracleClean' in g.data.checks).map((g) => g.t))
const firstWithEarned = Math.min(...gates.filter((g) => g.data.checks && 'earnedReason' in g.data.checks).map((g) => g.t))

// Every landing with a commit, checked against its own repo.
const landings = []
for (const c of fs.readdirSync(DIR)) {
  const f = path.join(DIR, c, 'events.jsonl')
  if (!fs.existsSync(f)) continue
  const st = stateOf(c)
  const repo = st?.workspace ?? 'C:/Projects/RSI'
  const gateByRound = new Map()
  for (const e of readJsonl(f)) {
    if (e.type === 'gate.evaluated') gateByRound.set(e.data.round, e.data)
    if (e.type !== 'autopilot.applied' || !e.data.committed || !e.data.commit) continue
    landings.push({ campaign: c, repo, round: e.data.round, commit: e.data.commit, t: e.t, gate: gateByRound.get(e.data.round) ?? null })
  }
}

const TEST_RE = /(^|\/)tests?\//
const rows = landings.map((l) => {
  const parent = git(['rev-parse', `${l.commit}^`], l.repo)
  const ok = Boolean(parent && git(['cat-file', '-t', parent], l.repo) === 'commit')
  const files = ok ? (git(['diff', '--name-only', parent, l.commit], l.repo) ?? '').split('\n').filter(Boolean) : []
  const touchedTests = files.filter((f) => TEST_RE.test(f))
  const checks = l.gate?.checks ?? null
  return {
    ...l,
    ok,
    files,
    touchedTests,
    hadTestsCleanCheck: checks ? 'testsClean' in checks : null,
    testsCleanValue: checks?.testsClean ?? null,
    beforeTestsCleanRule: l.t < firstWithTestsClean ? true : false,
  }
})

const checkable = rows.filter((r) => r.ok)
const touched = checkable.filter((r) => r.touchedTests.length > 0)

// (b) ordering: does the task's own oracle exist at the parent commit?
const INTERP = /^(node|npx|pnpm|npm|yarn|bun|deno|tsx|ts-node|python|python3|py|bash|sh|zsh|cmd|pwsh|powershell)$/i
function oracleRelPath(cmd, repo) {
  if (!cmd) return null
  const toks = (cmd.split(/\s*&&\s*/)[0].match(/"[^"]+"|\S+/g) ?? [])
  for (const raw of toks) {
    const tok = raw.replace(/^"|"$/g, '')
    if (INTERP.test(path.basename(tok).replace(/\.exe$/i, ''))) continue
    if (tok.startsWith('-')) continue
    if (!/\.(mjs|cjs|js|ts|py|sh)$/i.test(tok)) continue
    const abs = path.isAbsolute(tok) ? tok : path.resolve(repo, tok)
    const rel = path.relative(repo, abs).split(path.sep).join('/')
    return rel.startsWith('..') ? null : rel
  }
  return null
}

const ordering = []
for (const r of checkable) {
  const st = stateOf(r.campaign)
  const taskId = (readJsonl(path.join(DIR, r.campaign, 'events.jsonl')).find((e) => e.type === 'round.started' && e.data.n === r.round)?.data?.taskId) ?? st?.evalset?.tasks?.[0]?.id
  const task = (st?.evalset?.tasks ?? []).find((t) => t.id === taskId) ?? st?.evalset?.tasks?.[0]
  const oracle = oracleRelPath(task?.verify?.cmd, r.repo)
  if (!oracle) { ordering.push({ campaign: r.campaign, round: r.round, oracle: null }); continue }
  const parent = git(['rev-parse', `${r.commit}^`], r.repo)
  const existed = parent ? git(['cat-file', '-e', `${parent}:${oracle}`], r.repo) !== null : null
  ordering.push({ campaign: r.campaign, round: r.round, oracle, existedBefore: existed, touched: r.files.includes(oracle) })
}

const resolved = ordering.filter((o) => o.oracle)
const q = (a, f) => a.length ? a[Math.min(a.length - 1, Math.floor(f * (a.length - 1)))] : null

const out = {
  landingsWithCommit: landings.length,
  checkableAgainstGit: checkable.length,
  era: {
    gates: gates.length,
    firstGateWithTestsClean: new Date(firstWithTestsClean).toISOString(),
    firstGateWithOracleClean: new Date(firstWithOracleClean).toISOString(),
    firstGateWithEarnedReason: new Date(firstWithEarned).toISOString(),
    landingsBeforeTestsCleanRule: checkable.filter((r) => r.beforeTestsCleanRule).length,
    landingsAfter: checkable.filter((r) => !r.beforeTestsCleanRule).length,
  },
  a_touchedTests: {
    total: touched.length,
    beforeRule: touched.filter((r) => r.beforeTestsCleanRule).length,
    afterRule: touched.filter((r) => !r.beforeTestsCleanRule).length,
    detail: touched.map((r) => ({ campaign: r.campaign, round: r.round, files: r.touchedTests, gateHadTestsClean: r.hadTestsCleanCheck, value: r.testsCleanValue })),
  },
  b_ordering: {
    resolvedOracle: resolved.length,
    unresolved: ordering.length - resolved.length,
    oracleExistedAtParent: resolved.filter((o) => o.existedBefore === true).length,
    oracleAbsentAtParent: resolved.filter((o) => o.existedBefore === false).length,
    oracleTouchedByPromotion: resolved.filter((o) => o.touched === true).length,
    absentSample: resolved.filter((o) => o.existedBefore === false).slice(0, 5),
  },
  fileSize: { median: q(checkable.map((r) => r.files.length).sort((a, b) => a - b), 0.5) },
}
console.log(JSON.stringify(out, null, 2))
fs.writeFileSync('research/exp/e70.json', JSON.stringify(out, null, 2))
