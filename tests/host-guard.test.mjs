// Cordis guards service access per fiber: reading `ctx.tools` from an `effect`
// callback, a timer, or a tool handler throws
//   cannot get property "tools" without inject
// even when the plugin declares the inject list — the guard is evaluated
// against the current fiber, not the plugin.
//
// This regression test emulates that guard exactly, because the fake contexts
// in the other suites do not. Every plugin module must therefore resolve
// services through `ctx.get(name)`.
import { registerTools } from '../src/tools/index.js'
import { registerPanel } from '../src/panel/api.js'

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

const SERVICES = new Set([
  'tools',
  'agents',
  'sessions',
  'sessionController',
  'subagents',
  'agentLoop',
  'webServer',
  'systemPrompt',
])

const registered = { tools: [], routes: [], sections: [] }
const services = {
  tools: {
    register(def) {
      registered.tools.push(def.name)
      return () => {}
    },
    schemas: () => registered.tools.map((name) => ({ name })),
  },
  agents: { currentInitiator: () => ({ id: 'sess-1' }) },
  sessions: { get: () => null },
  sessionController: { prompt: async () => ({ accepted: true }) },
  subagents: {},
  agentLoop: {},
  webServer: {
    register(route) {
      registered.routes.push(route.path)
      return () => {}
    },
  },
  systemPrompt: {
    section(section) {
      registered.sections.push(section.name)
      return () => {}
    },
  },
}

function guardedCtx() {
  const target = {
    effect(fn) {
      return fn()
    },
    get(name) {
      return services[name]
    },
  }
  return new Proxy(target, {
    get(obj, prop, recv) {
      if (typeof prop === 'string' && SERVICES.has(prop)) {
        // Exactly what cordis throws when the property read is not covered by
        // the current fiber's inject list.
        throw new Error(`cannot get property "${prop}" without inject`)
      }
      return Reflect.get(obj, prop, recv)
    },
  })
}

const runtime = {
  listCampaigns: () => [],
  get: () => {
    throw new Error('no campaigns in this test')
  },
  status: () => ({}),
  liveAttempts: () => [],
  ownership: () => ({ owner: null, mine: true }),
  leanProbe: () => ({ available: false }),
  open: () => {
    throw new Error('no campaigns in this test')
  },
  enabled: () => true,
  switchState: () => ({ enabled: true, at: null, by: 'config' }),
}

let toolErr = null
try {
  registerTools(guardedCtx(), { runtime, config: {} })
} catch (err) {
  toolErr = err
}
ok(toolErr === null, 'registerTools survives a guarded context', toolErr?.message)
ok(registered.tools.length === 13, 'every tool registered', registered.tools.length)
ok(registered.tools.includes('rsi_start'), 'rsi_start is among them')

let panelErr = null
try {
  registerPanel(guardedCtx(), { runtime, config: {} })
} catch (err) {
  panelErr = err
}
ok(panelErr === null, 'registerPanel survives a guarded context', panelErr?.message)
ok(registered.routes.includes('/dsh-loom/state'), 'panel route registered')

const ctx = guardedCtx()
let sectionErr = null
try {
  const systemPrompt = ctx.get('systemPrompt')
  ctx.effect(() =>
    systemPrompt.section({ name: 'dsh-loom:campaigns', order: 118, text: () => '' }),
  )
} catch (err) {
  sectionErr = err
}
ok(sectionErr === null, 'system prompt section can be registered through a captured service')

if (fail > 0) process.exitCode = 1
console.log(`\n${pass}/${pass + fail} passed`)
