import { spawn } from 'node:child_process'
import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { StringDecoder } from 'node:string_decoder'
import { nodeExecutable } from './node-bin.js'

/** Keep at most 64KB of tail per stream (contract §1). */
const MAX_STREAM_BYTES = 64 * 1024
/** Default verifier timeout: 10 minutes. */
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000
/** Grace after kill before we resolve with whatever output we have. */
const KILL_GRACE_MS = 4000
const TRUNCATED_MARK = '...[truncated]\n'

/**
 * Tail-keeping buffer: appends decoded text, trims from the front once the
 * capped size is exceeded, and marks truncated output with a prefix.
 */
class TailBuffer {
  #decoder = new StringDecoder('utf8')
  #text = ''
  #truncated = false

  constructor(limit = MAX_STREAM_BYTES) {
    this.limit = limit
    this.ended = false
  }

  push(chunk) {
    this.#text += this.#decoder.write(chunk)
    this.#trim()
  }

  /** Flush pending (possibly incomplete) multibyte bytes. */
  end() {
    if (this.ended) return
    this.ended = true
    this.#text += this.#decoder.end()
    this.#trim()
  }

  #trim() {
    if (this.#text.length > this.limit) {
      this.#truncated = true
      this.#text = this.#text.slice(this.#text.length - this.limit)
    }
  }

  toString() {
    return this.#truncated ? TRUNCATED_MARK + this.#text : this.#text
  }
}

function normalizeTimeout(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function buildEnv(extra) {
  const env = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') env[key] = value
  }
  if (extra && typeof extra === 'object') {
    for (const [key, value] of Object.entries(extra)) {
      if (value === undefined || value === null) continue
      env[key] = String(value)
    }
  }
  return env
}

/**
 * Kill the whole `shell: true` process tree, then the shell itself.
 * The taskkill call must not race with child.kill(): killing cmd.exe first
 * orphans its child (Windows then reports "process not found" and the real
 * command keeps running), so the shell is only killed once taskkill is done.
 */
function terminateTree(child) {
  const pid = child.pid
  let finished = false
  const killShell = () => {
    if (finished) return
    finished = true
    try {
      child.kill('SIGKILL')
    } catch {
      // already gone
    }
  }
  if (process.platform !== 'win32' || typeof pid !== 'number') {
    killShell()
    return
  }
  try {
    const killer = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    killer.on('close', killShell)
    killer.on('error', killShell)
    const guard = setTimeout(killShell, 10_000)
    if (typeof guard.unref === 'function') guard.unref()
  } catch {
    killShell()
  }
}

function parseMetrics(stdout, specs) {
  const metrics = {}
  if (!specs || typeof specs !== 'object') return metrics
  for (const [name, def] of Object.entries(specs)) {
    try {
      if (!def || typeof def.pattern !== 'string') continue
      const re = def.pattern instanceof RegExp ? def.pattern : new RegExp(def.pattern)
      const match = re.exec(stdout)
      if (!match) continue
      const group = def.group ?? 1
      const raw = match[group]
      if (raw === undefined) continue
      const value = Number(raw)
      if (Number.isNaN(value)) continue
      metrics[name] = value
    } catch {
      // invalid pattern / group: the key is simply omitted
    }
  }
  return metrics
}

