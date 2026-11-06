import {
  stripComments,
  parseImports,
  scanSource,
  parseAxiomReport,
  checkAxioms,
  buildCheckSource,
  DEFAULT_AXIOMS,
} from '../src/lean/scan.js'
import { checkLemma } from '../src/lean/gate.js'
import { probeLean, INSTALL_HINTS, elanBinDir, leanBinDir, pathWithElan } from '../src/lean/probe.js'
import { runTaskLeanGate, safeJoin, leanSpecOf } from '../src/lean/task.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let passed = 0
let failed = 0
function ok(cond, name) {
  if (cond) {
    passed += 1
    console.log(`ok ${passed} - ${name}`)
  } else {
    failed += 1
    console.error(`not ok ${passed + failed} - ${name}`)
  }
}
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), `${name} (got ${JSON.stringify(a)})`)

// ------------------------------------------------------------- source scanning
eq(stripComments('a /- b -/ c'), 'a  c', 'stripComments: block comment removed')
eq(stripComments('a -- b\nc'), 'a \nc', 'stripComments: line comment removed')
eq(stripComments('a /- x /- y -/ z -/ b'), 'a  b', 'stripComments: nested block comment removed')
eq(parseImports('import Mathlib.Data.Nat\nimport Loom.Core\n'), ['Mathlib.Data.Nat', 'Loom.Core'], 'parseImports: in order')

{
  const r = scanSource('theorem t : 1 = 1 := by rfl')
  eq(r.ok, true, 'scan: a clean proof passes')
}
{
  const r = scanSource('theorem t : 1 = 1 := by sorry')
  eq(r.ok, false, 'scan: sorry is rejected')
  eq(r.violations[0].code, 'sorry', 'scan: sorry code')
}
{
  const r = scanSource('-- sorry in a comment is fine\ntheorem t : 1 = 1 := by rfl')
  eq(r.ok, true, 'scan: sorry inside a comment does not count')
}
{
  const r = scanSource('axiom cheat : False')
  eq(r.violations.some((v) => v.code === 'axiom-decl'), true, 'scan: new axioms rejected')
}
{
  const r = scanSource('theorem t : 1 = 1 := by native_decide')
  eq(r.violations.some((v) => v.code === 'native-decide'), true, 'scan: native_decide rejected')
}
{
  const r = scanSource('@[implemented_by fastFoo] def foo := 1')
  eq(r.violations.some((v) => v.code === 'implemented-by'), true, 'scan: implemented_by rejected')
}
{
  const r = scanSource('import Mathlib.Tactic\nimport Evil.Backdoor\ntheorem t : 1 = 1 := by rfl', {
    allowedImports: ['Mathlib'],
  })
  eq(r.ok, false, 'scan: import outside the allow-list rejected')
  eq(r.violations.filter((v) => v.code === 'import').length, 1, 'scan: only the bad import is flagged')
}
{
  const r = scanSource('  ', {})
  eq(r.ok, false, 'scan: empty source rejected')
}
{
  const r = scanSource('theorem t : True := by trivial', { allowAxioms: ['sorryAx'] })
  eq(r.violations.some((v) => v.code === 'allow-list'), true, 'scan: sorryAx can never be allow-listed')
}

// --------------------------------------------------------------- axiom reports
{
  eq(
    parseAxiomReport("'loom_claim' does not depend on any axioms", 'loom_claim'),
    [],
    'axioms: "does not depend" parses as none',
  )
  eq(
    parseAxiomReport("'loom_claim' depends on axioms: [propext, Classical.choice, Quot.sound]", 'loom_claim'),
    ['propext', 'Classical.choice', 'Quot.sound'],
    'axioms: list parses',
  )
  eq(parseAxiomReport('nothing here', 'loom_claim'), null, 'axioms: missing report is null')
  eq(parseAxiomReport("'other' depends on axioms: [propext]", 'loom_claim'), null, 'axioms: wrong theorem is null')
}
{
  eq(checkAxioms(['propext'], {}).length, 0, 'checkAxioms: default axioms accepted')
  eq(checkAxioms(['sorryAx'], {}).length, 1, 'checkAxioms: sorryAx rejected')
  eq(checkAxioms(['MyThing.weird'], { allowAxioms: ['MyThing.weird'] }).length, 0, 'checkAxioms: explicit allow-list works')
  eq(checkAxioms(null, {}).length, 1, 'checkAxioms: unknown report is a violation')
  eq(DEFAULT_AXIOMS.length, 3, 'checkAxioms: three default axioms')
}

