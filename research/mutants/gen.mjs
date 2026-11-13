// Deterministic mutant generation, byte-level so EOL never changes.
//
// Why this exists: e91 (research/exp/e91.mjs) showed the corpus cannot supply a
// graded score -- 82 of the 83 tasks that print a level are already green and the
// median denominator is 3 assertions. A level needs headroom and a fine
// denominator, so the score has to be computed by something the task does not
// own. Mutation kill rate is that something: headroom is measured (0.100 on
// src/knowledge/select.js), and the denominator is however many mutants the
// source admits.
//
// Determinism matters more than sophistication here. Every mutant is
// (file, pattern index, occurrence index) -- no RNG, no line numbers that drift,
// and the train/holdout split is a hash of the mutant id so it can be
// recomputed years later without storing it.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'

export const PATTERNS = [
  { name: 'eq-to-neq', find: ' === ', replace: ' !== ' },
  { name: 'neq-to-eq', find: ' !== ', replace: ' === ' },
  { name: 'ge-to-gt', find: ' >= ', replace: ' > ' },
  { name: 'le-to-lt', find: ' <= ', replace: ' < ' },
  { name: 'and-to-or', find: ' && ', replace: ' || ' },
  { name: 'or-to-and', find: ' || ', replace: ' && ' },
  { name: 'plus1-to-plus2', find: ' + 1', replace: ' + 2' },
  { name: 'minus1-to-minus2', find: ' - 1', replace: ' - 2' },
  { name: 'true-to-false', find: 'true', replace: 'false' },
  { name: 'min-to-max', find: 'Math.min', replace: 'Math.max' },
  { name: 'max-to-min', find: 'Math.max', replace: 'Math.min' },
  { name: 'null-to-zero', find: 'null', replace: '0' },
]

// The guard set for a module is the spec files that import it by name. That is
// a narrow definition on purpose: it is reproducible from the tree, it is what a
// task "harden this module's tests" can actually edit, and it is why the
// measured kill rates are as low as 0.100 rather than being propped up by the
// rest of the suite.
export const MODULES = [
  { file: 'src/knowledge/select.js', focal: 'tests/knowledge/no-work-is-not-knowledge.test.mjs' },
  { file: 'src/knowledge/impact.js', focal: 'tests/knowledge/a-lesson-is-about-a-file.test.mjs' },
  { file: 'src/gate/gate.js', focal: 'tests/gate.test.mjs' },
  { file: 'src/runtime/selector.js', focal: 'tests/selector.test.mjs' },
  { file: 'src/gate/earned.js', focal: 'tests/self6/graded-earned.test.mjs' },
  { file: 'src/gate/oracle.js', focal: 'tests/oracle-scope.test.mjs' },
  { file: 'src/runtime/candidates.js', focal: 'tests/balance/second-candidate-tail.test.mjs' },
  { file: 'src/runtime/baseline.js', focal: 'tests/balance/spec-must-fail-on-base.test.mjs' },
]

// Separators are normalised before anything is hashed: `--module=src\runtime\x.js`
// and `--module=src/runtime/x.js` name the same file, and the sample is chosen by
// hashing the slug, so an un-normalised slug makes the reading depend on argv
// spelling rather than on the tree. Measured on 2026-11-13, same tree, same patch,
// same two guard specs: the two spellings reported KILLRATE 0.65 and 0.95.
export function slug(file) {
  return String(file)
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^src\//, '')
    .replace(/\.js$/, '')
    .replace(/\//g, '-')
}

// Byte offsets on purpose: a text-level rewrite can normalise CRLF and produce a
// 56-line phantom diff (research/exp/README records this), and a mutation run
// must leave the tree byte-identical afterwards.
export function mutantsFor(file) {
  const buf = fs.readFileSync(file)
  const out = []
  for (const p of PATTERNS) {
    const hay = buf.toString('latin1')
    const needle = p.find
    let from = 0
    for (;;) {
      const at = hay.indexOf(needle, from)
      if (at < 0) break
      from = at + 1
      out.push({ pattern: p.name, find: p.find, replace: p.replace, offset: at })
    }
  }
  return out
}

// Split by hash so the holdout set is a property of the mutant, not of the run
// order: adding a pattern later does not reshuffle existing assignments.
export function splitOf(moduleSlug, index, holdoutEvery = 5) {
  const h = crypto.createHash('sha256').update(`${moduleSlug}:${index}`).digest()
  return h[0] % holdoutEvery === 0 ? 'holdout' : 'train'
}

// The sample is a property of (module, index), ordered by a hash of the
// normalised slug -- never by file offset, so adding a pattern later does not
// reshuffle a task's sample, and the two spellings of one path pick the same
// mutants. task.mjs slices the head of this list.
export function rankedSample(file) {
  const s = slug(file)
  return mutantsFor(file)
    .map((m, i) => ({ ...m, index: i, id: `${s}#${String(i).padStart(3, '0')}` }))
    .map((m) => ({ ...m, rank: crypto.createHash('sha256').update(`${s}:${m.index}`).digest('hex') }))
    .sort((a, b) => a.rank.localeCompare(b.rank))
}

export function plan() {
  return MODULES.map((m) => {
    const mutants = mutantsFor(m.file)
    return {
      module: m.file,
      slug: slug(m.file),
      focal: m.focal,
      candidates: mutants.length,
      mutants: mutants.map((x, i) => ({
        id: `${slug(m.file)}#${String(i).padStart(3, '0')}`,
        index: i,
        ...x,
        split: splitOf(slug(m.file), i),
      })),
    }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const p = plan()
  const total = p.reduce((n, m) => n + m.candidates, 0)
  const holdout = p.reduce((n, m) => n + m.mutants.filter((x) => x.split === 'holdout').length, 0)
  fs.writeFileSync('research/mutants/plan.json', JSON.stringify(p, null, 1))
  for (const m of p) console.log(m.module.padEnd(30), String(m.candidates).padStart(4), 'mutants')
  console.log('total', total, '| holdout', holdout, '| train', total - holdout)
}
