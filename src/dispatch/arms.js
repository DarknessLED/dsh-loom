/**
 * The far side of an arm: which agent program actually does the work, and which
 * model it runs on.
 *
 * The stage plan names an arm per stage (`codex`, `gcli`, ...). An arm is only a
 * *declaration* until something can start it, and the loop's own executor is one
 * DSH subagent. T3 Code is the host that can start the other four: it owns the
 * agent programs, their credentials and their sandboxes, and it takes a
 * `--provider`/`--model` pair per thread. So this module is the seam that turns
 * `{arm, model}` into a command, and back into an answer.
 *
 * Two things it deliberately does not do:
 *
 *   - it does not guess a provider for a harness T3 does not ship (Gemini CLI has
 *     no provider instance here; `agy` maps to `antigravity`, `cc` to
 *     `claudeAgent`, `codex` to `codex`). A missing provider is a reason to fall
 *     back, not a reason to pick the nearest thing and call it routed.
 *   - it does not assume a provider advertises the model the plan named. T3
 *     advertises a per-provider model list and refuses anything outside it, so a
 *     name that is not on the list is adjusted once, visibly, and reported.
 */
import { spawn as nodeSpawn } from 'node:child_process'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Arm names as the benchmark measured them. */
export const ARM_PROVIDERS = {
  dsh: null,
  cc: 'claudeAgent',
  codex: 'codex',
  gcli: null,
  agy: 'antigravity',
}

/**
 * The model every routed arm asks for unless a stage overrides it.
 *
 * `auto/deepseek-v4.1-flash` is a magpie *routing group*, not a model: the
 * gateway picks the concrete model behind it. That is the same idea as a
 * client's "Auto" model option, one layer down; asking for it by group id keeps
 * the loop from pinning a model the account may lose access to tomorrow.
 */
export const DEFAULT_ARM_MODEL = 'auto/deepseek-v4.1-flash'

/** Where T3 keeps its CLI shim and its provider caches. */
export function t3Home(home = homedir()) {
  return join(home, '.t3')
}

export function t3Command(home = homedir()) {
  return join(t3Home(home), 'bin', 't3.cmd')
}

/**
 * The argv for one delegated attempt.
 *
 * The prompt goes over stdin (`-`) rather than argv: an attempt brief is tens of
 * kilobytes and well past what a Windows command line carries, and quoting it
 * into a `.cmd` line would make the quoting bug part of the transport.
 */
export function threadArgs({ cwd, provider, model }) {
  return ['thread', 'start', cwd, '-', '--provider', provider, '--model', model, '--wait', '--json']
}

/**
 * Read the one JSON line T3 prints for a finished run.
 *
 * `--json` prints a single object on the last line; anything the agent printed
 * before it is not the transport's business. A run that failed still carries a
 * status and an error, and that is a result -- not a crash.
 */
export function parseT3Reply(stdout) {
  const lines = String(stdout ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (!lines[i].startsWith('{')) continue
    let parsed
    try {
      parsed = JSON.parse(lines[i])
    } catch {
      continue
    }
    if (!parsed || typeof parsed !== 'object' || !('status' in parsed)) continue
    return {
      status: typeof parsed.status === 'string' ? parsed.status : 'unknown',
      reply: typeof parsed.reply === 'string' ? parsed.reply : null,
      error: typeof parsed.error === 'string' && parsed.error ? parsed.error : null,
      threadId: typeof parsed.threadId === 'string' ? parsed.threadId : null,
      runId: typeof parsed.runId === 'string' ? parsed.runId : null,
    }
  }
  return null
}

/**
 * The model a provider will actually accept.
 *
 * T3 refuses a model the provider does not advertise ("is not advertised by
 * provider ..."), so a plan that names a model for the wrong family would fail
 * every attempt. The wanted name wins when it is on the list; otherwise a
 * routing group is preferred (it is the closest thing to "let the gateway
 * decide"), then anything containing `deepseek`, then the first advertised name.
 * The caller records `adjusted` so a silently substituted model never reads as a
 * routing decision.
 */