const SCRIPT_FILE = /\.(?:cjs|mjs|js)$/i
const SHELL_SYNTAX = /[\s"'`&|<>;^()]/

/**
 * A task may name a JS file directly as its acceptance command
 * (`{ cmd: 'holdout-slow.cjs' }`). A shell cannot execute such a file: on
 * Windows `cmd.exe` reports success without running it — a candidate would look
 * verified for the wrong reason — and on POSIX it is not executable at all.
 * When the command is exactly one existing script path, run it with the
 * interpreter that is already running the harness. Anything carrying shell
 * syntax (quotes, spaces, operators) is left to the shell untouched, so
 * `node test.mjs` and pipelines keep working.
 * @param {string} command
 * @param {string} cwd
 * @returns {string}
 */
function resolveScriptCommand(command, cwd) {
  const trimmed = command.trim()
  if (!SCRIPT_FILE.test(trimmed) || SHELL_SYNTAX.test(trimmed)) return command
  try {
    const file = resolve(cwd, trimmed)
    if (!statSync(file).isFile()) return command
    // The interpreter has to be a node that runs scripts. Under Electron
    // `process.execPath` is the application: handing it a script path opens a
    // second window and exits 0, which reads as a passing verifier that ran
    // nothing at all.
    const interpreter = nodeExecutable()
    return interpreter ? `"${interpreter}" "${file}"` : command
  } catch {
    return command
  }
}

/**
 * cmd.exe consumes every double quote it parses, including quotes that are data
 * inside a quoted argument. A verifier assembled by interpolation — a
 * JSON.stringify'd path, a `node -e` snippet — therefore reaches the child with
 * its string delimiters gone: at best a syntax error, at worst a command that
 * passes for the wrong reason. Escape the quotes that sit *inside* the last
 * quoted argument so the CRT hands them back to the child; the outer pair still
 * groups the argument. Commands whose last quoted argument holds no interior
 * quote, and every non-Windows host, are returned untouched.
 * @param {string} command
 * @returns {string}
 */
function escapeNestedQuotes(command) {
  if (process.platform !== 'win32') return command
  const close = command.lastIndexOf('"')
  if (close < 0) return command
  // The opening quote is the nearest preceding one that starts an argument: at
  // the beginning of the command or right after whitespace. Quotes that merely
  // close an earlier argument are not candidates.
  let open = -1
  for (let i = close - 1; i >= 0; i -= 1) {
    if (command[i] !== '"') continue
    if (i === 0 || /\s/.test(command[i - 1])) {
      open = i
      break
    }
  }
  if (open < 0) return command
  const inner = command.slice(open + 1, close)
  if (!inner.includes('"')) return command
  const escaped = inner.replace(/(^|[^\\])"/g, '$1\\"')
  return `${command.slice(0, open + 1)}${escaped}${command.slice(close)}`
}

/**
 * @param {{cmd: string, cwd?: string, timeoutMs?: number,
 *          metrics?: Record<string, {pattern: string, group?: number}>}} spec
 * @param {{cwd: string, timeoutMs?: number, env?: Record<string,string>}} opts
 * @returns {Promise<{
 *   ok: boolean,
 *   exitCode: number|null,
 *   signal: string|null,
 *   timedOut: boolean,
 *   durationMs: number,
 *   stdout: string,
 *   stderr: string,
 *   metrics: Record<string, number>,
 *   command: string,
 *   cwd: string,
 * }>}
 */
export async function runVerifier(spec, opts = {}) {
  if (!spec || typeof spec.cmd !== 'string' || spec.cmd.trim() === '') {
    throw new TypeError('runVerifier: spec.cmd must be a non-empty string')
  }
  const options = opts && typeof opts === 'object' ? opts : {}
  const rawCwd = options.cwd ?? spec.cwd ?? process.cwd()
  if (typeof rawCwd !== 'string' || rawCwd === '') {
    throw new TypeError('runVerifier: opts.cwd must be a non-empty string')
  }
  const cwd = resolve(rawCwd)
  const timeoutMs = normalizeTimeout(
    options.timeoutMs ?? spec.timeoutMs,
    DEFAULT_TIMEOUT_MS,
  )
  const env = buildEnv(options.env)
  const command = spec.cmd
  const startedAt = Date.now()

  const stdoutBuf = new TailBuffer()
  const stderrBuf = new TailBuffer()

  let exitCode = null
  let signal = null
  let timedOut = false

  const child = spawn(escapeNestedQuotes(resolveScriptCommand(command, cwd)), {
    shell: true,
    cwd,
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const finished = new Promise((resolve) => {
    let settled = false
    let killTimer = null
    let graceTimer = null

    const settle = () => {
      if (settled) return
      settled = true
      if (killTimer) clearTimeout(killTimer)
      if (graceTimer) clearTimeout(graceTimer)
      if (!stdoutBuf.ended) stdoutBuf.end()
      if (!stderrBuf.ended) stderrBuf.end()
      resolve({
        ok: exitCode === 0 && !timedOut,
        exitCode,
        signal,
        timedOut,
        durationMs: Date.now() - startedAt,
        stdout: stdoutBuf.toString(),
        stderr: stderrBuf.toString(),
        metrics: parseMetrics(stdoutBuf.toString(), spec.metrics),
        command,
        cwd,
      })
    }

    child.on('spawn', () => {
      killTimer = setTimeout(() => {
        if (settled) return
        timedOut = true
        terminateTree(child)
        // A shell that ignores termination can linger; never hang the caller
        // waiting for 'close'.
        graceTimer = setTimeout(settle, KILL_GRACE_MS)
      }, timeoutMs)
      if (typeof killTimer.unref === 'function') killTimer.unref()
    })

    if (child.stdout) {
      child.stdout.on('data', (chunk) => stdoutBuf.push(chunk))
      child.stdout.on('error', () => {})
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk) => stderrBuf.push(chunk))
      child.stderr.on('error', () => {})
    }

    child.on('error', (error) => {
      // spawn failure (ENOENT etc.): report through the return value, not a throw
      stderrBuf.push(Buffer.from(`spawn error: ${error?.message ?? String(error)}\n`))
      if (child.pid === undefined) {
        settle()
        return
      }
      if (!graceTimer) {
        graceTimer = setTimeout(settle, KILL_GRACE_MS)
        if (typeof graceTimer.unref === 'function') graceTimer.unref()
      }
    })

    child.on('close', (code, sig) => {
      exitCode = typeof code === 'number' ? code : null
      signal = sig ?? null
      settle()
    })
  })

  return finished
}
