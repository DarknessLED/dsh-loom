// The run pipeline is judged by what it does when the web is not perfect.
//
// In this environment that is the normal case: a payment wall, a captcha page,
// a PDF that comes back as `%PDF-1.7` binary, a host that times out. A pipeline
// that returns "12 sources" while five of the fetches were error pages is the
// exact failure the earlier manual research hit — the report looked complete and
// two of its three claims were unverifiable.
//
// So the contract pinned here:
//   * a failed search is a recorded gap and the run continues;
//   * a failed fetch is recorded as `failed` with the reason, and its URL is
//     never counted as evidence;
//   * binary bodies are not passed through as if they were prose;
//   * evidence extraction reports, per source, how many characters were read and
//     whether a passage was actually found — a source with no qualifying span is
//     "read, contributed nothing", not a silent zero;
//   * no web service at all is a named state (`web-unavailable`) with the plan
//     still returned, so a caller can run the plan-only path on a headless host.
//
// The pipeline takes its search/fetch functions as dependencies, which is what
// makes all of the above checkable without a network.
import assert from 'node:assert/strict'

import { runResearch } from '../../src/research/run.js'

let passed = 0
let failed = 0
// Each block ends with a call to this line: reaching it means every assertion
// in the block held, so the block itself is the check.
function ok(name) {
  passed++
  console.log(`ok ${passed + failed} - ${name}`)
}

const PAGE = 'A verifier that runs the reference solution will always agree with itself, so it cannot detect ' +
  'a patch that hard-codes the expected output instead of implementing the behaviour. This is the same ' +
  'weakness observed in the 2026 audit of self-improving agents.'

function searchOf(map) {
  return async (query) => {
    const sources = map[query]
    if (sources === 'boom') throw new Error(`provider refused: ${query}`)
    return { sources: sources ?? [], truncated: false }
  }
}

function fetchOf(map) {
  const calls = []
  const fn = async (url) => {
    calls.push(url)
    const hit = map[url]
    if (!hit) return { url, statusCode: 404, body: { kind: 'text', content: 'not found' }, truncated: false }
    if (hit === 'timeout') throw Object.assign(new Error('fetch timed out'), { code: 'ETIMEDOUT' })
    return { url, statusCode: hit.statusCode ?? 200, body: { kind: hit.kind ?? 'html', content: hit.content }, truncated: Boolean(hit.truncated) }
  }
  fn.calls = calls
  return fn
}

const question = 'why do verifiers fail to catch reward hacking?'

// --- no web at all still returns a plan ----------------------------------

{
  const result = await runResearch({ question, depth: 'standard' }, {})
  assert.equal(result.ok, false)
  assert.equal(result.code, 'web-unavailable')
  assert.ok(result.plan && Array.isArray(result.plan.queries), 'the plan comes back even with no network')
  assert.ok(result.plan.queries.length > 0)
  assert.ok(result.hint && /provider/i.test(result.hint), `and says what is missing, got ${JSON.stringify(result.hint)}`)
}
ok('a host with no web service gets the plan and a named refusal')

// --- one query fails, the run continues ---------------------------------

{
  const search = searchOf({
    [question]: 'boom',
    'why do verifiers fail to catch reward hacking? latest analysis': [{ url: 'https://a.test/p', title: 'A' }],
    'why do verifiers fail to catch reward hacking? data evidence': [{ url: 'https://b.test/p', title: 'B' }],
  })
  const fetchPage = fetchOf({
    'https://a.test/p': { content: `<p>${PAGE}</p>` },
    'https://b.test/p': { content: `<p>${PAGE}</p>` },
  })
  const result = await runResearch({ question, depth: 'standard', fetchTop: 2 }, { search, fetchPage })
  assert.equal(result.ok, true, JSON.stringify(result).slice(0, 300))
  const failed = result.queries.filter((q) => q.status === 'failed')
  assert.equal(failed.length, 1, 'the refusal is on the record')
  assert.match(failed[0].error, /provider refused/)
  assert.ok(result.gaps.some((g) => /provider refused/.test(g)), 'and it is a named gap')
  assert.ok(result.sources.length >= 2, 'the other queries still produced sources')
}
ok('a search failure is a recorded gap, not the end of the run')

// --- a failed fetch never becomes evidence ------------------------------

{
  const queries = [question]
  const search = async () => ({
    sources: [
      { url: 'https://ok.test/a' },
      { url: 'https://timeout.test/a' },
      { url: 'https://binary.test/a' },
    ],
    truncated: true,
  })
  const fetchPage = fetchOf({
    'https://ok.test/a': { content: `<p>${PAGE}</p>` },
    'https://timeout.test/a': 'timeout',
    'https://binary.test/a': { content: '%PDF-1.7\n1 0 obj\n<< binary', kind: 'text' },
  })
  const result = await runResearch({ question, depth: 'quick', fetchTop: 3 }, { search, fetchPage })
  assert.equal(result.ok, true)
  assert.ok(result.warnings.some((w) => /truncated/i.test(w)), 'a truncated provider result is warned about')

  const byUrl = new Map(result.sources.map((s) => [s.url, s]))
  assert.equal(byUrl.get('https://timeout.test/a').fetchStatus, 'failed')
  assert.match(byUrl.get('https://timeout.test/a').fetchError, /timed out/)
  assert.equal(byUrl.get('https://timeout.test/a').passages.length, 0, 'a failed fetch has no passages')
  assert.equal(byUrl.get('https://binary.test/a').fetchStatus, 'skipped', 'binary is not prose')
  assert.ok(result.evidence.every((e) => e.url !== 'https://timeout.test/a'), 'a failed fetch is not evidence')
  assert.ok(result.evidence.every((e) => e.url !== 'https://binary.test/a'))

  const auth = result.authority
  assert.ok(auth && Number.isFinite(auth.passages), 'the run reports how much evidence it actually got')
  assert.equal(auth.fetched, 1, 'one page was really read')
  assert.equal(auth.failed, 1)
  assert.equal(auth.skipped, 1)
}
ok('a page that failed or was binary contributes no evidence, and the run says so')

