/**
 * Is a Lean toolchain usable right now?
 *
 * Detection is deliberately boring: run the binary, look at the exit code. The
 * plugin never installs anything — a missing toolchain becomes a setup
 * checkpoint with the exact command to run, because silently downloading a
 * 3 GB dependency is not a decision a background loop should make.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'

export const INSTALL_HINTS = {
  windows:
    'winget install --id LeanProver.Elan  (or: curl -sSf https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh | sh)',
  unix: 'curl -sSf https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh | sh -s -- -y',
}

/**
 * Where the *fast* `lean`/`lake` binaries are.
 *
 * `elan` keeps shims in `<ELAN_HOME|~/.elan>/bin`, but on Windows a shim costs
 * ~34 s per invocation (it resolves the toolchain and checks for updates),
 * while the toolchain's own binary runs in <0.1 s. A probe that spawns a shim
 * with a 15 s timeout therefore reports "no Lean" on a perfectly good install,
 * and a verifier that runs `lake env lean` per attempt would burn the whole
 * attempt budget on shim startup. So: toolchain binary first, shim as fallback.
 */
function toolchainBinDirs(home) {
  const root = join(home, 'toolchains')
  let names = []
  try {
    names = readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  } catch {
    return []
  }
  const rows = []
  for (const name of names) {
    const bin = join(root, name, 'bin')
    const lean = join(bin, process.platform === 'win32' ? 'lean.exe' : 'lean')
    const lake = join(bin, process.platform === 'win32' ? 'lake.exe' : 'lake')
    if (!existsSync(lean) || !existsSync(lake)) continue
    let mtime = 0
    try {
      mtime = statSync(lean).mtimeMs
    } catch {
      /* unreadable dir: still usable, just ranks last */
    }
    rows.push({ bin, mtime })
  }
  rows.sort((a, b) => b.mtime - a.mtime)
  return rows.map((r) => r.bin)
}

/** Shim dir (`<home>/bin`) — only a fallback, see {@link leanBinDir}. */
export function elanBinDir(env = process.env, opts = {}) {
  const home = opts.home ?? env.ELAN_HOME ?? join(homedir(), '.elan')
  const bin = join(home, 'bin')
  const exe = process.platform === 'win32' ? join(bin, 'lean.exe') : join(bin, 'lean')
  return existsSync(exe) ? bin : null
}

/** Toolchain binary dir first, shims second, null when there is no Lean at all. */
export function leanBinDir(env = process.env, opts = {}) {
  const home = opts.home ?? env.ELAN_HOME ?? join(homedir(), '.elan')
  const toolchains = toolchainBinDirs(home)
  if (toolchains.length > 0) return toolchains[0]
  return elanBinDir(env, { home })
}

/** PATH with the Lean binaries first, so `lake env lean` finds `lean`. */
export function pathWithElan(env = process.env, opts = {}) {
  const bin = leanBinDir(env, opts)
  const current = String(env.PATH ?? env.Path ?? '')
  if (!bin) return current
  return current ? `${bin}${delimiter}${current}` : bin
}

/** Default runner: spawnSync with a short timeout, never throws. */
export function defaultRun(cmd, args = [], opts = {}) {
  try {
    const res = spawnSync(cmd, args, {
      cwd: opts.cwd,
      timeout: opts.timeoutMs ?? 15_000,
      encoding: 'utf8',
      windowsHide: true,
      shell: opts.shell === true,
      env: opts.env ?? process.env,
    })
    return {
      ok: !res.error && res.status === 0,
      code: res.status ?? null,
      signal: res.signal ?? null,
      stdout: String(res.stdout ?? ''),
      stderr: String(res.stderr ?? ''),
      error: res.error ? String(res.error.message ?? res.error) : null,
    }
  } catch (err) {
    return { ok: false, code: null, signal: null, stdout: '', stderr: '', error: String(err?.message ?? err) }
  }
}

function firstLine(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .find((x) => x.length > 0) ?? ''
}

/**
 * @param {{run?: Function, platform?: string}} opts
 * @returns {{available: boolean, lean: string|null, lake: string|null, versions: {lean: string|null, lake: string|null}, install: string}}
 */
export function probeLean({ run = defaultRun, platform = process.platform, env = process.env } = {}) {
  const bin = leanBinDir(env)
  const exe = (name) => (bin ? join(bin, platform === 'win32' ? `${name}.exe` : name) : name)
  const lean = run(exe('lean'), ['--version'])
  const lake = run(exe('lake'), ['--version'])
  const leanOk = Boolean(lean?.ok)
  const lakeOk = Boolean(lake?.ok)
  return {
    available: leanOk,
    lean: leanOk ? firstLine(lean.stdout) || firstLine(lean.stderr) || 'lean' : null,
    lake: lakeOk ? firstLine(lake.stdout) || firstLine(lake.stderr) || 'lake' : null,
    versions: {
      lean: leanOk ? firstLine(lean.stdout) : null,
      lake: lakeOk ? firstLine(lake.stdout) : null,
    },
    install: platform === 'win32' ? INSTALL_HINTS.windows : INSTALL_HINTS.unix,
  }
}
