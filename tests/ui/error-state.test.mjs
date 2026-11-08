// When the state fetch fails, the panel prints the raw error and nothing else:
// "HTTP 500" or "Failed to fetch", in English, in a Chinese panel, with no hint
// about whether the loop is still running or what the reader should do. And the
// empty state is one sentence for two very different situations: no campaign yet,
// and every campaign finished.
//
// Required:
//   - `errorState(error, {retry})` -> { title, hint, detail, action }
//       title is Chinese; hint reassures that the loop keeps running while the
//       panel cannot read it (the panel failing is not the loop failing);
//       detail keeps the raw message so the failure stays debuggable;
//       action is {label:'重试', onClick: retry} when retry is a function, else null;
//     it must not throw for a null/absent error.
//   - `emptyState(data)` -> { title, hint } or null when there is nothing to say:
//       no campaigns at all -> 还没有战役 (and how to start one);
//       campaigns exist but none is running/paused/planning and nothing waits ->
//       都处理完了;
//       otherwise null (the caller renders campaigns).
//   - the panel actually uses both (no dead exports).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { loadPanel } from './harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const panel = await loadPanel()
const source = readFileSync(new URL('../../client/index.js', import.meta.url), 'utf8')

assert.equal(typeof panel.errorState, 'function', 'errorState is exported')
{
  let retried = 0
  const state = panel.errorState(new Error('HTTP 500'), {
    retry: () => {
      retried += 1
    },
  })
  assert.equal(state.title, '读取失败', 'the title is Chinese')
  assert.match(state.hint, /循环|仍在运行/, 'the hint says the loop is unaffected')
  assert.match(state.hint, /刷新|重试/, 'and tells the reader what to do')
  assert.match(String(state.detail), /HTTP 500/, 'the raw message is kept for debugging')
  assert.equal(state.action.label, '重试', 'the action is a retry')
  state.action.onClick()
  assert.equal(retried, 1, 'and it calls the retry')
}
ok('a failed read explains itself instead of printing a raw error')

{
  const plain = panel.errorState(null)
  assert.equal(plain.title, '读取失败', 'a missing error still renders')
  assert.equal(plain.action, null, 'and offers no action it cannot honour')
}
ok('a missing error is not a crash')

{
  const none = panel.emptyState({ campaigns: [] })
  assert.equal(none.title, '还没有战役', 'an empty ledger says so')
  assert.match(none.hint, /rsi_start/, 'and names the call that starts one')
}
ok('no campaigns is a different message from a finished campaign')

{
  const finished = panel.emptyState({ campaigns: [{ id: 'a', status: 'done' }, { id: 'b', status: 'stopped' }] })
  assert.equal(finished.title, '都处理完了', 'a finished ledger says it is finished')
  assert.notEqual(finished.title, '还没有战役', 'and does not pretend nothing ever ran')
}
ok('a finished ledger is not reported as empty')

{
  assert.equal(panel.emptyState({ campaigns: [{ id: 'a', status: 'running' }] }), null, 'a working campaign needs no empty state')
  assert.equal(panel.emptyState({ campaigns: [{ id: 'a', status: 'done', open: 2 }] }), null, 'and a waiting checkpoint beats the finished message')
}
ok('an empty state never replaces live campaigns')

{
  assert.ok(/errorState\(/.test(source), 'the panel uses errorState')
  assert.ok(/emptyState\(/.test(source), 'the panel uses emptyState')
}
ok('both helpers are wired in, not dead exports')

console.log(`\n${pass}/${pass} passed`)
