// The protocol checker has one job: turn a ledger into "did this campaign keep
// its promises". A checker that cries wolf is worse than none, so each finding
// here is asserted twice — once that it fires, once that it stays quiet on the
// campaign that deserved it.
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { report, renderLines, issueDraft } from '../../scripts/live-report.mjs'

const mk = () => mkdtempSync(join(tmpdir(), 'live-report-'))

function campaign(events, { budget } = {}) {
  const dir = mk()
  writeFileSync(join(dir, 'events.jsonl'), events.map((e) => JSON.stringify(e)).join('\n'))
  if (budget) writeFileSync(join(dir, 'state.json'), JSON.stringify({ id: 'fake', budget }))
  return dir
}

const round = (n, { started = {}, attempts = [], verifier = null, gate = null, finished = {} }) => [
  { type: 'round.started', data: { n, ...started } },
  ...attempts.map((a) => ({ type: 'attempt.finished', data: a })),
  ...(verifier ? [{ type: 'verifier.finished', data: verifier }] : []),
  ...(gate ? [{ type: 'gate.evaluated', data: gate }] : []),
  { type: 'round.finished', data: { n, ...finished } },
]

const clean = () =>
  campaign(
    [
      ...round(1, {
        started: { previousFailure: null },
        attempts: [{ id: 'r1a1', verifierOk: true, costUsd: 0.01 }],
        verifier: { metrics: { killRate: 0.5 } },
        gate: { checks: { verifierOk: true, hasPatch: true, testsClean: true, oracleClean: true }, reason: 'no-gain' },
        finished: { status: 'no-gain', score: 0.5, scoreSource: 'killRate', costUsd: 0.01, promoted: false },
      }),
    ],
    { budget: { usd: 0.1, spentUsd: 0.01 } },
  )

// A campaign that kept its promises reports ok, and the renderer says so.
{
  const dir = clean()
  const r = report({ dir, home: dir })
  assert.equal(r.ok, true, renderLines(r).join('\n'))
  assert.equal(r.rounds.length, 1)
  assert.match(renderLines(r).join('\n'), /protocol: ok/)
}

// Money that left the round without being declared is a finding, not a note.
{
  const dir = campaign([
    ...round(1, {
      started: { previousFailure: null },
      attempts: [{ id: 'r1a1', verifierOk: true, costUsd: 0.01 }, { id: 'r1a2', verifierOk: false, costUsd: 0.02 }],
      finished: { status: 'no-gain', score: 0, scoreSource: 'binary', costUsd: 0.01, promoted: false },
    }),
  ])
  const r = report({ dir, home: dir })
  assert.equal(r.ok, false)
  assert.ok(r.findings.some((f) => /sum of its attempts/.test(f.problem)), JSON.stringify(r.findings))
}

// A round that lands while the gate said the tests were dirty is the one
// finding that would invalidate every other claim, so it must fire.
{
  const dir = campaign([
    ...round(1, {
      started: { previousFailure: null },
      attempts: [{ id: 'r1a1', verifierOk: true, costUsd: 0.01 }],
      gate: { checks: { verifierOk: true, hasPatch: true, testsClean: false, oracleClean: true } },
      finished: { status: 'promoted', score: 1, scoreSource: 'killRate', costUsd: 0.01, promoted: true },
    }),
  ])
  const r = report({ dir, home: dir })
  assert.ok(r.findings.some((f) => /testsClean: false/.test(f.problem)), JSON.stringify(r.findings))
}

// …and the same gate on a *rejected* round is honest, so it must stay quiet.
{
  const dir = campaign([
    ...round(1, {
      started: { previousFailure: null },
      attempts: [{ id: 'r1a1', verifierOk: false, costUsd: 0.01 }],
      gate: { checks: { verifierOk: false, hasPatch: true, testsClean: false, oracleClean: true } },
      finished: { status: 'no-gain', score: 0, scoreSource: 'binary', costUsd: 0.01, promoted: false },
    }),
  ])
  const r = report({ dir, home: dir })
  assert.equal(r.ok, true, JSON.stringify(r.findings))
}

// A round with no scoreSource cannot be told apart from a 0/1 collapse.
{
  const dir = campaign([
    ...round(1, {
      started: { previousFailure: null },
      attempts: [{ id: 'r1a1', verifierOk: true, costUsd: 0.01 }],
      finished: { status: 'promoted', score: 1, costUsd: 0.01, promoted: true },
    }),
  ])
  const r = report({ dir, home: dir })
  assert.ok(r.findings.some((f) => /no scoreSource/.test(f.problem)), JSON.stringify(r.findings))
}

// The failure channel: a failed round that is followed by one that was not
// told is a finding — but only on ledgers new enough to record the field.
{
  const events = [
    ...round(1, {
      started: { previousFailure: null },
      attempts: [{ id: 'r1a1', verifierOk: false, costUsd: 0.01 }],
      finished: { status: 'no-gain', score: 0, scoreSource: 'binary', costUsd: 0.01, promoted: false },
    }),
    ...round(2, {
      started: { previousFailure: null },
      attempts: [{ id: 'r2a1', verifierOk: true, costUsd: 0.01 }],
      finished: { status: 'promoted', score: 1, scoreSource: 'killRate', costUsd: 0.01, promoted: true },
    }),
  ]
  const r = report({ dir: campaign(events), home: mk() })
  assert.ok(r.findings.some((f) => /not handed the failure/.test(f.problem)), JSON.stringify(r.findings))

  const handed = events.map((e) =>
    e.type === 'round.started' && e.data.n === 2 ? { ...e, data: { ...e.data, previousFailure: { reason: 'verifier failed', chars: 120 } } } : e,
  )
  const r2 = report({ dir: campaign(handed), home: mk() })
  assert.equal(r2.ok, true, JSON.stringify(r2.findings))
  assert.equal(r2.rounds[1].handedFailure, true)
}

// Crossing the cap without recording it is exactly the thing a person would
// otherwise discover from a bank statement.
{
  const dir = campaign(
    [
      ...round(1, {
        started: { previousFailure: null },
        attempts: [{ id: 'r1a1', verifierOk: true, costUsd: 0.3 }],
        finished: { status: 'promoted', score: 1, scoreSource: 'killRate', costUsd: 0.3, promoted: true },
      }),
    ],
    { budget: { usd: 0.1, spentUsd: 0.3 } },
  )
  const r = report({ dir, home: dir })
  assert.ok(r.findings.some((f) => /cap was crossed/.test(f.problem)), JSON.stringify(r.findings))
  assert.equal(r.capUsd, 0.1)
}

// The issue draft has to be pasteable: campaign, evidence, a command that
// reproduces the finding.
{
  const dir = campaign([
    ...round(1, {
      started: { previousFailure: null },
      attempts: [{ id: 'r1a1', verifierOk: true, costUsd: 0.01 }],
      finished: { status: 'promoted', score: 1, costUsd: 0.01, promoted: true },
    }),
  ])
  const draft = issueDraft(report({ dir, home: dir }))
  assert.match(draft, /## 观察/)
  assert.match(draft, /## 复现/)
  assert.match(draft, /live-report\.mjs/)
  assert.match(draft, /no scoreSource/)
}

console.log('ok - a campaign that broke a promise cannot pass the protocol check quietly')
