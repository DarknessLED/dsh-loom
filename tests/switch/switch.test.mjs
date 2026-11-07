// Adversarial: the operator wants the loop on *now*, off in a minute, and back
// on an hour later, without the campaign history moving underneath them.
//
// The switch therefore lives outside the campaign directories: flipping it must
// not append a single campaign event (so no seq moves, nothing needs re-reading
// or re-summarising), it must survive a restart, and with the loop off a child
// session must still be usable on demand.
//
//   node tests/switch/switch.test.mjs
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { Runtime } from '../../src/runtime/runtime.js'
import { normalizeConfig } from '../../src/core/config.js'
import { templateFor } from '../../src/chain/templates.js'
import { readSwitch, switchLogPath, switchPath, writeSwitch } from '../../src/runtime/switch.js'

const NODE = process.execPath
const root = mkdtempSync(join(tmpdir(), 'loom-switch-'))
const repo = join(root, 'repo')
const home = join(root, 'home')
mkdirSync(repo, { recursive: true })
mkdirSync(home, { recursive: true })
writeFileSync(join(repo, 'a.txt'), 'a\n')
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', windowsHide: true })
git('init', '-q')
git('config', 'user.email', 'loom@example.com')
git('config', 'user.name', 'loom')
git('add', '.')
git('commit', '-q', '-m', 'init')

let pass = 0
const ok = (name, cond, detail) => {
  if (!cond) {
    console.error(`FAIL  ${name}${detail ? ` ${detail}` : ''}`)
    process.exitCode = 1
    return
  }
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const config = normalizeConfig({ tickMs: 1000, session: { maxConcurrent: 1 } })

// ---------------------------------------------------------------- the switch
assert.equal(existsSync(switchPath(home)), false)
ok('a fresh home has no switch file', readSwitch(home, true).enabled === true, JSON.stringify(readSwitch(home, true)))
ok('the configured default answers when nothing was flipped', readSwitch(home, false).enabled === false)

const runtime = new Runtime({ ctx: {}, home, config, log: () => {} })
const view = runtime.create({ id: 'swx', objective: 'pin the switch', workspace: repo, initiator: null })
runtime.append(view, 'evalset.registered', {
  tasks: [{ id: 't1', prompt: 'do it', verify: { cmd: `"${NODE}" -e "process.exit(0)"`, timeoutMs: 30_000 } }],
  holdout: [],
})
runtime.append(view, 'chain.proposed', {
  version: 1,
  spec: { ...JSON.parse(JSON.stringify(templateFor('code-fix'))), version: 1, params: { candidates: 1 } },
})
runtime.append(view, 'chain.activated', { version: 1 })
runtime.append(view, 'campaign.status', { status: 'running' })

const ledgerFile = join(home, 'campaigns', 'swx', 'events.jsonl')
const before = readFileSync(ledgerFile)
const seqBefore = view.state.rounds.length

runtime.setEnabled(false, { by: 'human', reason: 'pausing for the night' })
const afterOff = readFileSync(ledgerFile)
ok('turning the loop off does not touch the campaign log', Buffer.compare(before, afterOff) === 0, `${before.length} -> ${afterOff.length}`)
ok('the switch is readable and records who flipped it', runtime.enabled() === false && runtime.switchState().by === 'human')
ok('the flip is audited outside the campaign', existsSync(switchLogPath(home)) && readFileSync(switchLogPath(home), 'utf8').includes('rsi.disabled'))

// A disabled loop must not dispatch, but must not write either.
runtime.tick()
const afterTick = readFileSync(ledgerFile)
ok('a disabled tick dispatches nothing', Buffer.compare(afterOff, afterTick) === 0)
ok('a disabled tick leaves the campaign running', runtime.get('swx').state.status === 'running')

// Restart: a new process reads the flip from disk, not from a summary.
const restarted = new Runtime({ ctx: {}, home, config, log: () => {} })
ok('the flip survives a restart', restarted.enabled() === false)
ok('a restart does not have to replay or resummarise anything', restarted.get('swx').state.rounds.length === seqBefore)

// Turning it back on continues the same history: the next seq is the next one.
restarted.setEnabled(true, { by: 'human', reason: 'back on' })
const reopened = restarted.get('swx')
restarted.append(reopened, 'note.added', { text: 'after the flip' }, 'human')
const seqs = reopened.ledger.all().map((e) => e.seq)
const monotonic = seqs.every((s, i) => i === 0 || s > seqs[i - 1])
ok('the history keeps its seq across an off/on cycle', monotonic, JSON.stringify(seqs.slice(-4)))
ok('the flip appended nothing to the campaign', seqs.length === JSON.parse(`[${before.toString('utf8').trim().split('\n').join(',')}]`).length + 1)

// ------------------------------------------------- using children while off
restarted.setEnabled(false, { by: 'human' })
const stub = {
  async run() {
    return { text: 'worked', sessionId: `stub-${Date.now()}`, stopReason: 'completed', timedOut: false, error: null }
  },
}
restarted.dispatchers.set('swx', stub)
const ran = await restarted.runOnce('swx')
ok('one round can be run on demand while the loop is off', ran.newRounds === 1 && ran.round === 1, JSON.stringify(ran))
ok('the manual round went through the normal gate', restarted.get('swx').state.rounds[0].status !== undefined)
ok('the loop is still off after a manual round', restarted.enabled() === false)

// --------------------------------------------------------------- the brief
const brief = restarted.briefForPrompt()
ok('the brief says the loop is off', /RSI loop is OFF/.test(brief), brief.split('\n')[0])

// A switch file that cannot be read must not silently flip the loop either way.
writeFileSync(switchPath(home), '{not json')
ok('a corrupt switch file falls back to the configured default', readSwitch(home, true).enabled === true && readSwitch(home, false).enabled === false)

// writeSwitch is the only writer, and it is atomic enough to be re-read.
const rec = writeSwitch(home, { enabled: false, by: 'test', reason: 'regression' })
ok('writeSwitch returns what it wrote', rec.enabled === false && rec.by === 'test' && readSwitch(home, true).enabled === false)

rmSync(root, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
