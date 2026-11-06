import { pairedImpacts, applyImpacts, shouldQuarantine, deriveLesson, hashId, NOISE } from '../src/knowledge/impact.js'
import { pickSurvivors, screenEnabled } from '../src/runtime/halving.js'
import { reduce, emptyState } from '../src/core/reduce.js'

let passed = 0
let failed = 0
function ok(cond, name) {
  if (cond) {
    passed += 1
    console.log(`ok ${passed} - ${name}`)
  } else {
    failed += 1
    console.error(`not ok ${passed + failed} - ${name}`)
  }
}
const eq = (a, b, name) => ok(Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b), `${name} (got ${JSON.stringify(a)})`)
const near = (a, b, name) => ok(Math.abs(a - b) < 1e-9, `${name} (got ${a} want ${b})`)

// ---------------------------------------------------------------- pairedImpacts
{
  const attempts = [
    { id: 'r1a1', score: 0.4, lessons: [] },
    { id: 'r1a2', score: 0.7, lessons: ['lsn-a'] },
    { id: 'r1a3', score: 0.3, lessons: ['lsn-b'] },
  ]
  const imp = pairedImpacts({ attempts, round: 1 })
  eq(imp.length, 2, 'pairedImpacts: one row per treated attempt')
  eq(imp[0].lessonId, 'lsn-a', 'pairedImpacts: keeps lesson id')
  near(imp[0].delta, 0.3, 'pairedImpacts: delta measured against the control')
  eq(imp[0].outcome, 'gain', 'pairedImpacts: better than control is a gain')
  eq(imp[1].outcome, 'harm', 'pairedImpacts: worse than control is harm')
  near(imp[1].delta, -0.1, 'pairedImpacts: harm delta is negative')
  eq(imp[0].controlId, 'r1a1', 'pairedImpacts: control id recorded')
}
{
  const imp = pairedImpacts({
    attempts: [
      { id: 'a1', score: 0.5, lessons: [] },
      { id: 'a2', score: 0.5 + NOISE / 2, lessons: ['l'] },
    ],
  })
  eq(imp[0].outcome, 'neutral', 'pairedImpacts: sub-noise difference is neutral')
}
{
  eq(pairedImpacts({ attempts: [{ id: 'a', score: 1, lessons: ['l'] }] }).length, 0, 'pairedImpacts: no control -> no evidence')
  eq(pairedImpacts({}).length, 0, 'pairedImpacts: empty input is safe')
  const withScreen = pairedImpacts({
    attempts: [
      { id: 'a0', screenedOut: true, score: 0 },
      { id: 'a1', score: 0.2, lessons: [] },
      { id: 'a2', score: 0.2, lessons: ['l'] },
    ],
  })
  eq(withScreen.length, 1, 'pairedImpacts: screened-out attempts are never the control')
  eq(withScreen[0].controlId, 'a1', 'pairedImpacts: control skips screened-out attempts')
}

// ----------------------------------------------------------------- applyImpacts
{
  const lessons = [{ id: 'l1', useCount: 1, gainSum: 0.1, harmCount: 0, status: 'active' }]
  const next = applyImpacts(lessons, [{ lessonId: 'l1', delta: 0.2, outcome: 'gain' }], { round: 4 })
  near(next[0].gainSum, 0.3, 'applyImpacts: accumulates gain')
  eq(next[0].useCount, 2, 'applyImpacts: increments use count')
  eq(next[0].harmCount, 0, 'applyImpacts: no harm from a gain')
  eq(next[0].lastUsedRound, 4, 'applyImpacts: stamps the round')
  eq(lessons[0].gainSum, 0.1, 'applyImpacts: does not mutate the input')
}
{
  const lessons = [{ id: 'l1', useCount: 0, gainSum: 0, harmCount: 0, status: 'active' }]
  const next = applyImpacts(lessons, [{ lessonId: 'l1', delta: -0.2, outcome: 'harm' }], { round: 2 })
  eq(next[0].harmCount, 1, 'applyImpacts: counts a harm')
  near(next[0].gainSum, -0.2, 'applyImpacts: negative deltas subtract')
  const unknown = applyImpacts(lessons, [{ lessonId: 'nope', delta: 1, outcome: 'gain' }], { round: 2 })
  eq(unknown[0].useCount, 0, 'applyImpacts: unknown lesson ids are ignored')
  eq(Array.isArray(applyImpacts(null, [])), true, 'applyImpacts: null lesson list is safe')
}

// -------------------------------------------------------------- shouldQuarantine
{
  eq(shouldQuarantine({ status: 'active', harmCount: 2, gainSum: -0.1, useCount: 2 }), true, 'quarantine: two harms and no net gain')
  eq(shouldQuarantine({ status: 'active', harmCount: 2, gainSum: 0.4, useCount: 4 }), false, 'quarantine: net gain survives harms')
  eq(shouldQuarantine({ status: 'active', harmCount: 0, gainSum: 0, useCount: 5 }), true, 'quarantine: five uses with nothing to show')
  eq(shouldQuarantine({ status: 'active', harmCount: 0, gainSum: 0, useCount: 4 }), false, 'quarantine: four uses is still on probation')
  eq(shouldQuarantine({ status: 'quarantined', harmCount: 9, gainSum: -1, useCount: 9 }), false, 'quarantine: already quarantined is left alone')
  eq(shouldQuarantine(null), false, 'quarantine: null is safe')
}

