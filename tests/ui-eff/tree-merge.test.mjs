// Research P3 (`research/ui-eff-2026-11.md` §4): the tree says the same thing
// twice. `whyNode` opens with `为什么未晋升 · 第 3 轮 · 0.4` and `lastRoundNode`
// then draws `第 3 轮 · 未晋升 · 0.4` immediately below it — same round, same
// verdict, same score, 22.7 px of a 360 px sidebar spent repeating the line
// above it.
//
// The merge: when the why branch is present it owns the round. Attempts hang
// under it, and the separate round row is not drawn. When the round promoted
// (or there is no why), the round row stays — it is then the only place the
// round is named.
import assert from 'node:assert/strict'
import { loadPanel } from '../ui/harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const panel = await loadPanel()

const attempts = [
  { id: 'a1', score: 0.4, verifierOk: true },
  { id: 'a2', score: 0.2, verifierOk: false, screenedOut: true },
]

// 1. A losing round with attempts: one branch, and the attempts are its children.
{
  const c = { id: 'c1', lastRound: { n: 3, status: 'no-gain', score: 0.4, promoted: false, attempts } }
  const tree = panel.treeOf(c, [], null)
  const keys = tree.map((n) => n.key)
  assert.equal(keys.includes('why'), true, 'a losing round opens with why')
  assert.equal(keys.includes('round'), false, 'and does not repeat itself with a round row')
  const why = tree.find((n) => n.key === 'why')
  assert.equal(Array.isArray(why.children) ? why.children.length : 0, 2, 'both attempts hang under why')
  assert.equal(why.children[0].key, 'a-a1')
  ok('a losing round is named once, and its attempts hang under it')
}

// 2. The round number must still appear exactly once in the rendered lines.
{
  const c = { id: 'c2', lastRound: { n: 3, status: 'no-gain', score: 0.4, promoted: false, attempts } }
  const lines = panel.treeLines(panel.treeOf(c, [], null)).join('\n')
  assert.equal((lines.match(/第 3 轮/g) || []).length, 1, `the round is named once, got:\n${lines}`)
  assert.match(lines, /为什么/)
  ok('the round number is printed once, not twice')
}

// 3. A promoted round keeps its own row: there is no why to own it.
{
  const c = { id: 'c3', lastRound: { n: 4, status: 'promoted', score: 1, promoted: true, attempts: [attempts[0]] } }
  const tree = panel.treeOf(c, [], null)
  const keys = tree.map((n) => n.key)
  assert.equal(keys.includes('round'), true, 'a promoted round still names itself')
  assert.equal(keys.includes('why'), false, 'and grows no why branch')
  const round = tree.find((n) => n.key === 'round')
  assert.equal(round.children.length, 1, 'its attempts hang under the round row')
  ok('a promoted round keeps its own row')
}

// 4. No round at all: no crash, no empty branch.
assert.deepEqual(panel.treeOf({ id: 'c4' }, [], null), [], 'a campaign with no round draws no rows')
assert.deepEqual(panel.treeOf(null, [], null), [], 'no campaign, no rows, no throw')
ok('an empty campaign draws nothing')

console.log(`\n${pass}/${pass} passed`)
