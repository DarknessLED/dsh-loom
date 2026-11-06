import { appendJsonl, readJsonl } from './atomic.js'

/**
 * Append-only event log. The log is the source of truth; every derived view
 * (state.json, scores.json …) must be reproducible by `rebuild()`.
 */
export class Ledger {
  constructor(file) {
    this.file = file
    this.events = readJsonl(file)
    this.seq = this.events.length ? this.events[this.events.length - 1].seq : 0
  }

  append(type, data = {}, actor = 'system') {
    const event = { seq: this.seq + 1, t: Date.now(), type, actor, data }
    appendJsonl(this.file, event)
    this.events.push(event)
    this.seq = event.seq
    return event
  }

  all() {
    return this.events.slice()
  }

  since(seq) {
    return this.events.filter((e) => e.seq > seq)
  }
}
