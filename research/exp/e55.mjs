// e55: how many of the patches this loop has actually produced are *whitespace
// only* — a non-empty diff whose every changed line is unchanged when whitespace
// is ignored?
//
// Motivation: after landing loom-oracle round 1 the workspace at
// C:/tmp/oracle-live showed ` M lib.mjs` with 23/23 lines changed, while
// `git diff -w` was empty and `git ls-files --eol` said `i/lf w/crlf`. So a
// landing path can, in at least one observed instance, leave the tree with a
// whole-file line-ending flip that reads as work. I could not reproduce it in
// three controlled attempts (research/exp/e53.mjs: applyPatch and
// commitWorkspace both preserve LF; direct apply+commit in the live fixture is
// clean), so the cause stays unattributed. The question this script can answer
// without a cause is the *blast radius* of a rule that refuses such a patch.
//
// Method: for every campaign artifact patch, ask git whether the patch is
// whitespace-only. `git apply --numstat` reports added/removed per file; git has
// no "--ignore-whitespace numstat" for a patch, so the comparison is done by
// applying the patch to a scratch tree twice — once exactly, once with
// `--ignore-whitespace` content rewritten — and comparing the resulting file
// bytes with whitespace stripped. Cheaper: parse the patch ourselves and ask
// whether every +/- line pair differs only in whitespace.
//
// Run: node research/exp/e55.mjs

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const LOOM = 'C:/Users/Darkness/.dsh/loom/campaigns'

/** Strip all whitespace, so two lines that differ only in spacing compare equal. */
function squash(s) {
  return s.replace(/\s+/g, '')
}

/**
 * Parse a unified diff into per-file {removed:[], added:[]} line lists.
 * Only `-`/`+` body lines count; headers and hunk markers are skipped.
 */
function parsePatch(text) {
  const files = []
  let cur = null
  for (const raw of text.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      const m = raw.match(/^diff --git a\/(.+?) b\/(.+)$/)
      cur = { path: (m ? m[2] : raw).trim(), removed: [], added: [] }
      files.push(cur)
      continue
    }
    if (!cur) continue
    if (raw.startsWith('--- ') || raw.startsWith('+++ ') || raw.startsWith('@@') || raw.startsWith('index ')) continue
    if (raw.startsWith('-')) cur.removed.push(raw.slice(1))
    else if (raw.startsWith('+')) cur.added.push(raw.slice(1))
  }
  return files
}

function classify(files) {
  let changed = 0
  let whitespaceOnlyFiles = 0
  for (const f of files) {
    const removed = f.removed.map(squash).filter((s) => s !== '')
    const added = f.added.map(squash).filter((s) => s !== '')
    if (removed.length === 0 && added.length === 0) continue
    changed += 1
    if (removed.join('\n') === added.join('\n')) whitespaceOnlyFiles += 1
  }
  return { changed, whitespaceOnlyFiles }
}

const rows = []
let totalPatches = 0
let nonEmpty = 0
let whitespaceOnly = 0
const offenders = []

for (const id of readdirSync(LOOM)) {
  const dir = join(LOOM, id, 'artifacts')
  if (!existsSync(dir)) continue
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.patch')) continue
    totalPatches += 1
    const path = join(dir, name)
    let text
    try {
      text = readFileSync(path, 'utf8')
    } catch {
      continue
    }
    if (text.trim() === '') continue
    nonEmpty += 1
    const { changed, whitespaceOnlyFiles } = classify(parsePatch(text))
    rows.push({ campaign: id, patch: name, changedFiles: changed, whitespaceOnlyFiles })
    if (changed > 0 && whitespaceOnlyFiles === changed) {
      whitespaceOnly += 1
      offenders.push({ campaign: id, patch: name })
    }
  }
}

console.log(
  JSON.stringify(
    {
      verdict: {
        patchFiles: totalPatches,
        nonEmptyPatches: nonEmpty,
        whitespaceOnlyPatches: whitespaceOnly,
      },
      offenders,
      sample: rows.slice(0, 5),
    },
    null,
    2,
  ),
)
