// The prefetch pass is the cost of a survey. These pin the two decisions that
// decide whether it is worth that cost: what counts as "already have it", and
// what counts as "ask again" rather than "give up".
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  chunk,
  idsFromList,
  planFetch,
  prefetchAll,
  uniqueIds,
} from '../../scripts/research-prefetch.mjs'

const BODY = '<html><body><section class="ltx_section"><p class="ltx_p" id="p1">x</p></section></body></html>'
const STUB = '<html><body><p>See pages 1-last of ppo-min.pdf</p></body></html>'

function withCache(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'prefetch-'))
  try {
    return fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('an id asked for twice is fetched once, in the order asked', () => {
  assert.deepEqual(uniqueIds(['b', 'a', 'b', '', null, 'a', 'c']), ['b', 'a', 'c'])
  assert.deepEqual(uniqueIds(undefined), [])
})

test('a rendered body on disk is not fetched again', () => {
  withCache((cache) => {
    writeFileSync(join(cache, '2402.03300.html'), BODY)
    const plan = planFetch(['2402.03300', '2203.02155'], { cache })
    assert.deepEqual(plan.have, ['2402.03300'])
    assert.deepEqual(
      plan.staged.map((s) => s.id),
      ['2203.02155'],
    )
  })
})

test('a PDF-pointer stub is not a body: it must be fetched again', () => {
  // arXiv answers some ids with one line pointing at the PDF. Remembering that
  // as a hit would make the paper read as "no paragraphs" for ever.
  withCache((cache) => {
    writeFileSync(join(cache, '1707.06347.html'), STUB)
    const plan = planFetch(['1707.06347'], { cache })
    assert.deepEqual(plan.have, [])
    assert.deepEqual(
      plan.staged.map((s) => s.id),
      ['1707.06347'],
    )
  })
})

test('work is spread round-robin so one worker does not get every slow paper', () => {
  const buckets = chunk(['a', 'b', 'c', 'd', 'e'], 2)
  assert.deepEqual(buckets, [['a', 'c', 'e'], ['b', 'd']])
  assert.deepEqual(chunk([], 3), [])
  assert.deepEqual(chunk(['a'], 0), [['a']])
})

test('a body that arrives is written, and a 404 is reported as unread', async () => {
  await withCache(async (cache) => {
    const asked = []
    const fetchImpl = async (url) => {
      asked.push(url)
      if (url.endsWith('2402.03300')) return { ok: true, text: async () => BODY }
      return { ok: false, status: 404, text: async () => '' }
    }
    const summary = await prefetchAll(['2402.03300', '2402.99999'], {
      cache,
      concurrency: 1,
      fetchImpl,
    })
    assert.equal(summary.ok, 1)
    assert.deepEqual(
      summary.unread.map((u) => u.id),
      ['2402.99999'],
    )
    assert.match(summary.unread[0].error, /404/)
    assert.equal(readFileSync(join(cache, '2402.03300.html'), 'utf8'), BODY)
    assert.equal(existsSync(join(cache, '2402.99999.html')), false)
    assert.equal(asked.length, 2, 'a final answer is not asked twice')
  })
})

test('429 is "later", not "never": it comes back for one more go', async () => {
  await withCache(async (cache) => {
    let calls = 0
    const fetchImpl = async () => {
      calls += 1
      if (calls === 1) return { ok: false, status: 429, text: async () => '' }
      return { ok: true, text: async () => BODY }
    }
    const summary = await prefetchAll(['2402.03300'], {
      cache,
      concurrency: 1,
      retries: 2,
      fetchImpl,
    })
    assert.equal(summary.ok, 1)
    assert.deepEqual(summary.unread, [])
    assert.equal(calls, 2)
  })
})

test('a paper with no HTML is reported, not retried into the ground', async () => {
  await withCache(async (cache) => {
    let calls = 0
    const fetchImpl = async () => {
      calls += 1
      return { ok: true, text: async () => STUB }
    }
    const summary = await prefetchAll(['1707.06347'], { cache, concurrency: 1, retries: 3, fetchImpl })
    assert.equal(summary.ok, 0)
    assert.equal(calls, 1, 'a rendered-nothing page is a final answer')
    assert.match(summary.unread[0].error, /no rendered body/)
  })
})

test('the reading list is accepted as a list or as the per-direction map', () => {
  assert.deepEqual(idsFromList(['a', { id: 'b' }]), ['a', 'b'])
  assert.deepEqual(
    idsFromList({ 'r1-verifier': { papers: [{ id: 'x' }, { id: 'y' }] }, 'r2-score': { papers: [{ id: 'y' }] } }),
    ['x', 'y', 'y'],
  )
  assert.deepEqual(idsFromList({}), [])
})