// ----------------------------------------------------------------- source build
{
  const src = buildCheckSource({ source: 'theorem t : 1 = 1 := by rfl', theorem: 't', imports: ['Mathlib'] })
  ok(src.startsWith('import Mathlib'), 'buildCheckSource: imports first')
  ok(src.includes('#print axioms t'), 'buildCheckSource: axiom report appended')
  const bare = buildCheckSource({ source: 'theorem t : 1 = 1 := by rfl' })
  ok(!bare.includes('import'), 'buildCheckSource: no imports when none given')
}

// ------------------------------------------------------------------- checkLemma
const fakeRun = (result) => (cmd, args, opts) => ({ ok: true, code: 0, stdout: '', stderr: '', ...result })

{
  const res = await checkLemma({
    source: 'theorem loom_claim : 1 = 1 := by rfl',
    theorem: 'loom_claim',
    run: fakeRun({ stdout: "'loom_claim' depends on axioms: [propext]" }),
  })
  eq(res.ok, true, 'checkLemma: clean proof with allowed axioms passes')
  eq(res.stage, 'axioms', 'checkLemma: reaches the axiom stage')
  eq(res.axioms, ['propext'], 'checkLemma: axiom list recorded')
  eq(res.file !== null, true, 'checkLemma: reports the file it compiled')
}
{
  const res = await checkLemma({
    source: 'theorem loom_claim : False := by sorry',
    theorem: 'loom_claim',
    run: fakeRun({}),
  })
  eq(res.ok, false, 'checkLemma: sorry fails before compiling')
  eq(res.stage, 'scan', 'checkLemma: scan stage failure')
  eq(res.violations[0].code, 'sorry', 'checkLemma: sorry reason')
}
{
  const res = await checkLemma({
    source: 'theorem loom_claim : 1 = 1 := by rfl',
    theorem: 'loom_claim',
    run: () => ({ ok: false, code: 1, stdout: '', stderr: "error: unknown tactic 'rfl'\nmore text" }),
  })
  eq(res.ok, false, 'checkLemma: compile failure fails the claim')
  eq(res.stage, 'compile', 'checkLemma: compile stage failure')
  eq(res.violations[0].code, 'compile', 'checkLemma: compile reason')
  ok(res.violations[0].detail.includes("unknown tactic"), 'checkLemma: compiler error surfaced')
}
{
  const res = await checkLemma({
    source: 'theorem loom_claim : 1 = 1 := by rfl',
    theorem: 'loom_claim',
    run: fakeRun({ stdout: "'loom_claim' depends on axioms: [sorryAx]" }),
  })
  eq(res.ok, false, 'checkLemma: an unexpected axiom fails the claim')
  eq(res.violations[0].code, 'axioms', 'checkLemma: axiom violation code')
}
{
  const res = await checkLemma({
    source: 'theorem loom_claim : 1 = 1 := by rfl',
    theorem: 'loom_claim',
    run: () => ({ ok: false, code: null, stdout: '', stderr: '', error: 'spawn lake ENOENT' }),
  })
  eq(res.violations[0].code, 'compiler-missing', 'checkLemma: missing toolchain is reported distinctly')
}
{
  const res = await checkLemma({
    source: 'theorem loom_claim : 1 = 1 := by rfl',
    theorem: null,
    run: fakeRun({}),
  })
  eq(res.ok, true, 'checkLemma: a compiled claim without a theorem name still passes')
  eq(res.stage, 'axioms', 'checkLemma: no-theorem path stops after compiling')
}

