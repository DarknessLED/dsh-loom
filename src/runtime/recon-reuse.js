import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// A plan is a function of the tree it describes, nothing else: the same task
// planned against the same base commit, by the same chain node, produces the
// plan the previous round already paid for. Re-deriving it costs the most
// expensive model call in the round, so the result is cached in the campaign
// directory (not in memory) and only reused while every input still matches.
// Anything unreadable — a missing file, a truncated write, a hand-edited value —
// is treated as "no cache": a broken cache may cost a planning call but must
// never hand a worker a plan for a tree that no longer exists.
const CACHE_FILE = 'recon-cache.json'

// Plans are long (a paragraph or two each) and a campaign can run for weeks, so
// the file is bounded: the newest entries win, the oldest are dropped.
const MAX_ENTRIES = 32

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
    const entries = Object.entries(cache)
      .filter(([, entry]) => entry && typeof entry === 'object')
      .sort((a, b) => (Number(b[1].at) || 0) - (Number(a[1].at) || 0))
      .slice(0, MAX_ENTRIES)
    writeFileSync(join(dir, CACHE_FILE), JSON.stringify(Object.fromEntries(entries)))
  } catch {
    // A cache that cannot be persisted only costs a re-plan next time.
  }
}

/**
 * Identify the plan: which task, from which node, with which earlier findings
 * in hand.
 *
 * `base` is deliberately *not* part of the identity. A plan describes the files
 * it names; a commit that touches none of them moves the base without moving
 * the subject, and re-paying the planner for it is the cost this module exists
 * to avoid. The base is stored on the entry instead, so the caller can measure
 * the delta between the tree the plan saw and the tree it is about to be used
 * on (see `planFiles`). Without a base (not a git repo, git failed) there is no
 * delta to measure, so there is no key and the caller must plan for real.
 *
 * @param {{base: string|null, chain: object, task: object, node: object, objective?: string,
 *          prior?: Array<{id: string, text: string}>}} input
 * @returns {string|null}
 */
export function planCacheKey({ base, chain, task, node, objective, prior = [] } = {}) {
  if (typeof base !== 'string' || base === '') return null
  return sha1(
    JSON.stringify([
      String(objective ?? ''),
      String(chain?.name ?? ''),
      Number(chain?.version) || 0,
      String(task?.id ?? ''),
      String(task?.prompt ?? ''),
      String(task?.verify?.cmd ?? ''),
      String(node?.id ?? ''),
      String(node?.prompt ?? ''),
      // A node's brief carries the earlier nodes' findings, so they are inputs
      // too: same tree but different findings is a plan that was invalidated.
      (Array.isArray(prior) ? prior : []).map((f) => [String(f?.id ?? ''), String(f?.text ?? '')]),
    ]),
  )
}

/**
 * The tracked paths a plan names, as whole tokens.
 *
 * A plan is prose, so "mentions keep.txt" has to mean the exact path, not the
 * tail of `docs/keep.txt`: the character before and after an occurrence must
 * not be a path character. `trackedPaths` bounds the search to files that
 * exist, which keeps a plan from "naming" an arbitrary word with a dot in it.
 *
 * @param {string} planText
 * @param {string[]} trackedPaths
 * @returns {string[]}
 */
export function planFiles(planText, trackedPaths) {
  const text = typeof planText === 'string' ? planText : ''
  if (text.trim() === '' || !Array.isArray(trackedPaths)) return []
  const isPathChar = (ch) => /[A-Za-z0-9_.\-/]/.test(ch)
  const out = []
  for (const path of trackedPaths) {
    if (typeof path !== 'string' || path === '' || out.includes(path)) continue
    let from = 0
    while (true) {
      const at = text.indexOf(path, from)
      if (at < 0) break
      const before = at > 0 ? text[at - 1] : ''
      const after = text[at + path.length] ?? ''
      if ((before === '' || !isPathChar(before)) && (after === '' || !isPathChar(after))) {
        out.push(path)
        break
      }
      from = at + 1
    }
  }
  return out
}

/**
 * The cache entry an earlier round stored for this key, or null.
 * @param {string} dir campaign directory (where the cache lives)
 * @param {string} key from planCacheKey()
 * @returns {{plan: string, base: string|null, files: string[]}|null}
 */
export function cachedPlanEntry(dir, key) {
  if (typeof key !== 'string' || key === '') return null
  const entry = readCache(dir)[key]
  if (!entry || typeof entry !== 'object') return null
  const plan = entry.plan
  if (typeof plan !== 'string' || plan.trim() === '') return null
  return {
    plan,
    base: typeof entry.base === 'string' && entry.base !== '' ? entry.base : null,
    files: Array.isArray(entry.files) ? entry.files.filter((f) => typeof f === 'string' && f !== '') : [],
  }
}

/**
 * Remember a plan that was just produced, for the next round on this tree.
 * @param {string} dir campaign directory (where the cache lives)
 * @param {string} key from planCacheKey()
 * @param {string} plan the full plan text handed to the workers
 * @param {{base?: string|null, files?: string[]}} [meta] the tree it describes
 */
export function rememberPlan(dir, key, plan, { base = null, files = [] } = {}) {
  if (typeof key !== 'string' || key === '') return
  if (typeof plan !== 'string' || plan.trim() === '') return
  const cache = readCache(dir)
  cache[key] = {
    plan,
    at: Date.now(),
    base: typeof base === 'string' && base !== '' ? base : null,
    files: Array.isArray(files) ? files.filter((f) => typeof f === 'string' && f !== '') : [],
  }
  writeCache(dir, cache)
}
