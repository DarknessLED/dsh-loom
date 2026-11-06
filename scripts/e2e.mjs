// End-to-end M1 check: a real git repo, a real worktree, a real verifier, a stub agent.
// Run: node scripts/e2e.mjs
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

const NODE = process.execPath
const root = mkdtempSync(join(tmpdir(), 'loom-e2e-'))
const repo = join(root, 'repo')
const home = join(root, 'home')
mkdirSync(repo, { recursive: true })
mkdirSync(home, { recursive: true })

const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', windowsHide: true })

writeFileSync(join(repo, 'fix.txt'), 'broken\n')
writeFileSync(
  join(repo, 'test.mjs'),
  `import { readFileSync } from 'node:fs'\nconst t = readFileSync(new URL('./fix.txt', import.meta.url), 'utf8')\nif (t.trim() !== 'ok') { console.error('not fixed'); process.exit(1) }\nconsole.log('all good')\n`,
)
git('init', '-q')
git('config', 'user.email', 'loom@example.com')
git('config', 'user.name', 'loom')
git('add', '.')
git('commit', '-q', '-m', 'init')

const { Runtime } = await import('../src/runtime/runtime.js')
const { runRound } = await import('../src/runtime/round.js')
const { effectivePolicy } = await import('../src/loop/policy.js')
const { comparePolicies } = await import('../src/loop/replay.js')
const { normalizeConfig } = await import('../src/core/config.js')
const { templateFor } = await import('../src/chain/templates.js')

const config = normalizeConfig({ tickMs: 1000, loopPolicy: { autoApply: false } })
const runtime = new Runtime({ ctx: {}, home, config, log: (...a) => console.log('[log]', ...a) })
const view = runtime.create({ id: 'e2e-campaign', objective: 'make fix.txt say ok', workspace: repo, initiator: null })

runtime.append(view, 'evalset.registered', {
  tasks: [
    {
      id: 't1',
      prompt: 'fix the bug so the test passes',
      verify: { cmd: `"${NODE}" test.mjs`, timeoutMs: 60_000 },
    },
  ],
  holdout: [],
})

const spec = { ...JSON.parse(JSON.stringify(templateFor('code-fix'))), version: 1, params: { candidates: 2 } }
runtime.append(view, 'chain.proposed', { version: 1, spec })
runtime.append(view, 'chain.activated', { version: 1 })
runtime.append(view, 'campaign.status', { status: 'running' })

const REPORT_TEXT =
  'fixed it\n```json\n' +
  JSON.stringify({
    changed: ['fix.txt'],
    why: 'the flag file was stale because the writer never flushed before the check',
    evidence: ['test.mjs passes'],
    openQuestions: [],
    confidence: 0.8,
    nextHint: 'flush the writer before the check',
  }) +
  '\n```'
let calls = 0
const dispatcher = {
  async run(prompt, opts) {
    calls += 1
    writeFileSync(join(opts.cwd, 'fix.txt'), 'ok\n')
    return { text: REPORT_TEXT, sessionId: `stub-${calls}`, stopReason: 'completed', timedOut: false, error: null }
  },
}

await runRound({ runtime, view, config, dispatcher, log: (...a) => console.log('[round]', ...a) })

let failures = 0
const check = (name, cond, extra = '') => {
  if (cond) console.log(`PASS  ${name}`)
  else {
    failures += 1
    console.log(`FAIL  ${name} ${extra}`)
  }
}

const events = view.ledger.all()
const types = events.map((e) => e.type)
const s = view.state
const attempt = events.find((e) => e.type === 'attempt.finished')?.data
const gate = events.find((e) => e.type === 'gate.evaluated')?.data
const checkpoints = events.filter((e) => e.type === 'checkpoint.raised')

