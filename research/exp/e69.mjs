import fs from 'node:fs'
import path from 'node:path'

// gap-w1-004 says nobody A/Bs lessons-vs-control with a mechanical verifier, and exp-lesson-001
// answered that we do: 60 lesson.impact rows, mean delta +0.017. This measures what those rows can
// support. Two things decide it and neither is the mean:
//   (1) the unit. lesson.impact records one row per injected lesson, but the treated/control
//       comparison happens once per round. Lessons injected together share one comparison, so the
//       number of independent observations is the number of ROUNDS, not the number of rows.
//   (2) the arm. The treated arm is a2 in 48 rows and a1 in 12, i.e. the assignment flips. An
//       asymmetry computed without pinning the arm measures candidate index, not lessons.

const DIR = 'C:/Users/Darkness/.dsh/loom/campaigns'

function eventsOf(c) {
  const f = path.join(DIR, c, 'events.jsonl')
  if (!fs.existsSync(f)) return []
  const out = []
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try { out.push(JSON.parse(line)) } catch { /* torn tail */ }
  }
  return out
}

const rows = []
for (const c of fs.readdirSync(DIR)) {
  if (!fs.existsSync(path.join(DIR, c, 'events.jsonl'))) continue
  const ev = eventsOf(c)
  const taskOfRound = new Map()
  for (const e of ev) if (e.type === 'round.started') taskOfRound.set(e.data.n, e.data.taskId)
  const armsOfRound = new Map()
  for (const e of ev) {
    if (e.type !== 'attempt.finished') continue
    const m = /^r(\d+)a(\d+)$/.exec(String(e.data.id ?? ''))
    if (!m) continue
    const n = Number(m[1])
    const list = armsOfRound.get(n) ?? []
    list.push({ id: e.data.id, arm: Number(m[2]), ok: e.data.verifierOk === true, score: e.data.score })
    armsOfRound.set(n, list)
  }
  for (const e of ev) {
    if (e.type !== 'lesson.impact') continue
    rows.push({
      campaign: c,
      lesson: e.data.id,
      round: e.data.round,
      taskId: taskOfRound.get(e.data.round) ?? null,
      treated: String(e.data.attempt ?? ''),
      control: String(e.data.control ?? ''),
      delta: e.data.delta,
      arms: armsOfRound.get(e.data.round) ?? [],
    })
  }
}

// Collapse to rounds: one comparison per round, regardless of how many lessons rode on it.
const rounds = new Map()
for (const r of rows) {
  const key = `${r.campaign}#${r.round}`
  const b = rounds.get(key) ?? { key, campaign: r.campaign, round: r.round, taskId: r.taskId, deltas: new Set(), lessons: [], arms: r.arms, treatedSuffix: new Set() }
  b.deltas.add(r.delta)
  b.lessons.push(r.lesson)
  b.treatedSuffix.add(/a(\d)$/.exec(r.treated)?.[1] ?? '?')
  rounds.set(key, b)
}
const roundRows = [...rounds.values()].map((b) => {
  const t = [...b.treatedSuffix][0]
  const treated = b.arms.find((a) => String(a.arm) === t) ?? null
  const control = b.arms.find((a) => String(a.arm) !== t) ?? null
  return {
    ...b,
    treatedArm: treated?.id ?? null,
    controlArm: control?.id ?? null,
    treatedOk: treated?.ok ?? null,
    controlOk: control?.ok ?? null,
    // Sign convention check: delta should be treated - control.
    recomputed: treated && control ? Number(treated.ok) - Number(control.ok) : null,
  }
})

const signAgrees = roundRows.filter((r) => r.recomputed !== null && [...r.deltas][0] === r.recomputed).length
const signDisagrees = roundRows.filter((r) => r.recomputed !== null && !r.deltas.has(r.recomputed))
const twoArms = roundRows.filter((r) => r.arms.length >= 2).length
const disagreements = roundRows.filter((r) => r.treatedOk !== null && r.controlOk !== null && r.treatedOk !== r.controlOk)
const treatedWins = disagreements.filter((r) => r.treatedOk === true).length
const controlWins = disagreements.filter((r) => r.controlOk === true).length
const pTwoSided = treatedWins + controlWins === 0 ? null : Math.min(1, 2 * (0.5 ** (treatedWins + controlWins)))

// How many of the 36 rounds could have shown a difference at all: on a task whose bar is already
// met there is no promotion to win, so a delta of 0 there is structural.
const onSettled = roundRows.filter((r) => r.treatedOk === true && r.controlOk === true).length
const bothFail = roundRows.filter((r) => r.treatedOk === false && r.controlOk === false).length

// Power for a binary paired outcome: SE of a paired mean is sd(delta)/sqrt(n), and with deltas in
// {-1,0,+1} the sd is sqrt(pDisc). Use the observed disagreement rate as pDisc.
const pDisc = roundRows.length ? disagreements.length / roundRows.length : 0
const se = (n) => Math.sqrt(Math.max(pDisc, 1e-9) / n)
const nFor = (effect, z = 2.802) => Math.ceil((z * z * pDisc) / (effect * effect))

const out = {
  rows: rows.length,
  distinctLessons: new Set(rows.map((r) => r.lesson)).size,
  independentObservations: { rounds: roundRows.length, lessonsPerRound: Number((rows.length / roundRows.length).toFixed(2)) },
  armAssignment: {
    treatedIsA2: rows.filter((r) => /a2$/.test(r.treated)).length,
    treatedIsA1: rows.filter((r) => /a1$/.test(r.treated)).length,
    roundsWhereTheSuffixIsAmbiguous: roundRows.filter((r) => r.treatedSuffix.size > 1).length,
  },
  signConvention: { roundsWhereDeltaEqualsTreatedMinusControl: signAgrees, violations: signDisagrees.length, firstViolations: signDisagrees.slice(0, 3).map((r) => ({ key: r.key, deltas: [...r.deltas], recomputed: r.recomputed })) },
  informative: {
    roundsWithTwoArms: twoArms,
    bothPass: onSettled,
    bothFail,
    disagreements: disagreements.length,
    treatedWins,
    controlWins,
    twoSidedP: pTwoSided,
  },
  power: {
    disagreementRate: Number(pDisc.toFixed(3)),
    seAt36: Number(se(36).toFixed(3)),
    seAt200: Number(se(200).toFixed(3)),
    roundsNeededForEffect: { '0.25': nFor(0.25), '0.10': nFor(0.1), '0.05': nFor(0.05) },
  },
}
console.log(JSON.stringify(out, null, 2))
fs.writeFileSync('research/exp/e69.json', JSON.stringify(out, null, 2))
