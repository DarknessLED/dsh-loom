// arXiv sometimes answers `/html/<id>` with a page that only points at the PDF:
// a title, a sentence saying "See pages 1-last of foo.pdf", and nothing else.
//
// That page parses. It yields a title, zero sections, zero mechanisms, no
// abstract and no figure — a record that says "this paper has no method" about a
// paper that has one. PPO reached the r2 library exactly that way. A fetching
// failure must be reported as missing with a reason, not dressed as a record.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildLibrary } from '../../scripts/research-work.mjs'

const checks = []
async function check(name, fn) {
  try {
    await fn()
    checks.push({ name, ok: true })
  } catch (err) {
    checks.push({ name, ok: false, err })
  }
}

const POINTER = `<!DOCTYPE html><html><head><title>Untitled Document</title></head><body>
<div class="ltx_page_main"><div class="ltx_page_content">
<p>See pages 1-last of ppo-min.pdf</p>
</div></div></body></html>`

const REAL = `<!DOCTYPE html><html><head><title>Real</title></head><body>
<div id="abstract1" class="ltx_abstract"><h6 class="ltx_title ltx_title_abstract">Abstract</h6>
<p id="abstract1.1" class="ltx_p">A real paper with a real abstract that is long enough to be prose
rather than a placeholder, and that says what the paper is about in more than one clause.</p></div>
<section id="S1" class="ltx_section"><h2 class="ltx_title ltx_title_section">1 Introduction</h2>
<p id="S1.p1.1" class="ltx_p">Judging a candidate edit is the bottleneck, and a noisy verifier is the
default state of the field rather than an accident to be apologised for.</p></section>
</body></html>`

function cacheWith(entries) {
  const dir = mkdtempSync(join(tmpdir(), 'loom-stub-'))
  mkdirSync(dir, { recursive: true })
  for (const [id, html] of Object.entries(entries)) writeFileSync(join(dir, `${id}.html`), html, 'utf8')
  return dir
}

await check('a pdf pointer is missing with a reason, not a record with no method', async () => {
  const cache = cacheWith({ '1707.06347': POINTER, '2601.00001': REAL })
  const result = await buildLibrary({
    ids: [{ id: '1707.06347' }, { id: '2601.00001' }],
    cache,
    fetch: false,
  })
  assert.equal(result.records.length, 1, JSON.stringify(result.records.map((r) => r.id)))
  assert.equal(result.records[0].id, '2601.00001')
  const missing = result.missing.find((m) => m.id === '1707.06347')
  assert.ok(missing, 'the pointer paper is reported')
  assert.match(missing.reason, /PDF/i)
})

await check('the pointer never becomes a record that claims there was no method', async () => {
  const cache = cacheWith({ '1707.06347': POINTER })
  const result = await buildLibrary({ ids: [{ id: '1707.06347' }], cache, fetch: false })
  assert.equal(result.records.length, 0)
  assert.equal(result.missing.length, 1)
})

await check('a rendered paper that mentions its own supplement is still a record', async () => {
  const withMention = REAL.replace(
    'a noisy verifier is',
    'a noisy verifier (see pages 3-9 of the supplement.pdf for the full tables) is',
  )
  const cache = cacheWith({ '2601.00002': withMention })
  const result = await buildLibrary({ ids: [{ id: '2601.00002' }], cache, fetch: false })
  assert.equal(result.records.length, 1, 'a paper quoting that sentence is not a stub')
})

let failed = 0
for (const c of checks) {
  if (c.ok) {
    console.log(`ok - ${c.name}`)
  } else {
    failed += 1
    console.log(`not ok - ${c.name}`)
    console.log(String(c.err && c.err.stack ? c.err.stack : c.err).split('\n').slice(0, 6).join('\n'))
  }
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
if (failed) process.exit(1)
