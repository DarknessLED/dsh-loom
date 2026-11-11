// Panel contract: one JSON route, no direct file access, actions through the
// same event appends the tools use.
import { panelState, panelAction, registerPanel } from '../src/panel/api.js'

let pass = 0
let fail = 0
function ok(cond, name) {
  if (cond) {
    pass += 1
    console.log(`ok ${pass} - ${name}`)
  } else {
    fail += 1
    console.log(`not ok ${pass + fail} - ${name}`)
  }
}
function eq(a, b, name) {
  ok(JSON.stringify(a) === JSON.stringify(b), name)
}

function view(over = {}) {
  return {
    state: {
      id: 'c1',
      status: 'running',
      objective: 'raise coverage on src/util.js',
      workspace: 'C:/w',
      rounds: [
        {
          n: 2,
          status: 'promoted',
          taskId: 't2',
          promoted: 'r2a1',
          attempts: [
            { id: 'r2a1', score: 0.81, verifierOk: true, chainVersion: 2 },
            { id: 'r2a2', score: 0.4, verifierOk: false, screenedOut: true, abandoned: { reason: 'stalled' } },
          ],
        },
      ],
      budget: { spentUsd: 0.1234567 },
      chain: { activeVersion: 2 },
      incumbent: { round: 2, score: 0.81 },
      policy: { status: 'promoted', version: 3 },
      evalset: { tasks: [{ id: 't1' }, { id: 't2' }], holdout: ['t2'] },
      lessons: [
        { id: 'l1', status: 'active' },
        { id: 'l2', status: 'quarantined' },
      ],
      checkpoints: [
        { id: 'cp-1', kind: 'gate', status: 'open', payload: { verdict: 'promote', delta: 0.11 } },
        { id: 'cp-0', kind: 'gate', status: 'answered' },
      ],
      updatedAt: new Date(Date.now() - 65_000).toISOString(),
      ...over,
    },
  }
}

function stubRuntime(v = view(), extra = {}) {
  const appends = []
  return {
    appends,
    listCampaigns: () => [v.state.id],
    get: () => v,
    liveAttempts: () => [{ campaign: 'c1', attemptId: 'r2a1', idleMs: 4000 }],
    ownership: () => ({ owner: { pid: 42 }, mine: false }),
    leanProbe: () => ({ available: true, versions: { lean: '4.35.0' } }),
    ensureOwner: () => true,
    control: (...args) => appends.push(['control', ...args]),
    append: (...args) => appends.push(['append', ...args]),
    ...extra,
  }
}

// --- state projection --------------------------------------------------------
{
  const s = panelState({ runtime: stubRuntime() })
  const row = s.campaigns[0]
  eq(row.id, 'c1', 'state: campaign id')
  eq(row.status, 'running', 'state: status')
  eq(row.rounds, 1, 'state: round count')
  eq(row.spendUsd, 0.123457, 'state: spend rounded to 6 places')
  eq(row.chainVersion, 2, 'state: chain version')
  eq(row.incumbent, { round: 2, score: 0.81 }, 'state: incumbent')
  eq(row.policy, { status: 'promoted', version: 3 }, 'state: policy')
  eq(row.tasks, 2, 'state: task count')
  eq(row.holdout, 1, 'state: holdout count')
  eq(row.lessons, 2, 'state: lesson count')
  eq(row.quarantined, 1, 'state: quarantined lessons counted separately')
  // The sidebar prints these two numbers side by side; "N active" that includes
  // the quarantined ones is a number nobody can check against the label.
  eq(row.lessonsActive, 1, 'state: active lessons exclude the quarantined ones')
  eq(row.lessonsActive + row.quarantined, row.lessons, 'state: active + quarantined is the corpus')
  eq(row.openCheckpoints.length, 1, 'state: only open checkpoints are shown')
  eq(row.openCheckpoints[0].kind, 'gate', 'state: checkpoint kind')
  eq(row.lastRound.n, 2, 'state: last round number')
  eq(row.lastRound.attempts.length, 2, 'state: attempts of the last round')
  ok(row.lastRound.attempts[1].screenedOut === true, 'state: screened-out attempt flagged')
  eq(row.lastRound.attempts[1].abandoned, 'stalled', 'state: abandoned reason surfaced')
  ok(row.ageMs >= 60_000 && row.ageMs < 120_000, 'state: age derived from updatedAt')
  eq(s.live.length, 1, 'state: live attempts')
  eq(s.ownership.owner, 42, 'state: ownership pid')
  ok(s.ownership.mine === false, 'state: ownership says another window drives')
  eq(s.lean.available, true, 'state: lean availability')
}

