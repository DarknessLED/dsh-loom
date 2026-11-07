// Adversarial: the sidebar is the only thing a person sees. One unreadable
// campaign, a throwing live-attempt read, or a dead ownership probe must degrade
// the row — never the whole panel. A 500 here looks exactly like "the plugin is
// broken", which is the one thing an operator cannot debug from the UI.
import assert from 'node:assert/strict'
import { panelState } from '../../src/panel/api.js'
import { ok, done } from '../chaos/fixture.mjs'

const good = {
  state: {
    id: 'good',
    status: 'running',
    rounds: [],
    lessons: [],
    checkpoints: [],
    budget: { spentUsd: 0 },
  },
}

const runtime = {
  listCampaigns: () => ['good', 'broken'],
  get(id) {
    if (id === 'broken') throw new Error('events.jsonl is not readable')
    return good
  },
  liveAttempts() {
    throw new Error('watchdog table is gone')
  },
  ownership() {
    throw new Error('lock is unreadable')
  },
  leanProbe() {
    throw new Error('lean probe exploded')
  },
}

const state = panelState({ runtime })

assert.equal(state.campaigns.length, 2, 'both campaigns are still listed')
assert.equal(state.campaigns[0].id, 'good')
assert.equal(state.campaigns[0].status, 'running', 'the healthy campaign is unaffected')
assert.equal(state.campaigns[1].id, 'broken')
assert.equal(typeof state.campaigns[1].error, 'string', 'the broken campaign carries its error')
done(1, 'a broken campaign degrades to a row, not a 500')

assert.deepEqual(state.live, [], 'a throwing live-attempt read degrades to an empty list')
done(2, 'live attempts degrade to empty')

assert.equal(state.ownership.mine, true, 'an unreadable lock does not disable the panel')
assert.equal(state.lean, null, 'an exploding lean probe degrades to null')
done(3, 'ownership and lean degrade without throwing')

// The caller asked for a specific campaign: a broken one must still answer with
// its error, never by silently dropping the row.
const onlyBroken = { ...runtime, listCampaigns: () => ['broken'] }
const broken = panelState({ runtime: onlyBroken })
assert.equal(broken.campaigns.length, 1)
assert.equal(broken.campaigns[0].id, 'broken')
assert.equal(typeof broken.campaigns[0].error, 'string')
done(4, 'a lone broken campaign is reported, not hidden')

done()
