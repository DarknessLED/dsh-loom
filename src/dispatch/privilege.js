// What a worker child is allowed to reach, decided by the task it is doing.
//
// The host has no per-child tool permission field: `AgentOptions` carries
// provider/model/effort/tokens and nothing else, and `SubagentStartRequest` has
// no capability list either. The only lever a plugin owns is the tool pipeline,
// so the decision is made here and enforced by a guard installed in
// `src/index.js` -- `ctx.tools.guard` runs on every dispatch, sees the calling
// `agent.id` (the child session), and a returned string is a denial the
// waterfall cannot undo.
//
// The registry is module-level on purpose: the guard lives in the plugin's
// apply(), the registration happens inside a round, and both must see the same
// map. Keys are child session ids; a session that is not in the map is somebody
// else's child and is left alone -- a guard that denied everything it had not
// been told about would break the operator's own session.
//
// Default is "allow", which is today's behaviour byte for byte. Setting
// `session.workerShell: 'declared'` makes the loop deny shell tools to any
// child whose task does not carry `exec: true` (or `verify.exec: true`). That
// is the honest shape of the rule: a task that never says it needs a shell does
// not get one, and the attempt record says which way it went.

/** Tools that run arbitrary code. Denying these is the difference the spec buys. */
export const SHELL_TOOLS = Object.freeze(['bash', 'pwsh', 'powershell', 'ops_bash', 'run_code', 'terminal_open', 'terminal_send'])

const isShellTool = (name) => SHELL_TOOLS.includes(String(name ?? ''))

/**
 * Does this task declare that it needs to execute commands?
 *
 * Two spellings are accepted because the eval set is caller-supplied JSON and
 * both have been written by hand: `exec: true` on the task, or `verify.exec:
 * true` next to the command. Anything else -- including a missing field -- is
 * "did not say", which is not the same as "said no" for a task running under
 * the default policy and is exactly "no" under the declared policy.
 */
export function declaresExec(task) {
  if (!task || typeof task !== 'object') return false
  if (task.exec === true) return true
  if (task.verify && typeof task.verify === 'object' && task.verify.exec === true) return true
  return false
}

/**
 * The privilege set for one task's children, as a record a round can store.
 *
 * `mode` is echoed so an attempt read months later can say *why* a shell was
 * refused without reconstructing the config at the time.
 */
export function privilegesFor(task, config) {
  const mode = config?.session?.workerShell === 'declared' || config?.session?.workerShell === 'deny' ? config.session.workerShell : 'allow'
  if (mode === 'allow') {
    return { shell: true, mode, reason: 'session.workerShell is allow: every child keeps the host default' }
  }
  if (mode === 'deny') {
    return { shell: false, mode, reason: 'session.workerShell is deny: no worker child runs commands' }
  }
  const declared = declaresExec(task)
  return {
    shell: declared,
    mode,
    reason: declared
      ? 'the task declares exec, so its children keep the shell'
      : 'the task does not declare exec, so its children are refused shell tools',
  }
}

/** A session-id keyed map of refusals, shared by the round and the guard. */
export function createPrivilegeRegistry() {
  const denied = new Map()
  return {
    deny(sessionId, reason) {
      if (sessionId === null || sessionId === undefined || sessionId === '') return null
      const id = String(sessionId)
      denied.set(id, String(reason ?? 'no shell for this child'))
      return id
    },
    release(sessionId) {
      if (sessionId === null || sessionId === undefined || sessionId === '') return false
      return denied.delete(String(sessionId))
    },
    /**
     * The guard's answer for one dispatch: a string refuses, `undefined`
     * delegates. A session that was never registered is not this plugin's
     * business and always delegates.
     */
    decision(sessionId, toolName) {
      if (sessionId === null || sessionId === undefined || sessionId === '') return undefined
      const reason = denied.get(String(sessionId))
      if (!reason) return undefined
      if (!isShellTool(toolName)) return undefined
      return `[loom] ${reason} (tool: ${String(toolName)})`
    },
    size() {
      return denied.size
    },
    has(sessionId) {
      if (sessionId === null || sessionId === undefined || sessionId === '') return false
      return denied.has(String(sessionId))
    },
  }
}

/** The one registry the plugin's guard and its rounds share. */
export const shellPrivileges = createPrivilegeRegistry()
