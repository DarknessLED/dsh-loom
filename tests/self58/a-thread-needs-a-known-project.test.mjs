// A thread cannot start in a directory T3 has never been told about.

import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'

import { projectRootFor, runViaT3, t3Command } from '../../src/dispatch/arms.js'

const ok = (n, msg) => console.log(`ok ${n} - ${msg}`)

function fakeChild(behave, { selfClosing = false } = {}) {
  const child = new EventEmitter()
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.pid = 4242
  child.kill = () => {}
  child.stdin = {
    end(text) {
      setImmediate(() => behave(child, text))
    },
  }
  // `t3 project add` is spawned without stdin and exits on its own; a thread
  // start is fed the brief and only settles after that.
  if (selfClosing) setImmediate(() => behave(child, ''))
  return child
}

{
  // Attempts run in .../worktrees/<campaign>/<attempt>; T3 wants the campaign.
  assert.equal(projectRootFor('C:/Users/x/worktrees/c1/r2a1'), 'C:\\Users\\x\\worktrees\\c1')
  assert.equal(projectRootFor('C:\\Users\\x\\worktrees\\c1\\r2a1'), 'C:\\Users\\x\\worktrees\\c1')
  assert.equal(projectRootFor('C:/a/b'), 'C:/a/b')
  assert.equal(projectRootFor('C:/Users/x/worktrees/c1'), 'C:/Users/x/worktrees/c1')
  ok(1, 'the project root is the campaign directory, not the attempt or its grandparent')
}

{
  const calls = []
  const spawn = (cmd, args) => {
    const kind = args.includes('project') ? 'project' : 'thread'
    calls.push({ kind, args })
    if (kind === 'project') {
      return fakeChild((child) => {
        child.stdout.emit('data', 'Added project 88c33bdd (loom) at C:\\Users\\x\\worktrees\\c1.\n')
        child.emit('close', 0)
      }, { selfClosing: true })
    }
    const threads = calls.filter((c) => c.kind === 'thread').length
    return fakeChild((child) => {
      if (threads === 1) {
        child.stdout.emit('data', "No T3 Code project matches 'C:\\Users\\x\\worktrees\\c1\\r1a1'. Pass a project id or a path inside a project.\n")
        child.emit('close', 1)
        return
      }
      child.stdout.emit('data', `{"threadId":"mcp:1","runId":"run:1","status":"completed","reply":"done","error":null}\n`)
      child.emit('close', 0)
    })
  }
  const res = await runViaT3({
    cwd: 'C:\\Users\\x\\worktrees\\c1\\r1a1',
    prompt: 'the brief',
    provider: 'codex',
    model: 'auto/deepseek-v4.1-flash',
    home: 'C:/home',
    spawn,
  })
  assert.equal(res.ok, true)
  assert.equal(res.reply, 'done')
  assert.equal(res.project?.dir, 'C:\\Users\\x\\worktrees\\c1')
  assert.equal(res.project?.registered, true)
  assert.deepEqual(calls.map((c) => c.kind), ['thread', 'project', 'thread'])
  // The registration names the campaign directory, and the CLI is unquoted.
  assert.equal(calls[1].args.at(-1), 'C:\\Users\\x\\worktrees\\c1')
  assert.equal(calls[1].args[calls[1].args.indexOf('/c') + 1], t3Command('C:/home'))
  ok(2, 'a refusal for an unknown directory is answered by registering it and trying again')
}

{
  const calls = []
  const spawn = (cmd, args) => {
    const kind = args.includes('project') ? 'project' : 'thread'
    calls.push({ kind, args })
    if (kind === 'project') {
      return fakeChild((child) => {
        child.stdout.emit('data', 'a project already exists at this path\n')
        child.emit('close', 0)
      }, { selfClosing: true })
    }
    const threads = calls.filter((c) => c.kind === 'thread').length
    return fakeChild((child) => {
      if (threads === 1) {
        child.stdout.emit('data', "No T3 Code project matches 'C:\\x\\c1\\r1a1'.\n")
        child.emit('close', 1)
        return
      }
      child.stdout.emit('data', '{"status":"completed","reply":"ok","error":null}\n')
      child.emit('close', 0)
    })
  }
  const res = await runViaT3({
    cwd: 'C:\\x\\c1\\r1a1',
    prompt: 'x',
    provider: 'codex',
    model: 'm',
    home: 'C:/home',
    spawn,
  })
  assert.equal(res.ok, true)
  assert.equal(res.project.registered, true)
  ok(3, 'a project that already exists counts as registered, not as a failure')
}

{
  const calls = []
  const spawn = (cmd, args) => {
    const kind = args.includes('project') ? 'project' : 'thread'
    calls.push(kind)
    if (kind === 'project') {
      return fakeChild((child) => {
        child.stdout.emit('data', 'T3 is not running\n')
        child.emit('close', 1)
      }, { selfClosing: true })
    }
    return fakeChild((child) => {
      child.stdout.emit('data', "No T3 Code project matches 'C:\\x\\c1\\r1a1'.\n")
      child.emit('close', 1)
    })
  }
  const res = await runViaT3({
    cwd: 'C:\\x\\c1\\r1a1',
    prompt: 'x',
    provider: 'codex',
    model: 'm',
    home: 'C:/home',
    spawn,
  })
  assert.equal(res.ok, false)
  assert.equal(res.project.registered, false)
  assert.match(res.project.note ?? '', /not running/)
  assert.equal(calls.length, 3, 'one retry, not a loop')
  ok(4, 'when registration fails the second refusal is the result, and there is no third try')
}

{
  // A failure that is not about projects must not be retried.
  const calls = []
  const spawn = (cmd, args) => {
    calls.push(args.includes('project') ? 'project' : 'thread')
    return fakeChild((child) => {
      child.stdout.emit('data', 'T3 printed nothing useful\n')
      child.emit('close', 1)
    })
  }
  const res = await runViaT3({
    cwd: 'C:\\x\\c1\\r1a1',
    prompt: 'x',
    provider: 'codex',
    model: 'm',
    home: 'C:/home',
    spawn,
  })
  assert.equal(res.ok, false)
  assert.deepEqual(calls, ['thread'])
  assert.equal(res.project, undefined)
  ok(5, 'any other failure is reported once, without registering anything')
}
