// The T3 transport is a command and a parser, and both are small enough to pin.
//
// Talking to another machine's agent through a CLI has exactly two places to go
// wrong: the argument vector (a prompt quoted into a `.cmd` line) and the reply
// (a JSON line, or a failure that must not read as success). The prompt goes over
// stdin so the argv limit and the quoting rules stay out of it, and the parser
// only accepts a line that carries a status.
//   node tests/self58/the-t3-transport-is-a-command.test.mjs
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'

import { parseT3Reply, runViaT3, threadArgs, t3Command } from '../../src/dispatch/arms.js'
import { ok, done } from '../chaos/fixture.mjs'

// 1. The argv is the contract `t3 thread start --help` documents: project, then
//    `-` for "read the message from stdin", then the pair, then wait-and-json.
{
  const args = threadArgs({ cwd: 'C:/work/tree', provider: 'codex', model: 'auto/deepseek-v4.1-flash' })
  assert.deepEqual(args, [
    'thread', 'start', 'C:/work/tree', '-',
    '--provider', 'codex',
    '--model', 'auto/deepseek-v4.1-flash',
    '--wait', '--json',
  ])
  assert.match(t3Command('C:/home'), /\.t3[\\/]bin[\\/]t3\.cmd$/)
  ok('the argv is the documented one, and the brief travels on stdin')
}

// 2. Completed, failed, and not-a-result-at-all are three different answers.
{
  const doneLine = JSON.stringify({
    threadId: 'mcp:abc', runId: 'run:1', status: 'completed', reply: 'LOOP-OK', error: null,
  })
  assert.deepEqual(parseT3Reply(`some chatter\n${doneLine}\n`), {
    status: 'completed', reply: 'LOOP-OK', error: null, threadId: 'mcp:abc', runId: 'run:1',
  })

  const failed = parseT3Reply(JSON.stringify({ status: 'failed', reply: null, error: 'API Error: 402' }))
  assert.equal(failed.status, 'failed')
  assert.equal(failed.reply, null)
  assert.match(failed.error, /402/)

  assert.equal(parseT3Reply('no json here'), null)
  assert.equal(parseT3Reply('{"reply":"forgot the status"}'), null, 'a line without a status is not a result')
  assert.equal(parseT3Reply(''), null)
  ok('only a line that carries a status is a result, and a failure keeps its error')
}

// 3. A fake child proves the plumbing: stdin gets the brief, stdout is parsed, the
//    wall clock is measured, and the promise settles on close.
{
  const seen = {}
  const spawn = (file, args, opts) => {
    seen.file = file
    seen.args = args
    seen.cwd = opts.cwd
    const child = new EventEmitter()
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    child.killed = false
    child.kill = () => {
      child.killed = true
    }
    child.stdin = {
      end: (text) => {
        seen.stdin = text
        setImmediate(() => {
          child.stdout.emit('data', JSON.stringify({ status: 'completed', reply: 'done here', threadId: 't1', runId: 'r1' }))
          child.emit('close', 0)
        })
      },
    }
    return child
  }
  const run = await runViaT3({
    cwd: '/tmp/tree',
    prompt: 'the brief',
    provider: 'codex',
    model: 'auto/deepseek-v4.1-flash',
    home: 'C:/home',
    spawn,
  })
  assert.equal(run.ok, true)
  assert.equal(run.reply, 'done here')
  assert.equal(run.threadId, 't1')
  assert.equal(seen.stdin, 'the brief', 'the brief goes over stdin, not argv')
  assert.equal(seen.file, 'cmd.exe', 'a .cmd shim is started through the shell host')
  assert.ok(seen.args.includes('--wait'))
  // The path is named bare: `cmd /c "<path>"` hands cmd a quoted literal and it
  // answers `is not recognized as an internal or external command`, which is how
  // the first live round reported a routing failure that was a quoting failure.
  const command = seen.args[seen.args.indexOf('/c') + 1]
  assert.equal(command, t3Command('C:/home'), 'the command is not quoted')
  assert.equal(seen.args[0], '/d')
  assert.equal(seen.args[1], '/s')
  assert.ok(run.wallMs >= 0)
  ok('the brief is written to stdin and the JSON line is the answer')
}

// 4. A failed run is a result, not an exception: the round must still be able to
//    record what the other harness said.
{
  const spawn = () => {
    const child = new EventEmitter()
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    child.kill = () => {}
    child.stdin = {
      end: () => setImmediate(() => {
        child.stdout.emit('data', JSON.stringify({ status: 'failed', reply: null, error: 'model quota exhausted' }))
        child.emit('close', 1)
      }),
    }
    return child
  }
  const run = await runViaT3({ cwd: '/tmp', prompt: 'x', provider: 'claudeAgent', model: 'claude-haiku-5-5', home: 'C:/home', spawn })
  assert.equal(run.ok, false)
  assert.equal(run.status, 'failed')
  assert.match(run.error, /quota/)
  ok('a failed run comes back as a failed result with the harness\u2019s own words')
}

// 5. A spawn that throws, and output with no result line, are both errors with a
//    reason -- never a silent success.
{
  const thrown = await runViaT3({
    cwd: '/tmp', prompt: 'x', provider: 'codex', model: 'm', home: 'C:/home',
    spawn: () => {
      throw new Error('ENOENT cmd.exe')
    },
  })
  assert.equal(thrown.ok, false)
  assert.match(thrown.error, /ENOENT/)

  const garbage = await runViaT3({
    cwd: '/tmp', prompt: 'x', provider: 'codex', model: 'm', home: 'C:/home',
    spawn: () => {
      const child = new EventEmitter()
      child.stdout = new EventEmitter()
      child.stderr = new EventEmitter()
      child.kill = () => {}
      child.stdin = { end: () => setImmediate(() => {
        child.stderr.emit('data', 'not installed\n')
        child.emit('close', 127)
      }) }
      return child
    },
  })
  assert.equal(garbage.ok, false)
  assert.match(garbage.error, /no result line/)
  ok('a broken transport reports itself instead of pretending to have run')
}

done()
