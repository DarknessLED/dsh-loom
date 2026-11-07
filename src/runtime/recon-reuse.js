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
 * Identify the plan: which tree it describes, for which task, from which node,
 * with which earlier findings in hand.
 *
 * `base` is the workspace HEAD a worktree is branched from. Without one (not a
 * git repo, git failed) the plan cannot be invalidated, so there is no key and
 * the caller must plan for real — a missing commit is never "same as last time".
 *
 * @param {{base: string|null, chain: object, task: object, node: object, objective?: string,
 *          prior?: Array<{id: string, text: string}>}} input
 * @returns {string|null}
 */
export function planCacheKey({ base, chain, task, node, objective, prior = [] } = {}) {
  if (typeof base !== 'string' || base === '') return null
  return sha1(
    JSON.stringify([
      base,
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
 * The plan an earlier round stored for this key, or null.
 * @param {string} dir campaign directory (where the cache lives)
 * @param {string} key from planCacheKey()
 * @returns {string|null}
 */
export function cachedPlan(dir, key) {
  if (typeof key !== 'string' || key === '') return null
  const entry = readCache(dir)[key]
  if (!entry || typeof entry !== 'object') return null
  const plan = entry.plan
  return typeof plan === 'string' && plan.trim() !== '' ? plan : null
}

/**
 * Remember a plan that was just produced, for the next round on this tree.
 * @param {string} dir campaign directory (where the cache lives)
 * @param {string} key from planCacheKey()
 * @param {string} plan the full plan text handed to the workers
 */
export function rememberPlan(dir, key, plan) {
  if (typeof key !== 'string' || key === '') return
  if (typeof plan !== 'string' || plan.trim() === '') return
  const cache = readCache(dir)
  cache[key] = { plan, at: Date.now() }
  writeCache(dir, cache)
}
