#!/usr/bin/env node
// Check one research note: `node scripts/check-note.mjs <note.json>`
//
// Exit 0 when the note is well formed, 1 when it is not, 2 when it cannot be
// read at all. A session that gathered sources writes the note first and runs
// this before it believes its own summary — the same discipline the loop applies
// to a patch (write, verify, then claim).

import { readFileSync } from 'node:fs'
import { gradeNote, renderNote } from '../src/research/note.js'

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('-'))
const asJson = args.includes('--json')

if (!file) {
  console.error('usage: check-note.mjs <note.json> [--json]')
  process.exit(2)
}

let note
try {
  note = JSON.parse(readFileSync(file, 'utf8'))
} catch (err) {
  console.error(`could not read ${file}: ${err?.message ?? err}`)
  process.exit(2)
}

const result = gradeNote(note)
if (asJson) {
  console.log(JSON.stringify(result, null, 2))
} else {
  for (const line of renderNote(result)) console.log(line)
}
process.exit(result.ok ? 0 : 1)