export function pickAdvertisedModel(advertised, wanted) {
  const list = (Array.isArray(advertised) ? advertised : []).filter((m) => typeof m === 'string' && m)
  if (wanted && list.includes(wanted)) return { model: wanted, adjusted: false, reason: 'advertised' }
  if (!list.length) return { model: wanted ?? null, adjusted: false, reason: 'no list' }
  const group = list.find((m) => m.startsWith('group/') || m.startsWith('auto/'))
  if (group) return { model: group, adjusted: true, reason: `not advertised; a routing group is (${group})` }
  const deepseek = list.find((m) => /deepseek/i.test(m))
  if (deepseek) return { model: deepseek, adjusted: true, reason: `not advertised; ${deepseek} is` }
  return { model: list[0], adjusted: true, reason: `not advertised; ${list[0]} is` }
}

/**
 * The providers this machine can actually run, and the models each one accepts.
 *
 * Read from T3's own provider caches rather than by starting the server: the
 * caches are what the CLI itself reads to decide what is installed, and asking
 * them costs one directory listing instead of a network round trip on every
 * round. A provider that is installed but not enabled is not routable.
 */
export function readProviders({ home = homedir(), fs = { readFileSync, readdirSync, existsSync } } = {}) {
  const dir = join(t3Home(home), 'caches')
  const out = {}
  if (!fs.existsSync(dir)) return out
  let names = []
  try {
    names = fs.readdirSync(dir)
  } catch {
    return out
  }
  for (const name of names) {
    if (!name.endsWith('.json') || name.includes('-probe')) continue
    let data
    try {
      data = JSON.parse(fs.readFileSync(join(dir, name), 'utf8'))
    } catch {
      continue
    }
    if (!data || typeof data !== 'object' || !data.displayName) continue
    const id = name.replace(/\.json$/, '')
    out[id] = {
      id,
      displayName: data.displayName,
      status: typeof data.status === 'string' ? data.status : null,
      enabled: data.enabled === true,
      // The cache writes each model as `{slug, name, ...}`; reading only bare
      // strings made every provider look like it advertised nothing, and the
      // routing then said "no list" while the list was right there.
      models: Array.isArray(data.models)
        ? data.models
            .map((m) => (typeof m === 'string' ? m : m?.slug))
            .filter((m) => typeof m === 'string' && m.length > 0)
        : [],
    }
  }
  return out
}

/** Can this arm be started at all, and by whom? */
export function routeFor(arm, { providers = {}, home = homedir(), exists = existsSync } = {}) {
  const provider = ARM_PROVIDERS[arm] ?? null
  if (!arm || arm === 'dsh') return { routable: false, reason: 'the loop runs this one itself', provider: null, models: [] }
  if (!provider) return { routable: false, reason: `no T3 provider ships the ${arm} harness`, provider: null, models: [] }
  const known = providers[provider]
  if (!known) return { routable: false, reason: `T3 has no provider instance ${provider}`, provider, models: [] }
  if (known.enabled === false || (known.status && known.status !== 'ready')) {
    return { routable: false, reason: `provider ${provider} is ${known.status ?? 'disabled'}`, provider, models: known.models }
  }
  if (!exists(t3Command(home))) {
    return { routable: false, reason: 'the T3 CLI is not installed', provider, models: known.models }
  }
  return { routable: true, reason: `delegated to T3 provider ${provider}`, provider, models: known.models }
}

/** Quote only what needs it: cmd treats a quoted command name as a literal. */
function quoted(arg) {
  const text = String(arg)
  return /\s/.test(text) ? `"${text}"` : text
}

/**
 * The directory T3 has to know about for a thread to start in `cwd`.
 *
 * T3 starts a thread in a *project*, not in any directory: a worktree path that
 * belongs to no project is answered with "No T3 Code project matches". Our
 * attempts run in `.../worktrees/<campaign>/<attempt>`, so the campaign's
 * worktree root is the stable thing to register -- one project per campaign
 * instead of one per attempt, and attempt directories are then inside it.
 */
export function projectRootFor(cwd) {
  const parts = String(cwd ?? '').split(/[\\/]/).filter(Boolean)
  const last = parts[parts.length - 1] ?? ''
  if (/^r\d+a\d+$/.test(last) && parts.length >= 2) return parts.slice(0, -1).join('\\')
  return String(cwd ?? '')
}

