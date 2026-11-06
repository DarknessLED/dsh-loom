// Loads the plugin with a fake cordis ctx — no DSH runtime needed.
// run: node scripts/verify.mjs
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Ledger } from '../src/core/ledger.js'
import { writeLease, readLease } from '../src/runtime/lease.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const home = mkdtempSync(join(tmpdir(), 'loom-verify-'))
process.env.LOOM_HOME = home

const results = []
const ok = (cond, label, extra) => {
  results.push([cond ? 'PASS' : 'FAIL', label])
  if (!cond) {
    process.exitCode = 1
    if (extra !== undefined) console.error('   ', extra)
  }
}

function makeCtx() {
  const tools = new Map()
  const effects = []
  const services = {}
  const pending = []
  const ctx = {
    // cordis `inject` runs the closure when the service appears; a fake that
    // runs it immediately would hide exactly the boot-order bug this guards.
    inject(deps, fn) {
      pending.push({ deps: [...deps], fn, ran: false })
    },
    provide(name, value) {
      services[name] = value
      for (const p of pending) {
        if (p.ran || !p.deps.every((d) => services[d])) continue
        p.ran = true
        const scope = Object.create(ctx)
        Object.assign(scope, services)
        try {
          p.fn(scope)
        } catch (err) {
          ok(false, `inject(${p.deps.join(',')}) threw`, err)
        }
      }
    },
    logger: { info() {}, warn() {}, error() {} },
    effect(fn, label) {
      const dispose = fn()
      if (typeof dispose === 'function') effects.push({ label, dispose })
      return () => dispose?.()
    },
    on: () => () => {},
    get: (k) => (k === 'tools' ? ctx.tools : services[k]),
    tools: {
      register(def) {
        if (tools.has(def.name)) throw new Error(`duplicate tool: ${def.name}`)
        tools.set(def.name, def)
        return () => tools.delete(def.name)
      },
      get: (n) => tools.get(n),
      schemas: () => [...tools.values()].map(({ name, description, parameters }) => ({ name, description, parameters })),
    },
    disposeAll() {
      for (const e of effects.reverse()) {
        try {
          e.dispose()
        } catch (err) {
          ok(false, `dispose ${e.label} threw`, err)
        }
      }
    },
  }
  return ctx
}

const mod = await import(pathToFileURL(join(ROOT, 'src', 'index.js')).href)
ok(typeof mod.apply === 'function', 'exports apply(ctx, config)')
ok(Array.isArray(mod.inject) && mod.inject.includes('tools'), 'injects tools')

const ctx = makeCtx()
mod.apply(ctx, { tickMs: 1000 })
const names = [...ctx.tools.schemas().map((s) => s.name)].sort()
ok(names.length === 10, `10 tools registered (${names.join(', ')})`, names)
for (const n of ['rsi_start', 'rsi_status', 'rsi_control', 'rsi_chain', 'rsi_evalset', 'rsi_decide', 'rsi_report', 'rsi_lean', 'rsi_replay', 'rsi_dashboard']) {
  ok(names.includes(n), `tool ${n}`)
}
for (const n of names) {
  const d = ctx.tools.get(n)
  ok(d.parameters?.type === 'object', `${n}: parameters is a full JSON Schema`)
  ok(typeof d.execute === 'function', `${n}: execute is a function`)
  ok(typeof d.timeoutMs === 'number', `${n}: static timeoutMs`)
  ok(typeof d.output?.render === 'function', `${n}: output.render present`)
}

const call = async (name, args) => {
  const value = await ctx.tools.get(name).execute(args, { deferContext() {}, concludeTurn() {} })
  // host gate: lossless JSON only
  const round = JSON.parse(JSON.stringify(value ?? null))
  ok(round !== undefined, `${name}: lossless output`)
  return value
}

// --- happy path -------------------------------------------------------------
const started = await call('rsi_start', { objective: 'Raise coverage of src/parser to 80%', workspace: ROOT, template: 'code-fix', budgetRounds: 3 })
ok(started.campaign?.startsWith('c-'), `campaign created: ${started.campaign}`)
ok(started.chain?.version === 1, 'seed chain proposed')

await call('rsi_evalset', {
  action: 'register',
  tasks: [
    { id: 't1', prompt: 'fix parser crash on empty input', verify: { cmd: 'node -e "process.exit(0)"' } },
    { id: 't2', prompt: 'cover unicode path', verify: { cmd: 'node -e "process.exit(0)"' } },
    { id: 'h1', prompt: 'holdout: malformed header', verify: { cmd: 'node -e "process.exit(0)"' } },
  ],
  holdout: ['h1'],
})

const act = await call('rsi_chain', { action: 'activate', version: 1 })
ok(act.active === 1, 'chain v1 activated')

const st = await call('rsi_control', { action: 'start' })
ok(st.status === 'running', `campaign running (${st.status})`)

const status = await call('rsi_status', {})
ok(status.status === 'running', 'status reflects running')
ok(status.chainVersion === 1, 'status reports active chain')

await call('rsi_control', { action: 'constraint', text: 'never touch generated/' })
await call('rsi_control', { action: 'budget', usd: 2 })
const paused = await call('rsi_control', { action: 'pause' })
ok(paused.status === 'paused', 'pause works')
const resumed = await call('rsi_control', { action: 'resume' })
ok(resumed.status === 'running', 'resume works')