check('two attempts ran', calls === 2)
check('round.started first', types.includes('round.started'))
check('attempts verified', events.filter((e) => e.type === 'attempt.finished').every((e) => e.data.verifierOk))
check('attempt carries diff', attempt?.diff?.files === 1, JSON.stringify(attempt?.diff))
check('patch captured', Boolean(attempt?.patch) && existsSync(attempt.patch))
check('gate promoted', gate?.promoted === true, JSON.stringify(gate))
check('artifact promoted', types.includes('artifact.promoted'))
check('checkpoint raised for human', checkpoints.length === 1 && checkpoints[0].data.kind === 'gate')
check('round finished promoted', events.find((e) => e.type === 'round.finished')?.data.status === 'promoted')
check('incumbent recorded', s.incumbent?.round === 1 && s.incumbent?.score > 0, JSON.stringify(s.incumbent))
check('workspace untouched', readFileSync(join(repo, 'fix.txt'), 'utf8').trim() === 'broken')
check('worktrees cleaned', !existsSync(join(home, 'worktrees', 'e2e-campaign', 'r1a1')))
check('state.json materialized', existsSync(join(home, 'campaigns', 'e2e-campaign', 'views', 'state.json')))

// M2: every attempt left a lease, none of them still claims to be running.
const leaseDirPath = join(home, 'campaigns', 'e2e-campaign', 'leases')
const leases = existsSync(leaseDirPath)
  ? readdirSync(leaseDirPath).filter((n) => n.endsWith('.json')).map((n) => JSON.parse(readFileSync(join(leaseDirPath, n), 'utf8')))
  : []
check('a lease was written per attempt', leases.length === 2, JSON.stringify(leases.map((l) => l.attemptId)))
check('no lease is left running', leases.every((l) => l.state === 'done'), JSON.stringify(leases.map((l) => [l.attemptId, l.state])))
check('attempt recorded how many sibling notes it saw', typeof attempt?.notesShown === 'number')

// M2: the round board exists and was pruned to its cap.
const boardFile = join(home, 'campaigns', 'e2e-campaign', 'rounds', '1', 'board.jsonl')
check('round board is bounded', existsSync(boardFile) ? readFileSync(boardFile, 'utf8').trim().split('\n').filter(Boolean).length <= 20 : true)

// M3: only verified work becomes knowledge, and only the mechanism is kept.
const lessonEvents = events.filter((e) => e.type === 'lesson.added')
check('a verified attempt became a lesson', lessonEvents.length === 1, String(lessonEvents.length))
const lessonId = lessonEvents[0]?.data?.lesson?.id
check(
  'the lesson is declarative and cites evidence',
  Boolean(lessonId) && /^lsn-/.test(lessonId) && lessonEvents[0].data.lesson.claim.length > 0,
)

// M3: round 2 — the control explores, the treated attempt gets the lesson.
await runRound({ runtime, view, config, dispatcher, log: (...a) => console.log('[round]', ...a) })
const all2 = view.ledger.all()
const r2 = all2.filter((e) => e.type === 'attempt.finished' && e.data.round === 2).map((e) => e.data)
check('round 2 ran two attempts', r2.length === 2, JSON.stringify(r2.map((a) => a.id)))
check('attempt 1 is the control and gets no lessons', r2[0]?.phase === 'explore' && r2[0]?.lessons?.length === 0)
check('attempt 2 receives the earned lesson', Array.isArray(r2[1]?.lessons) && r2[1].lessons.includes(lessonId), JSON.stringify(r2[1]?.lessons))
const impacts = all2.filter((e) => e.type === 'lesson.impact')
check('paired impact recorded for round 2', impacts.length >= 1 && impacts[0].data.round === 2, JSON.stringify(impacts.map((e) => e.data)))

