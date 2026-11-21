// Merging search results is where a survey quietly narrows itself.
//
// Five queries that all return the same top link should not produce five
// copies; a source found by three queries is stronger evidence than a source
// found by one; and two pages from the same host are usually the same page
// twice. Each of those is a decidable property of the batch list, so each gets
// pinned here.
//
// The passage extractor is the other half: evidence has to be a verbatim span
// of the page, chosen by the terms of the question, not a paraphrase. What it
// cannot do is check that the span supports the claim — that is what the note
// checker and a human are for.
//
// Ported from `dsh-deep-research/lib/research.js` (MIT, houdinicc); see
// THIRD_PARTY_NOTICES.md.
import assert from 'node:assert/strict'

import {
  domainOf,
  extractPassages,
  extractTerms,
  htmlToText,
  mergeSearchResults,
  normalizeUrl,
  selectFetchTargets,
  buildFollowupQueries,
} from '../../src/research/fetch.js'

let passed = 0
let failed = 0
// Each block ends with a call to this line: reaching it means every assertion
// in the block held, so the block itself is the check.
function ok(name) {
  passed++
  console.log(`ok ${passed + failed} - ${name}`)
}

// --- URL identity ---------------------------------------------------------

{
  assert.equal(normalizeUrl('HTTPS://Example.COM/A?utm_source=x&b=1#frag'), 'https://example.com/A?b=1')
  assert.equal(domainOf('https://Example.COM:8443/a'), 'example.com')
  assert.equal(normalizeUrl(''), '')
  assert.equal(normalizeUrl('not a url'), 'not a url', 'a string that will not parse comes back cleaned, not thrown')
  assert.equal(domainOf('junk'), '')
  assert.equal(normalizeUrl(null), '')
}
ok('a URL is identified by scheme, host and a stripped query — never by its tracking parameters')

// --- merge: rotation, dedupe, score --------------------------------------

{
  const batches = [
    { query: 'q1', sources: [{ url: 'https://a.test/1', title: 'A1' }, { url: 'https://b.test/1' }] },
    { query: 'q2', sources: [{ url: 'https://b.test/1', snippet: 'from q2' }, { url: 'https://c.test/1' }] },
  ]
  const merged = mergeSearchResults(batches, { maxSources: 10 })
  assert.deepEqual(
    merged.map((s) => s.url),
    ['https://b.test/1', 'https://a.test/1', 'https://c.test/1'],
    'a source two queries agree on outranks a source one query found',
  )
  // Rotation is still visible in `order`: rank 0 of both queries is claimed
  // before rank 1 of either, so c (rank 1 of q2) lands after a (rank 0 of q1).
  const rotated = mergeSearchResults(
    [
      { query: 'q1', sources: [{ url: 'https://x.test/0' }, { url: 'https://x.test/1' }] },
      { query: 'q2', sources: [{ url: 'https://y.test/0' }, { url: 'https://y.test/1' }] },
    ],
    { maxSources: 10 },
  )
  assert.deepEqual(
    rotated.map((s) => s.url),
    ['https://x.test/0', 'https://y.test/0', 'https://x.test/1', 'https://y.test/1'],
    'rotation interleaves by rank instead of concatenating queries',
  )
  const b = merged.find((s) => s.url === 'https://b.test/1')
  assert.equal(b.queries.length, 2, 'a source found twice records both queries')
  assert.equal(b.snippet, 'from q2', 'and keeps the field the first sighting lacked')
  assert.equal(b.title, undefined, 'a field neither sighting had is not invented')
  assert.equal(merged[0].url, 'https://b.test/1', 'the source two queries agreed on ranks first')
  assert.ok(b.score > merged[1].score, 'more queries found means a higher score')
  assert.equal(b.domain, 'b.test')
  assert.equal(b.bestRank, 0, 'the best rank it ever had across queries')

  assert.equal(mergeSearchResults([], { maxSources: 5 }).length, 0, 'no batches is an empty list')
  assert.equal(mergeSearchResults(null).length, 0)
  assert.equal(
    mergeSearchResults([{ query: 'q', sources: [{ url: 'https://a.test/1' }] }], { maxSources: 0 }).length,
    1,
    'maxSources 0 is "no cap", not "no results" — a cap of zero would silently empty a survey',
  )
  const junk = mergeSearchResults([{ query: 'q', sources: [null, {}, { url: '' }] }])
  assert.deepEqual(junk, [], 'sources without a URL are dropped, not kept as ghosts')
}
ok('merging rotates, dedupes by identity, and drops what has no URL')

// --- fetch targets: spread across hosts ----------------------------------

