// w2-decide-gap-eval-set-decay-under-reuse: how fast does an eval set's
// discriminative power decay when it is used repeatedly to accept/reject?
//
// We cannot re-run the corpora, but the ledger records the same task being judged
// repeatedly across campaigns. If the set decays under reuse, a task's pass rate
// should fall as the number of prior attempts on it rises -- because the easy
// instances get consumed first. If it does not decay, the fall is something else.
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.join(process.env.USERPROFILE ?? process.env.HOME, '.dsh', 'loom', 'campaigns')
const readJsonl = (f) => {
  const out = []
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try { out.push(JSON.parse(line)) } catch { /* torn */ }
  }
  return out
}

// (campaign, round) -> taskId, and score
const taskOf = new Map()
const scoreOf = new Map()
for (const c of fs.readdirSync(DIR)) {
  const f = path.join(DIR, c, 'events.jsonl')
  if (!fs.existsSync(f)) continue
  for (const e of readJsonl(f)) {
    if (e.type === 'round.started') taskOf.set(`${c}|${e.data.n}`, e.data.taskId)
    if (e.type === 'attempt.finished') scoreOf.set(`${c}|${e.data.round}|${e.data.id}`, e.data.score)
    if (e.type === 'round.finished') scoreOf.set(`${c}|${e.data.n}|round`, e.data.score)
  }
}

// Order all rounds by wall clock; for each task, its k-th appearance.
const byTask = new Map()
for (const [key, task] of taskOf) {
  const [c, n] = key.split('|')
  const score = scoreOf.get(`${c}|${n}|round`)
  if (score === undefined || score === null) continue
  if (!byTask.has(task)) byTask.set(task, [])
  byTask.get(task).push({ campaign: c, round: Number(n), score })
}

const buckets = new Map() // k -> {n, pass}
let flips = 0
let repeatPairs = 0
let tasksRepeated = 0
const perTask = []
for (const [task, rows] of byTask) {
  if (rows.length < 2) continue
  tasksRepeated += 1
  rows.sort((a, b) => a.round - b.round)
  const rate = rows.filter((r) => r.score === 1).length / rows.length
  const gainedLate = rows.some((r, i) => i > 0 && r.score === 1 && rows[i - 1].score === 0)
  const lostLate = rows.some((r, i) => i > 0 && r.score === 0 && rows[i - 1].score === 1)
  if (gainedLate && lostLate) flips += 1
  perTask.push({ task, n: rows.length, rate, gainedLate, lostLate, seq: rows.map((r) => r.score).join('') })
  rows.forEach((r, i) => {
    const k = i + 1
    const b = buckets.get(k) ?? { n: 0, pass: 0 }
    b.n += 1
    if (r.score === 1) b.pass += 1
    buckets.set(k, b)
  })
  for (let i = 1; i < rows.length; i += 1) { repeatPairs += 1 }
}

console.log(`tasks judged more than once: ${tasksRepeated} (repeat pairs: ${repeatPairs})`)
console.log(`pass rate by appearance index (k-th time this task was judged):`)
const ks = [...buckets.keys()].sort((a, b) => a - b)
for (const k of ks.slice(0, 10)) {
  const b = buckets.get(k)
  console.log(`  k=${k}: ${b.pass}/${b.n} = ${(b.pass / b.n * 100).toFixed(1)}%`)
}

// The decay question, stated as a test: is the pass rate of a task's later
// appearances lower than its earlier ones, on the SAME tasks?
let early = { n: 0, pass: 0 }
let late = { n: 0, pass: 0 }
for (const [task, rows] of byTask) {
  if (rows.length < 2) continue
  rows.sort((a, b) => a.round - b.round)
  const half = Math.floor(rows.length / 2)
  for (const r of rows.slice(0, half)) { early.n += 1; if (r.score === 1) early.pass += 1 }
  for (const r of rows.slice(half)) { late.n += 1; if (r.score === 1) late.pass += 1 }
}
console.log(`\nwithin-task, first half vs second half of appearances:`)
console.log(`  first:  ${early.pass}/${early.n} = ${(early.pass / early.n * 100).toFixed(1)}%`)
console.log(`  second: ${late.pass}/${late.n} = ${(late.pass / late.n * 100).toFixed(1)}%`)
console.log(`  difference: ${((late.pass / late.n - early.pass / early.n) * 100).toFixed(1)} pp`)

// The mechanism the decay hypothesis predicts: once solved, a task can never
// promote again (one promotion per task), so later appearances should be
// concentrated on unsolved hard tasks. Count how much of the late drop is that.
const solvedFirst = perTask.filter((t) => t.seq.startsWith('1'))
console.log(`\ntasks whose first appearance passed: ${solvedFirst.length}; their later appearances: ${solvedFirst.reduce((s, t) => s + t.n - 1, 0)}`)
const unsolvedFirst = perTask.filter((t) => t.seq.startsWith('0'))
console.log(`tasks whose first appearance failed: ${unsolvedFirst.length}; their later appearances: ${unsolvedFirst.reduce((s, t) => s + t.n - 1, 0)}`)

fs.writeFileSync(path.join('research', 'exp', 'e81.json'), JSON.stringify({
  tasksRepeated, repeatPairs, flips,
  buckets: Object.fromEntries([...buckets].map(([k, v]) => [k, v])),
  early, late,
  firstPassed: solvedFirst.length, firstFailed: unsolvedFirst.length,
  perTask,
}, null, 2))
