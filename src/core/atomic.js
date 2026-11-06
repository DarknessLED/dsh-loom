import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

/** Atomic replace: write temp file, then rename over the target. */
export function writeJsonAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(tmp, JSON.stringify(value, null, 2))
  renameSync(tmp, path)
}

export function appendJsonl(path, obj) {
  mkdirSync(dirname(path), { recursive: true })
  appendFileSync(path, `${JSON.stringify(obj)}\n`)
}

/** Parse JSONL defensively: a torn last line is skipped, not fatal. */
export function readJsonl(path) {
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return []
  }
  const out = []
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t) continue
    try {
      out.push(JSON.parse(t))
    } catch {
      /* skip torn line */
    }
  }
  return out
}

/** Strip values JSON cannot carry losslessly (tool results must be lossless). */
export function lossless(value) {
  if (value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) && !Object.is(value, -0) ? value : null
  if (typeof value === 'bigint') return String(value)
  if (typeof value === 'function' || typeof value === 'symbol') return null
  if (Array.isArray(value)) return value.map(lossless)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = lossless(v)
    return out
  }
  return value
}