// --------------------------------------------------------------------- probeLean
{
  const p = probeLean({
    platform: 'win32',
    // The probe prefers the elan shim's absolute path when one exists, so the
    // stub matches on the basename rather than the bare command.
    run: (cmd) =>
      /lean(\.exe)?$/i.test(String(cmd))
        ? { ok: true, stdout: 'Lean (version 4.9.0)', stderr: '' }
        : { ok: false, error: 'x' },
  })
  eq(p.available, true, 'probe: lean detected')
  eq(p.lean.includes('4.9.0'), true, 'probe: version captured')
  eq(p.lake, null, 'probe: missing lake reported as null')
  eq(p.install, INSTALL_HINTS.windows, 'probe: windows install hint')
}
{
  const p = probeLean({ platform: 'linux', run: () => ({ ok: false, error: 'ENOENT' }) })
  eq(p.available, false, 'probe: missing toolchain reported')
  eq(p.install, INSTALL_HINTS.unix, 'probe: unix install hint')
}

// ----------------------------------------------------------- task-level gate
{
  const root = mkdtempSync(join(tmpdir(), 'loom-lean-task-'))
  try {
    eq(safeJoin(root, 'a/b.lean') !== null, true, 'safeJoin: inside the worktree')
    eq(safeJoin(root, '../../etc/passwd'), null, 'safeJoin: traversal refused')
    eq(safeJoin(root, ''), root.endsWith('loom-lean-task-') ? root : root, 'safeJoin: empty stays at root')

    eq(leanSpecOf({}), null, 'leanSpecOf: no spec')
    eq(leanSpecOf({ lean: { source: '  ' } }), null, 'leanSpecOf: blank source')
    ok(leanSpecOf({ lean: { file: 'Proof.lean' } }) !== null, 'leanSpecOf: file spec accepted')

    eq(await runTaskLeanGate({ task: { id: 't' }, config: {}, worktree: root }), null, 'task gate: null without a spec')

    const skipped = await runTaskLeanGate({
      task: { lean: { source: 'theorem t : 1 = 1 := by rfl' } },
      config: { lean: { enabled: false } },
      worktree: root,
    })
    eq(skipped.ok, true, 'task gate: disabled config skips')
    ok(String(skipped.skipped).includes('disabled'), 'task gate: skip reason recorded')

    const inlineRun = await runTaskLeanGate({
      task: { lean: { source: 'theorem loom_claim : 1 = 1 := by rfl', theorem: 'loom_claim' } },
      config: { lean: { allowedImports: [] }, verify: {} },
      worktree: root,
      run: () => ({ ok: true, code: 0, stdout: "'loom_claim' depends on axioms: [propext]", stderr: '' }),
    })
    eq(inlineRun.ok, true, 'task gate: inline source passes with an allowed axiom')
    eq(inlineRun.axioms, ['propext'], 'task gate: axiom report recorded')

    writeFileSync(join(root, 'Proof.lean'), 'theorem loom_claim : 1 = 1 := by rfl\n', 'utf8')
    const fromFile = await runTaskLeanGate({
      task: { lean: { file: 'Proof.lean', theorem: 'loom_claim' } },
      config: { lean: {} },
      worktree: root,
      run: () => ({ ok: true, code: 0, stdout: "'loom_claim' does not depend on any axioms", stderr: '' }),
    })
    eq(fromFile.ok, true, 'task gate: reads the proof file inside the worktree')
    eq(fromFile.axioms, [], 'task gate: no axioms is a pass')

    const escape = await runTaskLeanGate({
      task: { lean: { file: '../outside.lean' } },
      config: { lean: {} },
      worktree: root,
    })
    eq(escape.ok, false, 'task gate: path traversal refused')
    eq(escape.violations[0].code, 'unsafe-path', 'task gate: traversal code')

    const missing = await runTaskLeanGate({
      task: { lean: { file: 'nope.lean' } },
      config: { lean: {} },
      worktree: root,
    })
    eq(missing.ok, false, 'task gate: missing file fails')
    eq(missing.violations[0].code, 'missing-file', 'task gate: missing file code')

    const sorrySource = await runTaskLeanGate({
      task: { lean: { source: 'theorem loom_claim : False := by sorry' } },
      config: { lean: {} },
      worktree: root,
      run: () => ({ ok: true, code: 0, stdout: '', stderr: '' }),
    })
    eq(sorrySource.ok, false, 'task gate: sorry fails the whole attempt')
    eq(sorrySource.violations[0].code, 'sorry', 'task gate: sorry code')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

// ------------------------------------------------------- elan shim discovery
{
  // A GUI-started host has no ~/.elan/bin on PATH: the probe has to find the
  // shims itself, or an installed toolchain reads as missing.
  const fakeHome = mkdtempSync(join(tmpdir(), 'loom-elan-home-'))
  try {
    const empty = elanBinDir({ ELAN_HOME: fakeHome }, { home: fakeHome })
    eq(empty, null, 'elan: missing shims report null')

    const bin = join(fakeHome, 'bin')
    mkdirSync(bin, { recursive: true })
    const exe = join(bin, process.platform === 'win32' ? 'lean.exe' : 'lean')
    writeFileSync(exe, '', 'utf8')
    eq(elanBinDir({ ELAN_HOME: fakeHome }, { home: fakeHome }), bin, 'elan: shim dir found from ELAN_HOME')

    const pathed = pathWithElan({ ELAN_HOME: fakeHome, PATH: '/usr/bin' }, { home: fakeHome })
    ok(pathed.startsWith(bin), 'elan: shim dir prepended to PATH')
    ok(pathed.length > bin.length && bin === pathed.slice(0, bin.length), 'elan: original PATH preserved')
    ok(pathWithElan({ ELAN_HOME: join(fakeHome, 'nope'), PATH: '/usr/bin' }, { home: fakeHome }).endsWith('/usr/bin'), 'elan: no shims leaves the existing PATH tail alone')
  } finally {
    rmSync(fakeHome, { recursive: true, force: true })
  }
}
{
  // The probe must call the shim's absolute path when one is discoverable.
  const seen = []
  const fakeHome = mkdtempSync(join(tmpdir(), 'loom-elan-probe-'))
  try {
    const bin = join(fakeHome, 'bin')
    mkdirSync(bin, { recursive: true })
    writeFileSync(join(bin, process.platform === 'win32' ? 'lean.exe' : 'lean'), '', 'utf8')
    probeLean({
      env: { ELAN_HOME: fakeHome },
      run: (cmd) => {
        seen.push(String(cmd))
        return { ok: false, error: 'x' }
      },
    })
    ok(seen.every((cmd) => cmd.includes(fakeHome)), 'elan: probe runs the discovered absolute shim')
  } finally {
    rmSync(fakeHome, { recursive: true, force: true })
  }
}

// ------------------------------------------- toolchain binary beats elan shim
{
  // On Windows a shim costs ~34 s per spawn: a probe with a 15 s timeout reads
  // an installed toolchain as missing. The toolchain binary must win.
  const home = mkdtempSync(join(tmpdir(), 'loom-elan-tc-'))
  try {
    const name = (n) => (process.platform === 'win32' ? `${n}.exe` : n)
    const tc = join(home, 'toolchains', 'leanprover--lean4---v4.35.0', 'bin')
    mkdirSync(tc, { recursive: true })
    writeFileSync(join(tc, name('lean')), '', 'utf8')
    writeFileSync(join(tc, name('lake')), '', 'utf8')
    const shims = join(home, 'bin')
    mkdirSync(shims, { recursive: true })
    writeFileSync(join(shims, name('lean')), '', 'utf8')

    eq(leanBinDir({}, { home }), tc, 'elan: toolchain bin preferred over shims')
    ok(pathWithElan({ PATH: '/usr/bin' }, { home }).startsWith(tc), 'elan: PATH gets the toolchain bin first')

    // A half-extracted toolchain (lean but no lake) must not be selected.
    const broken = join(home, 'toolchains', 'broken', 'bin')
    mkdirSync(broken, { recursive: true })
    writeFileSync(join(broken, name('lean')), '', 'utf8')
    eq(leanBinDir({}, { home }), tc, 'elan: incomplete toolchain skipped')

    rmSync(join(home, 'toolchains'), { recursive: true, force: true })
    eq(leanBinDir({}, { home }), shims, 'elan: shims are the fallback when no toolchain exists')
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
}

if (failed) process.exitCode = 1
console.log(`\n${passed}/${passed + failed} passed`)
