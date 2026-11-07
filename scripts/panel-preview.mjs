// Render the sidebar panel to a static HTML file, so the design can be looked
// at without opening DeepSeek Harness.
//
// The panel is a React component, and this script does not run React: it
// replays the bundle's own factory with a four-function React shim, feeds the
// real component the state a loaded panel would hold, and serialises the
// resulting node tree. So what you see is the markup and stylesheet the app
// ships — not a mock-up that can drift away from it.
//
//   node scripts/panel-preview.mjs [out.html]
//
// The preview stacks the panel on a dark canvas and on a light one: the
// palette is `currentColor` at fixed opacities, and that claim is only worth
// anything if both canvases are shown.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

/** Load client/index.js exactly the way the browser loader does. */
function loadClient() {
  const source = readFileSync(join(root, 'client', 'index.js'), 'utf8')
  let captured = null
  const window = {
    __ModuleLoader__: {
      load({ id, factory }) {
        captured = { id, exports: factory(() => ({ createElement: () => null })) }
      },
    },
  }
  new Function('window', source)(window)
  if (!captured) throw new Error('the bundle did not register')
  return captured.exports
}

function shimReact(states, index = { at: 0 }) {
  const next = () => (index.at < states.length ? states[index.at++] : undefined)
  const react = {
    createElement(type, props, ...children) {
      return { type, props: props || {}, children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false) }
    },
    useState() {
      return [next(), () => {}]
    },
    useEffect() {},
    useCallback(fn) {
      return fn
    },
  }
  return react
}

function camelToCss(key) {
  return key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
}

function styleOf(style) {
  if (!style || typeof style !== 'object') return ''
  return Object.entries(style)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${camelToCss(k)}:${typeof v === 'number' && !/^(opacity|zIndex|flex|flexGrow|flexShrink|order|lineHeight|WebkitLineClamp|fontWeight)$/.test(k) ? v + 'px' : v}`)
    .join(';')
}

function escape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function html(node) {
  if (node === null || node === undefined || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return escape(node)
  if (Array.isArray(node)) return node.map(html).join('')
  const { type, props, children } = node
  // A component, not a tag: React would call it, so the preview must too. This
  // used to be the bug that made the preview emptier than the real panel — the
  // campaign body is rendered by a component, so serialising it as a <div>
  // measured a page with no campaigns on it.
  if (typeof type === 'function') {
    const kids = children.length === 0 ? undefined : children.length === 1 ? children[0] : children
    return html(type({ ...props, children: kids }))
  }
  const attrs = []
  if (props.className) attrs.push(`class="${escape(props.className)}"`)
  if (props.title) attrs.push(`title="${escape(props.title)}"`)
  if (props['data-depth']) attrs.push(`data-depth="${escape(props['data-depth'])}"`)
  if (props['data-last']) attrs.push(`data-last="${escape(props['data-last'])}"`)
  if (props.style) attrs.push(`style="${styleOf(props.style)}"`)
  if (props.disabled) attrs.push('disabled')
  const tag = type === 'code' ? 'code' : type === 'button' ? 'button' : type === 'span' ? 'span' : type === 'b' ? 'b' : 'div'
  return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>${html(children)}</${tag}>`
}

