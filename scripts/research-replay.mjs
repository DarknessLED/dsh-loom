#!/usr/bin/env node
/**
 * Re-check a sealed research report.
 *
 * A seal is only worth something if someone who was not there can re-derive it.
 * This script reads the manifest, recomputes the report hash, re-hashes every
 * evidence blob that backed a claim, and prints the claim/verdict table — so a
 * reader can see both "the bytes are the bytes" and "which sentences rested on
 * a literal that was actually found".
 *
 * Usage:
 *   node scripts/research-replay.mjs                 # every sealed report
 *   node scripts/research-replay.mjs <topic-or-dir>  # one report (prefix match)
 *   node scripts/research-replay.mjs --json          # machine-readable
 *   node scripts/research-replay.mjs --home <dir>    # a loom home other than ~/.dsh/loom
 *
 * Exit codes: 0 all seals ok, 1 at least one seal failed, 2 nothing found.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { verifySeal, readEvidence } from '../src/research/ledger.js'

const DEFAULT_HOME = path.join(os.homedir(), '.dsh', 'loom')

function optionValue(args, name) {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : null
}

function listReports(reportsDir) {
  let entries = []
  try {
    entries = fs.readdirSync(reportsDir, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
}

function matches(dir, wanted) {
  if (!wanted) return true
  return dir === wanted || dir.startsWith(wanted)
}

function replayOne(home, dir) {
  const full = path.join(home, 'research', 'ledger', 'reports', dir)
  const seal = verifySeal(full)
  let manifest = null
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(full, 'manifest.json'), 'utf8'))
  } catch {
    manifest = null
  }

  const evidence = []
  for (const item of Array.isArray(manifest?.evidence) ? manifest.evidence : []) {
    const live = item?.id ? readEvidence(home, item.id) : null
    evidence.push({
      id: item?.id ?? null,
      origin: item?.origin ?? null,
      bytes: item?.bytes ?? null,
      recordedHash: item?.hash ?? null,
      present: Boolean(live) && Boolean(live?.content),
      // `readEvidence` sets `tampered: true` only when the bytes no longer hash
      // to the recorded digest; absence of the field is the intact case.
      tampered: !live || live.missing === true || live.tampered === true,
    })
  }

  const claims = (Array.isArray(manifest?.claims) ? manifest.claims : []).map((c) => ({
    id: c?.id ?? null,
    status: c?.status ?? 'unknown',
    text: c?.text ?? '',
    note: c?.note ?? null,
  }))

  const verified = claims.filter((c) => c.status === 'verified').length
  return {
    dir,
    ok: seal.ok === true,
    seal: seal.ok ? seal.seal : null,
    reason: seal.ok ? null : seal.reason ?? null,
    claims,
    verified,
    evidence,
    evidenceTampered: evidence.filter((e) => e.tampered).map((e) => e.id),
  }
}

function render(result) {
  const lines = []
  const head = `${result.ok ? 'ok  ' : 'FAIL'} ${result.dir}`
  lines.push(head)
  if (result.seal) lines.push(`     seal: ${result.seal}`)
  if (!result.ok) lines.push(`     seal: ${result.reason}`)
  lines.push(`     claims: ${result.verified}/${result.claims.length} verified`)
  for (const c of result.claims) {
    lines.push(`       [${c.status}] ${clip(c.text, 96)}`)
    if (c.note) lines.push(`                ${clip(c.note, 96)}`)
  }
  if (result.evidence.length) {
    lines.push(`     evidence: ${result.evidence.length} blob(s), ${result.evidenceTampered.length} tampered`)
    for (const e of result.evidence) {
      lines.push(`       ${e.tampered ? 'TAMPERED' : 'intact  '} ${e.id} ${e.bytes ?? '?'}B ${e.origin ?? ''}`)
    }
  }
  return lines
}

function clip(text, max) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim()
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

function main(argv) {
  const args = argv.slice(2)
  const json = args.includes('--json')
  const home = optionValue(args, '--home') ?? DEFAULT_HOME
  const skip = new Set(['--json', '--home', optionValue(args, '--home')].filter(Boolean))
  const wanted = args.find((a) => !a.startsWith('--') && !skip.has(a)) ?? null
  const reportsDir = path.join(home, 'research', 'ledger', 'reports')

  const dirs = listReports(reportsDir).filter((d) => matches(d, wanted))
  if (!dirs.length) {
    process.stderr.write(`no sealed report matches ${wanted ? `"${wanted}"` : '(anything)'} under ${reportsDir}\n`)
    return 2
  }

  const results = dirs.map((d) => replayOne(home, d))
  if (json) {
    process.stdout.write(`${JSON.stringify(results, null, 1)}\n`)
  } else {
    for (const r of results) {
      for (const line of render(r)) process.stdout.write(`${line}\n`)
      process.stdout.write('\n')
    }
    const bad = results.filter((r) => !r.ok)
    process.stdout.write(`${results.length - bad.length}/${results.length} seal(s) ok\n`)
  }
  return results.some((r) => !r.ok) ? 1 : 0
}

process.exitCode = main(process.argv)
