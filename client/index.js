// Browser half of dsh-loom: a campaign dashboard in the sidebar's panel list.
//
// Hand-written in the lazy-CJS bundle protocol (`window.__ModuleLoader__.load`
// with a factory returning cordis-plugin exports), so there is no build step
// and no import from a dsh client package: the same zero-dependency stance as
// the host half. It reads and writes one JSON route, `/dsh-loom/state`, which
// owns `~/.dsh/loom`: the browser never touches campaign files.
//
// Visual system: grounded in the Linear pack from OpenDesign (opendesign.cc,
// spec CC BY 4.0) — the dashboard idiom real developer tools ship. What that
// means here, concretely:
//
//   · monochrome. `color-mix(in srgb, currentColor N%, transparent)` is the
//     whole palette, so the panel is ink-on-canvas in a light *and* a dark
//     theme without a theme switch of its own. Colour appears only as 6px
//     state dots, mid-tone enough to read on #08090A and on white.
//   · hairline structure instead of cards: 1px dividers at 10% ink, no
//     shadows, no gradients, radius 4/6px, never 12.
//   · mono for anything an engineer scans by shape — ids, scores, spend,
//     chain paths — with tabular figures, and the body face for prose.
//   · one 4px spacing rhythm, labels at 10px/uppercase/.08em.
//   · motion 150ms cubic-bezier(.25,.46,.45,.94): hover shifts, no springs.
//   · voice: direct, lower-case button labels, no exclamation marks, no emoji.
window.__ModuleLoader__.load({
  id: 'dsh-loom',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var PANEL_KEY = 'dsh-loom'
    var ROUTE = '/dsh-loom/state'
    var POLL_MS = 5000
    var STYLE_ID = 'dsh-loom-style'
    var COLLAPSE_KEY = 'dsh-loom-collapsed'

    // The reference's tokens, expressed as one stylesheet rather than inline
    // objects: hover, focus and transition states are half of a design system
    // and inline styles cannot express them.
    var CSS = [
      '.loom{',
      ' --loom-ink:currentColor;',
      // tint everything against an OPAQUE ink base. Mixing against currentColor
      // looks identical until you nest: `.sec-head .n` inherits the head's
      // half-transparent colour and mixes again, so the alphas multiply
      // (0.58 × 0.5 → 0.29) and 9.5px text lands at 1.8:1. The base is written
      // inline at mount from the panel's computed colour, so it is one flat
      // value everywhere and the alphas simply add up to what they say.
      ' --loom-base:var(--loom-ink-base,currentColor);',
      ' --loom-soft:rgba(127,127,127,1);--loom-soft:color-mix(in srgb,var(--loom-base) 78%,transparent);',
      ' --loom-quiet:rgba(127,127,127,.8);--loom-quiet:color-mix(in srgb,var(--loom-base) 68%,transparent);',
      ' --loom-faint:rgba(127,127,127,.6);--loom-faint:color-mix(in srgb,var(--loom-base) 50%,transparent);',
      ' --loom-line:rgba(127,127,127,.18);--loom-line:color-mix(in srgb,var(--loom-base) 11%,transparent);',
      ' --loom-line2:rgba(127,127,127,.3);--loom-line2:color-mix(in srgb,var(--loom-base) 20%,transparent);',
      ' --loom-wash:rgba(127,127,127,.06);--loom-wash:color-mix(in srgb,var(--loom-base) 4%,transparent);',
      ' --loom-hover:rgba(127,127,127,.1);--loom-hover:color-mix(in srgb,var(--loom-base) 7%,transparent);',
      // accents sit at the point where they clear 4.2:1 on BOTH canvases — a
      // single value per hue, so the panel needs no theme switch of its own.
      ' --loom-ok:#3d8a58;--loom-warn:#8f7a33;--loom-bad:#c05a4a;--loom-idle:#7a7f87;',
      ' --loom-mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;',
      ' --loom-ease:cubic-bezier(.25,.46,.45,.94);',
      ' display:flex;flex-direction:column;height:100%;min-height:0;min-width:0;font-size:13px;line-height:1.45;',
      ' color:var(--loom-ink);-webkit-font-smoothing:antialiased;overflow-x:hidden;',
      '}',
      '.loom *{box-sizing:border-box}',
      '.loom code,.loom .m{font-family:var(--loom-mono);font-variant-numeric:tabular-nums}',
      // every flex row in a 320px sidebar needs its wandering child to be
      // allowed to shrink: `min-width:auto` is what turns an ellipsis into a
      // horizontal scrollbar.
      '.loom-titlerow,.loom-obj,.loom-meta,.loom-chain,.loom-ev,.loom-cp-head{min-width:0}',
      // header
      '.loom-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--loom-line)}',
      '.loom-mark{font-family:var(--loom-mono);font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}',
      '.loom-spacer{flex:1 1 auto;min-width:4px}',
      '.loom-btn{appearance:none;background:transparent;border:1px solid var(--loom-line);color:var(--loom-soft);',
      ' font-family:inherit;font-size:11px;font-weight:400;line-height:1;padding:4px 7px;border-radius:4px;cursor:pointer;',
      ' transition:background 150ms var(--loom-ease),color 150ms var(--loom-ease),border-color 150ms var(--loom-ease);white-space:nowrap}',
      '.loom-btn:hover{background:var(--loom-hover);color:var(--loom-ink);border-color:var(--loom-line2)}',
      '.loom-btn:active{transform:translateY(.5px)}',
      '.loom-btn:focus-visible{outline:1px solid var(--loom-soft);outline-offset:1px}',
      '.loom-btn[disabled]{opacity:.38;cursor:default;transform:none}',
      '.loom-btn.bare{border-color:transparent;padding:4px 5px}',
      '.loom-btn.bare:hover{background:var(--loom-hover);border-color:transparent}',
      '.loom-btn.danger:hover{color:var(--loom-bad);border-color:color-mix(in srgb,var(--loom-bad) 45%,transparent)}',
      // the loop switch: a dot and two words, not a traffic light
      '.loom-switch{display:inline-flex;align-items:center;gap:6px;background:transparent;border:0;padding:4px 2px;',
      ' font-family:var(--loom-mono);font-size:11px;letter-spacing:.02em;color:var(--loom-soft);cursor:pointer;',
      ' transition:color 150ms var(--loom-ease)}',
      '.loom-switch:hover{color:var(--loom-ink)}',
      '.loom-switch:focus-visible{outline:1px solid var(--loom-soft);outline-offset:2px}',
      '.loom-dot{display:inline-block;width:6px;height:6px;border-radius:999px;background:currentColor;flex:0 0 auto}',
      '.loom-dot.on{color:var(--loom-ok);box-shadow:0 0 0 3px color-mix(in srgb,var(--loom-ok) 14%,transparent)}',
      '.loom-dot.off{color:var(--loom-warn);box-shadow:0 0 0 3px color-mix(in srgb,var(--loom-warn) 14%,transparent)}',
      // metrics: a ruled strip, values in mono
      '.loom-metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));border-bottom:1px solid var(--loom-line)}',
      '.loom-metric{padding:7px 8px 8px;border-right:1px solid var(--loom-line);min-width:0}',
      '.loom-metric:last-child{border-right:0}',
      '.loom-metric b{display:block;font-family:var(--loom-mono);font-size:13px;font-weight:500;line-height:1.1;',
      ' white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loom-metric span{display:block;margin-top:2px;font-size:9px;line-height:1;letter-spacing:.08em;',
      ' text-transform:uppercase;color:var(--loom-quiet);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loom-metric.hot b{color:var(--loom-warn)}',
      // sections
      '.loom-sec{border-bottom:1px solid var(--loom-line)}',
      '.loom-sec:last-child{border-bottom:0}',
      '.loom-sec-head{display:flex;align-items:center;gap:6px;padding:9px 12px 5px;',
      ' font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--loom-quiet)}',
      '.loom-sec-head .n{margin-left:auto;font-family:var(--loom-mono);letter-spacing:0;color:var(--loom-quiet)}',
      // rows
      '.loom-row{display:flex;align-items:center;gap:8px;padding:6px 12px;border-top:1px solid var(--loom-line);',
      ' transition:background 150ms var(--loom-ease)}',
      '.loom-row:hover{background:var(--loom-hover)}',
      '.loom-row .txt{flex:1 1 auto;min-width:0;font-size:11.5px;color:var(--loom-soft);',
      ' overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.loom-row .txt b{font-weight:500;color:var(--loom-ink)}',
      // campaign block
      '.loom-camp{padding:10px 12px 11px;border-top:1px solid var(--loom-line)}',
      '.loom-camp:first-of-type{border-top:0}',
      '.loom-camp:hover{background:color-mix(in srgb,var(--loom-base) 2.5%,transparent)}',
      '.loom-titlerow{display:flex;align-items:baseline;gap:7px}',
      '.loom-name{font-size:13px;font-weight:500;line-height:1.2;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loom-state{font-family:var(--loom-mono);font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:var(--loom-quiet)}',
      '.loom-age{margin-left:auto;font-family:var(--loom-mono);font-size:10px;color:var(--loom-faint);white-space:nowrap}',
      '.loom-obj{margin-top:4px;font-size:11.5px;line-height:1.45;color:var(--loom-soft);',
      ' display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.loom-meta{margin-top:5px;font-family:var(--loom-mono);font-size:10px;letter-spacing:.01em;color:var(--loom-faint);',
      ' white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loom-chain{margin-top:3px;font-family:var(--loom-mono);font-size:10px;color:var(--loom-quiet);',
      ' white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loom-ev{margin-top:4px;display:flex;align-items:center;gap:6px;font-family:var(--loom-mono);font-size:10px;color:var(--loom-quiet)}',
      '.loom-chips{margin-top:6px;display:flex;flex-wrap:wrap;gap:4px}',
      '.loom-chip{font-family:var(--loom-mono);font-size:10px;line-height:1;padding:3px 5px;border-radius:4px;',
      ' background:var(--loom-wash);border:1px solid transparent;color:var(--loom-soft);white-space:nowrap}',
      '.loom-chip.ok{color:var(--loom-ok);border-color:color-mix(in srgb,var(--loom-ok) 32%,transparent)}',
      '.loom-chip.bad{color:var(--loom-bad);border-color:color-mix(in srgb,var(--loom-bad) 32%,transparent)}',
      '.loom-chip.live{color:var(--loom-ok)}',
      '.loom-acts{margin-top:8px;display:flex;align-items:center;gap:2px}',
      '.loom-acts .sep{width:1px;height:12px;background:var(--loom-line);margin:0 4px}',
      // checkpoint block: hairline ledger entry, not a warning banner
      '.loom-cp{margin-top:8px;padding:7px 8px;border:1px solid var(--loom-line2);border-radius:6px;background:var(--loom-wash)}',
      '.loom-cp-head{display:flex;align-items:center;gap:6px;font-family:var(--loom-mono);font-size:10px;',
      ' letter-spacing:.03em;color:var(--loom-quiet);justify-content:space-between}',
      '.loom-cp-head b{font-weight:500;color:var(--loom-ink);letter-spacing:.04em;text-transform:uppercase}',
      '.loom-cp-body{margin-top:3px;font-size:11px;line-height:1.45;color:var(--loom-soft)}',
      '.loom-cp-acts{margin-top:6px;display:flex;gap:4px}',
      // knowledge
      '.loom-lesson{display:flex;align-items:baseline;gap:8px;padding:2px 12px;font-size:11.5px;color:var(--loom-soft)}',
      '.loom-lesson .claim{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.loom-lesson .score{font-family:var(--loom-mono);font-size:10px;color:var(--loom-quiet);white-space:nowrap}',
      '.loom-kind{padding:2px 12px 1px;font-family:var(--loom-mono);font-size:9.5px;letter-spacing:.1em;',
      ' text-transform:uppercase;color:var(--loom-quiet)}',
      // shell
      '.loom-scroll{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;min-height:0;',
      ' scrollbar-width:thin}',
      '.loom-foot{display:flex;align-items:center;gap:6px;padding:7px 12px;border-top:1px solid var(--loom-line);',
      ' font-family:var(--loom-mono);font-size:9.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--loom-soft)}',
      '.loom-foot .sep{margin-left:auto}',
      '.loom-empty{padding:14px 12px 16px;font-size:11.5px;line-height:1.6;color:var(--loom-quiet)}',
      '.loom-empty code{font-size:11px;color:var(--loom-soft)}',
      '.loom-err{padding:10px 12px;font-family:var(--loom-mono);font-size:10.5px;color:var(--loom-bad);word-break:break-word}',
      '.loom-loading{padding:10px 12px;font-family:var(--loom-mono);font-size:10.5px;color:var(--loom-faint)}',
      '.loom-broken{display:flex;align-items:baseline;gap:6px;padding:6px 12px;border-top:1px solid var(--loom-line);',
      ' font-family:var(--loom-mono);font-size:10.5px;color:var(--loom-quiet)}',
      '.loom-broken b{font-weight:500;color:var(--loom-soft)}',
      '@media (max-width:320px){.loom-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}',
      '.loom-metric:nth-child(3n){border-right:0}}',
      '@media (prefers-reduced-motion:reduce){.loom *{transition:none!important}}',
    ].join('\n')

    function ensureStyle(doc) {
      if (!doc || !doc.createElement || !doc.head) return
      if (doc.getElementById && doc.getElementById(STYLE_ID)) return
      var el = doc.createElement('style')
      el.id = STYLE_ID
      el.textContent = CSS
      doc.head.appendChild(el)
    }

    // The tints mix against an opaque ink so that a label nested inside a
    // half-transparent heading does not multiply its alpha down to nothing.
    // The panel's own computed colour is the only honest source for that ink —
    // the host theme paints it, we never pick it — so read it and pin it.
    function paintInk(doc) {
      try {
        if (!doc || !doc.querySelector || !doc.defaultView) return
        var root = doc.querySelector('.loom')
        if (!root) return
        var ink = doc.defaultView.getComputedStyle(root).color
        if (ink) root.style.setProperty('--loom-ink-base', ink)
      } catch (error) {
        // a panel that cannot measure its ink still renders on the fallback
      }
    }

    function text(value, fallback) {
      return typeof value === 'string' && value.length > 0 ? value : fallback
    }

    function money(usd) {
      var n = typeof usd === 'number' && isFinite(usd) ? usd : 0
      if (n === 0) return '$0'
      return n < 0.01 ? '$' + n.toFixed(4) : '$' + n.toFixed(2)
    }

    function age(ms) {
      if (typeof ms !== 'number' || !isFinite(ms) || ms < 0) return ''
      var s = Math.round(ms / 1000)
      if (s < 60) return s + 's'
      var m = Math.round(s / 60)
      if (m < 60) return m + 'm'
      var h = Math.round(m / 60)
      if (h < 48) return h + 'h'
      return Math.round(h / 24) + 'd'
    }

    function statusTone(status) {
      if (status === 'running') return '#3d8a58'
      if (status === 'paused') return '#8f7a33'
      if (status === 'failed' || status === 'error') return '#c05a4a'
      return '#7a7f87'
    }

    function qualityTone(verdict) {
      if (verdict === 'healthy') return '#3d8a58'
      if (verdict === 'stalled') return '#8f7a33'
      if (verdict === 'regressing') return '#c05a4a'
      return '#7a7f87'
    }

    function when(cond, node) {
      return cond ? node : null
    }

    // ---- what the panel says, computed without React ----------------------
    //
    // These are pure functions over one `/dsh-loom/state` payload. They are the
    // panel's actual design: React below only turns them into nodes. Keeping
    // them separate is also why they can be tested without a browser.

    function num(value) {
      return typeof value === 'number' && isFinite(value) ? value : 0
    }

    /** One line a reader can act on: how much work is in flight, how much is pending. */
    function overview(data) {
      var rows = (data && data.campaigns) || []
      var o = { campaigns: 0, running: 0, rounds: 0, spend: 0, open: 0, live: 0, lessons: 0 }
      for (var i = 0; i < rows.length; i += 1) {
        var c = rows[i]
        if (!c || c.error) continue
        o.campaigns += 1
        if (c.status === 'running') o.running += 1
        o.rounds += num(c.rounds)
        o.spend += num(c.spendUsd)
        o.open += num(c.open)
        o.lessons += num(c.lessons)
      }
      o.live = ((data && data.live) || []).length
      return o
    }

    /**
     * The ruled strip under the header: six figures, in the order a person
     * checks them — is anything running, is anything stuck on me, is it
     * costing anything, has it learned anything.
     */
    function metrics(data) {
      var o = overview(data)
      return [
        { key: 'campaigns', label: 'campaigns', value: String(o.campaigns) },
        { key: 'running', label: 'live', value: String(o.running) },
        { key: 'rounds', label: 'rounds', value: String(o.rounds) },
        { key: 'pending', label: 'pending', value: String(o.open), hot: o.open > 0 },
        { key: 'spend', label: 'spend', value: money(o.spend) },
        { key: 'lessons', label: 'lessons', value: String(o.lessons) },
      ]
    }

    var RISK_ORDER = { high: 0, normal: 1, low: 2 }
    function riskOf(value) {
      return RISK_ORDER[value] === undefined ? 9 : RISK_ORDER[value]
    }

    /**
     * Every decision waiting on a human, across every campaign, riskiest first.
     * A checkpoint is the loop asking a question; hiding it one campaign card
     * down is how a person misses the one that mattered.
     */
    function pending(data) {
      var out = []
      var rows = (data && data.campaigns) || []
      for (var i = 0; i < rows.length; i += 1) {
        var c = rows[i]
        if (!c || c.error) continue
        var reviews = c.reviews || []
        var cps = c.openCheckpoints || []
        for (var j = 0; j < cps.length; j += 1) {
          var cp = cps[j]
          var review = null
          for (var k = 0; k < reviews.length; k += 1) {
            if (reviews[k].id === cp.id) {
              review = reviews[k]
              break
            }
          }
          out.push({
            campaign: c.id,
            id: cp.id,
            kind: cp.kind,
            risk: review ? review.risk : 'normal',
            summary: review ? review.summary : '',
            ageMs: c.ageMs === null || c.ageMs === undefined ? null : c.ageMs,
          })
        }
      }
      out.sort(function (a, b) {
        return riskOf(a.risk) - riskOf(b.risk) || (a.campaign < b.campaign ? -1 : a.campaign > b.campaign ? 1 : 0) || (a.id < b.id ? -1 : 1)
      })
      return out
    }

    /**
     * The knowledge tree, as the loop actually uses it: what it learned, where
     * from, and how much that lesson has earned or cost. Grouped by kind,
     * because "hazard" and "recipe" are read differently.
     */
    function knowledge(data) {
      var rows = (data && data.campaigns) || []
      var groups = { fact: [], hazard: [], recipe: [] }
      var active = 0
      var quarantined = 0
      for (var i = 0; i < rows.length; i += 1) {
        var c = rows[i]
        if (!c || c.error) continue
        active += num(c.lessons)
        quarantined += num(c.quarantined)
        var top = c.lessonsTop || []
        for (var j = 0; j < top.length; j += 1) {
          var l = top[j]
          var kind = l.kind === 'hazard' || l.kind === 'recipe' ? l.kind : 'fact'
          groups[kind].push({ campaign: c.id, id: l.id, claim: l.claim, score: num(l.score) })
        }
      }
      var kinds = []
      for (var key in groups) {
        var items = groups[key].sort(function (a, b) {
          return b.score - a.score || (a.id < b.id ? -1 : 1)
        })
        if (items.length) kinds.push({ kind: key, items: items.slice(0, 4), total: items.length })
      }
      return { active: active, quarantined: quarantined, kinds: kinds }
    }

    /** The chain as a single readable thread: the shape of this loop's work. */
    function chainPath(chain) {
      if (!chain) return ''
      var nodes = chain.nodes || []
      var body = nodes
        .map(function (n) {
          return n && n.name ? n.type + '/' + n.name : n && n.type ? n.type : ''
        })
        .filter(function (s) {
          return s.length > 0
        })
        .join(' → ')
      var version = chain.version === null || chain.version === undefined ? '?' : String(chain.version)
      return body ? 'chain v' + version + ' · ' + body : 'chain v' + version
    }

    /**
     * The figures a reader compares between campaigns, in a fixed order so the
     * same number sits in the same place on every row.
     */
    function campaignMeta(c) {
      var out = []
      out.push(num(c.rounds) + ' round' + (num(c.rounds) === 1 ? '' : 's'))
      out.push(money(c.spendUsd))
      if (c.chainVersion !== null && c.chainVersion !== undefined) out.push('chain v' + c.chainVersion)
      if (c.incumbent && c.incumbent.score !== null && c.incumbent.score !== undefined) out.push('best ' + c.incumbent.score)
      if (c.lessons) out.push(num(c.lessons) + ' lesson' + (num(c.lessons) === 1 ? '' : 's'))
      if (c.holdout) out.push(num(c.holdout) + ' holdout')
      return out
    }

    /** Per-attempt verdicts from the last round, as tiny mono chips. */
    function attemptChips(lastRound) {
      var attempts = (lastRound && lastRound.attempts) || []
      return attempts.map(function (a) {
        var label = String(a.id) + ' ' + (a.score === null || a.score === undefined ? '—' : a.score)
        if (a.screenedOut) label += ' screened'
        if (a.abandoned) label += ' ' + a.abandoned
        return { key: String(a.id), label: label, tone: a.verifierOk ? 'ok' : 'bad' }
      })
    }

    /** Live attempts of one campaign, newest first, as the ids a person can grep. */
    function liveOf(data, campaign) {
      return ((data && data.live) || []).filter(function (a) {
        return a && a.campaign === campaign
      })
    }

    function riskTone(risk) {
      if (risk === 'high') return '#c05a4a'
      if (risk === 'low') return '#7a7f87'
      return '#8f7a33'
    }

    function readCollapsed() {
      try {
        var raw = window.localStorage && window.localStorage.getItem(COLLAPSE_KEY)
        var parsed = raw ? JSON.parse(raw) : {}
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch (error) {
        return {}
      }
    }

    function writeCollapsed(next) {
      try {
        if (window.localStorage) window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next))
      } catch (error) {
        // a panel that cannot remember its fold state still has to render
      }
    }

    function Panel(react, CardView) {
      var h = react.createElement
      var useState = react.useState
      var useEffect = react.useEffect
      var useCallback = react.useCallback

      return function LoomPanel() {
        var s = useState({ loading: true, data: null, error: null, busy: null })
        var box = s[0]
        var setBox = s[1]

        // which campaigns the reader folded away, and which destructive action
        // is one click into being confirmed
        var f = useState(readCollapsed)
        var folded = f[0]
        var setFolded = f[1]
        var k = useState(null)
        var confirming = k[0]
        var setConfirming = k[1]

        var load = useCallback(function () {
          fetch(ROUTE, { headers: { accept: 'application/json' }, cache: 'no-store' })
            .then(function (r) {
              if (!r.ok) throw new Error('HTTP ' + r.status)
              return r.json()
            })
            .then(function (data) {
              setBox({ loading: false, data: data, error: null, busy: null })
            })
            .catch(function (err) {
              setBox({ loading: false, data: null, error: String(err && err.message ? err.message : err), busy: null })
            })
        }, [])

        useEffect(function () {
          ensureStyle(typeof document === 'undefined' ? null : document)
          paintInk(typeof document === 'undefined' ? null : document)
          load()
          var t = setInterval(function () {
            // re-pin on every tick: if the reader flips the host theme, the
            // ink base has to follow it without a reload
            paintInk(typeof document === 'undefined' ? null : document)
            load()
          }, POLL_MS)
          return function () {
            clearInterval(t)
          }
        }, [load])

        var act = useCallback(
          function (campaign, action, decision, checkpoint) {
            setBox(function (prev) {
              return { loading: false, data: prev.data, error: prev.error, busy: campaign + ':' + action }
            })
            fetch(ROUTE, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                campaign: campaign,
                action: action,
                decision: decision,
                checkpoint: checkpoint,
              }),
            })
              .then(function (r) {
                return r.json().then(function (body) {
                  if (!r.ok) throw new Error(text(body && body.error, 'HTTP ' + r.status))
                  return body
                })
              })
              .then(function () {
                setConfirming(null)
                load()
              })
              .catch(function (err) {
                setBox(function (prev) {
                  return { loading: false, data: prev.data, error: String(err && err.message ? err.message : err), busy: null }
                })
              })
          },
          [load],
        )

        var toggle = useCallback(function (id) {
          setFolded(function (prev) {
            var next = {}
            for (var key in prev) next[key] = prev[key]
            next[id] = !prev[id]
            writeCollapsed(next)
            return next
          })
        }, [])

        var data = box.data
        // The switch is the one control that is not about a campaign: it stops
        // dispatch and nothing else, so it sits in the header and never asks
        // which campaign it refers to.
        var rsiOn = !(data && data.rsi && data.rsi.enabled === false)
        var switchBtn = h(
          'button',
          {
            type: 'button',
            className: 'loom-switch',
            title: rsiOn
              ? 'loop is dispatching — stop it here; campaign history is untouched'
              : 'loop is stopped — no round is dispatched until you turn it back on',
            onClick: function () {
              act('', rsiOn ? 'disable' : 'enable')
            },
          },
          h('span', { className: 'loom-dot ' + (rsiOn ? 'on' : 'off') }),
          h('span', null, rsiOn ? 'on' : 'off'),
        )
        var header = h(
          'div',
          { className: 'loom-head' },
          h('span', { className: 'loom-mark' }, 'RSI'),
          h('span', { className: 'loom-spacer' }),
          switchBtn,
          h(
            'button',
            {
              type: 'button',
              className: 'loom-btn bare',
              title: 'reload from ~/.dsh/loom',
              'aria-label': 'refresh',
              onClick: load,
            },
            '↻',
          ),
        )

        var figs = metrics(data)
        var strip = h(
          'div',
          { className: 'loom-metrics' },
          figs.map(function (m) {
            return h(
              'div',
              { key: m.key, className: 'loom-metric' + (m.hot ? ' hot' : '') },
              h('b', null, m.value),
              h('span', null, m.label),
            )
          }),
        )

        var queue = pending(data)
        var tree = knowledge(data)

        var pendingBlock =
          queue.length === 0
            ? null
            : h(
                'div',
                { className: 'loom-sec' },
                h('div', { className: 'loom-sec-head' }, 'waiting on you', h('span', { className: 'n' }, String(queue.length))),
                queue.map(function (q) {
                  var key = q.campaign + ':' + q.id
                  var busyKey = q.campaign + ':decide'
                  var armed = confirming === key
                  return h(
                    'div',
                    { key: key, className: 'loom-row' },
                    h('span', { className: 'loom-dot', style: { color: riskTone(q.risk) } }),
                    h(
                      'span',
                      { className: 'txt', title: q.summary || q.kind },
                      h('b', null, q.campaign),
                      ' · ' + q.kind + (q.summary ? ' — ' + q.summary : ''),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'loom-btn bare',
                        disabled: box.busy === busyKey,
                        title: 'accept this checkpoint and let the round land',
                        onClick: function () {
                          act(q.campaign, 'decide', 'approve', q.id)
                        },
                      },
                      'approve',
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'loom-btn bare danger',
                        disabled: box.busy === busyKey,
                        title: armed ? 'click again to reject' : 'reject — this needs a second click',
                        onClick: function () {
                          if (!armed) {
                            setConfirming(key)
                            return
                          }
                          setConfirming(null)
                          act(q.campaign, 'decide', 'reject', q.id)
                        },
                      },
                      armed ? 'sure?' : 'reject',
                    ),
                  )
                }),
              )

        var treeBlock =
          tree.kinds.length === 0
            ? null
            : h(
                'div',
                { className: 'loom-sec' },
                h(
                  'div',
                  { className: 'loom-sec-head' },
                  'knowledge',
                  h('span', { className: 'n' }, tree.active + ' active' + (tree.quarantined ? ' · ' + tree.quarantined + ' held' : '')),
                ),
                tree.kinds.map(function (g) {
                  return h(
                    'div',
                    { key: g.kind },
                    h('div', { className: 'loom-kind' }, g.kind + ' · ' + g.total),
                    g.items.map(function (item) {
                      return h(
                        'div',
                        { key: item.campaign + ':' + item.id, className: 'loom-lesson', title: text(item.claim, item.id) },
                        h('span', { className: 'claim' }, text(item.claim, item.id)),
                        h(
                          'span',
                          { className: 'score', style: { color: item.score > 0 ? '#3d8a58' : item.score < 0 ? '#c05a4a' : undefined } },
                          (item.score > 0 ? '+' : '') + item.score,
                        ),
                      )
                    }),
                  )
                }),
              )

        var body
        if (box.loading) {
          body = h('div', { className: 'loom-loading' }, 'reading ~/.dsh/loom…')
        } else if (box.error) {
          body = h('div', { className: 'loom-err' }, box.error)
        } else if (!data || !data.campaigns || data.campaigns.length === 0) {
          body = h(
            'div',
            { className: 'loom-empty' },
            'No campaigns.',
            h('br'),
            'Ask the agent for ',
            h('code', null, 'rsi_start'),
            ' with an objective and a workspace; the loop does the rest.',
          )
        } else {
          body = h(
            'div',
            { className: 'loom-sec' },
            h(
              'div',
              { className: 'loom-sec-head' },
              'campaigns',
              h('span', { className: 'n' }, String(data.campaigns.filter(function (c) {
                return c && !c.error
              }).length)),
            ),
            data.campaigns.map(function (c) {
              if (c && c.error) {
                return h(
                  'div',
                  { key: c.id, className: 'loom-broken' },
                  h('b', null, c.id),
                  h('span', null, c.error),
                )
              }
              return h(CardView, {
                key: c.id,
                c: c,
                live: liveOf(data, c.id),
                busy: box.busy,
                act: act,
                folded: folded[c.id] === true,
                onToggle: toggle,
                confirming: confirming,
                setConfirming: setConfirming,
              })
            }),
          )
        }

        var footer = h(
          'div',
          { className: 'loom-foot' },
          h('span', null, data && data.ownership && data.ownership.mine === false ? 'driven by another window' : 'this window drives'),
          data && data.lean ? h('span', { className: 'sep' }, 'lean ' + (data.lean.available ? 'ok' : 'missing')) : null,
        )

        // The header, the figures and the footer stay put; only the middle
        // scrolls, so the loop switch never scrolls out of reach.
        return h(
          'div',
          { className: 'loom', style: { height: '100%' } },
          header,
          strip,
          h('div', { className: 'loom-scroll', style: { overflowY: 'auto' } }, pendingBlock, body, treeBlock),
          footer,
        )
      }
    }

    function Card(react) {
      var h = react.createElement
      return function CampaignCard(props) {
        var c = props.c
        var busy = props.busy
        var folded = props.folded === true
        var live = props.live || []
        var meta = campaignMeta(c)
        var chips = attemptChips(c.lastRound)
        var chain = chainPath(c.chain)
        var armed = props.confirming === c.id + ':stop'

        var head = h(
          'div',
          { className: 'loom-titlerow' },
          h('span', { className: 'loom-dot', style: { color: statusTone(c.status), marginBottom: 1 } }),
          h('span', { className: 'loom-name', title: c.id }, c.id),
          h('span', { className: 'loom-state' }, c.status),
          h('span', { className: 'loom-age', title: age(c.ageMs) ? 'last activity ' + age(c.ageMs) + ' ago' : '' }, folded ? '' : age(c.ageMs))
        )

        if (folded) {
          return h(
            'div',
            { className: 'loom-camp', onClick: function () { props.onToggle(c.id) }, style: { cursor: 'pointer' } },
            head,
          )
        }

        var checkpoints = (c.openCheckpoints || []).map(function (cp) {
          var verdict = cp.payload && cp.payload.verdict ? String(cp.payload.verdict) : ''
          var delta = cp.payload && cp.payload.delta !== undefined ? ' Δ' + cp.payload.delta : ''
          var key = c.id + ':' + cp.id
          return h(
            'div',
            { key: cp.id, className: 'loom-cp' },
            h(
              'div',
              { className: 'loom-cp-head' },
              h('b', null, cp.kind),
              h('span', null, (verdict || cp.id) + delta),
            ),
            h(
              'div',
              { className: 'loom-cp-acts' },
              ['approve', 'reject', 'hold'].map(function (decision) {
                var armKey = key + ':' + decision
                var needs = decision === 'reject' || decision === 'hold'
                var isArmed = props.confirming === armKey
                return h(
                  'button',
                  {
                    key: decision,
                    type: 'button',
                    className: 'loom-btn' + (needs ? ' danger' : ''),
                    disabled: busy === c.id + ':decide',
                    onClick: function () {
                      if (needs && !isArmed) {
                        props.setConfirming(armKey)
                        return
                      }
                      props.act(c.id, 'decide', decision, cp.id)
                    },
                  },
                  isArmed ? decision + '?' : decision,
                )
              }),
            ),
          )
        })

        return h(
          'div',
          { className: 'loom-camp' },
          h(
            'div',
            { onClick: function () { props.onToggle(c.id) }, style: { cursor: 'pointer' } },
            head,
            h('div', { className: 'loom-obj' }, text(c.objective, 'no objective recorded')),
            h('div', { className: 'loom-meta' }, meta.join(' · ')),
            when(chain, h('div', { className: 'loom-chain', title: chain }, chain)),
            when(
              c.quality,
              h(
                'div',
                { className: 'loom-ev' },
                h('span', { className: 'loom-dot', style: { color: qualityTone(c.quality.verdict) } }),
                h('span', null, c.quality.verdict),
                h('span', null, '· ' + c.quality.promotions + '/' + c.quality.rounds + ' promoted'),
                c.quality.avgRoundMs === null || c.quality.avgRoundMs === undefined
                  ? null
                  : h('span', null, '· ' + Math.round(c.quality.avgRoundMs / 1000) + 's/round'),
              ),
            ),
            when(
              live.length > 0,
              h(
                'div',
                { className: 'loom-chips' },
                live.map(function (a) {
                  return h(
                    'span',
                    { key: a.attemptId, className: 'loom-chip live', title: 'in flight' },
                    a.attemptId + (typeof a.idleMs === 'number' ? ' ' + Math.round(a.idleMs / 1000) + 's' : ''),
                  )
                }),
              ),
            ),
            when(
              chips.length > 0,
              h(
                'div',
                { className: 'loom-chips' },
                chips.map(function (chip) {
                  return h('span', { key: chip.key, className: 'loom-chip ' + chip.tone }, chip.label)
                }),
              ),
            ),
          ),
          checkpoints,
          h(
            'div',
            { className: 'loom-acts' },
            ['pause', 'resume', 'stop'].map(function (action) {
              var key = c.id + ':' + action
              var destructive = action === 'stop'
              var isArmed = destructive && armed
              return h(
                'button',
                {
                  key: action,
                  type: 'button',
                  className: 'loom-btn bare' + (destructive ? ' danger' : ''),
                  disabled: busy === c.id + ':' + action || busy === c.id + ':stop',
                  title: isArmed ? 'click again to stop this campaign' : action + ' ' + c.id,
                  onClick: function () {
                    if (destructive && !isArmed) {
                      props.setConfirming(key)
                      return
                    }
                    props.act(c.id, action)
                  },
                },
                busy === c.id + ':' + action ? '…' : isArmed ? 'stop?' : action,
              )
            }),
            h('span', { className: 'sep' }),
            h(
              'button',
              {
                type: 'button',
                className: 'loom-btn bare',
                title: 'refold this campaign',
                onClick: function () {
                  props.onToggle(c.id)
                },
              },
              'fold',
            ),
          ),
        )
      }
    }

    function apply(ctx) {
      var react
      try {
        react = require('react')
      } catch (error) {
        console.error('[loom] panel skipped: ' + error)
        return
      }
      // Card must be closed over by Panel: passing the factory itself is how
      // the sidebar used to render a header and nothing else (React refuses a
      // component that returns a function).
      var CardView = Card(react)
      var PanelView = Panel(react, CardView)

      if (typeof ctx.inject !== 'function') return
      ctx.inject(['slots'], function (scope) {
        scope.slots.inject('main', function* () {
          yield scope.slots.register({ name: 'main', key: PANEL_KEY }, PanelView)
        })
        scope.slots.inject('sidebar.panellist', function* () {
          yield scope.slots.register({ name: 'sidebar.panellist', id: PANEL_KEY, order: 24, label: () => 'RSI' }, function Icon(props) {
            var size = typeof props.size === 'number' ? props.size : 16
            return react.createElement(
              'svg',
              {
                width: size,
                height: size,
                viewBox: '0 0 16 16',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 1.4,
                'aria-hidden': 'true',
              },
              react.createElement('path', { d: 'M8 1.5a6.5 6.5 0 1 1-6.5 6.5' }),
              react.createElement('path', { d: 'M8 4.5V8l2.5 1.5' }),
              react.createElement('path', { d: 'M1.5 8 3 6.5M1.5 8 3 9.5' }),
            )
          })
        })
      })
    }

    exports.apply = apply
    // `slots` is optional: the host may run headless, where nothing registers.
    exports.inject = []
    exports.__panel = {
      money: money,
      age: age,
      statusTone: statusTone,
      qualityTone: qualityTone,
      text: text,
      Panel: Panel,
      Card: Card,
      overview: overview,
      metrics: metrics,
      pending: pending,
      knowledge: knowledge,
      chainPath: chainPath,
      campaignMeta: campaignMeta,
      attemptChips: attemptChips,
      liveOf: liveOf,
      riskTone: riskTone,
      paintInk: paintInk,
      ensureStyle: ensureStyle,
      CSS: CSS,
      STYLE_ID: STYLE_ID,
    }
    return module.exports
  },
})
