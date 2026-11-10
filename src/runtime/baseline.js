import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Whether a task's command already passes on the base commit.
//
// A candidate is verified inside its worktree, and the worktree was cut from the
// workspace at HEAD. So "does this spec fail before the work?" is a question about
// a tree the loop already has and already requires to be clean -- one verifier run
// answers it.
//
// The answer matters because a passing verdict on a spec that was *already* green
// is not evidence of work. In the ledger that shape is common: of 103 landed
// rounds, 22 carried a `verifierOk: true` candidate whose diff was empty.
//
// The verdict is cached per (task, base, command): it cannot change until HEAD
// moves, and re-running it every round would spend the round's clock on a fact
// that was settled at the first round.
//
// A cache that cannot be read or written costs a run. It must never produce a
// verdict: this module's whole job is to be the thing that does not lie.
const CACHE_FILE = 'baseline-cache.json'

const sha1 = (value) => createHash('sha1').update(value).digest('hex')
const keyOf = (taskId, base, command) => sha1(JSON.stringify([String(taskId ?? ''), String(base ?? ''), String(command ?? '')]))

const keyFile = (dir) => join(dir, CACHE_FILE)

function readCache(dir) {
  try {
    const parsed = JSON.parse(readFileSync(keyFile(dir), 'utf8'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {
    // Missing or corrupt: the safe reading is "nothing is known".
  }
  return {}
}

/**
 * Ask whether `command` passes on the tree at `base`.
 *
 * @param {object} opts
 * @param {string} opts.dir campaign directory, where the cache lives
 * @param {string} opts.cwd directory to run the command in (the base tree)
 * @param {string} opts.taskId task the command belongs to
 * @param {string|null} opts.base commit the candidate worktree was cut from
 * @param {string|null} opts.command the verifier command
 * @param {() => Promise<object>} opts.run spawns the verifier
 * @returns {Promise<{ok: boolean, exitCode: number|null, cached: boolean}>}
 */
export async function baseVerdict({ dir, cwd, taskId, base, command, run }) {
  if (typeof run !== 'function') throw new TypeError('baseVerdict requires run')
  const key = keyOf(taskId, base, command)
  const cache = readCache(dir)
  const hit = cache[key]
  if (hit && typeof hit === 'object' && typeof hit.ok === 'boolean') {
    return { ok: hit.ok, exitCode: hit.exitCode ?? null, cached: true }
  }
  const verdict = await run()
  const okNow = verdict?.ok === true
  // Write back what we just learned. A failed write only costs a re-measurement
  // next time, so it is not an error worth surfacing to the round.
  try {
    const fresh = readCache(dir)
    fresh[key] = { ok: okNow, exitCode: verdict?.exitCode ?? null, taskId: String(taskId ?? ''), base: base ?? null, command: String(command ?? ''), at: Date.now() }
    const { writeFileSync } = await import('node:fs')
    writeFileSync(keyFile(dir), JSON.stringify(fresh))
  } catch {
    /* a cache that cannot be persisted is only a slower loop */
  }
  void cwd
  return { ok: okNow, exitCode: verdict?.exitCode ?? null, cached: false }
}
