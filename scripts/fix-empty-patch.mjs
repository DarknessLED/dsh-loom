// One-shot source edit: an attempt that changes nothing must not promote an
// empty patch (git apply refuses it) but must still count as landing a solved task.
// The sources use CRLF, so every multi-line pattern goes through eol().
import { readFileSync, writeFileSync } from 'node:fs'

const roundPath = 'src/runtime/round.js'
let src = readFileSync(roundPath, 'utf8')
const EOL = src.includes('\r\n') ? '\r\n' : '\n'
const edits = []

const sub = (re, to, label) => {
  if (!re.test(src)) {
    console.error('MISSING:', label)
    process.exit(1)
  }
  src = src.replace(re, to)
  edits.push(label)
}

sub(
  new RegExp(`([ \\t]*)patch: patch\\?\\.path \\?\\? null,`),
  `$1patch: patch?.path ?? null,${EOL}$1patchBytes: patch?.bytes ?? 0,`,
  'attempt.patchBytes',
)
sub(/hasPatch: Boolean\(best\?\.patch\),/, 'hasPatch: Boolean(best?.patch) && (best?.patchBytes ?? 0) > 0,', 'checks.hasPatch')
sub(
  /const promote = checks\.verifierOk && checks\.hasPatch && checks\.beatsIncumbent/,
  [
    '// A verified attempt that changed nothing is not evidence of new work, but it IS',
    '    // evidence the task is satisfied (an earlier landing already covered it). Applying',
    '    // an empty patch fails in git apply, so record it as a no-op landing instead.',
    '    checks.noop = checks.verifierOk && !checks.hasPatch && score > 0 && checks.beatsIncumbent',
    '    const promote = checks.verifierOk && checks.beatsIncumbent && (checks.hasPatch || checks.noop)',
  ].join(EOL + '    '),
  'promote',
)
sub(
  /runtime\.append\(view, 'artifact\.promoted', \{ kind: 'attempt', round: n, score, patch: best\.patch, branch: best\.branch \}, 'system'\)/,
  [
    'runtime.append(',
    "        view,",
    "        'artifact.promoted',",
    "        { kind: 'attempt', round: n, score, patch: best.patch, branch: best.branch, ...(checks.noop ? { noop: true } : {}) },",
    "        'system',",
    '      )',
  ].join(EOL),
  'artifact.promoted.noop',
)
sub(
  new RegExp(`const auto = config\\.loopPolicy\\.autoApply \\|\\| state\\.autopilot\\?\\.enabled === true(\\r?\\n)([ \\t]*)if \\(auto\\) \\{`),
  [
    'const auto = config.loopPolicy.autoApply || state.autopilot?.enabled === true$1$2if (auto && checks.noop) {',
    '$2  // Nothing to apply: the tree already satisfies the verifier. Marking the round',
    '$2  // landed is what stops the selector spending more rounds on this task.',
    "$2  runtime.append(view, 'autopilot.applied', { round: n, patch: null, guard: null, noop: true, committed: false, at: Date.now() }, 'system')",
    '$2} else if (auto) {',
  ].join(EOL),
  'noop-branch',
)
writeFileSync(roundPath, src)

const patchPath = 'src/exec/patch.js'
let pat = readFileSync(patchPath, 'utf8')
const PE = pat.includes('\r\n') ? '\r\n' : '\n'
if (!/export async function applyPatch\(\{ repo, patchFile \}\) \{/.test(pat)) {
  console.error('MISSING: applyPatch header')
  process.exit(1)
}
pat = pat.replace(
  /export async function applyPatch\(\{ repo, patchFile \}\) \{/,
  [
    'export async function applyPatch({ repo, patchFile }) {',
    '  // An empty patch is not a failure: some attempts correctly change nothing.',
    '  try {',
    "    if (readFileSync(patchFile, 'utf8').trim() === '') return { ok: true, reason: 'empty-patch' }",
    '  } catch (err) {',
    "    return { ok: false, reason: 'patch-missing', detail: String(err?.message ?? err) }",
    '  }',
  ].join(PE),
)
pat = pat.replace("import { mkdirSync, writeFileSync } from 'node:fs'", "import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'")
writeFileSync(patchPath, pat)

console.log('applied:', edits.join(', '), '+ applyPatch empty guard')
