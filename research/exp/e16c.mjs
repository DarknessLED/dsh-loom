// The durability question that actually matters: if the host dies mid-write, is
// the campaign state recoverable? The claim under test (w3-restart) is that a
// temp-then-rename publish is safe. Test it by killing a real writer at random
// points and rebuilding from the ledger.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-kill-'))
const writer = path.join(dir, 'writer.mjs')
fs.writeFileSync(writer, `
import { writeJsonAtomic, appendJsonl } from 'file:///C:/Projects/RSI/src/core/atomic.js'
const p = process.argv[2]
let i = 0
for (;;) {
  writeJsonAtomic(p + '/state.json', { round: i, payload: 'x'.repeat(4000) })
  appendJsonl(p + '/events.jsonl', { seq: i, type: 'round.finished' })
  i += 1
}
`)

const outcomes = []
for (let trial = 0; trial < 6; trial += 1) {
  const p = path.join(dir, 't' + trial)
  fs.mkdirSync(p, { recursive: true })
  const child = spawn(process.execPath, [writer, p], { stdio: 'ignore' })
  const exited = new Promise((r) => child.once('exit', r))
  await new Promise((r) => setTimeout(r, 120 + trial * 40))
  child.kill('SIGKILL')
  await exited

  // What did the reader see?
  let state = null, stateErr = null
  try { state = JSON.parse(fs.readFileSync(path.join(p, 'state.json'), 'utf8')) } catch (e) { stateErr = e.code || e.message }
  const ledger = fs.existsSync(path.join(p, 'events.jsonl')) ? fs.readFileSync(path.join(p, 'events.jsonl'), 'utf8') : ''
  const lines = ledger.split('\n').filter(Boolean)
  let torn = 0
  for (const l of lines) { try { JSON.parse(l) } catch { torn += 1 } }
  const strays = fs.readdirSync(p).filter((f) => f.endsWith('.tmp'))
  outcomes.push({ trial, stateOk: state !== null, stateRound: state?.round ?? null, stateErr, ledgerLines: lines.length, tornLines: torn, strayTmp: strays.length })
}
console.log(JSON.stringify({
  trials: outcomes.length,
  stateAlwaysParseable: outcomes.every((o) => o.stateOk),
  tornLedgerLines: outcomes.reduce((a, o) => a + o.tornLines, 0),
  strayTmpLeft: outcomes.reduce((a, o) => a + o.strayTmp, 0),
  outcomes,
}, null, 2))
fs.rmSync(dir, { recursive: true, force: true })
