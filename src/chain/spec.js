export const NODE_TYPES = new Set(['agent', 'verifier', 'human', 'map'])

/** Ids of the top-level nodes of a spec, in declaration order. */
function topLevelIds(nodes) {
  return nodes
    .map((n) => (n && typeof n === 'object' && typeof n.id === 'string' && n.id.trim() ? n.id : null))
    .filter(Boolean)
}

/**
 * Minimal structural validation. The chain spec is JSON (no YAML dependency),
 * authored by the main agent from a template and versioned by the ledger.
 *
 * A node may declare `needs: string[]` — the ids of the nodes that must run
 * before it. That turns the array into a graph: position stops being a
 * dependency statement, which is what makes a reordering safe. Unknown ids,
 * self-reference and cycles are refused here; `topoOrder` resolves the graph.
 */
export function validateChainSpec(spec) {
  const errs = []
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return ['spec must be an object']
  if (typeof spec.name !== 'string' || !spec.name.trim()) errs.push('spec.name is required')
  if (!Number.isInteger(spec.version) || spec.version < 1) errs.push('spec.version must be an integer >= 1')
  const nodes = spec.nodes
  if (!Array.isArray(nodes) || nodes.length === 0) {
    errs.push('spec.nodes must be a non-empty array')
    return errs
  }
  const ids = new Set()
  const check = (node, path) => {
    if (!node || typeof node !== 'object') {
      errs.push(`${path} must be an object`)
      return
    }
    if (typeof node.id !== 'string' || !node.id.trim()) errs.push(`${path}.id is required`)
    else if (ids.has(node.id)) errs.push(`${path}: duplicate id "${node.id}"`)
    else ids.add(node.id)
    if (!NODE_TYPES.has(node.type)) errs.push(`${path}.type must be one of ${[...NODE_TYPES].join('|')}`)
    if (node.type === 'verifier' && (typeof node.cmd !== 'string' || !node.cmd.trim())) {
      errs.push(`${path}.cmd is required for verifier nodes`)
    }
    if (node.type === 'agent' && typeof node.prompt !== 'string') errs.push(`${path}.prompt is required for agent nodes`)
    if (node.type === 'map') {
      if (!node.of || typeof node.of !== 'object') errs.push(`${path}.of (inner node) is required for map nodes`)
      else check(node.of, `${path}.of`)
    }
    if (node.needs !== undefined) {
      if (!Array.isArray(node.needs)) {
        errs.push(`${path}.needs must be an array of node ids`)
      } else {
        for (const dep of node.needs) {
          if (typeof dep !== 'string' || !dep.trim()) errs.push(`${path}.needs must contain non-empty node ids`)
        }
      }
    }
  }
  nodes.forEach((n, i) => check(n, `nodes[${i}]`))
  if (spec.params != null && typeof spec.params !== 'object') errs.push('spec.params must be an object')

  // `needs` is only a dependency inside the executable graph: the top-level
  // nodes. An inner `map.of` node is not addressable, and its `needs` (if any)
  // is not part of the graph.
  const graphIds = new Set(topLevelIds(nodes))
  const needsOf = new Map()
  nodes.forEach((node, i) => {
    if (!node || typeof node !== 'object' || typeof node.id !== 'string' || !node.id.trim()) return
    const needs = Array.isArray(node.needs) ? node.needs.filter((d) => typeof d === 'string' && d.trim()) : []
    needsOf.set(node.id, needs)
    for (const dep of needs) {
      if (!graphIds.has(dep)) errs.push(`nodes[${i}].needs: unknown node "${dep}"`)
    }
  })
  // Depth-first walk: a node that is still on the stack when it is revisited
  // closes a cycle. Self-reference is the smallest one ("a -> a").
  const state = new Map()
  const cycles = []
  const visit = (id, trail) => {
    const seen = state.get(id) ?? 0
    if (seen === 2) return
    if (seen === 1) {
      cycles.push([...trail, id].join(' -> '))
      return
    }
    state.set(id, 1)
    for (const dep of needsOf.get(id) ?? []) {
      if (graphIds.has(dep)) visit(dep, [...trail, id])
    }
    state.set(id, 2)
  }
  for (const id of needsOf.keys()) visit(id, [])
  if (cycles.length) errs.push(`nodes: cycle in needs (${cycles[0]})`)
  return errs
}

