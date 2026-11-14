/**
 * The panel's route contract, separated from the payload it serves.
 *
 * The acceptance of this route was always by spec and by a generated preview,
 * never by a request: the handler lived inline in `registerPanel`, so nothing
 * could assert a status code without a live host and a port that moves. A route
 * is a contract -- one path, one method, a status, a body -- so the decision is
 * a pure function over `(runtime, req)` and the registration is a thin adapter
 * over that decision.
 *
 * `routeState` is deliberately strict: a non-GET method is refused before the
 * runtime is touched (a refused write must not be able to read state as a side
 * effect), an unknown path is a 404 rather than the payload, and a runtime that
 * throws is a 500 carrying the message instead of a dead route.
 */

/** The one path this route owns. */
export const PANEL_PATH = '/dsh-loom/state'

function requestPath(req) {
  const raw = typeof req?.url === 'string' ? req.url : ''
  // The host matched this exact path before calling a registered handler, so a
  // caller that hands the handler only a method (the specs do) still means this
  // route. Anything with an explicit path must name this one exactly.
  if (!raw) return PANEL_PATH
  const cut = raw.indexOf('?')
  return cut === -1 ? raw : raw.slice(0, cut)
}

function reply(status, body, headers = {}) {
  return {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
    body: JSON.stringify(body),
  }
}

/**
 * Decide the response to one request without writing to it.
 *
 * This is the route the host serves: `panelRoute` wraps this same function, and
 * `src/index.js` registers it, so the spec and the browser exercise one path.
 */
export function routeState(runtime, req) {
  if (String(req?.method ?? '').toUpperCase() !== 'GET') {
    // Refused before any read: a method this route does not serve must not be
    // able to observe campaign state, not even to build an error body.
    return reply(405, { error: 'method not allowed' }, { allow: 'GET' })
  }
  if (requestPath(req) !== PANEL_PATH) return reply(404, { error: 'not found' })
  try {
    return reply(200, runtime.panelState())
  } catch (err) {
    return reply(500, { error: String(err?.message ?? err) })
  }
}

/**
 * Write a decided response onto a host response, when there is one.
 *
 * The handler is both callable as `handler(req)` (returns the decision, which
 * is what the spec asserts) and as `handler(req, res)` (the host's shape). One
 * function serves both so a test cannot pass against code the host never runs.
 */
function sendDecision(res, decision) {
  if (res && typeof res.writeHead === 'function') {
    res.writeHead(decision.status, decision.headers)
    if (typeof res.end === 'function') res.end(decision.body)
  }
  return decision
}

/**
 * The registered route.
 *
 * `options.write` is the panel's action door: when supplied, a non-GET request
 * on this exact path is handed to it instead of being refused, which is what
 * keeps the browser's buttons working. Omitted (the spec's `panelRoute(runtime)`)
 * the route is read-only and every non-GET method is a 405.
 */
export function panelRoute(runtime, options = {}) {
  const write = typeof options.write === 'function' ? options.write : null
  return {
    name: 'dsh-loom-panel',
    kind: 'exact',
    path: PANEL_PATH,
    handler: async (req, res) => {
      const method = String(req?.method ?? '').toUpperCase()
      let decision
      if (write && method !== 'GET' && requestPath(req) === PANEL_PATH) {
        decision = await write(req)
      } else {
        decision = routeState(runtime, req)
      }
      return sendDecision(res, decision)
    },
  }
}
