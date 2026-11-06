// Spec: the panel must show what the knowledge tree knows, not just how many
// lessons exist. A count cannot tell a human whether the loop is learning
// anything real or just accumulating folklore.
//
// Required: panelState rows expose lessonsTop — at most 3 entries, strongest
// first, each { id, claim, kind, score } — drawn from active lessons only.
import { panelState } from '../../src/panel/api.js'

let pass = 0
let fail = 0
function ok(cond, name, extra) {
  if (cond) {
    pass += 1
    console.log(`ok ${pass} - ${name}`)
  } else {
    fail += 1
    console.log(`not ok ${pass + fail} - ${name}`)
    if (extra !== undefined) console.log('   ', extra)
  }
}

const lessons = [
  { id: 'l-weak', claim: 'flaky: rerun once', status: 'active', kind: 'hazard', gainSum: 0.01, useCount: 1 },
  { id: 'l-strong', claim: 'coverage needs --runInBand', status: 'active', kind: 'recipe', gainSum: 0.4, useCount: 4 },
  { id: 'l-mid', claim: 'fixtures import each other', status: 'active', kind: 'fact', gainSum: 0.2, useCount: 2 },
  { id: 'l-dead', claim: 'stale advice', status: 'quarantined', kind: 'fact', gainSum: -0.5, useCount: 6 },
]

const view = {
  state: {
    id: 'c1',
    status: 'running',
    objective: 'raise coverage',
    rounds: [],
    budget: { spentUsd: 0.1 },
    chain: { activeVersion: 1 },
    checkpoints: [],
    evalset: { tasks: [], holdout: [] },
    lessons,
    updatedAt: new Date().toISOString(),
  },
}
const runtime = {
  listCampaigns: () => ['c1'],
  get: () => view,
  ownership: () => ({ owner: 'me', mine: true }),
  liveAttempts: () => [],
  leanProbe: () => ({ available: false }),
}

const state = panelState({ runtime })
const row = state.campaigns[0]

ok(Array.isArray(row.lessonsTop), 'row exposes lessonsTop array', JSON.stringify(row.lessonsTop))
const top = Array.isArray(row.lessonsTop) ? row.lessonsTop : []
ok(top.length > 0 && top.length <= 3, 'lessonsTop is capped at 3')
ok(top[0]?.id === 'l-strong', 'strongest lesson comes first')
ok(
  top.length === 3 && top.every((l) => typeof l.claim === 'string' && l.claim.length > 0 && 'kind' in l && typeof l.score === 'number'),
  'each entry carries claim, kind and score',
  JSON.stringify(top[0]),
)
ok(!top.some((l) => l.id === 'l-dead'), 'quarantined lesson excluded from lessonsTop')
ok(row.lessons === 4, 'raw lesson count is still reported')

if (fail > 0) process.exitCode = 1
console.log(`\n${pass}/${pass + fail} passed`)