// --- a source that was read but matched nothing is visible --------------

{
  const search = async () => ({ sources: [{ url: 'https://nothing.test/a' }], truncated: false })
  const fetchPage = fetchOf({
    'https://nothing.test/a': { content: '<p>Completely unrelated text about garden furniture and the weather in May.</p>' },
  })
  const result = await runResearch({ question, depth: 'quick', fetchTop: 1 }, { search, fetchPage })
  const source = result.sources[0]
  assert.equal(source.fetchStatus, 'ok')
  assert.equal(source.passages.length, 0)
  assert.ok(source.contentChars > 0, 'it was read')
  assert.equal(result.evidence.length, 0, 'and produced no evidence')
  assert.equal(result.authority.fetched, 1)
  assert.equal(result.authority.passages, 0, 'the report cannot claim evidence it does not have')
}
ok('a page that matched nothing is "read, contributed nothing", not silence')

// --- the report is a report, and it carries the gaps ---------------------

{
  const search = searchOf({
    [question]: [{ url: 'https://a.test/p', title: 'Verifier audit' }],
    'why do verifiers fail to catch reward hacking? latest analysis': [],
    'why do verifiers fail to catch reward hacking? data evidence': [],
  })
  const fetchPage = fetchOf({ 'https://a.test/p': { content: `<h1>Audit</h1><p>${PAGE}</p>` } })
  const result = await runResearch({ question, depth: 'standard', fetchTop: 1 }, { search, fetchPage })
  assert.equal(result.ok, true)
  assert.ok(typeof result.report === 'string' && result.report.length > 100, 'a markdown report is produced')
  assert.match(result.report, /why do verifiers fail/i, 'it restates the question')
  assert.match(result.report, /https:\/\/a\.test\/p/, 'it cites the source URL')
  assert.match(result.report, /##/, 'with headings')
  assert.ok(result.report.length <= 60_000, 'and stays inside a payload a model can accept')
}
ok('the run produces a markdown report that cites its sources')

// --- a report with a real passage renders the passage -------------------
// Found live: the report renderer read `passage.text` while the extractor
// returns `{passage, matchedTerms, score}`, so every run that actually found a
// span threw `Cannot read properties of undefined (reading 'replace')`. The
// earlier block survived only because its fixture matched no term.
{
  const q = 'verifier reward hacking'
  const search = async () => ({ sources: [{ url: 'https://hit.test/p', title: 'Hit' }], truncated: false })
  const fetchPage = fetchOf({ 'https://hit.test/p': { content: `<p>${PAGE}</p>` } })
  const result = await runResearch({ question: q, depth: 'quick', fetchTop: 1 }, { search, fetchPage })
  assert.equal(result.ok, true)
  assert.equal(result.authority.passages > 0, true, 'the fixture must actually find a passage')
  const item = result.evidence[0]
  assert.ok(typeof item.passages[0].text === 'string', 'a passage exposes the span as `text`')
  assert.match(result.report, /verifier/i, 'the passage text reaches the report')
  assert.ok(!/undefined/.test(result.report), 'the report never prints `undefined`')
}
ok('a report that found a passage renders it, instead of crashing')

// --- a failed fetch does not spend the whole budget ---------------------
// Found live on R2: the four highest-scored sources were a Paywalled PDF, two
// huggingface paper pages and a dataset diff, all of which the fetch capability
// answered with HTTP 404. The run spent its entire read budget on them and
// reported "0 read, 4 failed" while a readable arxiv HTML page sat one position
// below the cut. A search is cheap and a fetch is the expensive step, so a
// failure has to release its slot to the next candidate instead of consuming it.
{
  const search = async () => ({
    sources: [
      { url: 'https://p1.test/a', title: 'pdf one' },
      { url: 'https://p2.test/a', title: 'pdf two' },
      { url: 'https://p3.test/a', title: 'pdf three' },
      { url: 'https://p4.test/a', title: 'pdf four' },
      { url: 'https://readable.test/html', title: 'readable' },
    ],
    truncated: false,
  })
  const fetchPage = fetchOf({ 'https://readable.test/html': { content: `<p>${PAGE}</p>` } })
  const result = await runResearch({ question: 'verifier reward hacking', depth: 'quick', fetchTop: 1 }, { search, fetchPage })
  assert.equal(result.ok, true)
  assert.equal(result.authority.fetched, 1, 'the readable source is found below four failures')
  assert.ok(result.authority.attempts >= 3, 'and the report says how many fetches were spent finding it')
  assert.ok(result.authority.attempts > result.authority.fetched, 'attempts are counted apart from successes')
  assert.equal(result.evidence.length, 1, 'the readable page contributes evidence')
  assert.equal(result.evidence[0].url, 'https://readable.test/html')
  assert.ok(!/0 read/.test(result.report), 'the report does not claim nothing was read')
}
ok('a failed fetch releases its slot to the next candidate')

// --- nothing found is a named failure, not an empty success -------------

{
  const search = async () => ({ sources: [], truncated: false })
  const result = await runResearch({ question, depth: 'quick' }, { search, fetchPage: fetchOf({}) })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'no-results')
  assert.ok(result.plan)
}
ok('zero sources is a named failure')

console.log(`# passed ${passed}, failed ${failed}`)
process.exit(failed === 0 ? 0 : 1)
