// The e81 first-half/second-half comparison is confounded: the selector prefers
// unsolved tasks, so the second half of appearances is disproportionately made of
// tasks that keep failing. Measure the decay question on a paired basis instead:
// for each task with >=3 appearances, its FIRST and LAST score. Same task, both
// endpoints, so task difficulty cancels.
import fs from 'node:fs'
import path from 'node:path'

const d = JSON.parse(fs.readFileSync(path.join('research', 'exp', 'e81.json'), 'utf8'))
const per = d.perTask

const rows = per.map((t) => ({ task: t.task, n: t.n, seq: t.seq, first: t.seq[0], last: t.seq[t.seq.length - 1] }))
const both = rows.filter((r) => r.n >= 3)
const firstOne = both.filter((r) => r.first === '1').length
const lastOne = both.filter((r) => r.last === '1').length
const gained = both.filter((r) => r.first === '0' && r.last === '1').length
const lost = both.filter((r) => r.first === '1' && r.last === '0').length
const stayedPass = both.filter((r) => r.first === '1' && r.last === '1').length
const stayedFail = both.filter((r) => r.first === '0' && r.last === '0').length

console.log(`tasks with >=3 appearances: ${both.length}`)
console.log(`  first appearance passed: ${firstOne}; last appearance passed: ${lastOne}`)
console.log(`  gained (0..1): ${gained}   lost (1..0): ${lost}   stayed pass: ${stayedPass}   stayed fail: ${stayedFail}`)
const n = gained + lost
if (n) {
  // exact binomial two-sided
  const p = 0.5
  let tail = 0
  const fact = (k) => { let r = 1; for (let i = 2; i <= k; i += 1) r *= i; return r }
  const c = (a, b) => fact(a) / (fact(b) * fact(a - b))
  const k = Math.min(gained, lost)
  for (let i = 0; i <= k; i += 1) tail += c(n, i) * p ** i * (1 - p) ** (n - i)
  console.log(`  discordant pairs ${n}; exact two-sided p = ${(2 * tail).toFixed(4)}`)
}
console.log(`\nSequence inventory (first 12 with n>=4):`)
for (const r of both.filter((x) => x.n >= 4).slice(0, 12)) console.log(`  ${r.task.padEnd(34)} n=${r.n} ${r.seq}`)

// The direct question: does a task's pass rate change with reuse, holding task fixed?
// Sign test over tasks with a strict majority in one half and none in the other.
let up = 0, down = 0
for (const t of per) {
  if (t.n < 4) continue
  const half = Math.floor(t.n / 2)
  const a = t.seq.slice(0, half).split('').filter((c) => c === '1').length / half
  const b = t.seq.slice(half).split('').filter((c) => c === '1').length / (t.n - half)
  if (b > a) up += 1
  else if (b < a) down += 1
}
console.log(`\ntasks with n>=4 whose second half is better: ${up}; worse: ${down}`)

fs.writeFileSync(path.join('research', 'exp', 'e82.json'), JSON.stringify({ both: both.length, firstOne, lastOne, gained, lost, stayedPass, stayedFail, up, down }, null, 2))