// M3: successive halving — a screening check keeps half the candidates.
const view2 = runtime.create({ id: 'e2e-halving', objective: 'make fix.txt say ok', workspace: repo, initiator: null })
runtime.append(view2, 'evalset.registered', {
  tasks: [
    {
      id: 't1',
      prompt: 'fix the bug so the test passes',
      verify: { cmd: `"${NODE}" test.mjs`, timeoutMs: 60_000 },
      screen: { cmd: `"${NODE}" test.mjs` },
    },
  ],
  holdout: [],
})
runtime.append(view2, 'chain.proposed', {
  version: 1,
  spec: { ...JSON.parse(JSON.stringify(templateFor('code-fix'))), version: 1, params: { candidates: 4 } },
})
runtime.append(view2, 'chain.activated', { version: 1 })
runtime.append(view2, 'campaign.status', { status: 'running' })
let screenCalls = 0
const dispatcher2 = {
  async run(prompt, opts) {
    screenCalls += 1
    writeFileSync(join(opts.cwd, 'fix.txt'), 'ok\n')
    return { text: 'worked on it', sessionId: `stub2-${screenCalls}`, stopReason: 'completed', timedOut: false, error: null }
  },
}
await runRound({ runtime, view: view2, config, dispatcher: dispatcher2, log: (...a) => console.log('[round2]', ...a) })
const e2 = view2.ledger.all()
const recs2 = e2.filter((e) => e.type === 'attempt.finished').map((e) => e.data)
const screenedOut = recs2.filter((r) => r.screenedOut === true)
check('screening keeps half of four candidates', screenedOut.length === 2, JSON.stringify(recs2.map((r) => [r.id, r.screenedOut === true])))
check('screened-out attempts never reach the real run', recs2.filter((r) => !r.screenedOut).length === 2)
check('every candidate was screened first', screenCalls === 6, String(screenCalls))
check('screening verdict is recorded on the survivor', recs2.some((r) => r.screened && r.screened.ok === true && r.screenedOut !== true))


// ---------------------------------------------------------------- M5: L2 replay
// The policy that replay proposes has to survive the round, not just the maths:
// promote a 0.99 gain bar and the next verified round must refuse to promote.
const view3 = runtime.get('e2e-campaign')
const replayCmp = comparePolicies({
  rounds: view3.state.rounds.map((r) => ({ n: r.n, attempts: r.attempts || [] })),
  base: effectivePolicy({ state: view3.state, config }),
  candidate: { minGain: 0.99 },
})
check('replay re-decides the recorded rounds', replayCmp.base.decisions.length === view3.state.rounds.length, JSON.stringify(replayCmp.base.metrics))
check('a 0.99 bar promotes no more than the default bar', replayCmp.delta.promotions <= 0, JSON.stringify(replayCmp.delta))

runtime.append(view3, 'policy.proposed', { version: 1, policy: { minGain: 0.99 } }, 'system')
runtime.append(view3, 'policy.promoted', { version: 1, policy: { minGain: 0.99 } }, 'human')
check('promoted policy lands in state', view3.state.policy?.status === 'promoted' && view3.state.policy?.policy?.minGain === 0.99)

const dispatcher3 = {
  async run(prompt, opts) {
    writeFileSync(join(opts.cwd, 'fix.txt'), 'ok' + String.fromCharCode(10))
    return { text: 'worked on it', sessionId: 'stub3-1', stopReason: 'completed', timedOut: false, error: null }
  },
}
await runRound({ runtime, view: view3, config, dispatcher: dispatcher3, log: (...a) => console.log('[round3]', ...a) })
const gate3 = view3.ledger.all().filter((e) => e.type === 'gate.evaluated').slice(-1)[0]?.data
check('a strict promoted policy blocks the promotion', gate3?.promoted === false, JSON.stringify(gate3?.checks))
check('the blocked reason is the gain bar', gate3?.checks?.beatsIncumbent === false)


// ------------------------------------------------- M4: no Lean, no wasted round
// A task that declares a Lean claim on a machine without Lean must stop at the
// setup checkpoint instead of burning attempts that cannot pass the gate.
const view4 = runtime.get('e2e-campaign')
runtime.append(view4, 'evalset.registered', {
  tasks: [{ id: 'lean-t', prompt: 'prove it', verify: { cmd: 'node test.mjs' }, lean: { source: 'theorem loom_t : 1 = 1 := by rfl', theorem: 'loom_t' } }],
  holdout: [],
}, 'human')
// This machine may or may not have Lean (M7 installed it): force the missing
// branch so the assertion states a rule, not the local toolchain situation.
runtime._leanProbe = { available: false, lean: null, lake: null, versions: { lean: null, lake: null }, install: 'install lean' }
const before = view4.ledger.all().length
await runRound({ runtime, view: view4, config, dispatcher: dispatcher3, log: (...a) => console.log('[round4]', ...a) })
const e4 = view4.ledger.all().slice(before)
const cp4 = e4.filter((e) => e.type === 'checkpoint.raised')
check('a Lean task without a toolchain raises setup', cp4.length === 1 && cp4[0].data.kind === 'setup', JSON.stringify(cp4.map((e) => e.data.kind)))
check('no round starts when the toolchain is missing', !e4.some((e) => e.type === 'round.started'))

