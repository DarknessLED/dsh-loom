// Does the gate's minGain actually bite? Replay every round with the gate
// recomputed at several minGain values, holding the recorded scores fixed.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const campaigns = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')

const rounds = [] // {campaign, n, taskId, promoted, bestScore, status}
for (const c of fs.readdirSync(campaigns)) {
  const ev = path.join(campaigns, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  const gates = []
  const finished = new Map()
  const started = new Map()
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'round.started') started.set(Number(d.n ?? d.round), d)
    if (e.type === 'gate.evaluated') gates.push(d)
    if (e.type === 'round.finished') finished.set(Number(d.n), d)
  }
  for (const g of gates) {
    const n = Number(g.round)
    const f = finished.get(n)
    rounds.push({
      campaign: c,
      n,
      candidate: g.candidateId,
      taskId: started.get(n)?.taskId ?? started.get(n)?.task?.id ?? null,
      score: typeof g.score === 'number' ? g.score : null,
      incumbentScore: typeof g.incumbentScore === 'number' ? g.incumbentScore : null,
      beatsIncumbent: g.checks?.beatsIncumbent,
      promoted: Boolean(g.promoted),
      status: f?.status ?? null,
    })
  }
}

const scored = rounds.filter((r) => r.score !== null)
const dist = new Map()
for (const r of scored) dist.set(r.score, (dist.get(r.score) ?? 0) + 1)
const margins = scored.filter((r) => r.incumbentScore !== null).map((r) => ({ m: r.score - r.incumbentScore, p: r.promoted }))
const mDist = new Map()
for (const x of margins) mDist.set(x.m, (mDist.get(x.m) ?? 0) + 1)

// how often would a given minGain flip a decision?
const flips = {}
for (const g of [0.001, 0.01, 0.05, 0.1, 0.2, 0.5, 0.9]) {
  let changed = 0
  for (const x of margins) {
    const would = x.m >= g - 1e-9
    if (would !== x.p) changed += 1
  }
  flips[String(g)] = changed
}

// within-task sequences: how often does a task get a second chance above its best?
const byTask = new Map()
for (const r of scored) {
  if (!r.taskId) continue
  const k = r.campaign + '\0' + r.taskId
  if (!byTask.has(k)) byTask.set(k, [])
  byTask.get(k).push(r)
}
let seq = 0, seqVaried = 0, seqStuckAtOne = 0
for (const [, rs] of byTask) {
  seq += 1
  const vals = new Set(rs.map((r) => r.score))
  if (vals.size > 1) seqVaried += 1
  if (Math.max(...rs.map((r) => r.score)) === 1 && rs.filter((r) => r.score === 1).length > 1) seqStuckAtOne += 1
}

console.log(JSON.stringify({
  roundsWithGate: rounds.length,
  roundsScored: scored.length,
  scoreValues: [...dist.entries()].sort((a, b) => a[0] - b[0]),
  roundsWithIncumbent: margins.length,
  marginValues: [...mDist.entries()].sort((a, b) => a[0] - b[0]),
  decisionsFlippedByMinGain: flips,
  taskSequences: seq,
  taskSequencesWithMoreThanOneScore: seqVaried,
  taskSequencesThatHitOneRepeatedly: seqStuckAtOne,
}, null, 2))