// ------------------------------------------------------------------ deriveLesson
{
  const lesson = deriveLesson({
    attempt: { id: 'r3a2', score: 0.8, report: { why: 'The parser rejected the token because the lexer never flushed the buffer.' } },
    task: { id: 't1', family: 'parser', tags: ['lexer'] },
    round: 3,
  })
  eq(lesson.kind, 'fact', 'deriveLesson: claims are facts by default')
  eq(lesson.family, 'parser', 'deriveLesson: family comes from the task')
  eq(lesson.status, 'active', 'deriveLesson: starts active')
  near(lesson.confidence, 0.5, 'deriveLesson: confidence starts at 0.5')
  eq(lesson.useCount, 0, 'deriveLesson: never used yet')
  ok(lesson.claim.startsWith('The parser rejected'), 'deriveLesson: claim is the mechanism')
  ok(/round 3 attempt r3a2/.test(lesson.evidence), 'deriveLesson: evidence cites the attempt')
  ok(lesson.id.startsWith('lsn-'), 'deriveLesson: id is a lesson id')
  eq(
    deriveLesson({ attempt: { id: 'x', report: {} }, task: { id: 't1' }, round: 1 }),
    null,
    'deriveLesson: no why -> no lesson',
  )
  const long = deriveLesson({ attempt: { id: 'x', report: { why: 'a'.repeat(500) } }, task: { id: 't1' }, round: 1 })
  ok(long.claim.length <= 240, 'deriveLesson: claims are clamped')
  eq(hashId('same'), hashId('same'), 'hashId: stable')
  ok(hashId('a') !== hashId('b'), 'hashId: distinct inputs differ')
}

// ------------------------------------------------------------------- pickSurvivors
{
  const r = pickSurvivors([
    { id: 'a1', ok: true, score: 1 },
    { id: 'a2', ok: false, score: 0 },
    { id: 'a3', ok: true, score: 1 },
    { id: 'a4', ok: false, score: 0 },
  ])
  eq(r.keep, 2, 'halving: half of four survive')
  eq(r.survivors.length, 2, 'halving: two survivors')
  eq(r.dropped.length, 2, 'halving: two dropped')
  eq(r.survivors[0], 'a1', 'halving: passing candidates first, earliest wins ties')
  eq(r.survivors[1], 'a3', 'halving: second pass survives')
}
{
  const r = pickSurvivors([])
  eq(r.survivors.length, 0, 'halving: empty input')
  const one = pickSurvivors([{ id: 'solo', ok: false, score: 0 }])
  eq(one.survivors[0], 'solo', 'halving: a single candidate always survives')
  const ratio = pickSurvivors([{ id: 'a', ok: false, score: 0.1 }, { id: 'b', ok: false, score: 0.9 }], { keepRatio: 0.5 })
  eq(ratio.survivors[0], 'b', 'halving: score breaks ties among failures')
  const all = pickSurvivors([{ id: 'a', ok: true }, { id: 'b', ok: true }], { keepRatio: 1 })
  eq(all.keep, 2, 'halving: keepRatio 1 keeps everything')
}
{
  eq(screenEnabled({ task: { screen: { cmd: 'npm test' } }, config: { halving: { enabled: true } }, candidates: 2 }), true, 'screen: enabled with cmd and several candidates')
  eq(screenEnabled({ task: { screen: { cmd: 'x' } }, config: { halving: { enabled: false } }, candidates: 2 }), false, 'screen: config disables it')
  eq(screenEnabled({ task: {}, config: { halving: { enabled: true } }, candidates: 4 }), false, 'screen: task without a screen check')
  eq(screenEnabled({ task: { screen: { cmd: 'x' } }, config: { halving: { enabled: true } }, candidates: 1 }), false, 'screen: pointless with one candidate')
  eq(screenEnabled({}), false, 'screen: empty input')
}

// ---------------------------------------------------- reducer: lesson event fold
{
  const s = reduce(
    [
      { seq: 1, t: 'T1', type: 'lesson.added', actor: 'system', data: { lesson: { id: 'l1', family: 'parser', claim: 'x', kind: 'fact', confidence: 0.6 } } },
      { seq: 2, t: 'T2', type: 'lesson.impact', actor: 'system', data: { id: 'l1', delta: 0.25, harm: false, round: 2 } },
      { seq: 3, t: 'T3', type: 'lesson.impact', actor: 'system', data: { id: 'l1', delta: -0.1, harm: true, round: 3 } },
      { seq: 4, t: 'T4', type: 'lesson.quarantined', actor: 'system', data: { id: 'l1', reason: 'no gain' } },
    ],
    'c1',
  )
  eq(s.lessons.length, 1, 'reduce: one lesson')
  eq(s.lessons[0].id, 'l1', 'reduce: lesson id kept')
  eq(s.lessons[0].useCount, 2, 'reduce: impacts accumulate use count')
  near(s.lessons[0].gainSum, 0.15, 'reduce: impacts accumulate gain')
  eq(s.lessons[0].harmCount, 1, 'reduce: impacts accumulate harm')
  eq(s.lessons[0].status, 'quarantined', 'reduce: quarantine applied')
  eq(s.lessons[0].quarantineReason, 'no gain', 'reduce: quarantine reason kept')
  eq(emptyState().lessons.length, 0, 'reduce: fresh state has an empty lesson list')
}
{
  const s = reduce(
    [
      { seq: 1, t: 'T1', type: 'lesson.added', actor: 'system', data: { lesson: { id: 'l1', claim: 'v1' } } },
      { seq: 2, t: 'T2', type: 'lesson.added', actor: 'system', data: { lesson: { id: 'l1', claim: 'v2' } } },
      { seq: 3, t: 'T3', type: 'lesson.added', actor: 'system', data: {} },
    ],
    'c1',
  )
  eq(s.lessons.length, 1, 'reduce: re-adding the same lesson replaces it')
  eq(s.lessons[0].claim, 'v2', 'reduce: latest claim wins')
}

console.log(`\n${passed}/${passed + failed} passed`)
if (failed) process.exitCode = 1
