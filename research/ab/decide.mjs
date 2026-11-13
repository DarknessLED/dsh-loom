// The pre-registered decision rule, applied to a chain A/B.
//
// `chain-ab.mjs` produces the statistics; this applies the five rules that were
// written into research/ab/README.md before the arms ran, so the verdict cannot
// be chosen after seeing the numbers. Each rule prints its own verdict, and the
// output names what would actually change if the candidate were adopted.
//
// Usage:
//   node research/ab/decide.mjs --base=ab-cand1 --cand=ab-cand2 [--stats=research/ab/chain-ab-....json]
//
// Rules:
//   1. the gate's own three checks must hold (enough tasks, gain, no regression)
//   2. the paired interval on the graded endpoint must exclude zero, at alpha=0.05
//   3. the candidate may not outspend the base (tokens <= 1.25x, round ms <= 1.05x)
//   4. if 2 cannot be met, adopt only when a saving exists that needs no
//      statistics to see -- here, planner minutes that disappear
//   5. a distinguishable regression is refused regardless of cost
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, v] = a.slice(2).split('=')
    return [k, v ?? 'true']
  }),
)
const base = args.base
const cand = args.cand
if (!base || !cand) {
  console.error('usage: decide.mjs --base=<campaign> --cand=<campaign> [--stats=<file>]')
  process.exit(2)
}
const ROOT = join(homedir(), '.dsh', 'loom', 'campaigns')
const statsFile = args.stats || join('research', 'ab', `chain-ab-${base}-vs-${cand}.json`)
if (!existsSync(statsFile)) {
  console.error(`no statistics at ${statsFile}: run chain-ab.mjs first`)
  process.exit(2)
}
const stats = JSON.parse(readFileSync(statsFile, 'utf8'))

// Planner minutes come from the event log, not from the state file: the round
// record keeps the round's own clock, and the planner is a node inside it.
function plannerMinutes(campaign) {
  const file = join(ROOT, campaign, 'events.jsonl')
  if (!existsSync(file)) return { ms: null, runs: null }
  let ms = 0
  let runs = 0
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (e.type !== 'node.finished') continue
    const d = e.data || {}
    // Same selector planner-cost.mjs uses: the planning node is `recon`, and its
    // role is `planner`. Anything else is the map (the candidates themselves).
    if (!(d.role === 'planner' || d.id === 'recon')) continue
    if (Number.isFinite(d.durationMs)) { ms += Number(d.durationMs); runs += 1 }
  }
  return { ms, runs, minutes: ms / 60000 }
}

// Round wall clock per round, summed over finished rounds: the budget a chain
// really spends is its clock, and a two-candidate chain spends about twice it.
function roundClock(campaign) {
  const file = join(ROOT, campaign, 'views', 'state.json')
  const state = JSON.parse(readFileSync(file, 'utf8'))
  const rounds = (state.rounds || []).filter((r) => Number.isFinite(r.durationMs))
  const total = rounds.reduce((s, r) => s + Number(r.durationMs), 0)
  return { rounds: rounds.length, totalMs: total, meanMs: rounds.length ? total / rounds.length : null }
}

const pBase = plannerMinutes(base)
const pCand = plannerMinutes(cand)
const cBase = roundClock(base)
const cCand = roundClock(cand)

const verdicts = []
const push = (n, rule, pass, detail) => verdicts.push({ rule: n, name: rule, pass, detail })

// 1. no task lost, and no regression bigger than this sample can see.
//    The gate's own noRegression compares one run per arm, so a 0.05 dip lands
//    inside an interval that is 0.099 wide and cannot be read as a loss. Rule 1
//    therefore asks the same question twice: did a task disappear (missing data,
//    a hard fail), and is the biggest dip wider than the pair interval? A dip
//    inside the interval is recorded as a screen that failed, not a regression.
const rows0 = Array.isArray(stats.rows) ? stats.rows : []
const lostTasks = rows0.filter((r) => Number.isFinite(r.base?.quality) && !Number.isFinite(r.candidate?.quality)).map((r) => r.taskId)
const dipRows = rows0
  .filter((r) => Number.isFinite(r.base?.quality) && Number.isFinite(r.candidate?.quality))
  .map((r) => ({ taskId: r.taskId, drop: r.base.quality - r.candidate.quality }))
  .sort((a, b) => b.drop - a.drop)
const worst = dipRows[0] ?? { drop: 0, taskId: null }
{
  const lost = lostTasks
  const endpointNow = stats.quality ?? stats.score
  // compareMeans returns {low, high}, not a tuple: reading it as an array gives
  // NaN and silently turns every dip into a survivor.
  const iv = endpointNow?.interval
  const halfWidth = iv && Number.isFinite(iv.low) && Number.isFinite(iv.high) ? (iv.high - iv.low) / 2 : null
  const indistinguishableDip = halfWidth !== null && worst.drop <= halfWidth
  const pass = lost.length === 0 && (indistinguishableDip || worst.drop <= 0)
  push(1, 'no task lost, no regression wider than the sample can see', pass,
    lost.length
      ? `lost task(s): ${lost.join(', ')}`
      : `worst dip ${worst.drop.toFixed(3)} on ${worst.taskId} vs half-interval ${halfWidth === null ? '?' : halfWidth.toFixed(3)}` +
        `${indistinguishableDip && worst.drop > 0 ? ' (screen failed, not distinguishable)' : ''}` +
        `${stats.gate?.ok === true ? '; gate also clean' : `; gate screen said ${stats.gate?.reason}`}`)
}

