// Is the child working, or is it waiting for its own command?
//
// The watchdog measures liveness on the session's event watermark, which is
// right for "the agent stopped working" and blind to "the agent is blocked on
// the one tool call it made". A foreground `ops_bash` that runs for six minutes
// appends `tool/call` and then nothing until the command returns, so the
// watermark sits still while the child is perfectly healthy.
//
// fin-oneyear1 (2026-11-20) paid for that blind spot five times: every attempt
// died at idleMs ≈ 304 s against a 300 s window while its `job/registered`
// ("Scan futures gates", "Run ETF parameter grid search", …) was still running.
// The abort then labelled the attempt `stalled`, which made the round skip the
// verifier entirely and throw away a real patch.
//
// This module answers the missing half of the question from the session tail
// alone: is there an open tool call (or an unsettled job) at the end of the log?
// It is deliberately narrow — it reads state events, not prose — so the cost is
// a handful of objects per tick and the answer cannot be argued with.

// How far back to look when the tail holds nothing but chatter (stream chunks,
// assistant messages). Bounded because the tick must stay cheap.
const MAX_SCAN = 60

const DECISIVE = new Set([
  'tool/call',
  'tool/result',
  'job/registered',
  'job/settled',
  'step/start',
  'step/end',
  'turn/start',
  'turn/end',
])

/**
 * What is the child doing at the end of its log?
 *
 * @param {ReadonlyArray<{type?: string, seq?: number, data?: object}|null>|null} events session events
 * @returns {{waiting: boolean, tool?: string|null, callId?: string|null, jobId?: string|null, sinceSeq?: number|null}}
 */
export function tailActivity(events) {
  if (!Array.isArray(events) || events.length === 0) return { waiting: false }
  const from = Math.max(0, events.length - MAX_SCAN)
  for (let i = events.length - 1; i >= from; i -= 1) {
    const event = events[i]
    const type = event?.type
    if (typeof type !== 'string' || !DECISIVE.has(type)) continue
    const data = event?.data && typeof event.data === 'object' ? event.data : {}
    const seq = Number.isFinite(Number(event?.seq)) ? Number(event.seq) : null
    if (type === 'tool/call') {
      // Open until a result, a step end or a turn end appears after it — and
      // those would have been found first walking backwards, so reaching this
      // line already means nothing closed it.
      return {
        waiting: true,
        tool: typeof data.name === 'string' ? data.name : null,
        callId: typeof data.callId === 'string' ? data.callId : null,
        jobId: null,
        sinceSeq: seq,
      }
    }
    if (type === 'job/registered') {
      // A registered job means a command is running. The tool that launched it
      // is a little further back (tool/call → job/registered → … → settled),
      // so name it when it is in reach: the operator reading "waiting on
      // `ops_bash` (bash-77fd…)" can tell a sweep from a stuck shell.
      let tool = null
      let callId = null
      let sinceSeq = seq
      for (let j = i - 1; j >= 0 && j >= i - MAX_SCAN; j -= 1) {
        const prev = events[j]
        if (prev?.type !== 'tool/call') continue
        const pd = prev?.data && typeof prev.data === 'object' ? prev.data : {}
        tool = typeof pd.name === 'string' ? pd.name : null
        callId = typeof pd.callId === 'string' ? pd.callId : null
        sinceSeq = Number.isFinite(Number(prev?.seq)) ? Number(prev.seq) : seq
        break
      }
      return {
        waiting: true,
        tool,
        callId,
        jobId: typeof data.jobId === 'string' ? data.jobId : null,
        sinceSeq,
      }
    }
    // A result, a settled job, or the end of a step/turn all mean the child is
    // free to append again: the idle clock is the honest signal from here on.
    return { waiting: false }
  }
  // Nothing decisive in the tail (pure prose): fall back to the watermark.
  return { waiting: false }
}