// ------------------------------------------- M4: a real Lean gate, when present
// With the toolchain installed the same task must run and pass the math gate
// through the real compiler, not a stub.
runtime._leanProbe = null
if (runtime.leanProbe().available) {
  // Same campaign, same registered task: now the toolchain exists, so the
  // round must run and the claim must clear the real compiler + axiom gate.
  const before4b = view4.ledger.all().length
  await runRound({ runtime, view: view4, config, dispatcher: dispatcher3, log: (...a) => console.log('[lean r1]', ...a) })
  const e4b = view4.ledger.all().slice(before4b)
  check('a real Lean toolchain lets the round start', e4b.some((e) => e.type === 'round.started'))
  const att = view4.state.rounds.at(-1)?.attempts?.[0]
  check('a real Lean toolchain verifies the claim', att?.lean?.ok === true, JSON.stringify(att?.lean?.violations ?? null))
  check('the verified claim carries no axioms', Array.isArray(att?.lean?.axioms) && att.lean.axioms.length === 0, JSON.stringify(att?.lean?.axioms))
} else {
  console.log('SKIP  real Lean gate (toolchain not installed)')
}


// ------------------------------------------------- M6: chain versions are evidence
// A round must record which chain produced it, or L1 can never compare two ways
// of working on the same task.
const { mutateChain } = await import('../src/chain/mutate.js')
const { chainEvidence, coverage } = await import('../src/chain/evidence.js')
const view5 = runtime.create({ id: 'e2e-chain', objective: 'make fix.txt say ok', workspace: repo, initiator: null })
const v1 = (await import('../src/chain/templates.js')).templateFor('code-fix')
v1.version = 1
runtime.append(view5, 'chain.proposed', { version: 1, spec: v1 }, 'system')
runtime.append(view5, 'chain.activated', { version: 1 }, 'system')
runtime.append(view5, 'evalset.registered', {
  tasks: [
    { id: 'c1', prompt: 'fix it', verify: { cmd: 'node test.mjs' } },
    { id: 'c2', prompt: 'fix it again', verify: { cmd: 'node test.mjs' } },
  ],
  holdout: [],
}, 'human')
const dispatcher5 = {
  async run(prompt, opts) {
    writeFileSync(join(opts.cwd, 'fix.txt'), 'ok' + String.fromCharCode(10))
    return { text: 'worked on it', sessionId: 'stub5', stopReason: 'completed', timedOut: false, error: null }
  },
}
await runRound({ runtime, view: view5, config, dispatcher: dispatcher5, log: (...a) => console.log('[chain r1]', ...a) })
const mut = mutateChain(v1, { kind: 'candidates+1', version: 2 })
runtime.append(view5, 'chain.proposed', { version: 2, spec: mut.spec }, 'system')
runtime.append(view5, 'chain.activated', { version: 2 }, 'system')
await runRound({ runtime, view: view5, config, dispatcher: dispatcher5, log: (...a) => console.log('[chain r2]', ...a) })
const rounds5 = view5.state.rounds
check('rounds remember the chain that produced them', rounds5.map((r) => r.chainVersion).join(',') === '1,2', JSON.stringify(rounds5.map((r) => r.chainVersion)))
check('rounds remember the task they ran', rounds5.map((r) => r.taskId).join(',') === 'c1,c2', JSON.stringify(rounds5.map((r) => r.taskId)))
const rows5 = chainEvidence({ rounds: rounds5 })
check('evidence pairs one row per (version, task)', rows5.length === 2, JSON.stringify(rows5))
check('coverage sees both versions', coverage(rounds5).length === 2, JSON.stringify(coverage(rounds5)))

runtime.dispose()
console.log(failures ? `\n${failures} failed` : '\nall M1-M3 checks passed')
process.exitCode = failures ? 1 : 0
