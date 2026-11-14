#!/usr/bin/env node
// Wave 20 / p3: route the autopilot guard by change class.
//
// `scripts/test-all.mjs` costs 3m41s on a good day and twelve minutes on a bad
// one, against a round that takes about twelve. But the guard is the only thing
// standing between a bad patch and the checkout, so the plan must never narrow
// what a selector cannot see. This module is the decision, not the runner: it
// answers "which suites does this diff owe?" and nothing else.
//
// The safety rule is over-approximation. If any changed path is outside the
// classes we can reason about (source, docs, tests), the answer is the full
// suite. An empty diff is also full: a guard that skips itself on no evidence
// is not a guard.

/** The command that runs every regression suite plus the standing pins. */
export const FULL_SUITE = 'scripts/test-all.mjs'

// A docs change cannot break runtime code, but it can break the promise that
// every module is documented -- that spec is the docs pin.
export const DOCS_PINS = ['tests/self11/docs-coverage.test.mjs']

// A test change cannot break runtime code either, but it can break the specs
// that pin configuration and the selector itself: the guard's own routing is
// configuration, and docs coverage pins the module map. Both stay on every
// narrowed run so a test edit cannot quietly invalidate them.
export const CONFIG_PINS = [
  'tests/self11/docs-coverage.test.mjs',
  'tests/self20/guard-routing.test.mjs',
]

export const DEFAULT_FULL_EVERY = 10

const CONFIG_FILES = new Set([
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'yarn.lock',
  'npm-shrinkwrap.json',
  '.npmrc',
  '.nvmrc',
])

// Build/tooling config is a config class: a change there can alter how every
// suite is compiled or which files exist, so it is never narrowed.
const CONFIG_PREFIXES = ['.github/', 'config/', 'build/']
const CONFIG_SUFFIXES = ['.config.js', '.config.mjs', '.config.cjs', '.config.ts']

/** Normalize a repo-relative path to forward slashes with no leading `./`. */
function normalize(p) {
  return String(p)
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .trim()
}

function isConfig(p) {
  const base = p.slice(p.lastIndexOf('/') + 1)
  if (CONFIG_FILES.has(base)) return true
  if (base.startsWith('tsconfig') && base.endsWith('.json')) return true
  if (CONFIG_PREFIXES.some((pre) => p.startsWith(pre))) return true
  return CONFIG_SUFFIXES.some((suf) => base.endsWith(suf))
}

function isDocs(p) {
  return p.startsWith('docs/') || /(^|\/)README(\.[^/]*)?$/i.test(p) || p.endsWith('.md')
}

function isTest(p) {
  return p.startsWith('tests/')
}

function isSource(p) {
  return p.startsWith('src/')
}

/**
 * Decide how much guard a diff owes.
 *
 * @param {{changed?: string[], promotionsSinceFull?: number, fullEvery?: number}} input
 * @returns {{mode: 'full'|'light'|'related', suites: string[]}}
 */
export function guardPlan({ changed, promotionsSinceFull, fullEvery } = {}) {
  const paths = Array.isArray(changed) ? changed.map(normalize).filter(Boolean) : []
  const every = Number.isFinite(fullEvery) && fullEvery > 0 ? fullEvery : DEFAULT_FULL_EVERY
  const since = Number.isFinite(promotionsSinceFull) ? Math.max(0, promotionsSinceFull) : 0

  // A periodic full run is the backstop: even a run of tests-only or docs-only
  // diffs reaches the whole suite at least once every `fullEvery` promotions,
  // because narrowing is only sound while the previous full run is recent.
  // `promotionsSinceFull` counts completed promotions, so the guard run in
  // front of promotion number `since + 1` owes the full suite once that number
  // reaches `fullEvery`.
  if (since + 1 >= every) return full()

  // No evidence at all is not permission to skip the guard.
  if (paths.length === 0) return full()

  if (paths.some(isConfig)) return full()

  // Source is the class the selector cannot reason about beyond "run it all".
  if (paths.some(isSource)) return full()

  // Docs-only is safe to narrow, but only if *everything* is docs.
  if (paths.every(isDocs)) return { mode: 'light', suites: [...DOCS_PINS] }

  // Test-only runs the specs that changed plus the configuration pins. A test
  // tree edit without a spec file (a helper, a fixture) can affect every spec,
  // so it falls back to full rather than silently running nothing.
  if (paths.every(isTest)) {
    const specs = [...new Set(paths.filter((p) => p.endsWith('.test.mjs')))]
    if (specs.length === 0) return full()
    return { mode: 'related', suites: [...specs, ...CONFIG_PINS] }
  }

  // Anything else -- scripts, client, dist, research, a mixed diff -- is outside
  // what this selector can see. Over-approximate.
  return full()
}

function full() {
  return { mode: 'full', suites: [FULL_SUITE] }
}

export default guardPlan
