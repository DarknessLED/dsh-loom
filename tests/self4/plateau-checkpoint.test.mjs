// A campaign that stops improving must say so, through the checkpoint channel a
// human already watches. A helper that can detect a plateau is not the same
// thing: this drives real rounds through runRound and checks what the campaign
// actually records.
//
//   node tests/self4/plateau-checkpoint.test.mjs
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { Runtime } from '../../src/runtime/runtime.js'
import { runRound } from '../../src/runtime/round.js'
import { normalizeConfig } from '../../src/core/config.js'
import { templateFor } from '../../src/chain/templates.js'

const NODE = process.execPath
const root = mkdtempSync(join(tmpdir(), 'loom-plateau-'))
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

const config = normalizeConfig({ tickMs: 1000, loopPolicy: { autoApply: false } })
const logs = []
const runtime = new Runtime({ ctx: {}, home, config, log: (...a) => logs.push(a.join(' ')) })
const view = runtime.create({ id: 'plateau-campaign', objective: 'never succeeds', workspace: repo, initiator: null })

runtime.append(view, 'evalset.registered', {
  tasks: [
    {
      id: 'always-fails',
      prompt: 'attempt something',
      verify: { cmd: `"${NODE}" -e "process.exit(1)"`, timeoutMs: 30_000 },
    },
  ],
  holdout: [],
})
const spec = { ...JSON.parse(JSON.stringify(templateFor('code-fix'))), version: 1, params: { candidates: 1 } }
runtime.append(view, 'chain.proposed', { version: 1, spec })
runtime.append(view, 'chain.activated', { version: 1 })
runtime.append(view, 'campaign.status', { status: 'running' })

// The worker writes a file, but the verifier always fails, so nothing promotes
// and every round ends in the same place. That is a plateau.
const dispatcher = {
  async run(_prompt, { cwd }) {
    writeFileSync(join(cwd, 'attempt.txt'), 'x\n')
    return { sessionId: 'stub', text: 'done', stopReason: 'completed', timedOut: false, error: null }
  },
  bindTo() {},
  async dispose() {},
}

const state = () => runtime.get('plateau-campaign').state
const plateauCheckpoints = () =>
  (state().checkpoints || []).filter((c) => c.kind === 'plateau' && c.status === 'open')

let failed = 0
const check = (name, cond, detail = '') => {
  if (cond) console.log(`ok - ${name}`)
  else {
    failed += 1
    console.log(`not ok - ${name}${detail ? ` (${detail})` : ''}`)
  }
}

await runRound({ runtime, view: runtime.get('plateau-campaign'), config, dispatcher, log: () => {} })
await runRound({ runtime, view: runtime.get('plateau-campaign'), config, dispatcher, log: () => {} })
check('two flat rounds are not yet a plateau', plateauCheckpoints().length === 0, `got ${plateauCheckpoints().length}`)

await runRound({ runtime, view: runtime.get('plateau-campaign'), config, dispatcher, log: () => {} })

const after3 = plateauCheckpoints()
check('three flat rounds raise a plateau checkpoint', after3.length === 1, `got ${after3.length}`)
check(
  'the checkpoint is the one a human answers',
  after3.length === 1 && typeof after3[0].id === 'string' && after3[0].id.startsWith('cp-'),
  JSON.stringify(after3[0] || null),
)
check('three rounds were actually run', (state().rounds || []).length === 3, `got ${(state().rounds || []).length}`)

// A fourth flat round must not raise a second copy: one question is enough.
await runRound({ runtime, view: runtime.get('plateau-campaign'), config, dispatcher, log: () => {} })
check('a fourth flat round does not raise a duplicate', plateauCheckpoints().length === 1, `got ${plateauCheckpoints().length}`)

// A round that actually lands must not be reported as a plateau.
const promoted = state().rounds.filter((r) => r.landed === true)
check('no round landed, as designed', promoted.length === 0)

console.log(failed === 0 ? '\nplateau checkpoint: ok' : `\nplateau checkpoint: ${failed} failed`)
process.exitCode = failed === 0 ? 0 : 1