const report = await call('rsi_report', { limit: 3 })
ok(typeof report === 'string' && report.includes('RSI campaign'), 'report renders text')

// --- ledger + views ---------------------------------------------------------
const evFile = join(home, 'campaigns', started.campaign, 'events.jsonl')
ok(existsSync(evFile), 'events.jsonl written')
const events = readFileSync(evFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
ok(events.every((e, i) => e.seq === i + 1), 'event seq is contiguous from 1')
ok(existsSync(join(home, 'campaigns', started.campaign, 'views', 'state.json')), 'state.json materialized')

// --- guards -----------------------------------------------------------------
let threw = false
try {
  await call('rsi_chain', { action: 'propose', spec: { name: 'x', version: 1, nodes: [{ id: 'a', type: 'nope' }] } })
} catch {
  threw = true
}
ok(threw, 'invalid chain spec rejected')

threw = false
try {
  await call('rsi_control', { action: 'start' })
} catch {
  threw = true
}
ok(threw, 'cannot start an already-running campaign')

threw = false
try {
  await call('rsi_evalset', { action: 'register', tasks: [{ id: 't9', prompt: 'x', verify: { cmd: 'true' } }], holdout: ['missing'] })
} catch {
  threw = true
}
ok(threw, 'holdout ids must exist in tasks')

// --- a second instance keeps its tools and takes the loop over ----------------
// A restarted window must never be a silent no-op: the newest instance claims
// the loop, and the older one stands by instead of both dispatching.
const ctx2 = makeCtx()
mod.apply(ctx2, {})
ok(ctx2.tools.schemas().length === 10, 'second instance still registers every tool')
const claimAfterSecond = JSON.parse(readFileSync(join(home, 'lock'), 'utf8'))
ok(claimAfterSecond.instance !== undefined, 'second instance claimed the loop')
ok(claimAfterSecond.pid === process.pid, 'claim records the owning pid')

// --- dispose releases the lock ---------------------------------------------
ctx.disposeAll()
ok(!existsSync(join(home, 'lock')), 'dispose releases lock')

const ctx3 = makeCtx()
mod.apply(ctx3, {})
ok(ctx3.tools.schemas().length === 10, 'lock re-acquirable after dispose')
ctx3.disposeAll()

// --- M2: crash recovery ------------------------------------------------------
// Simulate a host that died mid-round: one running lease + one open round.
const crashDir = join(home, 'campaigns', started.campaign)
const crashLedger = new Ledger(join(crashDir, 'events.jsonl'))
crashLedger.append('round.started', { n: 9, taskId: 't1' }, 'system')
writeLease(crashDir, { attemptId: 'r9a1', round: 9, deadline: Date.now() + 60000 })

const ctx4 = makeCtx()
mod.apply(ctx4, {})
const afterRecovery = readFileSync(join(crashDir, 'events.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const interrupted = afterRecovery.filter((e) => e.type === 'round.finished' && e.data.n === 9)
ok(interrupted.length === 1 && interrupted[0].data.status === 'interrupted', 'boot closes a round a dead host left running')
const abandoned = afterRecovery.filter((e) => e.type === 'attempt.abandoned' && e.data.id === 'r9a1')
ok(abandoned.length === 1 && abandoned[0].data.reason === 'host-restart', 'boot writes off the stale attempt lease')
ok(readLease(crashDir, 'r9a1')?.state === 'abandoned', 'stale lease is persisted as abandoned')
ok(afterRecovery.every((e, i) => e.seq === i + 1), 'recovery keeps event seq contiguous')
ctx4.disposeAll()

// ------------------------------------- late services: routes ride ctx.inject
// `ctx.get('webServer')` is undefined during apply on a real boot, so a route
// registered from that check never exists and the panel shows HTTP 404.
{
  const ctxLate = makeCtx()
  mod.apply(ctxLate, { tickMs: 60000 })
  const routes = []
  const sections = []
  ctxLate.provide('webServer', {
    register(route) {
      routes.push(route)
      return () => {}
    },
  })
  ctxLate.provide('systemPrompt', {
    section(spec) {
      sections.push(spec)
      return () => {}
    },
  })
  ok(routes.length === 1, `panel route registers after webServer appears (${routes.length})`, routes.map((r) => r.path))
  ok(routes[0]?.path === '/dsh-loom/state', 'panel route path is /dsh-loom/state')
  ok(routes[0]?.kind === 'exact', 'panel route is exact')
  ok(typeof routes[0]?.handler === 'function', 'panel route has a handler')
  ok(sections.length === 1, `prompt section registers after systemPrompt appears (${sections.length})`)
  ok(sections[0]?.name === 'dsh-loom:campaigns', 'prompt section name')
  ok(typeof sections[0]?.text === 'function' && typeof sections[0].text() === 'string', 'prompt text is a lazy string')
  ctxLate.disposeAll()
}

rmSync(home, { recursive: true, force: true })

const pass = results.filter((r) => r[0] === 'PASS').length
console.log(results.map((r) => `${r[0]}  ${r[1]}`).join('\n'))
console.log(`\n${pass}/${results.length} passed`)
if (pass !== results.length) process.exitCode = 1
