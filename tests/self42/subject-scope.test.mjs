// The checker must not take the gate's word for what a promotion touched.
//
// Fin-strategy, round 1 (campaign `fin-strategy3`, seq 13/16/19): the winning
// patch deleted two A-share legs and two bond legs outright and added a second
// Nasdaq tracker next to the first. The 7/7 thresholds passed, the gate recorded
// `testsClean: true`, and `scripts/live-report.mjs` printed `protocol: ok` —
// because nothing in the ledger says "this is a different portfolio now". The
// verifier had no lock on the subject, so the substitution left no trace a
// ledger reader could see.
//
// Two things follow, and both are mechanical:
//   1. When a task *does* declare an edit scope, the checker can read the patch's
//      own file list and say whether the landing stayed inside it — without
//      trusting `checks.scope`. That is the same posture as the cost, score and
//      gate checks: cross-check the claim against the bytes.
//   2. When a task declares no scope, the checker cannot certify that a landing
//      changed the mechanism rather than the subject. That is a *note*, not a
//      finding: it is a missing precondition on the experiment, and it must be
//      visible in the report instead of hidden behind `protocol: ok`.
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { report, renderLines } from '../../scripts/live-report.mjs'

const mk = () => mkdtempSync(join(tmpdir(), 'subject-scope-'))

function campaign({ filesChanged, scope, budget } = {}) {
  const dir = mk()
  const events = [
    { type: 'round.started', data: { n: 1, previousFailure: null } },
    { type: 'attempt.finished', data: { id: 'r1a1', verifierOk: true, costUsd: 0.01, diff: { files: filesChanged.length, filesChanged } } },
    { type: 'verifier.finished', data: { metrics: { killRate: 1 } } },
    { type: 'gate.evaluated', data: { checks: { verifierOk: true, hasPatch: true, testsClean: true, oracleClean: true } } },
    { type: 'round.finished', data: { n: 1, status: 'promoted', score: 1, scoreSource: 'killRate', costUsd: 0.01, promoted: true } },
  ]
  writeFileSync(join(dir, 'events.jsonl'), events.map((e) => JSON.stringify(e)).join('\n'))
  const state = { id: 'fake', budget: budget ?? { usd: 1, spentUsd: 0.01 }, evalset: { tasks: [{ id: 't-main', prompt: 'x', verify: { cmd: 'python score.py' } }] } }
  if (scope) state.evalset.tasks[0].verify.scope = { editable: scope }
  writeFileSync(join(dir, 'state.json'), JSON.stringify(state))
  return dir
}

// A landing that stayed inside the declared scope is quiet.
{
  const r = report({ dir: campaign({ filesChanged: ['src/core.py', 'src/rates.py'], scope: ['src/'] }), home: mk() })
  assert.equal(r.findings.length, 0, JSON.stringify(r.findings))
}

// A landing that wrote outside the declared scope is a finding, read from the
// patch's own file list rather than from the gate's claim.
{
  const r = report({ dir: campaign({ filesChanged: ['src/core.py', 'scratch/sweep.py'], scope: ['src/'] }), home: mk() })
  assert.ok(
    r.findings.some((f) => /outside the declared scope/.test(f.problem)),
    JSON.stringify(r.findings),
  )
  assert.match(renderLines(r).join('\n'), /outside the declared scope/)
}

// An experiment that declared no scope cannot distinguish a mechanism change
// from a subject change. Say so — but do not turn a missing precondition into a
// failure of the campaign.
{
  const r = report({ dir: campaign({ filesChanged: ['params.json'] }), home: mk() })
  assert.equal(r.findings.length, 0, JSON.stringify(r.findings))
  assert.ok(r.notes.some((n) => /no edit scope declared/.test(n)), JSON.stringify(r.notes))
  assert.match(renderLines(r).join('\n'), /note: no edit scope declared/)
}

// The declared-scope case must not also emit the note; it answered the question.
{
  const r = report({ dir: campaign({ filesChanged: ['src/core.py'], scope: ['src/'] }), home: mk() })
  assert.equal(r.notes.length, 0, JSON.stringify(r.notes))
}

console.log('ok - a landing is judged against the scope the task declared, and an undeclared scope is said out loud')
