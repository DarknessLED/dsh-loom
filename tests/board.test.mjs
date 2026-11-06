// Unit tests for src/collab/board.js: no framework, no dependencies.
// Run: node tests/board.test.mjs
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'

import {
  appendNote,
  boardPath,
  normalizeText,
  pruneNotes,
  readNotes,
  summarizeNotes,
} from '../src/collab/board.js'

// ---------------------------------------------------------------------------
// tiny assertion harness
// ---------------------------------------------------------------------------
let passed = 0
let failed = 0
let total = 0

function fail(name, detail) {
  failed += 1
  console.log(`not ok ${total} - ${name}`)
  if (detail) console.log(`  ${String(detail).split('\n').join('\n  ')}`)
}

function ok(cond, name, detail) {
  total += 1
  if (cond) {
    passed += 1
    console.log(`ok ${total} - ${name}`)
  } else {
    fail(name, detail ?? 'expected a truthy value')
  }
}

function eq(actual, expected, name) {
  total += 1
  if (Object.is(actual, expected)) {
    passed += 1
    console.log(`ok ${total} - ${name}`)
  } else {
    fail(name, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]))
}

function deepEq(actual, expected, name) {
  total += 1
  if (deepEqual(actual, expected)) {
    passed += 1
    console.log(`ok ${total} - ${name}`)
  } else {
    fail(name, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function throwsType(fn, name) {
  total += 1
  try {
    fn()
    fail(name, 'did not throw')
  } catch (error) {
    if (error instanceof TypeError) {
      passed += 1
      console.log(`ok ${total} - ${name}`)
    } else {
      fail(name, `threw ${error?.name ?? 'non-TypeError'}: ${error?.message}`)
    }
  }
}

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------
const root = mkdtempSync(join(tmpdir(), 'loom-board-'))
let seq = 0
const freshFile = () => join(root, `case-${(seq += 1)}`, 'rounds', '3', 'board.jsonl')
const lines = (file) => readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() !== '')

try {
  // -------------------------------------------------------------------------
  // 1. boardPath
  // -------------------------------------------------------------------------
  eq(
    boardPath(join(root, 'camp'), 3),
    join(root, 'camp', 'rounds', '3', 'board.jsonl'),
    'boardPath: builds <campaignDir>/rounds/<n>/board.jsonl',
  )
  throwsType(() => boardPath(join(root, 'camp'), 0), 'boardPath: roundN=0 throws TypeError')
  throwsType(() => boardPath(join(root, 'camp'), -1), 'boardPath: roundN=-1 throws TypeError')
  throwsType(() => boardPath(join(root, 'camp'), 'x'), "boardPath: roundN='x' throws TypeError")
  throwsType(() => boardPath(join(root, 'camp'), 1.5), 'boardPath: non-integer roundN throws TypeError')
  throwsType(() => boardPath(42, 1), 'boardPath: non-string campaignDir throws TypeError')

  // -------------------------------------------------------------------------
  // 2. appendNote writes one JSON line, creates dirs, returns numeric t
  // -------------------------------------------------------------------------
  {
    const file = freshFile()
    ok(!existsSync(dirname(file)), 'appendNote: parent dir does not exist beforehand')
    const result = appendNote(file, { attempt: 'a1', kind: 'obstacle', text: '  node 18 missing  ' })
    eq(result.ok, true, 'appendNote: returns ok')
    eq(result.note.text, 'node 18 missing', 'appendNote: stored text is trimmed')
    eq(result.note.attempt, 'a1', 'appendNote: note carries the attempt id')
    eq(result.note.kind, 'obstacle', 'appendNote: note carries the kind')
    ok(
      typeof result.note.t === 'number' && Number.isFinite(result.note.t),
      'appendNote: returned note has a numeric t',
    )
    ok(existsSync(dirname(file)), 'appendNote: auto-creates parent dirs')
    const raw = readFileSync(file, 'utf8')
    eq(lines(file).length, 1, 'appendNote: appends exactly one line')
    ok(raw.endsWith('\n'), 'appendNote: line is newline-terminated')
    const stored = JSON.parse(lines(file)[0])
    eq(stored.text, 'node 18 missing', 'appendNote: the written line parses back')
    eq(stored.t, result.note.t, 'appendNote: stored t equals the returned t')
  }

  // -------------------------------------------------------------------------
  // 3. rejections produce no line
  // -------------------------------------------------------------------------
  {
    const file = freshFile()
    const cases = [
      [{ attempt: 'a', kind: 'obstacle', text: '' }, 'empty'],
      [{ attempt: 'a', kind: 'obstacle', text: '   \n\t ' }, 'empty'],
      [{ attempt: 'a', kind: 'obstacle' }, 'empty'],
      [{ attempt: 'a', kind: 'obstacle', text: 'x'.repeat(401) }, 'too-long'],
      [{ attempt: 'a', kind: 'wat', text: 'hello' }, 'bad-kind'],
    ]
    for (const [note, reason] of cases) {
      const result = appendNote(file, note)
      eq(result.ok, false, `appendNote: rejects ${reason} (${JSON.stringify(note.text?.slice(0, 12))})`)
      eq(result.reason, reason, `appendNote: reason is '${reason}'`)
    }
    ok(!existsSync(file), 'appendNote: rejections do not create the file')

    const atCap = appendNote(file, { attempt: 'a', kind: 'finding', text: 'x'.repeat(400) })
    eq(atCap.ok, true, 'appendNote: exactly 400 chars is accepted')
    eq(lines(file).length, 1, 'appendNote: only the accepted note was written')
  }

  // -------------------------------------------------------------------------
  // 4. missing file
  // -------------------------------------------------------------------------
  deepEq(
    readNotes(join(root, 'no-such-dir', 'board.jsonl')),
    [],
    'readNotes: missing file returns []',
  )

  // -------------------------------------------------------------------------
  // 5. kinds filter + limit (newest n, oldest->newest)
  // -------------------------------------------------------------------------
  {
    const file = freshFile()
    const kinds = ['obstacle', 'finding', 'approach', 'finding', 'obstacle']
    kinds.forEach((kind, i) => {
      appendNote(file, { attempt: `a${i}`, kind, text: `note number ${i + 1}` })
    })
    const only = readNotes(file, { kinds: ['obstacle'] })
    eq(only.length, 2, 'readNotes: kinds filter keeps only matching kinds')
    ok(only.every((n) => n.kind === 'obstacle'), 'readNotes: filtered notes all have the requested kind')

    const limited = readNotes(file, { limit: 2 })
    eq(limited.length, 2, 'readNotes: limit caps the result length')
    eq(limited[0].text, 'note number 4', 'readNotes: limit takes the newest notes')
    eq(limited[1].text, 'note number 5', 'readNotes: limited notes stay oldest->newest')

    const file2 = freshFile()
    for (let i = 1; i <= 12; i += 1) {
      appendNote(file2, { attempt: 'a', kind: 'finding', text: `default ${i}` })
    }
    const dflt = readNotes(file2)
    eq(dflt.length, 10, 'readNotes: default limit is 10')
    eq(dflt[0].text, 'default 3', 'readNotes: default limit keeps the newest ten')
  }

  // -------------------------------------------------------------------------
  // 6. excludeAttempt
  // -------------------------------------------------------------------------
  {
    const file = freshFile()
    appendNote(file, { attempt: 'a1', kind: 'obstacle', text: 'from a1' })
    appendNote(file, { attempt: 'a2', kind: 'obstacle', text: 'from a2' })
    appendNote(file, { attempt: 'a1', kind: 'finding', text: 'also a1' })
    const notes = readNotes(file, { excludeAttempt: 'a1' })
    eq(notes.length, 1, 'readNotes: excludeAttempt drops the other attempt notes')
    eq(notes[0].attempt, 'a2', 'readNotes: only the kept attempt remains')
  }

  // -------------------------------------------------------------------------
  // 7. dedupe by kind + normalized text, newest survives
  // -------------------------------------------------------------------------
  {
    const file = freshFile()
    appendNote(file, { attempt: 'a1', kind: 'obstacle', text: 'Flaky   TEST fails' })
    appendNote(file, { attempt: 'a2', kind: 'finding', text: 'other finding' })
    const newest = appendNote(file, {
      attempt: 'a3',
      kind: 'obstacle',
      text: 'flaky test   FAILS ',
    }).note
    const notes = readNotes(file)
    eq(notes.length, 2, 'dedupe: same kind + normalized text collapses to one note')
    const collapsed = notes.find((n) => n.kind === 'obstacle')
    eq(collapsed.count, 2, 'dedupe: surviving note reports count>=2')
    eq(collapsed.attempt, 'a3', 'dedupe: the newest note survives')
    eq(collapsed.t, newest.t, 'dedupe: surviving t is the newest t')
    eq(notes[notes.length - 1].kind, 'obstacle', 'dedupe: survivor sits at the newest position')
    eq(normalizeText('  A \n\t B  '), 'a b', 'normalizeText: lowercases and collapses whitespace')
  }

  // -------------------------------------------------------------------------
  // 8. torn/corrupt lines are skipped
  // -------------------------------------------------------------------------
  {
    const file = freshFile()
    mkdirSync(dirname(file), { recursive: true })
    const good1 = JSON.stringify({ attempt: 'a', kind: 'obstacle', text: 'first', t: 1 })
    const good2 = JSON.stringify({ attempt: 'c', kind: 'finding', text: 'third', t: 3 })
    writeFileSync(
      file,
      `${good1}\n{"attempt":"b","kind":"find\nnot json at all\n\n${good2}\n`,
      'utf8',
    )
    let notes
    let threw = false
    try {
      notes = readNotes(file)
    } catch {
      threw = true
    }
    ok(!threw, 'readNotes: corrupt lines do not throw')
    eq(notes.length, 2, 'readNotes: only the valid lines are returned')
    deepEq(notes.map((n) => n.text), ['first', 'third'], 'readNotes: valid notes keep file order')
  }

  // -------------------------------------------------------------------------
  // 9. pruneNotes
  // -------------------------------------------------------------------------
  {
    const file = freshFile()
    for (let i = 1; i <= 10; i += 1) {
      appendNote(file, { attempt: 'a', kind: 'finding', text: `finding ${i}` })
    }
    const first = pruneNotes(file, { max: 3 })
    deepEq(first, { kept: 3, dropped: 7 }, 'pruneNotes: max=3 drops 7 of 10')
    const kept = readNotes(file, { limit: 100 })
    eq(kept.length, 3, 'pruneNotes: exactly max notes remain readable')
    eq(kept[0].text, 'finding 8', 'pruneNotes: the oldest surviving note is the 8th')
    eq(kept[2].text, 'finding 10', 'pruneNotes: the newest note survives')
    ok(lines(file).every((l) => !l.includes('"count"')), 'pruneNotes: stored lines carry no derived count')

    const mtime = statSync(file).mtimeMs
    const second = pruneNotes(file, { max: 3 })
    eq(second.dropped, 0, 'pruneNotes: a no-op prune drops nothing')
    eq(second.kept, 3, 'pruneNotes: a no-op prune keeps the same notes')
    eq(statSync(file).mtimeMs, mtime, 'pruneNotes: a no-op prune does not rewrite the file')
  }

  // -------------------------------------------------------------------------
  // 10. summarizeNotes
  // -------------------------------------------------------------------------
  {
    eq(summarizeNotes([]), '', 'summarizeNotes: empty array returns ""')
    eq(summarizeNotes(null), '', 'summarizeNotes: non-array returns ""')
    const text = summarizeNotes([
      { kind: 'obstacle', text: 'build breaks' },
      { kind: 'finding', text: 'cache is warm' },
    ])
    eq(text, '- [obstacle] build breaks\n- [finding] cache is warm', 'summarizeNotes: joined bullet lines')
    ok(text.includes('[obstacle]'), 'summarizeNotes: contains [obstacle]')

    const long = Array.from({ length: 40 }, (_, i) => ({
      kind: 'finding',
      text: `long finding number ${i} with trailing padding text`,
    }))
    const cut = summarizeNotes(long, { maxChars: 100 })
    ok(cut.length <= 100, 'summarizeNotes: respects maxChars')
    ok(cut.endsWith('…'), 'summarizeNotes: truncated output ends with an ellipsis')

    const whole = summarizeNotes([{ kind: 'finding', text: 'short' }], { maxChars: 100 })
    ok(!whole.endsWith('…'), 'summarizeNotes: untruncated output has no ellipsis')
  }
} catch (error) {
  ok(false, 'suite ran to completion without an unexpected throw', error?.stack ?? error)
} finally {
  rmSync(root, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
console.log('')
console.log(`${passed}/${total} passed`)
process.exitCode = failed === 0 ? 0 : 1