/** Register a project with T3, if it is not one already. Silence is success. */
async function addProject({ file, dir, spawn, timeoutMs = 60_000 }) {
  return new Promise((resolve) => {
    let child
    const finish = (value) => {
      clearTimeout(timer)
      resolve(value)
    }
    const timer = setTimeout(() => {
      try {
        child?.kill()
      } catch {
        /* already gone */
      }
      finish({ ok: false, reason: 'the project registration timed out' })
    }, Math.max(1, timeoutMs))
    try {
      child = spawn('cmd.exe', ['/d', '/s', '/c', file, 'project', 'add', quoted(dir)], {
        windowsHide: true,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (err) {
      finish({ ok: false, reason: String(err?.message ?? err) })
      return
    }
    let out = ''
    child.stdout?.on('data', (chunk) => {
      out += String(chunk)
    })
    child.stderr?.on('data', (chunk) => {
      out += String(chunk)
    })
    child.on('error', (err) => finish({ ok: false, reason: String(err?.message ?? err) }))
    child.on('close', (code) => {
      // Adding a project that already exists fails too, and that is fine: the
      // only thing this call is for is "make sure T3 knows the path".
      finish({ ok: code === 0, reason: out.trim().split(/\r?\n/).slice(-1)[0] ?? '' })
    })
  })
}

/**
 * Run one attempt on another agent program and come back with its answer.
 *
 * `--wait` makes the CLI print one JSON line when the run settles, so the
 * promise resolves exactly when the agent is done. The child's stdin carries the
 * brief; its stdout is the transport's JSON (the agent's own chatter is on its
 * own stream and is not parsed here).
 *
 * A thread cannot start in a directory T3 does not already know: the first live
 * round failed with "No T3 Code project matches", which is a setup fact and not a
 * failure of the harness. So the first refusal is answered by registering the
 * campaign's worktree root and trying once more.
 */
export async function runViaT3({
  cwd,
  prompt,
  provider,
  model,
  timeoutMs = 20 * 60_000,
  home = homedir(),
  spawn = nodeSpawn,
} = {}) {
  const file = t3Command(home)
  const args = threadArgs({ cwd, provider, model })

  const one = () =>
    new Promise((resolve) => {
      const startedAt = Date.now()
      let settled = false
      const done = (value) => {
        if (settled) return
        settled = true
        resolve(value)
      }
      let child
      try {
        child = spawn('cmd.exe', ['/d', '/s', '/c', file, ...args.map(quoted)], {
          cwd,
          windowsHide: true,
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
          stdio: ['pipe', 'pipe', 'pipe'],
        })
      } catch (err) {
        done({ ok: false, reply: null, error: `could not start the T3 CLI: ${err?.message ?? err}`, wallMs: 0, timedOut: false })
        return
      }
      let stdout = ''
      let stderr = ''
      const timer = setTimeout(() => {
        try {
          child.kill()
        } catch {
          /* the run is already gone */
        }
        done({
          ok: false,
          reply: null,
          error: `the ${provider} run did not settle inside ${Math.round(timeoutMs / 1000)}s`,
          wallMs: Date.now() - startedAt,
          timedOut: true,
        })
      }, Math.max(1, timeoutMs))
      child.stdout?.on('data', (chunk) => {
        stdout += String(chunk)
      })
      child.stderr?.on('data', (chunk) => {
        stderr += String(chunk)
      })
      child.on('error', (err) => {
        clearTimeout(timer)
        done({ ok: false, reply: null, error: err?.message ?? String(err), wallMs: Date.now() - startedAt, timedOut: false })
      })
      child.on('close', (code) => {
        clearTimeout(timer)
        const parsed = parseT3Reply(stdout)
        const wallMs = Date.now() - startedAt
        if (!parsed) {
          const tail = (stderr || stdout).trim().split(/\r?\n/).slice(-3).join(' | ')
          done({
            ok: false,
            reply: null,
            error: `T3 printed no result line (exit ${code})${tail ? `: ${tail}` : ''}`,
            wallMs,
            timedOut: false,
          })
          return
        }
        const ok = parsed.status === 'completed'
        done({
          ok,
          reply: parsed.reply,
          error: parsed.error,
          threadId: parsed.threadId,
          runId: parsed.runId,
          status: parsed.status,
          wallMs,
          timedOut: false,
          exitCode: typeof code === 'number' ? code : null,
        })
      })
      try {
        child.stdin?.end(String(prompt ?? ''))
      } catch {
        /* a closed stdin is reported by the close handler */
      }
    })

  let result = await one()
  if (!result.ok && /No T3 Code project matches/i.test(String(result.error ?? ''))) {
    const dir = projectRootFor(cwd)
    const added = await addProject({ file, dir, spawn })
    result = await one()
    result = { ...result, project: { dir, registered: added.ok, note: added.reason } }
  }
  return result
}
