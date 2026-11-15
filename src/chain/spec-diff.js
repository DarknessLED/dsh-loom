// The exact change a chain proposal makes, in the form a reviewer can read.
//
// A spec is small JSON, so a structural walk is enough — but two details matter
// for a card. Nodes are aligned by id, because reordering the array is not a
// change to every node in it; and an appended prompt is shown as the appended
// text, not as the entire new prompt, which would bury the one sentence that is
// the hypothesis.

const SKIP_ROOT = new Set(['version', 'meta'])
const CLIP = 200
const MAX_CHANGES = 40

function clip(value) {
  if (typeof value !== 'string') return value
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length <= CLIP ? text : `${text.slice(0, CLIP - 1)}…`
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function isNodeArray(list) {
  return (
    Array.isArray(list) &&
    list.length > 0 &&
    list.every((n) => n && typeof n === 'object' && typeof n.id === 'string' && n.id.trim())
  )
}

function walk(path, base, next, out) {
  if (out.length >= MAX_CHANGES) return
  if (same(base, next)) return

  if (typeof base === 'string' && typeof next === 'string') {
    if (next.length > base.length && next.startsWith(base)) {
      out.push({ path, op: 'append', text: clip(next.slice(base.length)) })
    } else {
      out.push({ path, op: 'set', from: clip(base), to: clip(next) })
    }
    return
  }
  if (base === null || next === null || typeof base !== 'object' || typeof next !== 'object') {
    if (base === undefined) out.push({ path, op: 'added', to: clip(next) })
    else if (next === undefined) out.push({ path, op: 'removed', from: clip(base) })
    else out.push({ path, op: 'set', from: clip(base), to: clip(next) })
    return
  }

  if (Array.isArray(base) && Array.isArray(next)) {
    if (isNodeArray(base) && isNodeArray(next)) {
      const byId = new Map(base.map((n) => [n.id, n]))
      const seen = new Set()
      for (const node of next) {
        const before = byId.get(node.id)
        const at = `${path}[${node.id}]`
        if (!before) out.push({ path: at, op: 'added', to: clip(node.id) })
        else {
          seen.add(node.id)
          walk(at, before, node, out)
        }
      }
      for (const node of base) {
        if (!seen.has(node.id)) out.push({ path: `${path}[${node.id}]`, op: 'removed', from: clip(node.id) })
      }
      return
    }
    const len = Math.max(base.length, next.length)
    for (let i = 0; i < len && out.length < MAX_CHANGES; i += 1) {
      walk(`${path}[${i}]`, base[i], next[i], out)
    }
    return
  }

  const keys = new Set([...Object.keys(base), ...Object.keys(next)])
  for (const key of keys) {
    if (out.length >= MAX_CHANGES) return
    if (base === null || next === null) break
    walk(`${path}.${key}`, base[key], next[key], out)
  }
}

/**
 * Structural diff between two chain specs.
 *
 * `version` and `meta` are skipped: they are the bookkeeping of the proposal,
 * not the behaviour under review.
 *
 * @param {object} base
 * @param {object} next
 * @returns {Array<{path:string, op:'set'|'append'|'added'|'removed', from?:*, to?:*, text?:string}>}
 */
export function diffSpec(base, next) {
  const out = []
  if (!base || !next || typeof base !== 'object' || typeof next !== 'object') return out
  for (const key of new Set([...Object.keys(base), ...Object.keys(next)])) {
    if (SKIP_ROOT.has(key)) continue
    walk(`spec.${key}`, base[key], next[key], out)
  }
  return out
}

function fmt(value) {
  if (value === undefined) return '(absent)'
  if (typeof value === 'string') return JSON.stringify(value)
  return JSON.stringify(value)
}

/** One line per change, for the checkpoint message. */
export function renderDiff(changes) {
  return (Array.isArray(changes) ? changes : []).map((c) => {
    if (c.op === 'append') return `${c.path}: + ${fmt(c.text)}`
    if (c.op === 'added') return `${c.path}: + ${fmt(c.to)}`
    if (c.op === 'removed') return `${c.path}: - ${fmt(c.from)}`
    return `${c.path}: ${fmt(c.from)} → ${fmt(c.to)}`
  })
}
