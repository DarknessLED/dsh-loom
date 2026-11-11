// Spec: the brief states what the shell already is.
//
// The round that motivated this: an attempt in loom-claim-live3 spent itself
// discovering that `node` is not on PATH inside the harness shell, and wrote
// that discovery as its claim -- so the knowledge tree learned something about
// this machine instead of about the repository it was asked to change.
//
// The harness knows the answer already: it is the same search the verifier
// runs. A fact the runner knows must be in the brief, for the same reason the
// wall-clock budget is: otherwise the agent meets it as an unexplained wall.
import assert from 'node:assert/strict'
import { buildWorkerBrief } from '../src/dispatch/brief.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const base = {
  task: { id: 't1', prompt: 'change the thing', verify: { cmd: 'node -e "process.exit(0)"' } },
  round: 1,
  workspace: 'C:/w',
}

// --- 1. an interpreter off PATH is named ---------------------------------
{
  const nodePath = 'C:\\Users\\x\\.dsh\\dsh-runtimes\\r1\\dependencies\\node\\bin\\node.exe'
  const brief = buildWorkerBrief({ ...base, nodePath })
  assert.ok(brief.includes(nodePath), 'the brief names the interpreter the runner will actually use')
  assert.ok(/no `node` on PATH/i.test(brief), 'and says plainly that a bare `node` will not resolve')
  assert.ok(/Do not spend the attempt rediscovering this/.test(brief), 'so the attempt does not pay for it again')
  ok('a shell without node on PATH says where node is')
}

// --- 2. when PATH already answers, say nothing --------------------------
{
  const quiet = buildWorkerBrief({ ...base, nodePath: null })
  assert.ok(!/no `node` on PATH/i.test(quiet), 'no warning is emitted when there is nothing to warn about')
  assert.ok(!/rediscovering/.test(quiet), 'and no instruction about a problem that does not exist')

  const absent = buildWorkerBrief(base)
  assert.equal(absent, quiet, 'an unspecified interpreter is the same as one that needs no mention')
  ok('a working PATH is not narrated')
}

// --- 3. the note is a rule, and it is bounded like every other section --
{
  const brief = buildWorkerBrief({
    ...base,
    nodePath: 'C:\\very\\long\\path\\to\\the\\runtime\\dependencies\\node\\bin\\node.exe',
    constraints: ['do not touch tests'],
  })
  assert.ok(brief.includes('do not touch tests'), 'the task constraints survive')
  assert.ok(brief.length < 6000, 'a shell note does not push the brief past its cap')
  ok('the shell note lives with the rules, inside the brief budget')
}

console.log(`\n${pass}/${pass} passed`)
