// A verifier command is a fixture, and a fixture that only exists on the
// developer's machine is a spec that lies. `cmd: 'true'` is not a Windows
// command; on a GitHub runner Git's usr/bin is on PATH, so it succeeded there
// and failed here. Eleven specs asserted "a timed-out attempt promotes nothing"
// with that command, so on Windows they were passing for the wrong reason and
// on CI they were red — four consecutive runs, 110/114 suites.
//
// The pin: no fixture may name a *bare* POSIX builtin as its whole command.
// `echo x 1>&2 && exit 1` is fine (cmd.exe has both, and the verifier spawns
// through a shell on purpose); `true` is not (cmd.exe has no such builtin, so the
// shell reports success without running anything, or fails outright).
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const self = fileURLToPath(import.meta.url)

let pass = 0
let fail = 0
const ok = (name, cond, detail) => {
  if (cond) {
    pass += 1
    console.log('ok   ' + name)
  } else {
    fail += 1
    console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + detail))
  }
}

function specs(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      out.push(...specs(full))
    } else if (entry.name.endsWith('.test.mjs') && full !== self) {
      out.push(full)
    }
  }
  return out
}

const files = specs(join(root, 'tests'))
ok('there are specs to scan', files.length > 100, `${files.length} files`)

// Whole-command builtins that exist in a POSIX shell and in Git-for-Windows'
// usr/bin, but not in cmd.exe.
const BARE_POSIX = /^(true|false|exit|sleep|test|printf|pwd|cat|ls|sh|bash)$/

const offenders = []
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const pattern = /\bcmd:\s*(`[^`]*`|'[^']*'|"[^"]*")/g
  for (const match of text.matchAll(pattern)) {
    const command = match[1].slice(1, -1).replace(/\$\{[^}]*\}/g, '').trim()
    if (command === '') continue
    if (BARE_POSIX.test(command)) {
      const line = text.slice(0, match.index).split('\n').length
      offenders.push(`${file.replace(root, '').replace(/^[\\/]/, '')}:${line} ${match[1]}`)
    }
  }
}
ok(
  'no fixture makes a POSIX builtin the whole verifier command',
  offenders.length === 0,
  offenders.slice(0, 6).join(' | '),
)

// The verifier itself must keep two portability promises: a bare script path is
// run by the interpreter already in hand (cmd.exe would report success without
// running it), and commands otherwise go through a real shell.
const verifier = readFileSync(join(root, 'src', 'exec', 'verifier.js'), 'utf8')
ok('a bare script path is run through process.execPath', verifier.includes('process.execPath'))
ok('other commands still go through a shell', /shell:\s*true/.test(verifier))

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exit(1)
