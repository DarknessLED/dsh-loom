// Install-level defaults that are not campaign state.
//
// Planning is the first one. A campaign may always say what it wants
// (`rsi_control(action:"plan")` writes a campaign policy), but the *default* for
// campaigns that say nothing is an operator preference, and an operator changes it
// from the workbench, not by editing a config file. So it lives in a small file
// beside the ledgers, with its own audit trail — the same shape as `switch.json`,
// and for the same reason: toggling a default must not punctuate a campaign's
// history or shift what "round 3" means.
//
// A missing file is not an error: it means "never set", and the configured default
// applies. An unreadable file must not silently flip behaviour either — it answers
// with `null` and says why, so the caller keeps the config value and the panel can
// show that the file is broken.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { appendJsonl, writeJsonAtomic } from './atomic.js'
import { ensureDir } from './paths.js'

export const SETTINGS_FILE = 'settings.json'
export const SETTINGS_LOG = 'settings.jsonl'

/** Keys this file is allowed to carry. Anything else is dropped on write. */
const KEYS = ['plan', 'dispatch']

export function settingsPath(home) {
  return join(home, SETTINGS_FILE)
}

export function settingsLogPath(home) {
  return join(home, SETTINGS_LOG)
}

/**
 * @returns {{plan: boolean|null, at: number|null, by: string, reason: string|null}}
 *   `plan: null` means the file did not answer (missing, broken, or the key was
 *   never written) — the caller applies its configured default.
 */
export function readSettings(home) {
  const blank = { plan: null, dispatch: null, at: null, by: 'config', reason: 'default' }
  try {
    const file = settingsPath(home)
    if (!existsSync(file)) return blank
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    // Each key answers for itself: a file written before the dispatch switch
    // existed carries `plan` and no `dispatch`, and reading the second as `false`
    // would turn a workflow the operator never chose into the off position --
    // which is the same answer, but reached by guessing instead of by asking.
    const plan = typeof raw?.plan === 'boolean' ? raw.plan : null
    const dispatch = typeof raw?.dispatch === 'boolean' ? raw.dispatch : null
    if (!raw || typeof raw !== 'object' || (plan === null && dispatch === null)) {
      return { plan: null, dispatch: null, at: null, by: 'config', reason: 'unreadable' }
    }
    return {
      plan,
      dispatch,
      at: Number.isFinite(raw.at) ? raw.at : null,
      by: typeof raw.by === 'string' ? raw.by : 'human',
      reason: typeof raw.reason === 'string' ? raw.reason : null,
    }
  } catch {
    return { plan: null, dispatch: null, at: null, by: 'config', reason: 'unreadable' }
  }
}

/**
 * Merge `patch` into the file, write it atomically, and append one audit line.
 *
 * Only known keys survive, and a value of the wrong type is refused rather than
 * coerced: `plan: "false"` from a hand-edited file or a bad client is a mistake
 * worth naming, not a boolean worth guessing.
 */
export function writeSettings(home, patch, { by = 'human', reason = null, now = Date.now() } = {}) {
  const incoming = patch && typeof patch === 'object' ? patch : {}
  for (const key of Object.keys(incoming)) {
    if (!KEYS.includes(key)) throw new Error(`unknown setting: ${key} (known: ${KEYS.join(', ')})`)
  }
  for (const key of KEYS) {
    if (key in incoming && typeof incoming[key] !== 'boolean') {
      throw new Error(`setting "${key}" must be a boolean, got ${typeof incoming[key]}`)
    }
  }
  const prior = readSettings(home)
  const next = { ...prior, at: now, by, reason: reason ?? null }
  for (const key of KEYS) if (key in incoming) next[key] = incoming[key]
  ensureDir(home)
  writeJsonAtomic(settingsPath(home), next)
  appendJsonl(settingsLogPath(home), {
    at: now,
    by,
    reason: reason ?? null,
    patch: Object.fromEntries(KEYS.filter((k) => k in incoming).map((k) => [k, incoming[k]])),
    state: Object.fromEntries(KEYS.map((k) => [k, next[k] ?? null])),
  })
  return next
}

/**
 * The plan mode a campaign should get when it has not asked for one.
 *
 * `fallback` is the configured `loopPolicy.planMode`; the settings file wins over
 * it because the workbench toggle is the operator's latest word. `null` (nothing
 * set) returns the fallback untouched.
 */
export function planModeFromSettings(home, fallback) {
  const s = readSettings(home)
  if (s.plan === true) return 'full'
  if (s.plan === false) return 'off'
  return fallback
}

/**
 * The config a round runs under, with the workbench default applied.
 *
 * Pure on purpose: the runtime calls it per round, and a test can call it without
 * standing up a runtime. A campaign's own `planMode` still outranks this — that
 * precedence lives in `effectivePolicy`/`policyFor`, not here.
 */
export function dispatchFromSettings(home, fallback = false) {
  const s = readSettings(home)
  return s.dispatch === null ? fallback === true : s.dispatch === true
}

export function roundConfigWithSettings(config, home) {
  const planMode = planModeFromSettings(home, config?.loopPolicy?.planMode)
  const dispatchOn = dispatchFromSettings(home, config?.session?.dispatch?.enabled === true)
  const samePlan = planMode === config?.loopPolicy?.planMode
  const sameDispatch = dispatchOn === (config?.session?.dispatch?.enabled === true)
  if (samePlan && sameDispatch) return config
  return {
    ...config,
    loopPolicy: { ...(config.loopPolicy || {}), planMode },
    session: { ...(config.session || {}), dispatch: { ...(config.session?.dispatch || {}), enabled: dispatchOn } },
  }
}