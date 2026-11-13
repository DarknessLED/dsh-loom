// The mutation kill rate is chosen by hashing the module slug, so the slug has to
// be a property of the file and not of how a task happened to spell its path.
//
// Measured on 2026-11-13 in one worktree, with one patch applied and the same two
// guard specs: `--module=src\runtime\triangle.js` printed KILLRATE=0.6500 and
// `--module=src/runtime/triangle.js` printed KILLRATE=0.9500. Same tree, same
// patch, same specs -- only argv differed. That is a reading of the command line,
// not of the code, and it silently made every `mut-*` task compare a sample
// against a baseline computed from a different sample.
//
// This pins the invariant: every spelling of one path selects the same mutants.
import { slug, rankedSample } from '../research/mutants/gen.mjs'

let pass = 0
const EXPECTED = 5
const ok = (cond, name, detail) => {
  if (cond) { pass += 1; console.log(`  ok   ${name}`) }
  else { console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); process.exitCode = 1 }
}

const FILE = 'src/runtime/triangle.js'
const SPELLINGS = [FILE, 'src\\runtime\\triangle.js', './src/runtime/triangle.js', '.\\src\\runtime\\triangle.js']

console.log('mutants-determinism')

// 1. The slug is separator- and prefix-insensitive.
{
  const slugs = SPELLINGS.map((s) => slug(s))
  ok(new Set(slugs).size === 1, 'one file has one slug however it is spelled', slugs.join(' | '))
  ok(slugs[0] === 'runtime-triangle', 'the slug keeps the readable shape', slugs[0])
}

// 2. The ranked sample is identical, mutant for mutant, across spellings.
{
  const base = rankedSample(FILE)
  const same = SPELLINGS.map((s) => rankedSample(s).map((m) => m.id).join(','))
  ok(base.length > 0 && new Set(same).size === 1, 'every spelling picks the same ordered sample', `${base.length} mutants`)
}

// 3. Ordering is deterministic across calls, not incidental to a sort.
{
  const once = rankedSample(FILE).map((m) => m.id).join(',')
  const twice = rankedSample('src\\runtime\\triangle.js').map((m) => m.id).join(',')
  ok(once === twice, 'the ranking is stable between calls')
}

// 4. The sample is a head slice of the ranking, so `--sample=N` can only ever
//    drop the tail -- it cannot substitute a different mutant for a picked one.
{
  const all = rankedSample(FILE)
  const head = all.slice(0, 5).map((m) => m.id)
  const again = rankedSample('src\\runtime\\triangle.js').slice(0, 5).map((m) => m.id)
  ok(head.length === 5 && head.join(',') === again.join(','), 'sample=5 is the same five mutants for both spellings', head.join(','))
}

console.log(`${pass}/${EXPECTED} assertions passed`)
