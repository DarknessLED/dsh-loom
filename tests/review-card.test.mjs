// The card a person is asked to approve has to carry the four facts a reviewer
// needs: which task, what the diff does, what the verifier said, and what could
// break. These assertions pin each block, and pin that a missing block is said
// out loud -- an empty field reads as "fine".
import { assessRisk, cardEvidence, renderEvidence } from '../src/runtime/review-card.js'

let pass = 0
let fail = 0
const ok = (name, cond, detail) => {
  if (cond) pass += 1
  else {
    fail += 1
    console.log(`not ok - ${name}${detail ? ` :: ${detail}` : ''}`)
  }
}

const task = {
  id: 'mut-runtime-triangle',
  prompt: 'Add assertions to the specs in verify.scope so more one-token bugs make a spec fail.',
  verify: { cmd: 'node research/mutants/task.mjs', scope: { editable: ['tests/balance/hedge-stats.test.mjs'] } },
}
const attempt = {
  id: 'r3a1',
  patch: 'C:/tmp/r3a1.patch',
  exitCode: 0,
  diff: { files: 1, insertions: 12, deletions: 2, filesChanged: ['tests/balance/hedge-stats.test.mjs'] },
}
const goodChecks = {
  verifierOk: true,
  hasPatch: true,
  testsClean: true,
  oracleClean: true,
  oracleInBase: true,
  beatsIncumbent: true,
  baseFailed: false,
  earnedReason: 'metric-improved',
  earnedByMetric: true,
  earnedMetric: { name: 'quality', from: 0, to: 0.05 },
  scope: { editable: ['tests/balance/hedge-stats.test.mjs'], checked: 1, violations: [] },
}

const full = cardEvidence({ task, attempt, score: 0.335, checks: goodChecks, policyMinGain: 0.03 })
ok('task block names the task', full.task.id === 'mut-runtime-triangle')
ok('task block carries the prompt', full.task.prompt.startsWith('Add assertions'))
ok('task block carries the declared scope', full.task.scope[0] === 'tests/balance/hedge-stats.test.mjs')
ok('diff block carries the file count', full.diff.files === 1 && full.diff.insertions === 12)
ok('diff block carries the paths', full.diff.paths[0] === 'tests/balance/hedge-stats.test.mjs')
ok('verifier block carries the exit code', full.verifier.ok === true && full.verifier.exitCode === 0)
ok('verifier block carries the metric move', full.verifier.metric.from === 0 && full.verifier.metric.to === 0.05)
ok('a clean round is low risk', full.risk.level === 'low', JSON.stringify(full.risk))
ok('nothing is reported missing when all four blocks exist', full.missing.length === 0, full.missing.join(','))

// The risk ladder is ordered: a patch that reaches the measuring instrument is a
// refusal, a big diff is only a burden.
const noPatch = cardEvidence({ task, attempt: { id: 'r1a1', diff: attempt.diff }, score: 0, checks: { ...goodChecks, hasPatch: false, verifierOk: false } })
ok('no patch is high risk', noPatch.risk.level === 'high', JSON.stringify(noPatch.risk))
ok('no patch says there is nothing to accept', /nothing here to accept/.test(noPatch.risk.reasons.join(' ')))
ok('a missing patch is reported missing', noPatch.missing.includes('patch file'), noPatch.missing.join(','))

const outsideScope = cardEvidence({
  task,
  attempt,
  score: 1,
  checks: { ...goodChecks, testsClean: false, scope: { editable: ['tests/balance/hedge-stats.test.mjs'], checked: 2, violations: ['src/runtime/triangle.js'] } },
})
ok('an out-of-scope path is high risk', outsideScope.risk.level === 'high')
ok('the violation is named', /src\/runtime\/triangle\.js/.test(outsideScope.risk.reasons.join(' ')))

const editedOracle = cardEvidence({ task, attempt, score: 1, checks: { ...goodChecks, oracleClean: false } })
ok('editing the verifier is high risk', editedOracle.risk.level === 'high')
ok('the oracle reason is explicit', /file the verifier runs/.test(editedOracle.risk.reasons.join(' ')))

const unearned = cardEvidence({ task, attempt, score: 1, checks: { ...goodChecks, earnedByMetric: false, earnedMetric: null, baseFailed: false } })
ok('a verdict with no metric and no red base is medium risk', unearned.risk.level === 'medium', JSON.stringify(unearned.risk))
ok('the missing reason is reported', unearned.missing.includes('why the verdict is a gain'), unearned.missing.join(','))

const big = cardEvidence({ task, attempt: { ...attempt, diff: { ...attempt.diff, insertions: 500, deletions: 20 } }, score: 1, checks: goodChecks })
ok('a large diff is medium risk', big.risk.level === 'medium', JSON.stringify(big.risk))
ok('the diff size is quoted', /520 changed lines/.test(big.risk.reasons.join(' ')))

const beatsNo = cardEvidence({ task, attempt, score: 0.5, checks: { ...goodChecks, beatsIncumbent: false } })
ok('not beating the task best is high risk', beatsNo.risk.level === 'high')

// Rendering: four lines, always in the same order, so a reader learns where to look.
const lines = renderEvidence(full)
ok('rendering produces the four blocks in order', /^task: /.test(lines[0]) && /^diff: /.test(lines[1]) && /^verifier: /.test(lines[2]) && /^risk: /.test(lines[3]), lines.join(' | '))
ok('rendering states the risk level', /risk: low/.test(lines[3]))
ok('a clean card says why it is clean rather than going blank', /none of the checks found a reason to hesitate/.test(lines[3]))
const missingLines = renderEvidence(noPatch)
ok('a card with holes says so', missingLines.some((l) => /^missing: /.test(l)), missingLines.join(' | '))
ok('rendering nothing is empty rather than a lie', renderEvidence(null).length === 0)

const risk = assessRisk({ checks: goodChecks, diff: { files: 1, insertions: 3, deletions: 0 } })
ok('assessRisk defaults to low without a reason to escalate', risk.level === 'low' && risk.reasons.length === 0)

console.log(`${fail === 0 ? 'ok' : 'FAIL'} - review-card ${pass}/${pass + fail}`)
if (fail > 0) process.exit(1)
