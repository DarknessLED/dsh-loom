// The paired-evidence number in docs/l2-state.md must be reproducible from the
// ledger, not remembered.
//
// The doc says 470 of 483 rounds contributed zero paired outcomes because the
// base side was never read on the same instrument. That came from a throwaway
// script, so nobody could re-derive it. `scripts/pair-audit.mjs` is the
// committed version: it reconstructs each attempt's kill rate from
// `attempt.finished`, reads the base from `gate.evaluated.checks.baseMetrics`,
// pairs them with the module's own `pairAgainstBase`, and runs the same
// `commitDecision` over the result.
//
// Three things this spec insists on, because each one is a way an audit can lie:
//   - a campaign whose ledger predates the fields is reported as unmeasured, not
//     as zero pairs — absence is not a tie and not a zero;
//   - the rule's answer is the exported rule's answer (it is imported, not
//     reimplemented), so the audit cannot drift from the gate it audits;
//   - the script never writes to the loom home it reads.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, statSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { commitDecision } from '../../src/gate/sequential.js'

const here = dirname(fileURLToPath(import.meta.url))
const SCRIPT = resolve(here, '..', '..', 'scripts', 'pair-audit.mjs')

function event(seq, type, data) {
  return JSON.stringify({ seq, t: 1_700_000_000_000 + seq, type, actor: 'system', data })
}

function writeCampaign(home, id, lines) {
  const dir = join(home, 'campaigns', id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'events.jsonl'), `${lines.join('\n')}\n`, 'utf8')
}

// A campaign that wrote both sides of the comparison: two formed pairs (one won,
// one lost) and one deliberate tie.
function pairedCampaign() {
  return [
    event(1, 'campaign.created', { id: 'paired', objective: 'fixture' }),
    event(2, 'round.started', { n: 1 }),
    event(3, 'attempt.finished', { id: 'r1a1', round: 1, taskId: 't1', score: 0.7, verifierOk: true, metrics: { killRate: 0.7 } }),
    event(4, 'gate.evaluated', {
      candidateId: 'r1a1', round: 1, promoted: true, score: 0.7,
      checks: { verifierOk: true, baseMetrics: { killRate: 0.3 } },
      pairsThisRound: 1, pairReason: 'candidate-won', decision: 'defer', eValue: 1.5,
    }),
    event(5, 'round.started', { n: 2 }),
    event(6, 'attempt.finished', { id: 'r2a1', round: 2, taskId: 't1', score: 0.4, verifierOk: true, metrics: { killRate: 0.4 } }),
    event(7, 'gate.evaluated', {
      candidateId: 'r2a1', round: 2, promoted: false, score: 0.4,
      checks: { verifierOk: true, baseMetrics: { killRate: 0.5 } },
      pairsThisRound: 1, pairReason: 'candidate-lost', decision: 'defer', eValue: 0.75,
    }),
    event(8, 'round.started', { n: 3 }),
    event(9, 'attempt.finished', { id: 'r3a1', round: 3, taskId: 't1', score: 0.6, verifierOk: true, metrics: { killRate: 0.6 } }),
    event(10, 'gate.evaluated', {
      candidateId: 'r3a1', round: 3, promoted: false, score: 0.6,
      checks: { verifierOk: true, baseMetrics: { killRate: 0.6 } },
      pairsThisRound: 0, pairReason: 'equal-inside-epsilon', decision: 'defer', eValue: 0.75,
    }),
  ]
}

// A campaign whose ledger predates the paired fields: a gate with no
// `checks.baseMetrics` and no `decision` at all. The candidate was measured;
// the base side was never read.
function legacyCampaign() {
  return [
    event(1, 'campaign.created', { id: 'legacy', objective: 'fixture' }),
    event(2, 'round.started', { n: 1 }),
    event(3, 'attempt.finished', { id: 'r1a1', round: 1, taskId: 't1', score: 0.2, verifierOk: true, metrics: { killRate: 0.2 } }),
    event(4, 'gate.evaluated', { candidateId: 'r1a1', round: 1, promoted: false, score: 0.2, checks: { verifierOk: true } }),
  ]
}

function fixtureHome() {
  const home = mkdtempSync(join(tmpdir(), 'pair-audit-'))
  writeCampaign(home, 'paired', pairedCampaign())
  writeCampaign(home, 'legacy', legacyCampaign())
  return home
}

function snapshot(dir) {
  const out = []
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(d, entry.name)
      const rel = p.slice(dir.length).replace(/\\/g, '/')
      if (entry.isDirectory()) {
        out.push(`dir ${rel}`)
        walk(p)
      } else {
        const stat = statSync(p)
        out.push(`file ${rel} ${stat.size} ${readFileSync(p, 'utf8').length}`)
      }
    }
  }
  walk(dir)
  return out
}

