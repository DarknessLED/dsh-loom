// w3-restart claims bare renameSync publish is unsafe on Windows. Test the part
// that is testable right now: does rename-over-target fail while another handle
// has the target open? Our panel server reads state files while the loop writes.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-dura-'))
const target = path.join(dir, 'state.json')
fs.writeFileSync(target, JSON.stringify({ v: 1 }))

const results = {}

// 1. rename over a closed target (the normal path)
{
  const tmp = target + '.tmp1'
  fs.writeFileSync(tmp, JSON.stringify({ v: 2 }))
  try { fs.renameSync(tmp, target); results.renameOverClosed = 'ok:' + fs.readFileSync(target, 'utf8') }
  catch (e) { results.renameOverClosed = 'fail:' + e.code }
}

// 2. rename over a target that another handle has open for reading
{
  const tmp = target + '.tmp2'
  fs.writeFileSync(tmp, JSON.stringify({ v: 3 }))
  const held = fs.openSync(target, 'r')
  try { fs.renameSync(tmp, target); results.renameOverOpenReader = 'ok:' + fs.readFileSync(target, 'utf8') }
  catch (e) { results.renameOverOpenReader = 'fail:' + e.code }
  finally { fs.closeSync(held); try { fs.unlinkSync(tmp) } catch {} }
}

// 3. what a reader sees if it opens the target between write and rename
{
  const tmp = target + '.tmp3'
  fs.writeFileSync(tmp, JSON.stringify({ v: 4 }))
  const before = fs.readFileSync(target, 'utf8')
  fs.renameSync(tmp, target)
  const after = fs.readFileSync(target, 'utf8')
  results.readerNeverSeesPartial = JSON.parse(before).v === 3 && JSON.parse(after).v === 4
}

// 4. does the helper fsync at all?
{
  const src = fs.readFileSync('src/core/atomic.js', 'utf8')
  results.helperDoesFsync = /fsync|fdatasync/i.test(src)
  results.helperUsesTempAndRename = /writeFileSync\(tmp/.test(src) && /renameSync\(tmp, path\)/.test(src)
}

console.log(JSON.stringify(results, null, 2))
fs.rmSync(dir, { recursive: true, force: true })