// --- a broken campaign never takes the whole panel down ----------------------
{
  const rt = stubRuntime(view(), {
    listCampaigns: () => ['good', 'bad'],
    get: (id) => {
      if (id === 'bad') throw new Error('unreadable ledger')
      return view()
    },
  })
  const s = panelState({ runtime: rt })
  eq(s.campaigns.length, 2, 'state: one row per campaign')
  eq(s.campaigns[1].id, 'bad', 'state: broken campaign keeps its id')
  ok(typeof s.campaigns[1].error === 'string', 'state: broken campaign reports an error')
}

// --- ownership/liveness failures degrade to safe defaults --------------------
{
  const rt = stubRuntime(view(), {
    ownership: () => {
      throw new Error('lock gone')
    },
    leanProbe: () => {
      throw new Error('no toolchain')
    },
  })
  const s = panelState({ runtime: rt })
  ok(s.ownership.mine === true, 'state: unreadable ownership assumes this window')
  eq(s.lean, null, 'state: unreadable lean probe becomes null')
}

// --- actions ---------------------------------------------------------------
{
  const rt = stubRuntime()
  const res = panelAction({ runtime: rt }, { campaign: 'c1', action: 'pause' })
  ok(res.ok === true, 'action: pause acknowledged')
  eq(rt.appends[0][0], 'control', 'action: pause goes through runtime.control')
  eq(rt.appends[0][1], 'c1', 'action: control receives the campaign')
  eq(rt.appends[0][2], 'pause', 'action: control receives the verb')
  ok(Array.isArray(res.campaigns), 'action: response carries fresh rows')
}
{
  const rt = stubRuntime()
  panelAction({ runtime: rt }, { campaign: 'c1', action: 'decide', decision: 'approve' })
  const call = rt.appends.find((a) => a[0] === 'append')
  eq(call[2], 'checkpoint.answered', 'action: decide appends checkpoint.answered')
  eq(call[3].checkpoint, 'cp-1', 'action: decide targets the newest open checkpoint')
  eq(call[3].answer.decision, 'approve', 'action: decision recorded')
  eq(call[3].answer.source, 'panel', 'action: panel decisions are marked as such')
}
{
  const rt = stubRuntime()
  panelAction({ runtime: rt }, { campaign: 'c1', action: 'decide', decision: 'stop' })
  const types = rt.appends.map((a) => a[2]).filter(Boolean)
  ok(types.includes('campaign.status'), 'action: stop also stops the campaign')
}
{
  const rt = stubRuntime()
  let threw = false
  try {
    panelAction({ runtime: rt }, { campaign: 'c1', action: 'decide', decision: 'maybe' })
  } catch {
    threw = true
  }
  ok(threw, 'action: unknown decision rejected')
}
{
  const rt = stubRuntime()
  let threw = false
  try {
    panelAction({ runtime: rt }, { campaign: 'c1', action: 'nonsense' })
  } catch {
    threw = true
  }
  ok(threw, 'action: unknown action rejected')
}
{
  const rt = stubRuntime()
  let threw = false
  try {
    panelAction({ runtime: rt }, { action: 'pause' })
  } catch {
    threw = true
  }
  ok(threw, 'action: campaign id is required')
}
{
  const rt = stubRuntime(view({ checkpoints: [] }))
  let threw = false
  try {
    panelAction({ runtime: rt }, { campaign: 'c1', action: 'decide', decision: 'approve' })
  } catch {
    threw = true
  }
  ok(threw, 'action: decide without an open checkpoint throws')
}
{
  const rt = stubRuntime(view(), { ensureOwner: () => false })
  let threw = false
  try {
    panelAction({ runtime: rt }, { campaign: 'c1', action: 'resume' })
  } catch {
    threw = true
  }
  ok(threw, 'action: mutating without ownership is refused')
}

// --- the route -------------------------------------------------------------
{
  const registered = []
  const ctx = { effect: (fn) => fn(), webServer: { register: (r) => (registered.push(r), () => {}) } }
  registerPanel(ctx, { runtime: stubRuntime() })
  eq(registered.length, 1, 'route: one route registered')
  eq(registered[0].path, '/dsh-loom/state', 'route: path')
  eq(registered[0].kind, 'exact', 'route: exact match')

  const calls = []
  const res = {
    writeHead: (status, headers) => calls.push(['head', status, headers]),
    end: (body) => calls.push(['end', body]),
  }
  await registered[0].handler({ method: 'GET' }, res)
  const status = calls[0][1]
  eq(status, 200, 'route: GET answers 200')
  const body = JSON.parse(calls[1][1])
  eq(body.campaigns[0].id, 'c1', 'route: GET returns campaign rows')

  calls.length = 0
  let threw = false
  try {
    await registered[0].handler({ method: 'POST', [Symbol.asyncIterator]: async function* () { yield Buffer.from('{}') } }, res)
  } catch {
    threw = true
  }
  ok(!threw, 'route: a bad POST is answered, not thrown')
  eq(calls[0][1], 409, 'route: bad POST answers 409')
}

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exitCode = 1
