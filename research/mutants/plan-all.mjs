// The whole task space, not just the eight modules we started with.
//
// A file is eligible when at least one spec imports it by name: that spec set is
// the file's guard, it is what a task can edit, and it makes the kill rate
// reproducible from the tree alone. Eligibility is not endorsement -- the
// per-file counts are the point, because they are the denominator of the graded
// score for that file.
import fs from 'node:fs'
import path from 'node:path'
import { mutantsFor, slug } from './gen.mjs'

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p, acc)
    else acc.push(p)
  }
  return acc
}

export function guardSet(file) {
  const base = path.basename(file)
  const re = new RegExp(`from\\s+['"][^'"]*${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`)
  return walk('tests').filter((s) => s.endsWith('.mjs') && re.test(fs.readFileSync(s, 'utf8'))).sort()
}

export function planAll({ minMutants = 1 } = {}) {
  const rows = []
  for (const file of walk('src').filter((f) => f.endsWith('.js'))) {
    const guard = guardSet(file)
    if (!guard.length) continue
    const mutants = mutantsFor(file)
    if (mutants.length < minMutants) continue
    rows.push({ file, slug: slug(file), guard, mutants })
  }
  rows.sort((a, b) => b.mutants.length - a.mutants.length || a.file.localeCompare(b.file))
  return rows
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const rows = planAll({ minMutants: 1 })
  const out = rows.map((r) => ({ file: r.file, slug: r.slug, guard: r.guard, mutants: r.mutants.length }))
  fs.writeFileSync('research/mutants/plan-all.json', JSON.stringify(out, null, 1))
  for (const r of out.slice(0, 28)) console.log(String(r.mutants).padStart(4), String(r.guard.length).padStart(2), r.file)
  console.log('files:', out.length, '| >=20 mutants:', out.filter((r) => r.mutants >= 20).length, '| total mutants:', out.reduce((n, r) => n + r.mutants, 0))
}
