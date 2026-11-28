// Reading a change the way spec-superflow reads it.
//
// `spec-superflow` (ssf) is the thing that decides *when* a change is allowed to
// move and *what* proves it moved: a change goes draft -> executing -> closing,
// each step recorded in `.spec-superflow.yaml`, and the work itself is a list of
// checkbox tasks in `tasks.md`. Its own word for a task is a step with a verb,
// which is also the closest thing the repository has to a statement of *roles*:
// the verbs say whether a step is planning, writing, testing or reviewing.
//
// The measured table in `stage-plan.js` answers a different question — which
// harness was fastest at each stage, over eight tasks and five arms. It cannot
// know that this change is still in draft and needs two more spec steps, or that
// someone already ticked every task except the review. This module reads what
// ssf knows, so the two can be compared instead of one silently standing in for
// the other.
//
// It is read-only: it never starts, advances or closes a workflow. A planner
// that mutates the thing it is reading cannot be run twice.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Where ssf lives is an install question, not a repository constant: a checkout
// that hardcodes one machine's drive path cannot be run on another, and this
// module must still be able to *read* a change with no ssf installed at all.
// `LOOM_SSF_ROOT` names the package directory; absent, only the reading half
// works and the health check reports that it cannot be asked.
export function ssfRoot(env = process.env) {
  const root = typeof env?.LOOM_SSF_ROOT === 'string' ? env.LOOM_SSF_ROOT.trim() : ''
  return root || null
}

/** Where ssf lives, and whether this install has it at all. */
export function ssfCommand({ root = ssfRoot(), exists = existsSync } = {}) {
  if (!root) return { root: null, script: null, exists: false }
  const script = join(root, 'scripts', 'spec-superflow.mjs')
  return { root, script, exists: exists(script) }
}

/**
 * Run one ssf subcommand and return its answer instead of throwing.
 *
 * A planner that cannot ask a question must not take the round down with it, so
 * a missing binary, a non-zero exit or an unparsable answer all come back as
 * data with `ok: false` and the reason that was observed.
 */
export function runSsf(args, { cwd, node, script = null, spawnSync, timeoutMs = 20_000 } = {}) {
  if (!script) return { ok: false, reason: 'no ssf root configured (set LOOM_SSF_ROOT)' }
  if (typeof spawnSync !== 'function') return { ok: false, reason: 'no spawn available' }
  const result = spawnSync(node || process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: timeoutMs,
    windowsHide: true,
  })
  if (result?.error) return { ok: false, reason: String(result.error.message || result.error) }
  const stdout = String(result?.stdout ?? '')
  const stderr = String(result?.stderr ?? '')
  if ((result?.status ?? 0) !== 0) {
    return { ok: false, code: result?.status ?? null, stdout, stderr, reason: (stderr || stdout).trim().split('\n')[0] || 'ssf exited non-zero' }
  }
  return { ok: true, code: 0, stdout, stderr }
}

/** Minimal read of the state file: the three lines a caller needs. */
export function parseStateYaml(text) {
  const out = {}
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const match = /^([a-zA-Z_][\w-]*):\s*(.*)$/.exec(line)
    if (!match) continue
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    if (value !== '') out[match[1]] = value
  }
  return out
}

export function readState(dir, { read = (p) => readFileSync(p, 'utf8'), exists = existsSync } = {}) {
  const file = join(dir, '.spec-superflow.yaml')
  if (!exists(file)) return { ok: false, reason: 'no .spec-superflow.yaml here' }
  try {
    return { ok: true, file, state: parseStateYaml(read(file)) }
  } catch (error) {
    return { ok: false, reason: String(error?.message ?? error) }
  }
}

// A verb is the closest thing a task list has to a role. Ordered: the first
// rule that matches wins, so "verify the migration writes rows" is a verify step
// and not an implementation one.
const ROLE_VERBS = [
  ['review', /\b(review|audit|critique|inspect the diff)\b/i],
  ['verify', /\b(test|tests|verify|verifies|check|assert|measure|benchmark|reproduce)\b/i],
  ['spec', /\b(plan|plans|specify|spec|design|draft|outline|scope)\b/i],
  ['triage', /\b(investigate|locate|find|read|trace|diagnose|repro)\b/i],
  ['implement', /\b(write|implement|add|fix|build|create|refactor|migrate|rename|delete|wire)\b/i],
]

/** Which role a task's verb names, or null when the list does not say. */
export function roleOfVerb(text) {
  const body = String(text ?? '')
  for (const [role, pattern] of ROLE_VERBS) if (pattern.test(body)) return role
  return null
}

/**
 * Parse `tasks.md` into the steps it declares.
 *
 * Only real checkbox lines count: prose, headings and code fences are not steps,
 * and a fenced example of `- [ ]` inside a template must not be read as one.
 */
