/**
 * A patch that rewrites every line of a file without changing any of them.
 *
 * The classic shape is a line-ending conversion: the worker writes a CRLF copy
 * of a file whose lines were LF. The tests still pass, the diff is honest, and
 * a reviewer rejects it on sight because nothing in it can be read. That is
 * worth saying out loud — but it is not a reason to refuse a promotion, so the
 * call site records this and nothing gates on it.
 */

const MIN_LINES = 20;
const RATIO = 0.8;

/**
 * @param {string} patchText a unified diff
 * @returns {null | {files: Array<{path: string, added: number, deleted: number, crlf: number}>, added: number, deleted: number, crlf: number}}
 */
export function lineEndingChurn(patchText) {
  if (typeof patchText !== 'string' || patchText === '') return null
  const files = []
  let current = null
  const lines = patchText.split('\n')

  const start = (path) => {
    current = { path, added: 0, deleted: 0, crlf: 0, lfDeleted: 0 }
    files.push(current)
  }

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      const after = line.split(' b/')
      start(after.length > 1 ? after[after.length - 1] : line.slice(11))
      continue
    }
    if (!current) continue
    if (line.startsWith('+++') || line.startsWith('---')) continue
    if (line.startsWith('+')) {
      current.added += 1
      if (line.endsWith('\r')) current.crlf += 1
    } else if (line.startsWith('-')) {
      current.deleted += 1
      if (!line.endsWith('\r')) current.lfDeleted += 1
    }
  }

  const flagged = files.filter((f) => {
    if (f.added < MIN_LINES) return false
    // every added line carries a CR, and the lines it replaced did not: the
    // file was rewritten with a different ending rather than edited.
    const addedCrlf = f.crlf / f.added >= RATIO
    const replacedLf = f.deleted > 0 && f.lfDeleted / f.deleted >= RATIO
    const bulk = f.deleted >= RATIO * f.added
    return addedCrlf && replacedLf && bulk
  })
  if (!flagged.length) return null
  const pick = (f) => ({ path: f.path, added: f.added, deleted: f.deleted, crlf: f.crlf })
  return {
    files: flagged.map(pick),
    added: flagged.reduce((n, f) => n + f.added, 0),
    deleted: flagged.reduce((n, f) => n + f.deleted, 0),
    crlf: flagged.reduce((n, f) => n + f.crlf, 0),
  }
}