const now = Date.now()
const payload = {
  campaigns: [
    {
      id: 'loom-self15',
      status: 'running',
      rounds: 7,
      spendUsd: 0.41,
      open: 1,
      lessons: 6,
      quarantined: 1,
      ageMs: 42_000,
      objective:
        'make the loop survive a hostile host: dead child sessions, drifting ledgers, exhausted model budgets — without ever believing a round landed when it did not',
      chainVersion: 2,
      chain: {
        version: 2,
        nodes: [{ type: 'agent', name: 'worker' }, { type: 'map', name: 'candidates' }, { type: 'verifier', name: 'tests' }, { type: 'human' }],
      },
      incumbent: { score: 1 },
      holdout: 2,
      quality: { verdict: 'healthy', promotions: 5, rounds: 7, avgRoundMs: 96_000 },
      lessonsTop: [
        { id: 'l1', claim: 'a child that died mid-turn can still pass the verifier on an unchanged tree', kind: 'fact', score: 0.7 },
        { id: 'l2', claim: '`autopilot.applied` without a commit is not a landing', kind: 'hazard', score: 0.5 },
        { id: 'l3', claim: 'regenerate the brief at half length once the context blows', kind: 'recipe', score: 0.3 },
      ],
      openCheckpoints: [{ id: 'cp-9f21', kind: 'gate', payload: { verdict: 'improved', delta: 0.12 } }],
      reviews: [{ id: 'cp-9f21', kind: 'gate', risk: 'normal', summary: 'promote r7a2 (score 0.94, Δ0.12)' }],
      lastRound: {
        n: 7,
        status: 'promoted',
        promoted: true,
        score: 0.94,
        attempts: [
          { id: 'r7a1', score: 0.88, verifierOk: true },
          { id: 'r7a2', score: 0.94, verifierOk: true },
          { id: 'r7a3', score: null, verifierOk: false, screenedOut: true },
        ],
      },
    },
    {
      id: 'loom-chaos',
      status: 'paused',
      rounds: 6,
      spendUsd: 0.29,
      open: 0,
      lessons: 3,
      quarantined: 0,
      ageMs: 5_400_000,
      objective: 'the panel must degrade instead of 500 when a campaign cannot be read',
      chainVersion: 1,
      chain: { version: 1, nodes: [{ type: 'agent' }, { type: 'verifier' }, { type: 'human' }] },
      incumbent: { score: 1 },
      quality: { verdict: 'stalled', promotions: 2, rounds: 6, avgRoundMs: 143_000 },
      lessonsTop: [{ id: 'l4', claim: 'wrap every per-campaign read, not just the loop', kind: 'fact', score: 0.2 }],
      openCheckpoints: [],
      reviews: [],
      lastRound: { attempts: [{ id: 'r6a1', score: 1, verifierOk: true }] },
    },
    {
      id: 'loom-self3',
      status: 'done',
      rounds: 11,
      spendUsd: 0.66,
      open: 0,
      lessons: 9,
      quarantined: 2,
      ageMs: 86_400_000,
      objective: 'cost per round, a round table, a policy diff and lesson exposure',
      chainVersion: 1,
      incumbent: { score: 1 },
      quality: { verdict: 'healthy', promotions: 4, rounds: 11 },
      lessonsTop: [
        { id: 'l5', claim: 'holdout tasks must rotate, or exposure becomes the lesson', kind: 'fact', score: 0.4 },
        { id: 'l6', claim: 'a verifier that always fails is a gate nobody can reach', kind: 'hazard', score: 0.35 },
        { id: 'l7', claim: 'raise one checkpoint per stuck signature, not one per round', kind: 'recipe', score: 0.1 },
      ],
      openCheckpoints: [],
      reviews: [],
    },
  ],
  live: [{ attemptId: 'r8a1', campaign: 'loom-self15', idleMs: 31_000 }],
  rsi: { enabled: true, at: now - 60_000, by: 'human' },
  ownership: { owner: 8123, mine: true },
  lean: { available: true },
  now,
}

const pendingPayload = {
  ...payload,
  campaigns: [
    {
      ...payload.campaigns[0],
      openCheckpoints: [
        { id: 'cp-9f21', kind: 'gate', payload: { verdict: 'improved', delta: 0.12 } },
        { id: 'cp-a01c', kind: 'stuck', payload: {} },
        { id: 'cp-b77e', kind: 'holdout', payload: { verdict: 'regressed' } },
      ],
      reviews: [
        { id: 'cp-9f21', kind: 'gate', risk: 'normal', summary: 'promote r7a2 (score 0.94, Δ0.12)' },
        { id: 'cp-a01c', kind: 'stuck', risk: 'high', summary: 'same verifier signature for 3 rounds — the gate cannot be reached' },
        { id: 'cp-b77e', kind: 'holdout', risk: 'normal', summary: 'holdout regressed by 0.04' },
      ],
      open: 3,
    },
    payload.campaigns[1],
    payload.campaigns[2],
  ],
}

const client = loadClient()
const { Panel, Card, CSS } = client.__panel
const react = shimReact([{ loading: false, data: pendingPayload, error: null, busy: null }, {}, null])
const CardView = Card(react)
const PanelView = Panel(react, CardView)
const tree = PanelView()
const panelHtml = html(tree)

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>dsh-loom sidebar panel — preview</title>
<style>
  html,body{margin:0;padding:0;background:#101113;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .wrap{display:flex;gap:0;align-items:stretch;min-height:100vh}
  .canvas{flex:1 1 0;min-width:0;display:flex;flex-direction:column}
  .label{font:10px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;padding:10px 12px;color:#6b7078}
  .slot{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden}
  .dark{background:#08090a;color:#f7f8f8}
  .light{background:#ffffff;color:#08090a;border-left:1px solid #e5e7eb}
  /* the component pins this at mount from the host theme's computed colour;
     a static page has to state it, and these are the same two inks */
  .dark .loom{--loom-ink-base:#f7f8f8}
  .light .loom{--loom-ink-base:#08090a}
  .dark .label{color:#62666d}
  .light .label{color:#8a8f98}
${CSS}
</style>
</head>
<body>
<div class="wrap">
  <div class="canvas dark"><div class="label">dark · #08090a</div><div class="slot">${panelHtml}</div></div>
  <div class="canvas light"><div class="label">light · #ffffff</div><div class="slot">${panelHtml}</div></div>
</div>
</body>
</html>
`

const out = process.argv[2] ? process.argv[2] : join(root, 'docs', 'panel-preview.html')
writeFileSync(out, page)
console.log('wrote ' + out + ' (' + page.length + ' bytes)')
console.log('campaigns: ' + payload.campaigns.length + ' · pending: ' + client.__panel.pending(pendingPayload).length)
