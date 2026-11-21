// A seal is only worth something if a stranger can re-derive it.
//
// `research-replay.mjs` exists because everything else in this subsystem can be
// right while the reader still has no way to check. It reads a *directory of
// bytes* — the manifest, the report, the evidence blobs — and recomputes:
//
//   * the seal, from the manifest with the seal removed;
//   * each blob's hash, so "the page changed" is visible instead of assumed;
//   * the claim table, so "which sentences rested on a literal that was found"
//     survives out of the process that wrote them.
//
// Two things it deliberately does NOT do: it never re-fetches the origin (a
// re-fetch would prove today's page, not the bytes the claim was made against),
// and it never rewrites a verdict (a replay reports, it does not judge).
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { addClaim, addEvidence, sealReport, verifyClaim } from '../../src/research/ledger.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..', '..')
const SCRIPT = join(REPO, 'scripts', 'research-replay.mjs')

let passed = 0
let failed = 0
function ok(name) {
  passed++
  console.log(`ok ${passed + failed} - ${name}`)
}
function block(name, fn) {
  try {
    fn()
    ok(name)
  } catch (err) {
    failed++
    console.log(`not ok ${passed + failed} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n').join('\n  ')}`)
  }
}

function tempHome() {
  return mkdtempSync(join(tmpdir(), 'loom-replay-'))
}

// Build one sealed report in a throwaway loom home, the way the tool would.
function sealedFixture() {
  const home = tempHome()
  const ev = addEvidence(home, {
    origin: 'https://example.test/paper',
    title: 'A paper about measuring things',
    content: 'Measure twice. The evaluation budget pays for trial runs of candidate agents.\n',
  })
  const claim = addClaim(home, {
    text: 'The evaluation budget pays for trial runs, not for deployment.',
    evidenceIds: [ev.id],
    quotes: ['The evaluation budget pays for trial runs of candidate agents.'],
  })
  const verdict = verifyClaim(home, { ...claim, evidenceIds: claim.evidenceIds, quotes: claim.quotes })
  assert.equal(verdict.status, 'verified', 'fixture claim must verify before the replay is meaningful')
  const sealed = sealReport(home, {
    topic: 'replay-fixture',
    title: 'Replay fixture',
    sections: [{ heading: 'What it says', paragraphs: [{ text: 'Two budgets, not one.', claimIds: [claim.id] }] }],
    claims: [{ ...claim, status: verdict.status, note: verdict.note }],
    evidenceIds: [ev.id],
  })
  return { home, ev, claim, sealed }
}

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' })
}

block('every sealed report in a home replays, and the claim table comes back', () => {
  const { home, sealed } = sealedFixture()
  const out = run(['--home', home])
  assert.equal(out.status, 0, `expected exit 0, got ${out.status}: ${out.stderr}`)
  assert.match(out.stdout, /1\/1 seal\(s\) ok/)
  assert.match(out.stdout, /\[verified\]/)
  assert.match(out.stdout, /1\/1 verified/)
  assert.ok(out.stdout.includes(sealed.seal.slice(0, 16)), 'the seal it prints is the seal on disk')
  assert.match(out.stdout, /intact/)
})

block('a byte changed in the report body fails the seal, and nothing else is blamed', () => {
  const { home, sealed } = sealedFixture()
  const reportPath = join(sealed.dir, 'report.md')
  writeFileSync(reportPath, `${readFileSync(reportPath, 'utf8')}\nappended by hand\n`)

  const out = run(['--home', home])
  assert.equal(out.status, 1, 'a changed report must exit 1')
  assert.match(out.stdout, /FAIL/)
  assert.match(out.stdout, /0\/1 seal\(s\) ok/)
  assert.match(out.stdout, /report text changed/i, 'the reason names what changed')
})

block('a changed evidence blob is reported as tampered, not silently trusted', () => {
  const { home, ev } = sealedFixture()
  const blob = join(home, 'research', 'ledger', 'blobs', `${ev.hash}.txt`)
  writeFileSync(blob, 'the page was rewritten after the claim was made\n')

  const out = run(['--home', home])
  assert.equal(out.status, 0, 'a changed origin does not invalidate the seal — the manifest hashes are intact')
  assert.match(out.stdout, /TAMPERED/)
  assert.doesNotMatch(out.stdout, /intact   ev-/, 'the blob must not be called intact')
})

block('a claim that did not verify is shown with its verdict, never hidden', () => {
  const home = tempHome()
  const ev = addEvidence(home, { origin: 'https://example.test/x', content: 'The sky is blue today.\n' })
  const claim = addClaim(home, {
    text: 'The sky is green.',
    evidenceIds: [ev.id],
    quotes: ['The sky is green.'],
  })
  const verdict = verifyClaim(home, claim)
  assert.equal(verdict.status, 'contradicted')
  sealReport(home, {
    topic: 'replay-contradiction',
    title: 'Unverified fixture',
    sections: [{ heading: 'Body', paragraphs: [{ text: 'A claim that cannot be checked.', claimIds: [claim.id] }] }],
    claims: [{ ...claim, status: verdict.status, note: verdict.note }],
    evidenceIds: [ev.id],
  })

  const out = run(['--home', home])
  assert.match(out.stdout, /\[contradicted\]/)
  assert.match(out.stdout, /0\/1 verified/)
})

block('--json is the same answer in a shape another program can read', () => {
  const { home, sealed } = sealedFixture()
  const out = run(['--home', home, '--json'])
  assert.equal(out.status, 0)
  const parsed = JSON.parse(out.stdout)
  assert.equal(parsed.length, 1)
  assert.equal(parsed[0].ok, true)
  assert.equal(parsed[0].seal, sealed.seal)
  assert.equal(parsed[0].verified, 1)
  assert.equal(parsed[0].evidence[0].id, sealed.manifest.evidence[0].id)
  assert.equal(parsed[0].evidence[0].tampered, false)
})

block('an empty or missing home is a named failure, not a silent ok', () => {
  const home = tempHome()
  mkdirSync(join(home, 'research', 'ledger', 'reports'), { recursive: true })
  const out = run(['--home', home])
  assert.equal(out.status, 2)
  assert.match(out.stderr, /no sealed report/i)
})

block('a prefix picks one report and leaves the others alone', () => {
  const { home } = sealedFixture()
  const ev = addEvidence(home, { origin: 'https://example.test/y', content: 'Second report body here.\n' })
  const claim = addClaim(home, {
    text: 'Second report claim.',
    evidenceIds: [ev.id],
    quotes: ['Second report body here.'],
  })
  const v = verifyClaim(home, claim)
  sealReport(home, {
    topic: 'other-topic',
    title: 'Other',
    sections: [{ heading: 'Body', paragraphs: [{ text: 'Unrelated.', claimIds: [claim.id] }] }],
    claims: [{ ...claim, status: v.status, note: v.note }],
    evidenceIds: [ev.id],
  })

  const all = run(['--home', home])
  assert.match(all.stdout, /2\/2 seal\(s\) ok/)

  const one = run(['--home', home, 'replay-fixture'])
  assert.match(one.stdout, /1\/1 seal\(s\) ok/)
  assert.doesNotMatch(one.stdout, /other-topic/)
})

console.log(`\n# passed ${passed}, failed ${failed}`)
process.exit(failed ? 1 : 0)
