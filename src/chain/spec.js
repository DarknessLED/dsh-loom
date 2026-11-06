export const NODE_TYPES = new Set(['agent', 'verifier', 'human', 'map'])

/**
 * Minimal structural validation. The chain spec is JSON (no YAML dependency),
 * authored by the main agent from a template and versioned by the ledger.
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
  }
  nodes.forEach((n, i) => check(n, `nodes[${i}]`))
  if (spec.params != null && typeof spec.params !== 'object') errs.push('spec.params must be an object')
  return errs
}
