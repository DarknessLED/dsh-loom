// What does a worker actually read? Measure the brief's own composition on a real
// task, and check whether the numbers the loop knows (budget, base score, metric)
// appear in it.
const { buildWorkerBrief } = await import('file:///C:/Projects/RSI/src/dispatch/brief.js')
const b = buildWorkerBrief({
  task: { id: 'graded', prompt: 'Make node check.mjs print QUALITY=1.000.', verify: { cmd: '"C:/n/node.exe" check.mjs', cwd: 'C:/tmp/graded-live', metrics: { quality: { pattern: 'QUALITY=(\\d+)' } } } },
  round: 2,
  phase: 'explore',
  budgetMs: 780000,
  lessons: [],
  nodePath: 'C:/Users/Darkness/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe',
})
const text = typeof b === 'string' ? b : JSON.stringify(b)
console.log('chars', text.length, 'lines', text.split('\n').length)
for (const probe of ['QUALITY', 'metrics', 'quality', '0.500', 'base score', 'budget', 'minute', 'node.exe', 'lib.mjs']) {
  console.log(probe.padEnd(12), text.includes(probe) ? 'yes' : 'NO')
}
console.log('--- first 1200 chars ---')
console.log(text.slice(0, 1200))
