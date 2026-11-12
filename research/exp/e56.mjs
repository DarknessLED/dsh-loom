// e56: does a whitespace-only patch already fail the gate?
//
// I was about to write a rule for the class "a non-empty diff whose every changed
// line is unchanged once whitespace is ignored" because loom-oracle's workspace
// briefly showed exactly that shape (`git diff` = 23 lines, `git diff -w` = empty,
// `git ls-files --eol` = `i/lf w/crlf`). Before adding the rule the cheap question
// is whether an existing rule already refuses the class -- the same mistake as
// docs/rsi-digest §1, where a differential oracle already existed and I nearly
// wrote a second one.
//
// Method: build the whitespace-only candidate for real (clone the fixture at its
// base commit, flip only line endings), then run it through the live decision
// path: real runVerifier -> real baseVerdict -> real earnedByDifferential.
// If earned is false, the class is already covered and no rule is needed.
//
// Run: node research/exp/e56.mjs

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const earnedMod = await import(pathToFileURL('C:/Projects/RSI/src/gate/earned.js').href)
const baselineMod = await import(pathToFileURL('C:/Projects/RSI/src/runtime/baseline.js').href)
const verifierMod = await import(pathToFileURL('C:/Projects/RSI/src/exec/verifier.js').href)

const FIXTURE = 'C:/tmp/oracle-live'
const BASE = '12bdf4c'
const MIN_GAIN = 0.05

const root = mkdtempSync(join(tmpdir(), 'loom-ws-'))
const out = { steps: [] }

try {
  const repo = join(root, 'repo')
  execFileSync('git', ['clone', '-q', '--no-hardlinks', FIXTURE, repo])
  execFileSync('git', ['-C', repo, 'checkout', '-q', '--detach', BASE])

  const command = `"${process.execPath}" check.mjs`
  const run = () => verifierMod.runVerifier({ cmd: command, cwd: repo })
  const campaignDir = join(root, 'campaign')

  const baseRes = await baselineMod.baseVerdict({ dir: campaignDir, cwd: repo, taskId: 'graded', base: BASE, command, run })
  out.steps.push({ step: 'base verdict', ok: baseRes.ok, metrics: baseRes.metrics, cached: baseRes.cached })

  // Flip ONLY line endings -- no content change at all.
  const before = readFileSync(join(repo, 'lib.mjs'), 'latin1')
  const flipped = before.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n')
  writeFileSync(join(repo, 'lib.mjs'), flipped, 'latin1')
  out.lineEndings = {
    before: { crlf: (before.match(/\r\n/g) || []).length, lf: (before.match(/\n/g) || []).length },
    after: { crlf: (flipped.match(/\r\n/g) || []).length, lf: (flipped.match(/\n/g) || []).length },
  }

  // Independent proof the change really is whitespace-only: git agrees.
  const diff = execFileSync('git', ['-C', repo, 'diff', '--numstat'], { encoding: 'utf8' }).trim()
  const diffW = execFileSync('git', ['-C', repo, 'diff', '-w', '--numstat'], { encoding: 'utf8' }).trim()

  const candidate = await baselineMod.baseVerdict({ dir: campaignDir, cwd: repo, taskId: 'graded', base: BASE, command, run })
  out.steps.push({ step: 'candidate verdict (line endings flipped)', ok: candidate.ok, metrics: candidate.metrics, cached: candidate.cached })

  const decision = earnedMod.earnedByDifferential({
    baseFailed: baseRes.ok ? false : true,
    baseMetrics: baseRes.metrics ?? null,
    candidateMetrics: candidate.metrics ?? null,
    minGain: MIN_GAIN,
  })
  out.steps.push({ step: 'earned', decision })

  out.verdict = {
    diffNonEmpty: diff !== '',
    diffEmptyWhenIgnoringWhitespace: diffW === '',
    baseQuality: (baseRes.metrics || {}).quality ?? null,
    candidateQuality: (candidate.metrics || {}).quality ?? null,
    earned: decision.earned,
    earnedReason: decision.reason,
    classAlreadyRefused: decision.earned === false,
    diffStat: diff.split('\n')[0] || '',
  }
} finally {
  rmSync(root, { recursive: true, force: true })
}

console.log(JSON.stringify(out, null, 2))
