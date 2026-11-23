// The one failure mode that verifies and still lies: the right shelf, wrong book.
//
// `2609.02138` writes "Hyperband: A Novel Bandit-Based Approach" next to
// `arXiv:1903.11059`. That id is AlphaX. A reader that trusts the id fetches a
// real, readable paper, deposits 6 verbatim passages as evidence, and every one
// of them verifies -- quoting sentences from a paper the note does not name.
// Nothing downstream can catch it: the hashes are right, the quotes are right,
// the title is wrong.
//
// So the fetched body has to agree with the title the survey attributed to the
// id before anything is deposited, an unrendered stub is reported as unread
// rather than as a paper whose terms did not match, and the run exits non-zero
// when either happened, so "8 of 8" cannot mean "8 bodies, 1 of them wrong".
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SCRIPT = fileURLToPath(new URL('../../scripts/research-deepread.mjs', import.meta.url))
const NODE = process.execPath
let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const page = ({ title, heading, body }) =>
  `<!DOCTYPE html><html><head><title>${title}</title></head><body>` +
  `<section id="S1"><h2 class="ltx_title ltx_title_section"><span class="ltx_tag">1</span> Introduction</h2>` +
  `${heading ? `<h1 class="ltx_title ltx_title_document">${heading}</h1>` : ''}` +
  // `class="ltx_p"` is not decoration: the script treats a cache file without
  // it as an unrendered body and refetches, so a fixture missing it silently
  // tests the network instead of the fixture.
  `<p id="S1.p1.1" class="ltx_p">${body}</p>` +
  `</section></body></html>`

const REAL = page({
  title: 'Hyperband: A Novel Bandit-Based Approach',
  heading: 'Hyperband: A Novel Bandit-Based Approach',
  body: 'We propose Hyperband, a bandit-based approach to hyperparameter optimization that allocates a fixed budget across brackets and stops the worst configurations early. '.repeat(2),
})
const WRONG = page({
  title: 'AlphaX: eXploring Neural Architectures',
  heading: 'AlphaX: eXploring Neural Architectures',
  body: 'AlphaX is a scalable Monte Carlo tree search design agent that discovers neural architectures without human intervention and exceeds state of the art. '.repeat(2),
})
const STUB = `<!DOCTYPE html><html><head><title>Proximal Policy Optimization Algorithms</title></head><body>See pages 1-last of ppo-min.pdf</body></html>`

const { readPaper } = await import('../../scripts/research-deepread.mjs')

// readPaper is pure: a body in, a reading out. The guard is its verdict.
{
  const read = readPaper('1903.11059', REAL, ['hyperband', 'budget'], { expect: 'Hyperband: A Novel Bandit-Based Approach' })
  assert.equal(read.mismatch, false, 'a matching title is not a mismatch')
  assert.ok(read.similarity >= 0.9)
  ok('a body whose heading matches the expected title is deposited')
}
{
  const read = readPaper('1903.11059', WRONG, ['hyperband', 'budget'], { expect: 'Hyperband: A Novel Bandit-Based Approach' })
  assert.equal(read.mismatch, true, 'a wrong paper behind the right id is a mismatch')
  assert.ok(read.similarity < 0.5, 'the similarity is what says so, not an exact string compare')
  ok('a body behind the right id but titled something else is a mismatch')
}
{
  // Without an expected title there is nothing to disagree with, so the reading
  // stands: the guard is a claim about identity, not a requirement.
  const read = readPaper('9999.99999', WRONG, ['alphax'])
  assert.equal(read.mismatch, false)
  assert.equal(read.similarity, null)
  ok('with no expected title there is no mismatch to report')
}

// The CLI: a temp cache, so the run never touches the network and never writes
// into the repo's real cache.
const work = mkdtempSync(join(tmpdir(), 'deepexpect-'))
const cache = join(work, 'cache')
mkdirSync(join(cache, 'deep'), { recursive: true })
writeFileSync(join(cache, 'deep', '1903.11059.html'), REAL)
writeFileSync(join(cache, 'deep', '2405.00001.html'), WRONG)
writeFileSync(join(cache, 'deep', '1707.06347.html'), STUB)

// The CLI runs the real script against a fixture cache (`--cache`), so the run
// touches neither the network nor the repo's cache.
const runCopy = (args) => {
  try {
    return { code: 0, out: execFileSync(NODE, [SCRIPT, ...args, '--cache', join(cache, 'deep')], { encoding: 'utf8', stdio: 'pipe' }) }
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout || ''}${err.stderr || ''}` }
  }
}

{
  const expectFile = join(work, 'expect.json')
  writeFileSync(expectFile, JSON.stringify({ '1903.11059': 'Hyperband: A Novel Bandit-Based Approach' }))
  const res = runCopy(['--ids', '1903.11059', '--terms', 'hyperband,budget', '--expect', expectFile])
  assert.equal(res.code, 0, res.out)
  assert.match(res.out, /1903\.11059/)
  assert.doesNotMatch(res.out, /mismatch/)
  ok('a matching body passes the CLI guard')
}
{
  const expectFile = join(work, 'expect2.json')
  writeFileSync(expectFile, JSON.stringify({ '2405.00001': 'Hyperband: A Novel Bandit-Based Approach' }))
  // `--no-resolve` on purpose: this pins the guard's own verdict, and letting it
  // search by title would make the assertion depend on the network.
  const res = runCopy(['--ids', '2405.00001', '--terms', 'hyperband,budget', '--expect', expectFile, '--no-resolve'])
  assert.notEqual(res.code, 0, 'a mismatch must fail the run')
  assert.match(res.out, /mismatch/)
  ok('a mismatched body fails the run instead of passing quietly')
}
{
  const expectFile = join(work, 'expect3.json')
  writeFileSync(expectFile, JSON.stringify({ '1707.06347': 'Proximal Policy Optimization Algorithms' }))
  const res = runCopy(['--ids', '1707.06347', '--terms', 'policy,clip', '--expect', expectFile])
  assert.match(res.out, /no rendered body/, 'a stub is reported as unread, not as an empty paper')
  assert.notEqual(res.code, 0)
  ok('a PDF-only submission is reported as unread rather than as no-match')
}

rmSync(work, { recursive: true, force: true })
console.log(`\n${pass}/6 assertions`)
