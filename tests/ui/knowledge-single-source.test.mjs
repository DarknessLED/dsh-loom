// The panel shows the same knowledge twice: once as a section that groups every
// campaign's top lessons by kind (cap 4), once inside each campaign's tree (cap 3,
// unsorted). Two groupings and two caps for one corpus means a reader can see a
// lesson in one place and not the other, and the research note found the deeper
// problem: with two code paths, one of them rots. Here it is the tree's ordering.
//
// One function answers "which lessons, in what order"; both views are projections
// of it. The caps stay different on purpose - the section can afford four, the
// tree sits inside a card - but the order and the source must not be.
import assert from 'node:assert/strict'
import { loadPanel, scratch } from '../ui/harness.mjs'

const root = scratch('knowledge')
const panel = await loadPanel(root)

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const data = {
  campaigns: [
    {
      id: 'alpha',
      status: 'running',
      lessons: 4,
      quarantined: 1,
      lessonsTop: [
        { id: 'l3', claim: 'third', kind: 'fact', score: 0.3 },
        { id: 'l1', claim: 'first', kind: 'fact', score: 0.5 },
        { id: 'l2', claim: 'risk', kind: 'hazard', score: 0.1 },
        { id: 'l4', claim: 'recipe', kind: 'recipe', score: 0.2 },
        { id: 'l5', claim: 'fifth', kind: 'fact', score: 0.05 },
        { id: 'l6', claim: 'sixth', kind: 'fact', score: 0.01 },
      ],
    },
    {
      id: 'beta',
      status: 'paused',
      lessons: 1,
      quarantined: 0,
      lessonsTop: [{ id: 'm1', claim: 'other', kind: 'fact', score: 0.4 }],
    },
    { id: 'broken', error: 'boom' },
  ],
}

// 1. knowledgeOf exists and is the single source.
assert.equal(typeof panel.knowledgeOf, 'function', 'knowledgeOf is exported')
ok('knowledgeOf is exported as the single source')

// 2. Order is score-descending with a stable tiebreak, and the cap does not
//    distort the total.
const all = panel.knowledgeOf(data)
assert.ok(Array.isArray(all.kinds), 'knowledgeOf returns kinds')
const facts = all.kinds.find((k) => k.kind === 'fact')
assert.ok(facts, 'the fact group exists')
assert.deepEqual(
  facts.items.map((l) => l.id),
  ['l1', 'm1', 'l3', 'l5'],
  `facts are sorted by score and capped at four, got ${JSON.stringify(facts.items.map((l) => l.id))}`,
)
assert.equal(facts.total, 5, `total counts every fact, not the shown ones (got ${facts.total})`)
ok('kinds are score-sorted, capped at four, with an honest total')

// 3. Every campaign's lessons are available ungrouped, in the same order.
assert.ok(all.byCampaign && Array.isArray(all.byCampaign.alpha), 'byCampaign.alpha exists')
assert.deepEqual(
  all.byCampaign.alpha.map((l) => l.id),
  ['l1', 'l3', 'l4', 'l2', 'l5', 'l6'],
  `byCampaign keeps every lesson, ordered the same way, got ${JSON.stringify(all.byCampaign.alpha.map((l) => l.id))}`,
)
assert.equal(all.byCampaign.broken, undefined, 'a campaign that failed to load contributes nothing')
ok('byCampaign exposes the full ordered list per campaign (no cap)')

// 4. The section is a projection of the same object, not a second pass.
const section = panel.knowledge(data)
assert.deepEqual(section.kinds, all.kinds, 'the section reuses knowledgeOf rather than re-deriving')
assert.equal(section.active, 5, `active counts lessons (got ${section.active})`)
assert.equal(section.quarantined, 1, `quarantined is carried through (got ${section.quarantined})`)
ok('the section is a projection of knowledgeOf (one grouping, one order)')

// 5. The tree's knowledge branch uses the same rows, capped at three.
const node = panel.lessonsNode(data.campaigns[0], all)
assert.ok(node, 'the alpha campaign has a knowledge branch')
assert.deepEqual(
  node.children.map((c) => c.key),
  ['l-l1', 'l-l3', 'l-l4'],
  `the tree shows the top three in the section's order, got ${JSON.stringify(node.children.map((c) => c.key))}`,
)
ok('the tree knowledge branch is the same rows, same order, capped at three')

// 6. The one-argument form still works for callers that only have the row.
const alone = panel.lessonsNode(data.campaigns[0])
assert.ok(alone && alone.children.length === 3, 'lessonsNode(c) still works without the shared rows')
ok('lessonsNode(c) keeps working when the shared rows are not passed')

console.log(`\n${pass}/${pass} passed`)