/**
 * Node ids that may start right now, in declaration order.
 *
 * A node is runnable when it is not settled itself and every id in `needs` is
 * settled. `opts.cancelled` is the other half of settled: a branch the round
 * aborted (a sibling already solved the task) will never finish, so a join that
 * waits on it must still be unblocked or the round hangs on a promise nobody
 * will resolve. A cancelled id is settled for its dependents but is never handed
 * out itself.
 *
 * `settled` and `opts.cancelled` are both plain arrays of ids because they are
 * written to the ledger as JSON. An id in `needs` that no node declares is a
 * broken chain, not an empty pool: it throws with the name in the message so the
 * caller can say which edge is wrong.
 *
 * @param {{nodes?: Array<{id?: string, needs?: string[]}>}} chain
 * @param {string[]} [settled]
 * @param {{cancelled?: string[]}} [opts]
 * @returns {string[]} runnable node ids in declaration order
 */
export function runnableNodes(chain, settled, opts) {
  const nodes = Array.isArray(chain?.nodes) ? chain.nodes : []
  const settledIds = new Set(Array.isArray(settled) ? settled.filter((id) => typeof id === 'string') : [])
  const cancelledIds = new Set(
    Array.isArray(opts?.cancelled) ? opts.cancelled.filter((id) => typeof id === 'string') : [],
  )
  const known = new Set()
  for (const node of nodes) {
    if (node && typeof node === 'object' && typeof node.id === 'string' && node.id.trim()) known.add(node.id)
  }
  const ready = []
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    const id = node.id
    if (typeof id !== 'string' || !id.trim()) continue
    if (settledIds.has(id) || cancelledIds.has(id)) continue
    const needs = Array.isArray(node.needs) ? node.needs : []
    let allSettled = true
    for (const dep of needs) {
      if (typeof dep !== 'string' || !dep.trim()) continue
      if (!known.has(dep)) throw new Error(`runnableNodes: node "${id}" needs unknown node "${dep}"`)
      if (!settledIds.has(dep) && !cancelledIds.has(dep)) {
        allSettled = false
        break
      }
    }
    if (allSettled) ready.push(id)
  }
  return ready
}

/**
 * How wide the readiness pool may be: `params.maxParallel` clamped to >= 1.
 *
 * One is the default on purpose. The old scheduler ran one node at a time, and a
 * chain that says nothing about parallelism must keep that behaviour; a chain
 * that wants two branches in flight says `params: { maxParallel: 2 }`. A
 * fractional, negative or non-numeric value cannot widen the pool, so it reads
 * as the serial default instead of stalling the round at zero.
 *
 * @param {{params?: {maxParallel?: unknown}}} chain
 * @returns {number} a positive integer
 */
export function maxParallelOf(chain) {
  const raw = Number(chain?.params?.maxParallel)
  return Number.isFinite(raw) && raw >= 1 ? Math.max(1, Math.floor(raw)) : 1
}

/**
 * Node ids in dependency order: every node after the nodes it `needs`.
 *
 * Stable: nodes that do not constrain each other keep their declaration order,
 * so a spec without `needs` orders exactly as written (the old contract).
 * A cyclic spec cannot be ordered; the nodes that could not be placed are
 * appended in declaration order so the result is still a permutation, but
 * `validateChainSpec` is what refuses such a spec by name.
 */
export function topoOrder(spec) {
  const nodes = Array.isArray(spec?.nodes) ? spec.nodes : []
  const ids = nodes.map((n) => (n && typeof n === 'object' && typeof n.id === 'string' && n.id.trim() ? n.id : null))
  const present = new Set(ids.filter(Boolean))
  const needs = new Map()
  ids.forEach((id, i) => {
    if (!id) return
    const list = Array.isArray(nodes[i]?.needs) ? nodes[i].needs : []
    needs.set(id, new Set(list.filter((d) => typeof d === 'string' && d !== id && present.has(d))))
  })
  const order = []
  const done = new Set()
  let progressed = true
  while (progressed && order.length < needs.size) {
    progressed = false
    for (const id of ids) {
      if (!id || done.has(id)) continue
      let ready = true
      for (const dep of needs.get(id) ?? []) {
        if (!done.has(dep)) {
          ready = false
          break
        }
      }
      if (!ready) continue
      order.push(id)
      done.add(id)
      progressed = true
    }
  }
  for (const id of ids) if (id && !done.has(id)) order.push(id)
  return order
}
