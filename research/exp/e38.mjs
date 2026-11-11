// The brief is the only text every attempt reads. How much of it is the same
// every time? That share is the fixed per-attempt text cost, and it is also the
// part a worker is paying attention to for no task-specific reason.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const { buildWorkerBrief } = await import('file:///C:/Projects/RSI/src/dispatch/brief.js')

const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const tasks = []
const seen = new Set()
for (const c of fs.readdirSync(base)) {
  const sp = path.join(base, c, 'views', 'state.json')
  if (!fs.existsSync(sp)) continue
  let state
  try { state = JSON.parse(fs.readFileSync(sp, 'utf8')) } catch { continue }
  const list = (state.evalset && Array.isArray(state.evalset.tasks) ? state.evalset.tasks : state.tasks) || []
  for (const t of list) {
    const key = String(t.id)
    if (seen.has(key)) continue
    seen.add(key)
    tasks.push({ task: t, campaign: c })
  }
}

const briefs = []
for (const { task } of tasks.slice(0, 40)) {
  try {
    const b = buildWorkerBrief({ objective: 'raise QUALITY from 0.5 to 1.0', task, round: 2, phase: 'explore', budgetMs: 780000, lessons: [] })
    briefs.push(typeof b === 'string' ? b : JSON.stringify(b))
  } catch { /* a shape the builder refuses is not the question here */ }
}

// Line-level analysis: which lines are identical across every brief?
const split = briefs.map((b) => b.split('\n'))
const lineCount = Math.min(...split.map((l) => l.length))
const common = []
for (let i = 0; i < lineCount; i += 1) {
  const line = split[0][i]
  if (split.every((l) => l[i] === line)) common.push(line)
}
const commonChars = common.join('\n').length
const meanChars = briefs.reduce((a, b) => a + b.length, 0) / briefs.length
// Section-level: the ## Rules and ## Report blocks are templates.
const sectionOf = (b, name) => {
  const m = b.match(new RegExp('## ' + name + '\\n([\\s\\S]*?)(?=\\n## |$)'))
  return m ? m[1].length : 0
}
const rulesChars = briefs.reduce((a, b) => a + sectionOf(b, 'Rules'), 0) / briefs.length
const reportChars = briefs.reduce((a, b) => a + sectionOf(b, 'Report'), 0) / briefs.length

console.log(JSON.stringify({
  briefsMeasured: briefs.length,
  meanChars: Math.round(meanChars),
  identicalLinesEverywhere: common.length,
  identicalChars: commonChars,
  identicalShare: +(commonChars / meanChars).toFixed(3),
  meanRulesChars: Math.round(rulesChars),
  meanReportChars: Math.round(reportChars),
  boilerplateShare: +((rulesChars + reportChars + commonChars) / meanChars).toFixed(3),
  sampleCommonFirst: common.slice(0, 3),
}, null, 2))
