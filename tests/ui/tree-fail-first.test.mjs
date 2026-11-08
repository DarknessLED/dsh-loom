// When a round does not promote, the tree that explains it opens with the round
// number - which tells a reader nothing they did not already know. research/
// ui-refs-2026-11.md (P4) found the same pattern fixed in Sentry and Buildkite:
// the branch that answers "why is this stuck" comes first, and the happy path
// stays where it was.
import assert from 'node:assert/strict'

import { loadPanel } from '../ui/harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const panel = await loadPanel()
const { treeOf, flattenTree, treeLines } = panel

const failed = {
  id: 'c1',
  status: 'running',
  open: 0,
  openCheckpoints: [],
  lessonsTop: [],
  lastRound: {
    n: 3,
    status: 'no-gain',
    promoted: false,
    score: 0.5,
    attempts: [
      { id: 'r3a1', score: 0.4, verifierOk: false },
      { id: 'r3a2', score: 0.5, verifierOk: false },
    ],
  },
}

// 1. A round that did not promote leads with why, not with its number.
{
  const lines = treeLines(treeOf(failed, []))
  assert.equal(lines[0].startsWith('为什么'), true, `the first branch answers "why", got: ${lines[0]}`)
  assert.equal(lines[0].includes('未晋升'), true, 'and it names the status in Chinese')
  assert.equal(lines.slice(1).some((l) => l.includes('r3a1')), true, 'the attempts that failed are still there')
  ok('a failed round opens with why it failed')
}

// 2. A promoted round keeps its number first: the tree does not cry wolf.
{
  const promoted = { ...failed, lastRound: { ...failed.lastRound, n: 4, status: 'promoted', promoted: true, score: 1 } }
  const lines = treeLines(treeOf(promoted, []))
  assert.equal(lines[0].startsWith('第 4 轮'), true, `a promoted round keeps its number, got: ${lines[0]}`)
  ok('a promoted round keeps the plain branch first')
}

// 3. Nothing to explain is not an explanation: a campaign with no rounds yet does
//    not grow a "why" branch.
{
  const fresh = { id: 'c3', status: 'running', open: 0, openCheckpoints: [], lessonsTop: [], rounds: 0 }
  const lines = treeLines(treeOf(fresh, []))
  assert.equal(lines.some((l) => l.startsWith('为什么')), false, 'no history means no failure branch')
  ok('no history means no failure branch')
}

console.log(`\n${pass}/${pass} passed`)
