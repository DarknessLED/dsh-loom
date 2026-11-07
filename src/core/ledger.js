import { statSync } from 'node:fs'
import { appendJsonl, readJsonl } from './atomic.js'

/**
 * Append-only event log. The log is the source of truth; every derived view
 * (state.json, scores.json …) must be reproducible by `rebuild()`.
 *
 * Two writers can touch the same file: a hot-reloaded plugin instance shares
 * it with an instance that is still finishing an in-flight round. Sequence
 * numbers must therefore be allocated from the file, not from memory, or the
 * ledger ends up with duplicate seq values and a round can appear twice.
 */
export class Ledger {
  constructor(file) {
    this.file = file
    this.events = normalize(readJsonl(file))
    this.seq = maxSeq(this.events)
    this.size = sizeOf(file)
  }

  /** Re-read the file when another writer appended to it. */
  #sync() {
    const size = sizeOf(this.file)
    if (size === this.size) return
    this.events = normalize(readJsonl(this.file))
    this.size = size
    this.seq = maxSeq(this.events)
  }

  append(type, data = {}, actor = 'system') {
    this.#sync()
    const event = { seq: this.seq + 1, t: Date.now(), type, actor, data }
    appendJsonl(this.file, event)
    this.size = sizeOf(this.file)
    this.events.push(event)
    this.seq = event.seq
    return event
  }

  all() {
    this.#sync()
    return this.events.slice()
  }

  since(seq) {
    return this.all().filter((e) => e.seq > seq)
  }
}

function maxSeq(events) {
  return events.reduce((max, e) => (Number.isFinite(e?.seq) && e.seq > max ? e.seq : max), 0)
}

/**
 * The log survives things the writer did not plan for: a torn line from a killed
 * process, an out-of-order append from a second instance, and — from older
 * releases — the same seq written twice. Replaying a duplicate `round.started`
 * would fold a round twice and quietly corrupt every derived number, so the read
 * path normalises: finite seq only, ordered by seq, first writer of a seq wins.
 */
export function normalize(events) {
  const seen = new Set()
  const out = []
  for (const ev of events) {
    if (!ev || !Number.isFinite(ev.seq)) continue
    if (seen.has(ev.seq)) continue
    seen.add(ev.seq)
    out.push(ev)
  }
  out.sort((a, b) => a.seq - b.seq)
  return out
}

function sizeOf(file) {
  try {
    return statSync(file).size
  } catch {
    return -1
  }
}
