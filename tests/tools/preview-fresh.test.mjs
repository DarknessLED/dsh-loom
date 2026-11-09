// The panel audit is only as honest as the HTML it measures. It used to certify
// a preview that was a day older than the component that produces it, and the
// preview itself dropped every aria-*, role and tabindex attribute, so the
// accessibility work could never be seen — let alone fail — by the audit.
//
// These two are pins, not aspirational specs: the generator now keeps every
// attribute the panel sets and the committed artefact is regenerated here on
// every run, so a stale preview or a white-listed-away attribute breaks this.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const preview = join(root, 'docs', 'panel-preview.html')

let pass = 0
let fail = 0
function ok(name, cond, detail) {
  if (cond) {
    pass += 1
    console.log('ok   ' + name)
  } else {
    fail += 1
    console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + detail))
  }
}

// 1. Regenerating the preview right now must reproduce the committed file byte
//    for byte. If it does not, the audit is measuring a page nobody serves.
const dir = mkdtempSync(join(tmpdir(), 'loom-preview-'))
let fresh = ''
try {
  const out = join(dir, 'preview.html')
  execFileSync(process.execPath, [join(root, 'scripts', 'panel-preview.mjs'), out], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120_000,
  })
  fresh = readFileSync(out, 'utf8')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
const committed = readFileSync(preview, 'utf8')
// Compare after normalising line endings: a Windows runner checks the file out
// with CRLF and the generator writes LF, which made this pin fail on CI for a
// reason that has nothing to do with the panel being stale (55007 vs 54789
// bytes was 218 line endings, not 218 characters of drift).
const lf = (text) => text.replace(/\r\n/g, '\n')
ok(
  'the committed preview is the one the generator produces today',
  lf(fresh) === lf(committed),
  `${lf(committed).length} vs ${lf(fresh).length} bytes`,
)

// 2. The attributes the panel sets must survive serialisation.
const html = fresh || committed
ok('the switch keeps its role and checked state', /role="switch"/.test(html) && /aria-checked=/.test(html))
ok('the waiting area stays a live region', /aria-live=/.test(html))
ok('focusable rows keep their tabindex', /tabindex="0"/.test(html))
ok('named controls keep their aria-label', /aria-label=/.test(html))

// 3. The audit must be able to fail on those facts, or pinning them is theatre.
const auditSrc = readFileSync(join(root, 'scripts', 'panel-audit.mjs'), 'utf8')
ok('the audit reads the a11y surface', /a11y/.test(auditSrc) && /role="switch"|switchRole/.test(auditSrc))
ok('the audit fails when the switch loses its role', /does not expose role="switch"/.test(auditSrc))
ok('the audit fails when the queue goes silent', /not a live region/.test(auditSrc))

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exit(1)
