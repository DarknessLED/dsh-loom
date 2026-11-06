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
    this.events = readJsonl(file)
    this.seq = maxSeq(this.events)
    this.size = sizeOf(file)
  }

  /** Re-read the file when another writer appended to it. */
  #sync() {
    const size = sizeOf(this.file)
    if (size === this.size) return
    this.events = readJsonl(this.file)
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

function sizeOf(file) {
  try {
    return statSync(file).size
  } catch {
    return -1
  }
}