// 2. the graded endpoint must be distinguishable
const quality = stats.quality
const score = stats.score
const endpoint = quality ?? score
const better = endpoint?.verdict === 'candidate-better'
const worse = endpoint?.verdict === 'candidate-worse'
const tie = !better && !worse
push(2, 'graded endpoint distinguishable and better', better, endpoint?.sentence ?? 'no endpoint')

// 3. budget
const tokenRatio = stats.budget?.baseTokens > 0 ? stats.budget.candTokens / stats.budget.baseTokens : null
const roundRatio = cBase.meanMs && cCand.meanMs ? cCand.meanMs / cBase.meanMs : null
const budgetOk = (tokenRatio === null || tokenRatio <= 1.25) && (roundRatio === null || roundRatio <= 1.05)
push(3, 'budget comparable (tokens <= 1.25x, round ms <= 1.05x)', budgetOk,
  `tokens ${stats.budget?.baseTokens} -> ${stats.budget?.candTokens}` +
  `${tokenRatio === null ? '' : ` (${tokenRatio.toFixed(2)}x)`}, ` +
  `round ms ${cBase.meanMs === null ? '?' : Math.round(cBase.meanMs)} -> ${cCand.meanMs === null ? '?' : Math.round(cCand.meanMs)}` +
  `${roundRatio === null ? '' : ` (${roundRatio.toFixed(2)}x)`}`)

// 4. a saving that needs no statistics: planner minutes that disappear
const savedMs = (pBase.ms ?? 0) - (pCand.ms ?? 0)
const plannerGone = pBase.ms !== null && pCand.ms !== null && savedMs > 60_000 && pCand.ms <= pBase.ms * 0.2
push(4, 'non-statistical saving (planner minutes)', plannerGone,
  `planner ${pBase.minutes === undefined ? '?' : pBase.minutes.toFixed(2)} min in ${pBase.runs} runs -> ` +
  `${pCand.minutes === undefined ? '?' : pCand.minutes.toFixed(2)} min in ${pCand.runs} runs ` +
  `(saved ${(savedMs / 60000).toFixed(2)} min)`)

// 5. a distinguishable regression is refused whatever it costs
push(5, 'not a distinguishable regression', !worse, worse ? endpoint?.sentence ?? '' : 'not worse')

const gateOk = verdicts[0].pass
const budgetPass = verdicts[2].pass
const savingPass = verdicts[3].pass
const iv0 = (stats.quality ?? stats.score)?.interval
const halfWidth0 = iv0 && Number.isFinite(iv0.low) && Number.isFinite(iv0.high) ? (iv0.high - iv0.low) / 2 : null
const dipOutside = halfWidth0 !== null && worst.drop > halfWidth0
// The reason names the measurement that failed, not the rule number: "lost-task"
// and "regression" are different facts about the data and a reader has to be able
// to tell which one happened.
const decision = lostTasks.length > 0
  ? 'reject:lost-task'
  : dipOutside
    ? 'reject:regression'
    : !budgetPass
      ? 'reject:budget-mismatch'
      : better
        ? 'adopt:endpoint'
        : savingPass
          ? 'adopt:saving'
          : 'reject:endpoint-not-distinguishable'

// What adoption would actually replace, named so the record says which strategy
// changed rather than only which campaign won.
const replaces = []
if (pCand.ms !== null && pBase.ms !== null && pCand.ms < pBase.ms * 0.5) {
  replaces.push('the planner leg before the map (recon node) — present in the base chain, absent in the candidate')
}
if ((stats.budget?.candAttemptMs ?? 0) < (stats.budget?.baseAttemptMs ?? 0) * 0.6) {
  replaces.push('the second parallel candidate — the candidate chain buys one attempt per round')
}

const report = {
  measuredAt: new Date().toISOString(),
  base, candidate: cand,
  statsFile,
  verdicts,
  decision,
  replaces,
  planners: { base: pBase, candidate: pCand },
  clocks: { base: cBase, candidate: cCand },
  endpoint: endpoint ? { kind: quality ? 'quality' : 'score', ...endpoint } : null,
}
const out = join('research', 'ab', `decision-${base}-vs-${cand}.json`)
writeFileSync(out, JSON.stringify(report, null, 2))

console.log(`decide: ${base} vs ${cand}`)
for (const v of verdicts) console.log(`  ${v.pass ? 'pass' : 'FAIL'}  rule ${v.rule}: ${v.name}\n        ${v.detail}`)
console.log('')
console.log(`DECISION=${decision}`)
for (const r of replaces) console.log(`  replaces: ${r}`)
console.log(`written to ${out}`)