export function parseTasks(markdown) {
  const tasks = []
  let fenced = false
  const lines = String(markdown ?? '').split(/\r?\n/)
  lines.forEach((line, index) => {
    if (/^\s*```/.test(line)) {
      fenced = !fenced
      return
    }
    if (fenced) return
    const match = /^\s*[-*]\s*\[( |x|X)\]\s*(?:\*\*)?(?:(\d+(?:\.\d+)*)\s+)?(.+?)(?:\*\*)?\s*$/.exec(line)
    if (!match) return
    const text = match[3].replace(/\s+$/, '')
    tasks.push({ line: index + 1, id: match[2] ?? null, done: match[1].toLowerCase() === 'x', text, role: roleOfVerb(text) })
  })
  return tasks
}

export function readTasks(dir, { read = (p) => readFileSync(p, 'utf8'), exists = existsSync } = {}) {
  const file = join(dir, 'tasks.md')
  if (!exists(file)) return { ok: false, reason: 'no tasks.md here' }
  try {
    const tasks = parseTasks(read(file))
    return { ok: true, file, tasks }
  } catch (error) {
    return { ok: false, reason: String(error?.message ?? error) }
  }
}

/**
 * The roles a change still needs, in the order its unchecked steps ask for them.
 *
 * Done steps are left out on purpose: a plan for the remaining work is what a
 * dispatcher can act on, and including finished ones would keep re-hiring the
 * role that already finished.
 */
export function rolesFromTasks(tasks, { includeDone = false } = {}) {
  const roles = []
  for (const task of Array.isArray(tasks) ? tasks : []) {
    if (!includeDone && task.done) continue
    if (!task.role) continue
    if (!roles.includes(task.role)) roles.push(task.role)
  }
  return roles
}

/**
 * What ssf says about this directory, in the shape the dispatcher uses.
 *
 * `available: false` is an answer, not an error: a task that is not inside an
 * ssf change has no phase and no role list, and the caller falls back to the
 * measured table.
 */
export function ssfPlan({ dir, node, script = null, spawnSync, read = (p) => readFileSync(p, 'utf8'), exists = existsSync, run = null, doctor = true, env = process.env } = {}) {
  const command = ssfCommand({ exists, env })
  const resolvedScript = script ?? command.script
  const stateResult = readState(dir, { read, exists })
  if (!stateResult.ok) return { available: false, reason: stateResult.reason, command }
  const tasksResult = readTasks(dir, { read, exists })
  const tasks = tasksResult.ok ? tasksResult.tasks : []
  const roles = rolesFromTasks(tasks)
  let health = null
  // The health check spawns a process; a round that only needs the role list must
  // be able to ask without paying for it, so it is opt-in.
  const runner = doctor
    ? run ?? (command.exists && typeof spawnSync === 'function' ? () => runSsf(['doctor'], { cwd: dir, node, script: resolvedScript, spawnSync }) : null)
    : null
  if (runner) {
    try {
      health = runner()
    } catch (error) {
      health = { ok: false, reason: String(error?.message ?? error) }
    }
  }
  return {
    available: true,
    command,
    phase: stateResult.state.state ?? stateResult.state.phase ?? stateResult.state.status ?? null,
    change: stateResult.state.change_name ?? stateResult.state.change ?? null,
    stateFile: stateResult.file,
    tasksFile: tasksResult.ok ? tasksResult.file : null,
    tasks,
    open: tasks.filter((task) => !task.done).length,
    roles,
    doctor: health,
  }
}

/**
 * Put the measured table and the change's own task list side by side.
 *
 * The two disagree in a specific, readable way: a stage the table would hire and
 * the task list never asks for is work this change does not contain, and a role
 * the list asks for that the table has no arm for is a hole in the measurement.
 * Both are worth printing; neither is worth guessing away.
 */
export function comparePlans({ measured = [], dynamic = [], phase = null } = {}) {
  const staticRoles = [...new Set(measured)]
  const dynamicRoles = [...new Set(dynamic)]
  const onlyMeasured = staticRoles.filter((role) => !dynamicRoles.includes(role))
  const onlyDynamic = dynamicRoles.filter((role) => !staticRoles.includes(role))
  const shared = staticRoles.filter((role) => dynamicRoles.includes(role))
  const same = onlyMeasured.length === 0 && onlyDynamic.length === 0 && staticRoles.length === dynamicRoles.length
  let sentence
  if (dynamicRoles.length === 0) {
    sentence = 'the change declares no role yet: the measured table would decide for it'
  } else if (same) {
    sentence = `both plans name the same ${shared.length} role(s)`
  } else {
    const parts = []
    if (onlyMeasured.length) parts.push(`the table hires ${onlyMeasured.join(', ')} which this change does not ask for`)
    if (onlyDynamic.length) parts.push(`the change asks for ${onlyDynamic.join(', ')} which the table has not measured`)
    sentence = parts.join('; ')
  }
  if (phase) sentence = `${sentence} (change in ${phase})`
  return { same, phase, staticRoles, dynamicRoles, shared, onlyMeasured, onlyDynamic, sentence }
}
