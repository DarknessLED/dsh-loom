// Two things were wrong with the first pass at the decay question, and fixing them
// changes the answer.
//
// 1. The exact-binomial helper capped nothing, so 2*tail exceeded 1 (printed
//    "p = 1.3750"). A p-value above 1 is a bug, not a finding.
// 2. Splitting a task's appearances into first half / second half is confounded by
//    the selector: it prefers unsolved tasks, so late appearances are mostly on
//    tasks that keep failing. The paired endpoint comparison (first vs last, same
//    task) removes that.
//
// With both fixed, the question "does the eval set decay under reuse" answers
// differently than "no": what decays is not a task's difficulty, it is how much of
// the judging budget lands on tasks that can still discriminate.
import fs from 'node:fs'
import path from 'node:path'

const d = JSON.parse(fs.readFileSync(path.join('research', 'exp', 'e81.json'), 'utf8'))
const per = d.perTask

const binom = (k, n) => {
  const fact = (m) => { let r = 1; for (let i = 2; i <= m; i += 1) r *= i; return r }
  const c = (a, b) => fact(a) / (fact(b) * fact(a - b))
  let tail = 0
  for (let i = 0; i <= k; i += 1) tail += c(n, i) * 0.5 ** n
  return Math.min(1, 2 * tail)
}

const rows = per.filter((t) => t.n >= 3)
const gained = rows.filter((t) => t.seq[0] === '0' && t.seq[t.n - 1] === '1').length
const lost = rows.filter((t) => t.seq[0] === '1' && t.seq[t.n - 1] === '0').length
const k = Math.min(gained, lost)
const p = binom(k, gained + lost)

console.log(`paired first-vs-last, tasks with >=3 appearances (n=${rows.length}):`)
console.log(`  gained ${gained}, lost ${lost} => exact two-sided p = ${p.toFixed(3)} (previously printed 1.375, a bug)`)
console.log(`  => a task's difficulty does not measurably drift with reuse.`)

// What DOES change: composition of the judging budget.
const saturatedPass = per.filter((t) => t.seq.split('').every((c) => c === '1'))
const saturatedFail = per.filter((t) => t.seq.split('').every((c) => c === '0'))
const mixed = per.filter((t) => !saturatedPass.includes(t) && !saturatedFail.includes(t))
const total = per.reduce((s, t) => s + t.n, 0)
const sum = (xs) => xs.reduce((s, t) => s + t.n, 0)
console.log(`\nappearances by task type (${total} total on repeated tasks):`)
console.log(`  always-pass tasks: ${saturatedPass.length} tasks, ${sum(saturatedPass)} appearances (${(sum(saturatedPass) / total * 100).toFixed(1)}%)`)
console.log(`  always-fail tasks: ${saturatedFail.length} tasks, ${sum(saturatedFail)} appearances (${(sum(saturatedFail) / total * 100).toFixed(1)}%)`)
console.log(`  mixed tasks:       ${mixed.length} tasks, ${sum(mixed)} appearances (${(sum(mixed) / total * 100).toFixed(1)}%)`)
console.log(`\n  => ${((sum(saturatedPass) + sum(saturatedFail)) / total * 100).toFixed(1)}% of re-judgements land on a task`)
console.log(`     whose verdict never changed. That is the discriminative power that is lost --`)
console.log(`     not to decay, but to saturation: the set keeps answering questions already settled.`)
for (const t of [...saturatedPass, ...saturatedFail].sort((a, b) => b.n - a.n).slice(0, 8)) {
  console.log(`     ${t.task.padEnd(30)} n=${t.n} ${t.seq.slice(0, 14)}${t.n > 14 ? '…' : ''}  rate=${(t.rate * 100).toFixed(0)}%`)
}

fs.writeFileSync(path.join('research', 'exp', 'e83.json'), JSON.stringify({
  n: rows.length, gained, lost, p,
  saturatedPass: saturatedPass.length, saturatedFail: saturatedFail.length, mixed: mixed.length,
  appearances: { alwaysPass: sum(saturatedPass), alwaysFail: sum(saturatedFail), mixed: sum(mixed), total },
}, null, 2))