const run = (args) =>
  execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

test('the audit reports a paired round as a pair and a silent base as unmeasured', () => {
  const home = fixtureHome()
  try {
    const text = run(['--home', home])
    // The paired campaign: three rounds, two of them carrying a pair.
    const paired = text.split('\n').find((l) => l.startsWith('paired'))
    assert.ok(paired, `the table has a row for the paired campaign:\n${text}`)
    assert.match(paired, /\b3\b/, 'three rounds')
    assert.match(paired, /\b2\b/, 'two rounds with a pair')
    assert.match(paired, /defer/, 'the rule did not commit on one win and one loss')

    // The old campaign is named as unmeasured, and its absence is not a tie.
    const legacy = text.split('\n').find((l) => l.startsWith('legacy'))
    assert.ok(legacy, `the table has a row for the legacy campaign:\n${text}`)
    assert.match(legacy, /unmeasured/)
    assert.match(text, /legacy: .*predates/, 'the output says why the old ledger was not measured')
    assert.doesNotMatch(text, /legacy[^\n]*\bzero pairs\b/, 'absence is not counted as zero pairs')

    // Totals and the honest denominator: the base was read once, the candidate
    // was measurable twice — those are different numbers and both are printed.
    assert.match(text, /totals: 2 campaigns, 4 rounds, 2 with a pair \(1 won, 1 lost\)/)
    // Three base readings: the two formed pairs and the deliberate tie all have
    // a base side; only the legacy round's base was silent. The candidate side
    // was measurable in all four, which is the point — a candidate with no base
    // is not a pair, and the denominator has to say so in both directions.
    assert.match(text, /denominator: 3 of 4 rounds had a base reading, 4 had a measurable candidate/)
    assert.match(text, /unmeasured: 1 campaign/)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('the decision printed is the exported rule applied to the recovered pairs', () => {
  const home = fixtureHome()
  try {
    const json = JSON.parse(run(['--home', home, '--json']))
    const paired = json.campaigns.find((c) => c.id === 'paired')
    assert.deepEqual(paired.sequence, [1, 0], 'the pairs, in round order')
    const rule = commitDecision({ discordant: paired.sequence, alpha: 0.05, lambda: 0.5 })
    assert.equal(paired.ruleDecision, rule.decision)
    assert.equal(paired.ruleEValue, rule.eValue)
    assert.equal(paired.ruleDecision, 'defer')
    assert.equal(paired.recordedDecision, 'defer')
    assert.equal(paired.differs, false)
    assert.equal(paired.pairReasons['equal-inside-epsilon'], 1)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('a campaign whose ledger predates the fields is unmeasured, not a tie', () => {
  const home = fixtureHome()
  try {
    const json = JSON.parse(run(['--home', home, '--json']))
    const legacy = json.campaigns.find((c) => c.id === 'legacy')
    assert.equal(legacy.status, 'unmeasured')
    assert.equal(legacy.pairs, 0)
    assert.equal(legacy.roundsWithBase, 0)
    assert.equal(legacy.roundsWithCandidate, 1, 'the candidate side was measured; only the base was silent')
    assert.equal(legacy.recordedDecision, null, 'no decision is recorded, which is not the same as agreeing')
    assert.equal(legacy.differs, null)
    assert.match(legacy.note, /predates/)
    assert.deepEqual(json.totals.unmeasured, ['legacy'])
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('--campaign restricts the audit to one campaign', () => {
  const home = fixtureHome()
  try {
    const json = JSON.parse(run(['--home', home, '--campaign', 'legacy', '--json']))
    assert.deepEqual(json.campaigns.map((c) => c.id), ['legacy'])
    const text = run(['--home', home, '--campaign', 'paired'])
    assert.match(text, /totals: 1 campaign, 3 rounds/)
    assert.doesNotMatch(text, /^legacy/m)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('reading the home never writes to it', () => {
  const home = fixtureHome()
  try {
    const before = snapshot(home)
    run(['--home', home])
    run(['--home', home, '--json'])
    run(['--home', home, '--campaign', 'paired'])
    assert.deepEqual(snapshot(home), before, 'the audit is read-only: no file added, none changed')
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('a home with no campaigns directory is an error, not an empty success', () => {
  const home = mkdtempSync(join(tmpdir(), 'pair-audit-empty-'))
  try {
    const res = spawnSync(process.execPath, [SCRIPT, '--home', home], { encoding: 'utf8' })
    assert.notEqual(res.status, 0, 'nothing to audit must not read as "zero pairs everywhere"')
    assert.match(`${res.stdout}${res.stderr}`, /no campaigns directory/)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
