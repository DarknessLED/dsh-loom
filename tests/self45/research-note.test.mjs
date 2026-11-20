// A research note that cannot say how deeply it was read is a rumour with
// citations.
//
// The method here is not mine: it comes from the 3DGS paper-reading skill's
// evidence workflow (jaccen/Awesome-Gaussian-Skills, `3dgs-paper-reader/
// references/evidence-workflow.md`) plus its research-expert-team ledger. Five
// of its rules are mechanical, so they belong in a checker rather than in a
// promise:
//
//   1. A reachable identifier only proves a record exists — identity needs
//      title + authors + identifier, not a title and a guess.
//   2. Reading depth is declared (metadata / abstract / full) and a claim can
//      never be stronger than the depth: mechanism and evaluation claims read
//      from an abstract are gaps, not findings.
//   3. Author claim and reader inference are different types. Mixing them is
//      how a summary acquires conclusions the paper never made.
//   4. Every claim carries a locator (page, section, table, figure, anchor).
//   5. A delta is two cells under the same protocol, subtracted — not a number
//      recalled from two different setups.
//
// What this checks is the *form* of a note. It cannot check that the paper
// says what the note says; that still needs the locator to be opened.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { gradeNote } from '../../src/research/note.js'

let passed = 0
let failed = 0
function ok(name, cond, detail) {
  try {
    assert.ok(cond, detail)
    passed++
    console.log(`ok ${passed + failed} - ${name}`)
  } catch (err) {
    failed++
    console.log(`not ok ${passed + failed} - ${name} :: ${err?.message ?? err}`)
  }
}
const codes = (r) => r.findings.map((f) => f.code)

const good = () => ({
  identity: { title: '3D Gaussian Splatting for Real-Time Radiance Field Rendering', authors: ['Kerbl', 'Kopanas'], identifier: 'arXiv:2308.04079v1' },
  depth: 'full',
  claims: [
    {
      id: 'c1',
      type: 'author-claim',
      section: 'mechanism',
      text: 'Rasterises anisotropic 3D Gaussians with a tile-based splatting pass.',
      locator: 'sec.4 p.4',
    },
    {
      id: 'c2',
      type: 'measurement',
      section: 'evaluation',
      text: 'Reported PSNR on Mip-NeRF360 is 27.21 at 30k iterations.',
      locator: 'table 1',
      pair: [
        { name: '3DGS', value: 27.21, protocol: 'Mip-NeRF360, 30k iters, official' },
        { name: 'Mip-NeRF360', value: 27.69, protocol: 'Mip-NeRF360, 30k iters, official' },
      ],
      delta: -0.48,
    },
  ],
  gaps: [{ scope: 'ablations', text: 'Ablation table not retrieved.' }],
})

// 1. A complete note passes and reports its shape.
{
  const r = gradeNote(good())
  ok('a complete full-text note passes', r.ok === true, JSON.stringify(r.findings))
  ok('and counts its claims', r.counts.claims === 2, JSON.stringify(r.counts))
  ok('and counts author claims apart from inferences', r.counts.authorClaims === 1 && r.counts.inferences === 0, JSON.stringify(r.counts))
  ok('and counts gaps', r.counts.gaps === 1)
}

// 2. Identity: a title alone is not identity.
{
  const n = good()
  n.identity = { title: 'A paper', authors: [] }
  const r = gradeNote(n)
  ok('a missing identifier is a finding', codes(r).includes('identity-identifier'), JSON.stringify(codes(r)))
  ok('no authors is a finding', codes(r).includes('identity-authors'), JSON.stringify(codes(r)))
  ok('and the note does not pass', r.ok === false)
}

// 3. Depth: abstract-level mechanism claims are gaps, not findings.
{
  const n = good()
  n.depth = 'abstract'
  n.claims = [{ id: 'c1', type: 'author-claim', section: 'mechanism', text: 'It splats.', locator: 'abstract' }]
  const r = gradeNote(n)
  ok('a mechanism claim from an abstract is refused', codes(r).includes('depth-exceeds-reading'), JSON.stringify(codes(r)))
  const ok2 = good()
  ok2.depth = 'abstract'
  ok2.claims = [{ id: 'c1', type: 'author-claim', section: 'problem', text: 'It targets real-time rendering.', locator: 'abstract' }]
  ok('but an abstract can support a problem statement', gradeNote(ok2).ok === true, JSON.stringify(gradeNote(ok2).findings))
}

