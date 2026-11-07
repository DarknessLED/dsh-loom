// A checkpoint row says `门不可达` and nothing else. The person reading the
// sidebar has to know three things the panel never says: what happened, what
// ignoring it costs, and what the buttons will do. The kinds are a closed set,
// so the explanations can be written once and checked mechanically.
import assert from 'node:assert/strict'
import { loadPanel } from './harness.mjs'

const panel = await loadPanel()
let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const CJK = /[\u4e00-\u9fff]/

assert.equal(typeof panel.checkpointHelp, 'function', 'the panel must export checkpointHelp')
const kinds = Object.keys(panel.CP_ZH)

// 1. Every kind the panel can name gets an explanation that says what it is and
//    what happens if it is left alone.
for (const kind of kinds) {
  const help = panel.checkpointHelp(kind)
  assert.ok(help && typeof help.what === 'string' && help.what.length >= 8, `${kind}: what is missing`)
  assert.ok(typeof help.ifIgnored === 'string' && help.ifIgnored.length >= 8, `${kind}: ifIgnored is missing`)
  assert.match(help.what, CJK, `${kind}: what must be explained in Chinese`)
  assert.match(help.ifIgnored, CJK, `${kind}: ifIgnored must be explained in Chinese`)
}
ok('every checkpoint kind explains itself and its cost of being ignored')

// 2. "Explained" must mean explained, not repeated: two kinds with the same text
//    tell the reader nothing about which one they are looking at.
{
  const seen = new Map()
  for (const kind of kinds) {
    const key = panel.checkpointHelp(kind).what
    assert.ok(!seen.has(key), `${kind} and ${seen.get(key)} share one explanation`)
    seen.set(key, kind)
  }
}
ok('each kind gets its own explanation')

// 3. An unknown kind is a fact about the host, not a silent blank.
{
  const help = panel.checkpointHelp('brand-new-kind')
  assert.ok(help.what.length >= 4, 'an unknown kind still says something')
  assert.ok(
    help.what.includes('brand-new-kind') || help.ifIgnored.includes('brand-new-kind'),
    'and names the kind it does not know',
  )
}
ok('an unknown kind names itself instead of rendering blank')

// 4. The row carries the explanation, so the reader does not have to hover a
//    diagnostic to find out what is happening.
{
  const now = Date.now()
  const tree = panel.treeOf(
    {
      id: 'c1',
      status: 'running',
      openCheckpoints: [{ id: 'cp-1', kind: 'stuck', at: now - 30_000, payload: { taskId: 't1' } }],
      open: 1,
    },
    [],
  )
  const waiting = tree.find((node) => node.key === 'wait')
  assert.ok(waiting, 'the waiting branch exists')
  const child = waiting.children[0]
  assert.equal(typeof child.help, 'string', 'the checkpoint row carries a help string')
  assert.ok(child.help.includes(panel.checkpointHelp('stuck').what), 'and it is that kind\'s explanation')
  assert.ok(child.help.includes(panel.checkpointHelp('stuck').ifIgnored), 'including what ignoring it costs')
}
ok('a checkpoint row carries its explanation into the tree')

console.log(`\n${pass}/${pass} passed`)
