import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Verifier results are keyed by what the verifier actually measures against:
// the candidate's patch bytes and the command that judged them. Two candidates
// that leave an identical patch are one piece of evidence, so the second one
// inherits the first verdict instead of paying for the same command again.
//
// The cache lives in the campaign directory (not in memory) so it also covers
// later rounds and separate processes. Anything unreadable — a missing file, a
// truncated write, a hand-edited value — is treated as "no cache": a broken
// cache may cost a verifier run but must never fake evidence.
const CACHE_FILE = 'verifier-cache.json'

// Verifications currently running in this process. Two candidates can reach the
// verifier at the same instant, before either has written the cache file, so
// the file alone cannot dedupe them.
const inFlight = new Map()

const sha1 = (value) => createHash('sha1').update(value).digest('hex')

function readCache(dir) {
  try {
    const parsed = JSON.parse(readFileSync(join(dir, CACHE_FILE), 'utf8'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {
    // Missing or corrupt: an empty cache is the safe interpretation.
  }
  return {}
}

function writeCache(dir, cache) {
  try {
    writeFileSync(join(dir, CACHE_FILE), JSON.stringify(cache))
  } catch {
    // A cache that cannot be persisted only costs a re-run next time.
  }
}

const usable = (entry) => entry && typeof entry === 'object' && typeof entry.ok === 'boolean'

// What a later candidate inherits: the same evidence, without the first
// candidate's verifier seconds. `durationMs: 0` is the point of the reuse.
function inherited(entry, cwd) {
  return {
    ok: entry.ok === true,
    exitCode: entry.exitCode ?? null,
    signal: entry.signal ?? null,
    timedOut: entry.timedOut === true,
    durationMs: 0,
    stdout: typeof entry.stdout === 'string' ? entry.stdout : '',
    stderr: typeof entry.stderr === 'string' ? entry.stderr : '',
    metrics: entry.metrics && typeof entry.metrics === 'object' ? entry.metrics : {},
    command: entry.command ?? null,
    cwd,
  }
}

function stored(verdict) {
  return {
    ok: verdict.ok === true,
    exitCode: verdict.exitCode ?? null,
    signal: verdict.signal ?? null,
    timedOut: verdict.timedOut === true,
    stdout: verdict.stdout ?? '',
    stderr: verdict.stderr ?? '',
    metrics: verdict.metrics ?? {},
    command: verdict.command ?? null,
  }
}

/**
 * Run the verifier once per (patch, command, base commit) triple, or reuse the
 * verdict an earlier candidate in this campaign already paid for. The base
 * commit is part of the key because a verdict is evidence about a patch *on a
 * tree*: the same bytes rebased onto another commit have to be measured again.
 * An absent base is its own key (`null`), so it neither inherits a scoped
 * verdict nor is inherited by one.
 *
 * @param {object} opts
 * @param {string} opts.dir campaign directory (where the cache lives)
 * @param {string} opts.patchFile path to the candidate's patch file
 * @param {string} opts.keySuffix stable description of the verifier command
 * @param {string} opts.cwd resolved working directory for this candidate
 * @param {string|null} [opts.base] commit the candidate's worktree was based on
 * @param {() => Promise<object>} opts.run spawns the verifier
 * @returns {Promise<{verdict: object, reused: boolean}>}
 */
export async function verifyOnce({ dir, patchFile, keySuffix, cwd, base = null, run }) {
  let bytes = null
  try {
    bytes = readFileSync(patchFile)
  } catch {
    // No readable patch: nothing to compare, so always run for real.
  }
  // An empty patch is not a piece of evidence to deduplicate: the candidate
  // changed nothing, so there is no work whose verdict another candidate could
  // inherit. Keep the verifier per candidate in that case.
  if (!bytes || bytes.toString('utf8').trim() === '') return { verdict: await run(), reused: false }

  const key = sha1(JSON.stringify([sha1(bytes), keySuffix ?? '', base ?? null]))
  const cache = readCache(dir)
  if (usable(cache[key])) {
    return { verdict: inherited(cache[key], cwd), reused: true }
  }

  const pending = inFlight.get(key)
  if (pending) {
    return { verdict: inherited(await pending, cwd), reused: true }
  }

  const work = (async () => {
    const verdict = await run()
    const fresh = readCache(dir)
    fresh[key] = stored(verdict)
    writeCache(dir, fresh)
    return verdict
  })()
  inFlight.set(key, work)
  try {
    // The real run keeps its measured duration; only later candidates are free.
    return { verdict: await work, reused: false }
  } finally {
    inFlight.delete(key)
  }
}
