// Spec: a task that says `node` gets a node.
//
// What went wrong, measured on this machine. The runner built the verifier's
// environment as `PATH = <inherited PATH> + dirname(process.execPath)`, on the
// theory that the interpreter running the harness is a node whose directory is
// then on PATH. The plugin does not run inside `node.exe` here: it runs inside
// `DeepSeek Harness.exe`, an Electron application. So the appended directory
// held `DeepSeek Harness.exe` and no `node.exe`, PATH still had no `node`, and
// every task written the obvious way --
//
//     { cmd: 'node -e "process.exit(check() ? 0 : 1)"' }
//
// -- exited 1 whatever the workspace contained. A candidate that had done the
// work and a candidate that had done nothing scored the same, and `loom-claim-live`
// burned both of its rounds on it.
//
// Nothing about that is specific to this host: the failure mode is "the
// interpreter a task assumes is not the interpreter the harness runs", and the
// fix has to be a search, not an assumption. These specs pin the search.
import assert from 'node:assert/strict'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { delimiter } from 'node:path'
import { nodeBinDir, nodeBinDirs, nodeExecutable, withNodeOnPath, hasNode } from '../../src/exec/node-bin.js'
import { runVerifier } from '../../src/exec/verifier.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const NODE_EXE = process.platform === 'win32' ? 'node.exe' : 'node'
const root = join(tmpdir(), `loom-nodebin-${process.pid}`)
mkdirSync(root, { recursive: true })

/** A directory that looks like an interpreter install. */
function fakeBin(name) {
  const dir = join(root, name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, NODE_EXE), '')
  return dir
}

try {
  // --- 1. an Electron host must not be mistaken for an interpreter --------
  {
    const appDir = join(root, 'app')
    mkdirSync(appDir, { recursive: true })
    writeFileSync(join(appDir, 'DeepSeek Harness.exe'), '')
    const real = fakeBin('real-node')

    const dirs = nodeBinDirs({
      execPath: join(appDir, 'DeepSeek Harness.exe'),
      env: { PATH: [appDir, real].join(delimiter) },
      platform: process.platform,
    })
    assert.equal(dirs[0], real, 'the directory that actually holds an interpreter comes first')
    assert.ok(!dirs.includes(appDir), 'the application directory is not offered as a node directory')
    assert.equal(nodeExecutable({ execPath: join(appDir, 'DeepSeek Harness.exe'), env: { PATH: real } }), join(real, NODE_EXE), 'the script interpreter is a real node, not the app')
    ok('a host that is not node does not pretend to be one')
  }

  // --- 2. a real node keeps itself first ----------------------------------
  {
    const nodeDir = fakeBin('self-node')
    const other = fakeBin('other-node')
    const dirs = nodeBinDirs({
      execPath: join(nodeDir, NODE_EXE),
      env: { PATH: other },
      platform: process.platform,
    })
    assert.equal(dirs[0], nodeDir, 'when the harness runs under node, that node wins')
    assert.equal(nodeExecutable({ execPath: join(nodeDir, NODE_EXE), env: { PATH: other } }), join(nodeDir, NODE_EXE), 'and it is the interpreter used for bare script commands')
    ok('the interpreter already running the harness is preferred')
  }

  // --- 3. PATH order is preserved behind the winner ----------------------
  {
    const first = fakeBin('path-first')
    const second = fakeBin('path-second')
    const dirs = nodeBinDirs({ execPath: '/nonexistent/app', env: { PATH: [first, second].join(delimiter) }, platform: process.platform })
    assert.deepEqual(dirs.slice(0, 2), [first, second], "the caller's own search order survives")
    ok("the caller's PATH order is kept")
  }

  // --- 4. PATH is rewritten, not replaced --------------------------------
  {
    const bin = fakeBin('with-node')
    const base = ['C:\\somewhere\\else', 'C:\\another'].join(delimiter)
    const out = withNodeOnPath(base, { execPath: '/nonexistent/app', env: { PATH: bin }, platform: process.platform })
    assert.equal(out.split(delimiter)[0], bin, 'the interpreter directory leads')
    assert.ok(out.includes('C:\\somewhere\\else') && out.includes('C:\\another'), 'and nothing the caller had is dropped')
    assert.equal(withNodeOnPath(base, { execPath: '/nonexistent/app', env: { PATH: bin }, platform: process.platform }).split(delimiter).filter((p) => p === bin).length, 1, 'the interpreter directory appears once')
    ok('PATH is prepended to, never replaced')
  }

  // --- 5. no interpreter anywhere: say so, do not invent one -------------
  {
    const empty = join(root, 'empty')
    mkdirSync(empty, { recursive: true })
    const base = ['C:\\nowhere'].join(delimiter)
    const out = withNodeOnPath(base, { execPath: '/nonexistent/app', env: { PATH: empty, ProgramFiles: empty, LOCALAPPDATA: empty, USERPROFILE: empty }, platform: 'win32' })
    assert.equal(out, base, 'an untouched PATH beats a PATH that promises an interpreter it does not have')
    assert.equal(nodeBinDir({ execPath: '/nonexistent/app', env: { PATH: empty, ProgramFiles: empty, LOCALAPPDATA: empty, USERPROFILE: empty }, platform: 'win32' }), null, 'and the search reports its failure')
    assert.equal(hasNode(empty), false, 'a directory without the executable does not count')
    assert.equal(hasNode(join(root, 'no-such-dir')), false, 'and neither does one that does not exist')
    ok('when there is no interpreter the search says so')
  }

  // --- 6. the harness runtime is found without being on PATH -------------
  {
    const home = join(root, 'home')
    const bin = join(home, 'dsh-runtimes', 'runtime-a', 'dependencies', 'node', 'bin')
    mkdirSync(bin, { recursive: true })
    writeFileSync(join(bin, NODE_EXE), '')
    const dirs = nodeBinDirs({ execPath: '/nonexistent/app', env: { PATH: join(root, 'empty'), DSH_HOME: home }, platform: 'win32' })
    assert.ok(dirs.includes(bin), 'the runtime the harness shipped is discoverable from DSH_HOME')
    ok('the interpreter the harness brought with it is found without PATH help')
  }

  // --- 7. end to end: the command a task actually writes now passes ------
  {
    const work = join(root, 'work')
    mkdirSync(work, { recursive: true })
    writeFileSync(join(work, 'note.txt'), 'hello')

    const present = await runVerifier(
      { cmd: 'node -e "process.exit(require(\'fs\').existsSync(\'note.txt\') ? 0 : 1)"' },
      { cwd: work, timeoutMs: 30000, env: { PATH: withNodeOnPath('') } },
    )
    assert.equal(present.ok, true, `a task that says \`node\` reaches a node (stderr: ${present.stderr})`)
    assert.equal(present.exitCode, 0, 'and the verdict is about the workspace, not about PATH')

    const absent = await runVerifier(
      { cmd: 'node -e "process.exit(require(\'fs\').existsSync(\'missing.txt\') ? 0 : 1)"' },
      { cwd: work, timeoutMs: 30000, env: { PATH: withNodeOnPath('') } },
    )
    assert.equal(absent.ok, false, 'and a task whose condition is false still fails')
    assert.equal(absent.exitCode, 1, 'for the reason the task states, not for a missing interpreter')
    ok('a verifier that says `node` runs in a node')
  }
} finally {
  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
