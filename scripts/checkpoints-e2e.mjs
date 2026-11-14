// End-to-end check that a campaign which ends closes the inbox it left open,
// through the same Runtime door a real stop goes through (not by calling reduce
// directly). Runs against a throwaway home so ~/.dsh/loom is never touched.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Runtime } from '../src/runtime/runtime.js'

const home = mkdtempSync(join(tmpdir(), 'loom-cp-e2e-'))
const fail = (msg) => {
  console.error('FAIL ' + msg)
  process.exitCode = 1
}

try {
  const runtime = new Runtime({ home, config: { home } })
  runtime.create({ id: 'cp-e2e', objective: 'checkpoint closure', workspace: process.cwd() })
  const view = runtime.open('cp-e2e')
  runtime.append(view, 'campaign.status', { status: 'running' }, 'human')
  runtime.append(view, 'checkpoint.raised', { id: 'c1', kind: 'gate', payload: {} }, 'system')
  runtime.append(view, 'checkpoint.raised', { id: 'c2', kind: 'plateau', payload: {} }, 'system')
  runtime.append(view, 'checkpoint.closed', { id: 'c1', reason: 'answered' }, 'human')

  const before = runtime.get('cp-e2e').state
  const openBefore = before.checkpoints.filter((c) => c.status === 'open').map((c) => c.id)
  if (openBefore.join(',') !== 'c2') fail(`before end: open = [${openBefore}], want [c2]`)

  runtime.append(view, 'campaign.status', { status: 'stopped', reason: 'test' }, 'human')

  const state = runtime.get('cp-e2e').state
  const openAfter = state.checkpoints.filter((c) => c.status === 'open').map((c) => c.id)
  if (openAfter.length !== 0) fail(`after end: still open ${openAfter.join(',')}`)
  if (state.checkpoints.find((c) => c.id === 'c1')?.closedReason !== 'answered') {
    fail('a checkpoint closed by its own decision lost that reason when the campaign ended')
  }
  if (state.ended?.status !== 'stopped') fail(`state.ended = ${JSON.stringify(state.ended)}`)
  const finished = runtime.get('cp-e2e').ledger.all().filter((e) => e.type === 'campaign.finished')
  if (finished.length !== 1) fail(`campaign.finished written ${finished.length} times, want 1`)

  console.log(`ok open before=[${openBefore}] after=[] ended=${state.ended.status} finished=1x`)
} finally {
  rmSync(home, { recursive: true, force: true })
}
