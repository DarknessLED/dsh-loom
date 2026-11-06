import { randomUUID } from 'node:crypto'
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeConfig } from './core/config.js'
import { loomHome } from './core/paths.js'
import { claimOwnership, releaseLock } from './core/lock.js'
import { Runtime } from './runtime/runtime.js'
import { svc } from './core/services.js'
import { registerTools } from './tools/index.js'
import { registerPanel } from './panel/api.js'

export const name = 'dsh-loom'

/** Hard dependency: `ctx.tools` exists by the time apply() runs. */
export const inject = ['tools']

function traceLine(stage, err) {
  try {
    const home = process.env.LOOM_HOME || join(process.env.USERPROFILE || process.env.HOME || '.', '.dsh', 'loom')
    mkdirSync(home, { recursive: true })
    appendFileSync(
      join(home, 'apply.log'),
      `${new Date().toISOString()} pid=${process.pid} ${stage}${err ? ` :: ${err?.stack || err}` : ''}
`,
    )
  } catch {
    /* tracing must never throw */
  }
}

export function apply(ctx, config) {
  try {
    return applyInner(ctx, config)
  } catch (err) {
    // A throw here would otherwise be a single warning inside a packaged host.
    traceLine('apply:threw', err)
    throw err
  }
}

function applyInner(ctx, config) {
  let cfg
  try {
    cfg = normalizeConfig(config)
  } catch (err) {
    ctx.logger?.warn?.(`[loom] bad config: ${err?.message ?? err}`)
    return
  }
  const home = loomHome(cfg)

  const trace = traceLine
  trace('apply:start')
  trace('apply:config')

  const log = (...args) => {
    try {
      ctx.logger?.info?.('[loom]', ...args)
    } catch {
      /* logging must never throw */
    }
  }

  // Newest instance wins the loop. A restarted window must never end up as a
  // silent no-op because an abandoned process still holds a pid lock.
  const claim = claimOwnership(home, { instance: randomUUID().slice(0, 8) })
  if (claim.previous && claim.previous.pid !== process.pid) {
    log(`took the loop over from pid ${claim.previous.pid}`)
  }

  trace(`apply:claimed owner=${claim.ok} instance=${claim.record?.instance}`)

  const runtime = new Runtime({ ctx, home, config: cfg, log, lockFile: claim.file })

  // Anything a previous host left "running" is a lie: close it before ticking.
  try {
    const recovered = runtime.recover()
    if (recovered.abandonedAttempts.length || recovered.interruptedRounds.length) {
      log(
        `recovered after restart: ${recovered.abandonedAttempts.length} attempt(s), ${recovered.interruptedRounds.length} round(s)`,
      )
    }
  } catch (err) {
    log('recovery failed:', err?.message ?? err)
  }

  // Tools are registered whatever the ownership state: a second window should
  // still be able to look, and say clearly that another window is driving.
  try {
    registerTools(ctx, { runtime, config: cfg })
    trace('apply:tools')
  } catch (err) {
    trace('apply:tools-failed', err)
    log('tool registration failed:', err?.message ?? err)
  }

  // The panel's only data source. `ctx.get('webServer')` at apply time is a
  // trap: services appear later, so the check is false on a real boot and the
  // route silently never exists (the panel then shows HTTP 404). `inject`
  // runs the closure when the service shows up, and never runs on a headless
  // host that has no webServer at all.
  if (typeof ctx.inject === 'function') {
    ctx.inject(['webServer'], (scope) => {
      try {
        registerPanel(scope, { runtime, config: cfg })
      } catch (err) {
        log('panel route failed:', err?.message ?? err)
      }
    })
  }

  // Keep the human-facing agent aware of running campaigns without waking it.
  // Same late-service rule as the panel route: inject, do not `ctx.get` once.
  if (typeof ctx.inject === 'function') {
    ctx.inject(['systemPrompt'], (scope) => {
      try {
        const systemPrompt = svc(scope, 'systemPrompt')
        scope.effect(() =>
          systemPrompt.section({
            name: 'dsh-loom:campaigns',
            order: 118,
            text: () => {
              try {
                return runtime.briefForPrompt()
              } catch (err) {
                log('campaign brief failed:', err?.message ?? err)
                return ''
              }
            },
          }),
        )
      } catch (err) {
        log('campaign brief failed:', err?.message ?? err)
      }
    })
  }

  // Single timer owns all scheduling. Callbacks must never throw: an uncaught
  // throw here is fatal to the host process.
  ctx.effect(() => {
    const tick = () => {
      try {
        runtime.tick()
      } catch (err) {
        log('tick failed:', err?.stack ?? err)
      }
    }
    const handle = setInterval(tick, Math.max(1000, Number(cfg.tickMs) || 20_000))
    if (typeof handle.unref === 'function') handle.unref()
    const warm = setTimeout(tick, 250)
    if (typeof warm.unref === 'function') warm.unref()
    return () => {
      clearInterval(handle)
      clearTimeout(warm)
      runtime.dispose()
    }
  }, 'dsh-loom: scheduler')

  trace('apply:panel+prompt')
  ctx.effect(() => () => releaseLock(claim.file), 'dsh-loom: lock')

  trace(`apply:done tools=${svc(ctx, 'tools')?.schemas?.()?.length ?? '?'}`)
  log(`ready at ${home} (pid ${process.pid}, instance ${claim.record.instance})`)
}

export default apply

// touch: 2026-11-06T17:08:36Z
