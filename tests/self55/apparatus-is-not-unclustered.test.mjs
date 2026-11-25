// "Unclustered" was answering two different questions.
//
// A direction's clusters name the sub-questions the field argues about. But the
// corpus also holds technical reports, benchmarks, datasets and surveys: they
// are the instruments every direction measures with, and no keyword list for
// "reward hacking" was ever going to claim Llama 3. Left in one bucket, the
// panel printed a third of the library as "unclustered", which reads as "our
// keyword classifier failed" when most of it was "these are tools, not
// arguments".
//
// So the leftover bucket is split: a work that no cluster claims and whose title
// says it is an instrument is filed as apparatus, printed under its own heading
// between the direction's own clusters and the genuine misses. The distinction
// matters because the two need opposite responses -- a missing keyword is our
// bug, a technical report is not.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { APPARATUS_LABEL, classifyWork, clusterWork, loadDirection } from '../../src/panel/research.js'

const CLUSTERS = {
  'reward hacking': ['reward hack', 'goodhart', 'gaming the'],
  'judge reliability': ['judge', 'agreement'],
}

const work = (title, abstract = '') => ({ id: 'x', title, abstract, year: 2026, mechanisms: [], pipeline: {} })

test('a technical report is apparatus, not a missed cluster', () => {
  assert.equal(clusterWork(work('Qwen3 Technical Report'), CLUSTERS), APPARATUS_LABEL)
  assert.equal(clusterWork(work('The Llama 3 Herd of Models'), CLUSTERS), APPARATUS_LABEL)
})

test('a benchmark or a survey is apparatus too', () => {
  assert.equal(clusterWork(work('SWE-bench: Can Language Models Resolve Real-World GitHub Issues?'), CLUSTERS), APPARATUS_LABEL)
  assert.equal(clusterWork(work('MT-Bench and Chatbot Arena: a benchmark'), CLUSTERS), APPARATUS_LABEL)
  assert.equal(clusterWork(work('A Survey of Hallucination in Natural Language Generation'), CLUSTERS), APPARATUS_LABEL)
})

test('a work the keywords do reach is never filed as apparatus', () => {
  // The apparatus words appear in the abstract of plenty of ordinary papers;
  // the bucket is only for works that no cluster claimed.
  const claimed = work('Gaming the verifier', 'we study technical report style benchmarks and reward hacking')
  assert.equal(clusterWork(claimed, CLUSTERS), 'reward hacking')
})

test('a genuine miss is still unclustered, not apparatus', () => {
  const missed = work('Chain-of-Thought Prompting Elicits Reasoning in Large Language Models')
  assert.equal(clusterWork(missed, CLUSTERS), 'unclustered')
  assert.equal(classifyWork(missed, CLUSTERS), 'unclustered', 'the raw classifier never invents a bucket')
})

test('the direction list prints apparatus before the misses', () => {
  const ROOT = mkdtempSync(join(tmpdir(), 'loom-apparatus-'))
  const OUT = join(ROOT, 'research', 'out')
  const DIRS = join(ROOT, 'directions')
  mkdirSync(OUT, { recursive: true })
  mkdirSync(DIRS, { recursive: true })
  writeFileSync(join(DIRS, 'r1-a.json'), JSON.stringify({ slug: 'r1-a', name: 'A', clusters: CLUSTERS }))
  writeFileSync(
    join(OUT, 'work-r1-a.json'),
    JSON.stringify({
      slug: 'r1-a',
      built: '2026-11-25',
      works: [
        { ...work('Reward hacking in the wild', 'reward hack'), id: '1' },
        { ...work('Qwen3 Technical Report'), id: '2' },
        { ...work('Something nobody classified'), id: '3' },
      ],
      missing: [],
      edges: [],
      agent: [],
    }),
  )
  const listed = loadDirection({ root: ROOT, slug: 'r1-a' })
  const labels = listed.clusters.map((entry) => entry.label)
  assert.deepEqual(labels, ['reward hacking', APPARATUS_LABEL, 'unclustered'])
  // Counts add up to the shelf: no work is dropped by being relabelled.
  assert.equal(listed.clusters.reduce((n, entry) => n + entry.count, 0), listed.works.length)
})
