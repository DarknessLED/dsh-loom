// Wave 23 / p6: the route that was never reached.
//
// Every acceptance of the panel has been by spec and by the generated preview,
// because `curl http://127.0.0.1:<port>/dsh-loom/state` has never once returned
// a body -- the port moves with the host, and nothing ever asserted the handler
// itself. A route is a contract: a path, a method, a status, a body.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { panelRoute, routeState } from '../../src/panel/route.js'

const runtime = {
  panelState: () => ({ campaigns: [{ id: 'a', status: 'running' }], rsi: { enabled: true } }),
}

test('the route names one exact path', () => {
  const route = panelRoute(runtime)
  assert.equal(route.path, '/dsh-loom/state')
  assert.equal(route.kind, 'exact')
  assert.equal(typeof route.handler, 'function')
})

test('GET returns the panel payload as JSON with a status', async () => {
  const route = panelRoute(runtime)
  const out = await route.handler({ method: 'GET', url: '/dsh-loom/state' })
  assert.equal(out.status, 200)
  assert.equal(out.headers['content-type'].includes('application/json'), true)
  const body = JSON.parse(out.body)
  assert.equal(body.campaigns[0].id, 'a')
})

test('a different path is a 404, not the payload', () => {
  const out = routeState(runtime, { method: 'GET', url: '/dsh-loom/nope' })
  assert.equal(out.status, 404)
})

test('a write method is refused instead of silently reading', () => {
  const out = routeState(runtime, { method: 'POST', url: '/dsh-loom/state' })
  assert.equal(out.status, 405)
})

test('a runtime that throws is a 500 with the message, not a dead route', () => {
  const broken = { panelState: () => { throw new Error('boom') } }
  const out = routeState(broken, { method: 'GET', url: '/dsh-loom/state' })
  assert.equal(out.status, 500)
  assert.match(out.body, /boom/)
})