// 4. Claim types: inference must be labelled, not laundered as fact.
{
  const n = good()
  n.claims = [{ id: 'c1', type: 'fact', section: 'mechanism', text: 'It is fast.', locator: 'sec.1' }]
  const r = gradeNote(n)
  ok('an unknown claim type is a finding', codes(r).includes('claim-type'), JSON.stringify(codes(r)))
  const m = good()
  m.claims = [{ id: 'c2', type: 'reader-inference', section: 'mechanism', text: 'Probably also works for meshes.', locator: 'sec.6' }]
  const r2 = gradeNote(m)
  ok('an inference is allowed', r2.ok === true, JSON.stringify(r2.findings))
  ok('and is counted as one', r2.counts.inferences === 1)
}

// 5. Locators: a claim without one is an assertion.
{
  const n = good()
  n.claims = [{ id: 'c1', type: 'author-claim', section: 'mechanism', text: 'It splats.', locator: '' }]
  const r = gradeNote(n)
  ok('a claim without a locator is a finding', codes(r).includes('claim-locator'), JSON.stringify(codes(r)))
}

// 6. Deltas: two cells, same protocol, arithmetic that matches.
{
  const n = good()
  n.claims[1].delta = -0.1
  const r = gradeNote(n)
  ok('a delta that does not match its own cells is a finding', codes(r).includes('delta-mismatch'), JSON.stringify(codes(r)))

  const m = good()
  m.claims[1].pair[1].protocol = 'Mip-NeRF360, 7k iters, re-run'
  const r2 = gradeNote(m)
  ok('two cells under different protocols cannot make a delta', codes(r2).includes('delta-protocol'), JSON.stringify(codes(r2)))

  const k = good()
  delete k.claims[1].pair
  const r3 = gradeNote(k)
  ok('a delta without its cells is a finding', codes(r3).includes('delta-unpairable'), JSON.stringify(codes(r3)))
}

// 7. Gaps carry a scope, so "unknown" says where it is unknown.
{
  const n = good()
  n.gaps = [{ text: 'Not retrieved.' }]
  ok('a gap without a scope is a finding', codes(gradeNote(n)).includes('gap-scope'))
}

// 8. Junk input answers instead of throwing: the checker runs in a loop.
{
  ok('null is refused, not thrown', gradeNote(null).ok === false && codes(gradeNote(null)).includes('shape'))
  ok('an empty object is refused', gradeNote({}).ok === false)
}

// 9. The CLI is the way a session runs it: exit 1 on findings, 0 when clean.
{
  const dir = mkdtempSync(join(tmpdir(), 'note-'))
  const bad = join(dir, 'bad.json')
  writeFileSync(bad, JSON.stringify({ identity: { title: 'x' }, depth: 'metadata', claims: [] }), 'utf8')
  let code = 0
  let out = ''
  try {
    out = execFileSync(process.execPath, [new URL('../../scripts/check-note.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), bad], { encoding: 'utf8' })
  } catch (err) {
    code = err.status ?? 1
    out = String(err.stdout ?? '') + String(err.stderr ?? '')
  }
  ok('the cli exits 1 on a bad note', code === 1, `${code} ${out.slice(0, 200)}`)
  ok('and prints the finding codes', /identity-identifier/.test(out), out.slice(0, 300))

  const goodFile = join(dir, 'good.json')
  writeFileSync(goodFile, JSON.stringify(good()), 'utf8')
  const okOut = execFileSync(process.execPath, [new URL('../../scripts/check-note.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), goodFile], { encoding: 'utf8' })
  ok('the cli exits 0 on a clean note', /ok/i.test(okOut), okOut.slice(0, 200))
}

console.log(`# passed ${passed}, failed ${failed}`)
process.exit(failed === 0 ? 0 : 1)