{
  const sources = [
    { url: 'https://a.test/1', domain: 'a.test', score: 30 },
    { url: 'https://a.test/2', domain: 'a.test', score: 29 },
    { url: 'https://a.test/3', domain: 'a.test', score: 28 },
    { url: 'https://b.test/1', domain: 'b.test', score: 27 },
    { url: 'https://c.test/1', domain: 'c.test', score: 26 },
  ]
  const picked = selectFetchTargets(sources, { fetchTop: 3, maxPerHost: 2 })
  assert.deepEqual(
    picked.map((s) => s.url),
    ['https://a.test/1', 'https://a.test/2', 'https://b.test/1'],
    'two per host at most, and the third slot goes to a different host rather than a third page of the same one',
  )
  assert.equal(selectFetchTargets(sources, { fetchTop: 0 }).length, 0, 'fetchTop 0 fetches nothing')
  assert.equal(selectFetchTargets([], { fetchTop: 3 }).length, 0)
}
ok('fetching spreads across hosts instead of reading one site three times')

// --- HTML to text --------------------------------------------------------

{
  const html = `<!DOCTYPE html><html><head><style>p{color:red}</style>
    <script>var x = 1 < 2</script></head>
    <body><h1>Title</h1><p>First &amp; second</p><p>Third&nbsp;line &#39;quoted&#39;</p>
    <!-- a comment --><div>Fourth</div></body></html>`
  const text = htmlToText(html)
  assert.ok(!/color:red|var x|a comment/.test(text), `script, style and comments are gone: ${text}`)
  assert.match(text, /Title/)
  assert.match(text, /First & second/, 'entities are decoded')
  assert.match(text, /Third line 'quoted'/, 'nbsp becomes a space')
  assert.match(text, /Fourth/)
  assert.ok(!/\n{3,}/.test(text), 'runs of blank lines collapse')
  assert.equal(htmlToText(null), '')
}
ok('a page becomes readable text without its script, style or comments')

// --- terms ---------------------------------------------------------------

{
  const terms = extractTerms('The verifier fails when the harness cheats on verifier')
  assert.ok(!terms.includes('the'), 'stopwords are dropped')
  assert.ok(terms.includes('verifier') && terms.includes('harness'))
  assert.equal(terms.filter((t) => t === 'verifier').length, 1, 'terms are deduped')

  const cjk = extractTerms('验证器为什么会失败')
  assert.ok(cjk.length > 0, 'a Chinese phrase yields bigrams')
  assert.ok(cjk.includes('验证'), `bigrams come from the run, got ${JSON.stringify(cjk)}`)
  assert.ok(!extractTerms('').length)
  assert.deepEqual(extractTerms(null), [])
}
ok('terms come from the question in its own language, minus stopwords')

// --- passages ------------------------------------------------------------

{
  const page = [
    '# Heading only',
    '',
    'The verifier is fooled when the harness writes the expected file directly, because nothing checks the provenance of that file.',
    '',
    'An unrelated paragraph about pricing tables and scheduling.',
    '',
    'A shorter note about verifier drift, which repeats verifier twice: verifier, verifier.',
  ].join('\n')

  const found = extractPassages(page, ['verifier'], { maxPassages: 2, maxChars: 200 })
  assert.equal(found.length, 2, 'the heading and the unrelated paragraph do not qualify')
  assert.ok(found.every((p) => /verifier/i.test(p.passage)), 'every passage mentions the term')
  assert.ok(found.every((p) => p.matchedTerms.includes('verifier')))
  assert.ok(found[0].score >= found[1].score, 'higher occurrence count first')
  assert.ok(found.every((p) => p.passage.length <= 200), 'passages respect maxChars')

  assert.deepEqual(extractPassages(page, []), [], 'no terms, no passages')
  assert.deepEqual(extractPassages('', ['verifier']), [])
  const short = extractPassages('verifier', ['verifier'])
  assert.deepEqual(short, [], 'a block under 40 chars is a fragment, not a passage')
}
ok('passages are verbatim spans chosen by the question\'s terms')

// --- follow-up queries ---------------------------------------------------

{
  const sources = [
    { url: 'https://a.test/1', content: 'reward hacking graded by a verifier that never inspects provenance of artifacts' },
    { url: 'https://b.test/1', content: 'reward hacking where the verifier is bypassed and provenance is never inspected' },
    { url: 'https://a.test/1', content: 'reward hacking graded by a verifier that never inspects provenance of artifacts' },
  ]
  const followups = buildFollowupQueries('verifier hacking', sources, { rounds: 2, maxQueries: 5 })
  assert.ok(followups.length >= 1 && followups.length <= 2, `one or two follow-ups, got ${JSON.stringify(followups)}`)
  assert.ok(followups.every((q) => q.startsWith('verifier hacking')), 'each refines the original question')
  assert.ok(
    followups.some((q) => /provenance|inspected|hacking/i.test(q)),
    `a term shared by two sources becomes a query, got ${JSON.stringify(followups)}`,
  )
  assert.deepEqual(buildFollowupQueries('q', sources, { rounds: 1 }), [], 'only a two-round plan asks again')
  assert.deepEqual(buildFollowupQueries('q', [sources[0]]), [], 'one source has nothing to correlate')
  assert.deepEqual(buildFollowupQueries('', sources), [])
}
ok('the second round asks about terms two independent sources share')

console.log(`# passed ${passed}, failed ${failed}`)
process.exit(failed === 0 ? 0 : 1)
