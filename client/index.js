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
//   · monochrome. `color-mix(in srgb, var(--loom-base) N%, transparent)` is the
//     whole palette, so the panel is ink-on-canvas in a light *and* a dark
//     theme without a theme switch of its own. Colour appears only as 6px
//     state dots, mid-tone enough to read on #08090A and on white.
//   · hairline structure instead of cards: 1px dividers at 10% ink, no
//     shadows, no gradients, radius 4/6px, never 12.
//   · mono for anything an engineer scans by shape — ids, scores, spend,
//     chain paths — with tabular figures, and the body face for prose.
//   · one 4px spacing rhythm, labels at 10px/uppercase/.08em.
//   · motion 150ms cubic-bezier(.25,.46,.45,.94): hover shifts, no springs.
//   · voice: 中文标签、直陈语气、不用感叹号、不用 emoji。
//
// The campaign body is a *tree*, not a stack of chips: a campaign is one node,
// and under it the same three things every round either produces or blocks on
// — the last round and its candidates, the decisions waiting on a human, the
// attempts still in flight, and the lessons it has earned — hang off the
// campaign with hairline rails and elbows (the shape the Agent Teams panel
// uses for a delegation tree). A person reads a loop by its branches, not by
// its badges.
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
      ' --loom-faint:rgba(127,127,127,.6);--loom-faint:color-mix(in srgb,var(--loom-base) 52%,transparent);',
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
      '.loom-titlerow,.loom-obj,.loom-meta,.loom-chain,.loom-tri,.loom-vitals,.loom-cp-head{min-width:0}',
      // header
      '.loom-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--loom-line)}',
      '.loom-mark{font-family:var(--loom-mono);font-size:11px;font-weight:500;letter-spacing:.14em;white-space:nowrap}',
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
      // the loop switch: a dot and one word, not a traffic light
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
      '.loom-metric span{display:block;margin-top:2px;font-size:9px;line-height:1.15;letter-spacing:.06em;',
      ' color:var(--loom-quiet);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loom-metric.hot b{color:var(--loom-warn)}',
      // sections
      '.loom-sec{border-bottom:1px solid var(--loom-line)}',
      '.loom-sec:last-child{border-bottom:0}',
      '.loom-sec-head{display:flex;align-items:center;gap:6px;padding:10px 12px 4px;',
      ' font-size:10px;letter-spacing:.08em;color:var(--loom-quiet)}',
      '.loom-sec-head .n{margin-left:auto;font-family:var(--loom-mono);letter-spacing:0;color:var(--loom-quiet)}',
      // rows
      '.loom-row{display:flex;align-items:center;gap:8px;padding:6px 12px;border-top:1px solid var(--loom-line);',
      ' transition:background 150ms var(--loom-ease)}',
      '.loom-row:hover{background:var(--loom-hover)}',
      '.loom-row .txt{flex:1 1 auto;min-width:0;font-size:11.5px;color:var(--loom-soft);',
      ' overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.loom-row .txt b{font-weight:500;color:var(--loom-ink)}',
      // campaign block
      '.loom-camp{padding:11px 12px 12px;border-top:1px solid var(--loom-line)}',
      '.loom-camp:first-of-type{border-top:0}',
      '.loom-camp:hover{background:color-mix(in srgb,var(--loom-base) 2.5%,transparent)}',
      '.loom-titlerow{display:flex;align-items:baseline;gap:7px}',
      '.loom-name{font-family:var(--loom-mono);font-size:12.5px;font-weight:500;line-height:1.2;min-width:0;',
      ' white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loom-state{font-size:10px;letter-spacing:.02em;color:var(--loom-quiet);white-space:nowrap}',
      '.loom-age{margin-left:auto;font-family:var(--loom-mono);font-size:10px;color:var(--loom-faint);white-space:nowrap}',
      '.loom-obj{margin-top:3px;font-size:11.5px;line-height:1.45;color:var(--loom-soft);',
      ' display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.loom-meta{margin-top:4px;font-family:var(--loom-mono);font-size:10px;letter-spacing:.01em;color:var(--loom-faint);',
      ' white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loom-chain{margin-top:3px;font-family:var(--loom-mono);font-size:10px;color:var(--loom-quiet);',
      ' white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      // ---- the measured triangle, the trend, the budget --------------------
      // One line of five figures, then one line of structure. The line ellipsises
      // instead of wrapping: a wrapped row of dashes reads as a broken table, and
      // every segment carries its own title so the clipped text still explains
      // itself on hover.
      '.loom-tri{margin-top:5px;display:block;min-width:0;font-family:var(--loom-mono);',
      ' font-size:9.5px;letter-spacing:.01em;line-height:1.5;color:var(--loom-quiet);',
      ' white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loom-tri .seg{color:var(--loom-soft)}',
      '.loom-tri .sep{padding:0 4px;color:var(--loom-line2)}',
      '.loom-tri .loom-chip{margin-left:0}',
      // the vitals row: the last rounds on the left, the budget on the right,
      // both sitting on one baseline so a glance compares them.
      '.loom-vitals{margin-top:6px;display:flex;align-items:flex-end;gap:10px;min-width:0}',
      '.loom-spark{display:flex;align-items:flex-end;gap:2px;height:16px;flex:0 0 auto;padding-bottom:1px}',
      '.loom-spark .pt{display:block;width:4px;min-height:2px;border-radius:1px;background:var(--loom-faint);',
      ' transition:background 150ms var(--loom-ease)}',
      '.loom-spark .pt[data-tone="ok"]{background:var(--loom-ok)}',
      '.loom-spark .pt[data-tone="warn"]{background:var(--loom-warn)}',
      '.loom-spark .pt[data-tone="bad"]{background:var(--loom-bad)}',
      '.loom-spark .pt[data-tone="idle"]{background:var(--loom-faint)}',
      '.loom-meters{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:3px}',
      '.loom-meter{display:grid;grid-template-columns:26px minmax(0,1fr) auto;align-items:center;gap:6px;min-width:0}',
      '.loom-meter .k{font-size:9px;line-height:1;letter-spacing:.04em;color:var(--loom-faint);white-space:nowrap}',
      '.loom-meter .bar{display:block;height:2px;border-radius:1px;background:var(--loom-line);overflow:hidden}',
      '.loom-meter .fill{display:block;height:100%;border-radius:1px;background:var(--loom-ok);',
      ' transition:width 150ms var(--loom-ease)}',
      '.loom-meter[data-tone="warn"] .fill{background:var(--loom-warn)}',
      '.loom-meter[data-tone="bad"] .fill{background:var(--loom-bad)}',
      '.loom-meter .num{justify-self:end;font-family:var(--loom-mono);font-size:9px;line-height:1;',
      ' color:var(--loom-soft);white-space:nowrap}',
      // every figure a poll can change is tabular, so the column does not twitch
      '.loom-metric b,.loom-age,.loom-tri,.loom-meter .num,.loom-node .v{font-variant-numeric:tabular-nums}',
      // ---- the tree ----
      // one hairline rail runs down the depth-1 nodes and every node but the
      // last elbows onto it; deeper levels indent and keep a quieter dot. No
      // SVG: the shape is structure, not decoration, so it is one pseudo
      // element per row.
      '.loom-tree{margin-top:7px;position:relative}',
      '.loom-node{position:relative;display:flex;align-items:baseline;gap:6px;min-width:0;',
      ' padding:3px 0 3px 18px;transition:background 150ms var(--loom-ease)}',
      '.loom-node:hover{background:var(--loom-hover)}',
      '.loom-node[data-depth="1"]:before{content:"";position:absolute;left:6px;top:0;bottom:0;width:1px;',
      ' background:var(--loom-line)}',
      '.loom-node[data-depth="1"]:after{content:"";position:absolute;left:6px;top:11px;width:9px;height:1px;',
      ' background:var(--loom-line)}',
      '.loom-node[data-depth="1"][data-last="1"]:before{bottom:auto;height:11px}',
      '.loom-node[data-depth="2"]{padding-left:31px}',
      '.loom-node[data-depth="2"]:before{content:"";position:absolute;left:19px;top:11px;width:7px;height:1px;',
      ' background:var(--loom-line)}',
      '.loom-node[data-depth="3"]{padding-left:43px}',
      '.loom-node .k{flex:0 0 auto;font-family:var(--loom-mono);font-size:9.5px;letter-spacing:.04em;color:var(--loom-quiet)}',
      '.loom-node .t{flex:1 1 auto;min-width:0;font-size:11.5px;color:var(--loom-soft);',
      ' overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.loom-node .t.mono{font-family:var(--loom-mono);font-size:10.5px}',
      '.loom-node .v{flex:0 0 auto;font-family:var(--loom-mono);font-size:10px;color:var(--loom-quiet);white-space:nowrap}',
      '.loom-node .acts{flex:0 0 auto;display:flex;gap:2px}',
      '.loom-node .acts .loom-btn{font-size:10.5px;padding:2px 5px}',
      // checkpoint block: a hairline ledger entry inside the tree
      '.loom-cp{margin:0;padding:5px 0 6px}',
      '.loom-cp-head{display:flex;align-items:center;gap:6px;font-family:var(--loom-mono);font-size:10px;',
      ' letter-spacing:.03em;color:var(--loom-quiet);justify-content:space-between}',
      '.loom-cp-head b{font-weight:500;color:var(--loom-ink);letter-spacing:.04em}',
      '.loom-cp-body{margin-top:3px;font-size:11px;line-height:1.45;color:var(--loom-soft)}',
      '.loom-cp-acts{margin-top:5px;display:flex;gap:4px}',
      '.loom-acts{margin-top:8px;display:flex;align-items:center;gap:2px}',
      '.loom-acts .sep{width:1px;height:12px;background:var(--loom-line);margin:0 4px}',
      '.loom-chips{margin-top:6px;display:flex;flex-wrap:wrap;gap:4px}',
      '.loom-chip{font-family:var(--loom-mono);font-size:10px;line-height:1;padding:3px 5px;border-radius:4px;',
      ' background:var(--loom-wash);border:1px solid transparent;color:var(--loom-soft);white-space:nowrap}',
      '.loom-chip.ok{color:var(--loom-ok);border-color:color-mix(in srgb,var(--loom-ok) 32%,transparent)}',
      '.loom-chip.bad{color:var(--loom-bad);border-color:color-mix(in srgb,var(--loom-bad) 32%,transparent)}',
      '.loom-chip.live{color:var(--loom-ok)}',
      // a chip that reports an absence: no fill, a hairline, no accent — it is
      // a state of the data, not a state of the loop.
      '.loom-chip.quiet{background:transparent;border-color:var(--loom-line);color:var(--loom-faint);letter-spacing:.06em}',
      // knowledge
      '.loom-lesson{display:flex;align-items:baseline;gap:8px;padding:2px 12px 2px 31px;font-size:11.5px;color:var(--loom-soft)}',
      '.loom-lesson .claim{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.loom-lesson .score{font-family:var(--loom-mono);font-size:10px;color:var(--loom-quiet);white-space:nowrap}',
      '.loom-kind{padding:3px 12px 1px 18px;font-size:10px;letter-spacing:.04em;color:var(--loom-quiet)}',
      // shell
      '.loom-scroll{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;min-height:0;',
      ' scrollbar-width:thin}',
      '.loom-foot{display:flex;align-items:center;gap:6px;padding:7px 12px;border-top:1px solid var(--loom-line);',
      ' font-size:9.5px;letter-spacing:.04em;color:var(--loom-soft)}',
      '.loom-foot .sep{margin-left:auto}',
      '.loom-empty{padding:14px 12px 16px;font-size:11.5px;line-height:1.6;color:var(--loom-quiet)}',
      '.loom-empty code{font-size:11px;color:var(--loom-soft)}',
      '.loom-err{padding:10px 12px;font-family:var(--loom-mono);font-size:10.5px;color:var(--loom-bad);word-break:break-word}',
      '.loom-loading{padding:10px 12px;font-family:var(--loom-mono);font-size:10.5px;color:var(--loom-quiet)}',
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
      if (s < 60) return s + '秒'
      var m = Math.round(s / 60)
      if (m < 60) return m + '分'
      var h = Math.round(m / 60)
      if (h < 48) return h + '小时'
      return Math.round(h / 24) + '天'
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

    // ---- 词表 ---------------------------------------------------------------
    //
    // The host speaks English in its event log (and should: the ledger is the
    // durable artifact), so the panel is the one place that translates. Every
    // label goes through these maps, which also means an unknown value shows
    // through verbatim instead of disappearing.
    var STATE_ZH = { running: '运行中', paused: '已暂停', stopped: '已停止', done: '已完成', planning: '规划中', failed: '已失败', error: '出错' }
    var QUALITY_ZH = { healthy: '健康', stalled: '停滞', regressing: '退步' }
    var KIND_ZH = { fact: '事实', hazard: '风险', recipe: '做法' }
    var CP_ZH = { gate: '晋升待审', anomaly: '异常', plateau: '平台期', holdout: '留出集', stuck: '门不可达', exhausted: '额度耗尽', budget: '预算', human: '人工确认' }
    var NODE_ZH = { agent: '执行', map: '并行', verifier: '验证', human: '人审', judge: '评判', collect: '收集' }
    var RISK_ZH = { high: '高', normal: '中', low: '低' }

    function statusLabel(v) {
      return STATE_ZH[v] || v || ''
    }
    function qualityLabel(v) {
      return QUALITY_ZH[v] || v || ''
    }
    function kindLabel(v) {
      return KIND_ZH[v] || v || ''
    }
    function checkpointLabel(v) {
      return CP_ZH[v] || v || ''
    }
    function nodeLabel(v) {
      return NODE_ZH[v] || v || ''
    }
    function riskLabel(v) {
      return RISK_ZH[v] || v || ''
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
        { key: 'campaigns', label: '战役', value: String(o.campaigns) },
        { key: 'running', label: '运行中', value: String(o.running) },
        { key: 'rounds', label: '轮数', value: String(o.rounds) },
        { key: 'pending', label: '待处理', value: String(o.open), hot: o.open > 0 },
        { key: 'spend', label: '花费', value: money(o.spend) },
        { key: 'lessons', label: '知识', value: String(o.lessons) },
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
        if (items.length) kinds.push({ kind: key, label: kindLabel(key), items: items.slice(0, 4), total: items.length })
      }
      return { active: active, quarantined: quarantined, kinds: kinds }
    }

    /** The chain as a single readable thread: the shape of this loop's work. */
    function chainPath(chain) {
      if (!chain) return ''
      var version = chain.version === null || chain.version === undefined ? '?' : String(chain.version)
      var nodes = chain.nodes || []
      var body = nodes
        .map(function (n) {
          if (!n) return ''
          var head = nodeLabel(n.type)
          if (!n.type && !n.name) return ''
          return n && n.name ? head + '/' + n.name : head
        })
        .filter(function (s) {
          return s.length > 0
        })
        .join(' → ')
      return body ? '链 v' + version + ' · ' + body : '链 v' + version
    }

    /**
     * What is left once the budget meters own the rounds and the money and the
     * chain line owns the version: the artefacts a reader looks up.
     */
    function campaignMeta(c) {
      var out = []
      if (c.incumbent && c.incumbent.score !== null && c.incumbent.score !== undefined) out.push('最佳 ' + c.incumbent.score)
      if (c.lessons) out.push(num(c.lessons) + ' 条知识')
      if (c.holdout) out.push(num(c.holdout) + ' 留出')
      if (c.tasks) out.push(num(c.tasks) + ' 任务')
      return out
    }

    // ---- the triangle, the trend, the budget -------------------------------
    //
    // The three things a reader compares between campaigns. The host measures
    // them (`src/runtime/triangle.js`); this half only formats. A missing
    // number is a dash, never a zero: "not measured" and "cost nothing" are
    // different claims, and a panel that conflates them lies quietly.

    var SPARK_ROUNDS = 8
    var SPARK_PX = 13

    function amount(value) {
      return typeof value === 'number' && isFinite(value) ? value : null
    }

    function fmtSeconds(value) {
      var s = amount(value)
      if (s === null || s <= 0) return '—'
      return s >= 10 ? String(Math.round(s)) : String(Math.round(s * 10) / 10)
    }

    function fmtFactor(value) {
      var f = amount(value)
      if (f === null || f <= 0) return '—'
      return f >= 1 ? f.toFixed(1) : f.toFixed(2)
    }

    function fmtPercent(value) {
      var f = amount(value)
      return f === null ? '—' : String(Math.round(f * 100)) + '%'
    }

    function fmtTokens(value) {
      var n = amount(value)
      if (n === null || n <= 0) return '—'
      if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M'
      if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k'
      return String(Math.round(n))
    }

    /**
     * The five figures of the triangle as one mono line. `measured === false`
     * is a claim by the host that it looked and found nothing to measure — that
     * is one quiet chip, not five dashes pretending to be data.
     */
    function triangleChips(c) {
      var t = (c && c.triangle) || null
      if (!t || t.measured === false) {
        return [{
          key: 'unmeasured',
          label: '未测量',
          quiet: true,
          title: t ? '这一战役没有记录耗时和 token，三角未测量（不是 0）' : '宿主还没有送来三角数据',
        }]
      }
      var speed = amount(t.secondsPerRound)
      var factor = amount(t.parallelFactor)
      var share = amount(t.verifierShare)
      var tokens = amount(t.tokens)
      var perPromo = amount(t.usdPerPromotion)
      var timed = num(t.timedRounds)
      var total = num(t.rounds)
      var perRound = amount(t.tokensPerRound)
      var chips = [{
        key: 'speed',
        label: fmtSeconds(speed) + '秒/轮',
        title: speed === null
          ? '没有记录墙钟，算不出每轮秒数'
          : '平均每轮 ' + fmtSeconds(speed) + ' 秒（' + timed + '/' + total + ' 轮记录了墙钟）',
      }, {
        key: 'parallel',
        label: '并行 ×' + fmtFactor(factor),
        title: factor === null
          ? '没有墙钟或候选耗时，并行度未知'
          : '候选累计耗时 ÷ 墙钟 = ' + factor.toFixed(2) + '（1.0 是串行，2.0 是两个候选并行）',
      }, {
        key: 'verifier',
        label: '验证器 ' + fmtPercent(share),
        title: share === null
          ? '验证器耗时未记录'
          : '验证器占用墙钟 ' + fmtPercent(share),
      }, {
        key: 'tokens',
        label: fmtTokens(tokens) + ' tok',
        title: tokens === null || tokens <= 0
          ? 'token 未计量：宿主没有回报用量'
          : '累计 ' + Math.round(tokens) + ' token' + (perRound === null ? '' : '，每轮 ' + fmtTokens(perRound)),
      }, {
        key: 'promotion',
        label: (perPromo === null ? '—' : money(perPromo)) + '/晋升',
        title: perPromo === null
          ? '还没有晋升，算不出每次晋升的成本'
          : '每次晋升 ' + money(perPromo) + '（共 ' + money(t.usd) + '，晋升率 ' + fmtPercent(t.promotionRate) + '）',
      }]
      return chips
    }

    // The host ships the last round only; `trend` is the forward-compatible
    // shape a full history will arrive in, so the sparkline already knows how
    // to read it.
    function trendOf(c) {
      if (!c) return null
      var lists = [c.trend, c.roundHistory]
      for (var i = 0; i < lists.length; i += 1) {
        if (Array.isArray(lists[i])) return lists[i]
      }
      if (Array.isArray(c.rounds)) return c.rounds
      return null
    }

    function sparkTone(r) {
      if (!r) return 'idle'
      if (r.promoted === true || r.status === 'promoted') return 'ok'
      if (r.status === 'no-gain') return 'warn'
      if (r.status === 'holdout-failed' || r.status === 'crashed' || r.status === 'failed') return 'bad'
      return 'idle'
    }

    function barTitle(r, score) {
      var head = '第 ' + r.n + ' 轮'
      var status = roundStatusLabel(r)
      if (status) head += ' ' + status
      return head + ' ' + (score === null ? '未计分' : score)
    }

    /**
     * The last eight rounds as bars: height is the score against the best of
     * the window, colour is the verdict. No rounds is an empty sparkline, not
     * an error — a campaign one minute old has nothing to trend yet.
     */
    function sparkOf(c) {
      var list = trendOf(c)
      if (!list && c && c.lastRound && c.lastRound.n !== null && c.lastRound.n !== undefined) list = [c.lastRound]
      var rounds = (list || []).filter(function (r) {
        return r && r.n !== null && r.n !== undefined
      }).slice(-SPARK_ROUNDS)
      var scores = rounds.map(function (r) {
        return amount(r.score)
      })
      var max = 0
      for (var i = 0; i < scores.length; i += 1) {
        if (scores[i] !== null && scores[i] > max) max = scores[i]
      }
      if (max <= 0) max = 1
      var bars = rounds.map(function (r, index) {
        var score = scores[index]
        var share = score === null || score <= 0 ? 0 : Math.min(1, score / max)
        return {
          key: 'r' + r.n,
          n: r.n,
          score: score,
          px: 2 + Math.round(share * (SPARK_PX - 2)),
          tone: sparkTone(r),
          title: barTitle(r, score),
        }
      })
      return { bars: bars, max: max, count: bars.length }
    }

    function meterOf(key, label, used, cap, text, title) {
      var u = amount(used)
      var limit = amount(cap)
      var pct = limit === null || limit <= 0 || u === null ? 0 : Math.min(100, Math.max(0, (u / limit) * 100))
      var over = limit !== null && limit > 0 && u !== null && u > limit
      var full = limit !== null && limit > 0 && u !== null && u >= limit
      return {
        key: key,
        label: label,
        used: u,
        cap: limit,
        pct: Math.round(pct),
        over: over,
        tone: full ? 'bad' : pct >= 75 ? 'warn' : 'ok',
        text: text,
        title: title,
      }
    }

    /**
     * Three thin meters: rounds, money, wall-clock. The numbers sit right
     * aligned in mono so the columns line up across campaigns; the fill is
     * clamped at 100% because a meter that overflows its own track is a
     * picture of a bug, not of a budget.
     */
    function budgetMeters(c) {
      var b = (c && c.budget) || null
      var t = (c && c.triangle) || null
      var out = []

      var roundsUsed = b && amount(b.roundsUsed) !== null ? amount(b.roundsUsed) : num(c && c.rounds)
      var roundsCap = b ? amount(b.rounds) : null
      var roundsText = String(roundsUsed) + '/' + (roundsCap === null || roundsCap <= 0 ? '—' : roundsCap)
      out.push(meterOf('rounds', '轮数', roundsUsed, roundsCap, roundsText,
        roundsCap === null || roundsCap <= 0
          ? '这场战役没有轮数上限（已用 ' + roundsUsed + ' 轮）'
          : '已用 ' + roundsUsed + ' / 上限 ' + roundsCap + ' 轮'))

      var spent = b && amount(b.spentUsd) !== null ? amount(b.spentUsd) : num(c && c.spendUsd)
      var usdCap = b ? amount(b.usd) : null
      out.push(meterOf('spend', '花费', spent, usdCap,
        money(spent) + '/' + (usdCap === null || usdCap <= 0 ? '—' : money(usdCap)),
        usdCap === null || usdCap <= 0
          ? '这场战役没有美元上限（已花 ' + money(spent) + '）'
          : '已花 ' + money(spent) + ' / 上限 ' + money(usdCap)))

      var mins = t && t.measured !== false && amount(t.durationMs) !== null ? Math.round(amount(t.durationMs) / 60000) : null
      var minCap = b ? amount(b.minutes) : null
      var capText = minCap === null || minCap <= 0 ? '—' : minCap + ' 分'
      out.push(meterOf('time', '时间', mins, minCap,
        (mins === null ? '—' : mins) + '/' + capText,
        mins === null
          ? '轮内耗时未测量（不是 0）'
          : minCap === null || minCap <= 0
            ? '轮内耗时 ' + mins + ' 分，没有时间上限'
            : '轮内耗时 ' + mins + ' 分 / 上限 ' + minCap + ' 分'))

      return out
    }

    /** Per-attempt verdicts from the last round, as tiny mono chips. */
    function attemptChips(lastRound) {
      var attempts = (lastRound && lastRound.attempts) || []
      return attempts.map(function (a) {
        var label = String(a.id) + ' ' + (a.score === null || a.score === undefined ? '—' : a.score)
        if (a.screenedOut) label += ' 已筛除'
        if (a.abandoned) label += ' 已放弃'
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

    // ---- the tree ----------------------------------------------------------
    //
    // `treeOf` turns one campaign's payload into the branches a reader walks:
    // 最近一轮 (and the candidates that lost), 待审 (the decisions that block
    // it), 进行中 (what is running right now), 知识 (what it has learned).
    // `flattenTree` gives every node its depth and whether it is the last of
    // its siblings, which is all the CSS needs to draw rails and elbows.
    // Both are pure, so the shape of the panel is testable without React.

    var ROUND_ZH = { promoted: '已晋升', 'no-gain': '未晋升', 'holdout-failed': '留出集未过', exhausted: '额度耗尽', interrupted: '中断', crashed: '崩溃', screened: '已筛除' }

    function roundStatusLabel(lr) {
      if (!lr) return ''
      if (lr.status && ROUND_ZH[lr.status]) return ROUND_ZH[lr.status]
      if (lr.promoted) return '已晋升'
      if (lr.score !== null && lr.score !== undefined) return '未晋升'
      return ''
    }

    function lastRoundNode(c) {
      var lr = c.lastRound
      if (!lr || lr.n === null || lr.n === undefined) return null
      var attempts = lr.attempts || []
      var kids = attempts.map(function (a) {
        var score = a.score === null || a.score === undefined ? '—' : a.score
        var notes = []
        if (a.screenedOut) notes.push('已筛除')
        if (a.abandoned) notes.push('已放弃')
        return {
          key: 'a-' + a.id,
          label: String(a.id),
          meta: score + (notes.length ? ' · ' + notes.join(' · ') : ''),
          tone: a.verifierOk ? '#3d8a58' : '#c05a4a',
          mono: true,
        }
      })
      return {
        key: 'round',
        label: '第 ' + lr.n + ' 轮',
        meta: [roundStatusLabel(lr), lr.score === null || lr.score === undefined ? '' : String(lr.score)].filter(Boolean).join(' · '),
        tone: lr.promoted ? '#3d8a58' : '#8f7a33',
        children: kids,
      }
    }

    function waitingNode(c) {
      var cps = c.openCheckpoints || []
      if (!cps.length) return null
      return {
        key: 'wait',
        label: '待审',
        meta: String(cps.length),
        tone: '#8f7a33',
        children: cps.map(function (cp) {
          var payload = cp.payload || {}
          var detail = []
          if (payload.verdict) detail.push(String(payload.verdict))
          if (payload.delta !== undefined) detail.push('Δ' + payload.delta)
          if (payload.taskId) detail.push(String(payload.taskId))
          return {
            key: 'cp-' + cp.id,
            kind: checkpointLabel(cp.kind),
            label: cp.id,
            meta: detail.join(' · '),
            mono: true,
            actions: [
              { label: '批准', title: '接受这个检查点，让这一轮落地', action: 'decide', decision: 'approve', checkpoint: cp.id },
              { label: '驳回', title: '驳回；再点一次确认', action: 'decide', decision: 'reject', checkpoint: cp.id, danger: true, confirm: true },
              { label: '暂缓', title: '先放着，稍后再定', action: 'decide', decision: 'hold', checkpoint: cp.id },
            ],
          }
        }),
      }
    }

    function liveNode(c, live) {
      if (!live || !live.length) return null
      return {
        key: 'live',
        label: '进行中',
        meta: String(live.length),
        tone: '#3d8a58',
        children: live.map(function (a) {
          var idle = typeof a.idleMs === 'number' ? ' · 静默 ' + Math.round(a.idleMs / 1000) + ' 秒' : ''
          return { key: 'live-' + a.attemptId, label: String(a.attemptId), meta: '运行中' + idle, mono: true, tone: '#3d8a58' }
        }),
      }
    }

    function lessonsNode(c) {
      var top = c.lessonsTop || []
      if (!top.length) return null
      return {
        key: 'lessons',
        label: '知识',
        meta: String(num(c.lessons)),
        children: top.slice(0, 3).map(function (l) {
          return {
            key: 'l-' + l.id,
            kind: kindLabel(l.kind),
            label: text(l.claim, l.id),
            meta: (num(l.score) > 0 ? '+' : '') + num(l.score),
            mono: false,
          }
        }),
      }
    }

    function treeOf(c, live) {
      var nodes = []
      var round = lastRoundNode(c)
      if (round) nodes.push(round)
      var waiting = waitingNode(c)
      if (waiting) nodes.push(waiting)
      var flying = liveNode(c, live)
      if (flying) nodes.push(flying)
      var learned = lessonsNode(c)
      if (learned) nodes.push(learned)
      return nodes
    }

    function flattenTree(nodes, depth, out) {
      var list = nodes || []
      var rows = out || []
      for (var i = 0; i < list.length; i += 1) {
        var node = list[i]
        if (!node) continue
        var row = {
          key: node.key,
          depth: depth,
          last: i === list.length - 1,
          label: node.label,
          kind: node.kind || '',
          meta: node.meta || '',
          tone: node.tone || '',
          mono: node.mono === true,
          actions: node.actions || [],
        }
        rows.push(row)
        if (node.children && node.children.length) flattenTree(node.children, depth + 1, rows)
      }
      return rows
    }

    /** The tree as text: what a test asserts and what a reader would draw. */
    function treeLines(nodes) {
      return flattenTree(nodes, 1, []).map(function (row) {
        var marks = []
        for (var i = 1; i < row.depth; i += 1) marks.push('  ')
        var mark = row.last ? '└─ ' : '├─ '
        var head = (row.kind ? row.kind + ' ' : '') + row.label
        return marks.join('') + mark + head + (row.meta ? '  ' + row.meta : '')
      })
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
            title: rsiOn ? '循环正在派发；点这里停掉，战役历史不受影响' : '循环已停；在你打开之前不会派发任何一轮',
            onClick: function () {
              act('', rsiOn ? 'disable' : 'enable')
            },
          },
          h('span', { className: 'loom-dot ' + (rsiOn ? 'on' : 'off') }),
          h('span', null, rsiOn ? '循环 开' : '循环 关'),
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
              title: '重新读取 ~/.dsh/loom',
              'aria-label': '刷新',
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
                h('div', { className: 'loom-sec-head' }, '待你处理', h('span', { className: 'n' }, String(queue.length))),
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
                      { className: 'txt', title: q.summary || checkpointLabel(q.kind) },
                      h('b', null, q.campaign),
                      ' · ' + checkpointLabel(q.kind) + (q.summary ? ' — ' + q.summary : ''),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'loom-btn bare',
                        disabled: box.busy === busyKey,
                        title: '接受这个检查点，让这一轮落地',
                        onClick: function () {
                          act(q.campaign, 'decide', 'approve', q.id)
                        },
                      },
                      '批准',
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'loom-btn bare danger',
                        disabled: box.busy === busyKey,
                        title: armed ? '再点一次即驳回' : '驳回 — 需要再点一次确认',
                        onClick: function () {
                          if (!armed) {
                            setConfirming(key)
                            return
                          }
                          setConfirming(null)
                          act(q.campaign, 'decide', 'reject', q.id)
                        },
                      },
                      armed ? '确定?' : '驳回',
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
                  '知识',
                  h('span', { className: 'n' }, tree.active + ' 有效' + (tree.quarantined ? ' · ' + tree.quarantined + ' 隔离' : '')),
                ),
                tree.kinds.map(function (g) {
                  return h(
                    'div',
                    { key: g.kind },
                    h('div', { className: 'loom-kind' }, g.label + ' · ' + g.total),
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
          body = h('div', { className: 'loom-loading' }, '正在读取 ~/.dsh/loom…')
        } else if (box.error) {
          body = h('div', { className: 'loom-err' }, box.error)
        } else if (!data || !data.campaigns || data.campaigns.length === 0) {
          body = h(
            'div',
            { className: 'loom-empty' },
            '还没有战役。',
            h('br'),
            '让 agent 调 ',
            h('code', null, 'rsi_start'),
            '，给它一个目标和一个工作区，其余交给循环。',
          )
        } else {
          body = h(
            'div',
            { className: 'loom-sec' },
            h(
              'div',
              { className: 'loom-sec-head' },
              '战役',
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
          h('span', null, data && data.ownership && data.ownership.mine === false ? '由另一个窗口驱动' : '本窗口驱动'),
          data && data.lean ? h('span', { className: 'sep' }, 'Lean ' + (data.lean.available ? '就绪' : '未安装')) : null,
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
        var chain = chainPath(c.chain)
        var armed = props.confirming === c.id + ':stop'

        var head = h(
          'div',
          { className: 'loom-titlerow' },
          h('span', { className: 'loom-dot', style: { color: statusTone(c.status), marginBottom: 1 } }),
          h('span', { className: 'loom-name', title: c.id }, c.id),
          h('span', { className: 'loom-state' }, statusLabel(c.status)),
          h('span', { className: 'loom-age', title: age(c.ageMs) ? '最近活动 ' + age(c.ageMs) + '前' : '' }, folded ? '' : age(c.ageMs))
        )

        if (folded) {
          return h(
            'div',
            { className: 'loom-camp', onClick: function () { props.onToggle(c.id) }, style: { cursor: 'pointer' } },
            head,
          )
        }

        var tri = triangleChips(c)
        var spark = sparkOf(c)
        var meters = budgetMeters(c)

        var triKids = []
        tri.forEach(function (chip, i) {
          if (i > 0) triKids.push(h('span', { key: 's' + i, className: 'sep' }, '·'))
          triKids.push(
            chip.quiet
              ? h('span', { key: chip.key, className: 'loom-chip quiet', title: chip.title }, chip.label)
              : h('span', { key: chip.key, className: 'seg', title: chip.title }, chip.label),
          )
        })

        // A bar's height is its score against the best round of the window;
        // the colour is the verdict. Hover tells the round, result and score.
        var sparkNode = spark.count > 0
          ? h(
            'div',
            { className: 'loom-spark', title: '最近 ' + spark.count + ' 轮：柱高按分数、柱色按结果' },
            spark.bars.map(function (bar) {
              return h('span', {
                key: bar.key,
                className: 'pt',
                'data-tone': bar.tone,
                title: bar.title,
                style: { height: bar.px + 'px' },
              })
            }),
          )
          : null

        var metersNode = h(
          'div',
          { className: 'loom-meters' },
          meters.map(function (m) {
            return h(
              'div',
              { key: m.key, className: 'loom-meter', 'data-tone': m.tone, title: m.title },
              h('span', { className: 'k' }, m.label),
              h('span', { className: 'bar' }, h('span', { className: 'fill', style: { width: m.pct + '%' } })),
              h('span', { className: 'num' }, m.text),
            )
          }),
        )

        var qualityText = c.quality
          ? qualityLabel(c.quality.verdict) + ' · ' + num(c.quality.promotions) + '/' + num(c.quality.rounds) + ' 晋升 · '
          : ''

        var metaLine = h(
          'div',
          { className: 'loom-meta', title: qualityText + meta.join(' · ') },
          c.quality ? h('span', {
            className: 'loom-dot',
            style: { color: qualityTone(c.quality.verdict), marginRight: 4, verticalAlign: 'middle' },
          }) : null,
          qualityText,
          meta.join(' · '),
        )

        var rows = flattenTree(treeOf(c, live), 1, [])

        var treeRows = rows.map(function (row) {
          var parts = []
          // a dot marks a *branch*, not every leaf: thirty dots in a 300px
          // column is noise, four is a legend.
          if (row.tone && row.depth === 1) parts.push(h('span', { className: 'loom-dot', key: 'd', style: { color: row.tone, marginRight: 2 } }))
          if (row.kind) parts.push(h('span', { className: 'k', key: 'k' }, row.kind))
          parts.push(h('span', { className: 't' + (row.mono ? ' mono' : ''), key: 't', title: row.label }, row.label))
          if (row.meta) parts.push(h('span', { className: 'v', key: 'v' }, row.meta))
          if (row.actions && row.actions.length) {
            parts.push(
              h(
                'span',
                { className: 'acts', key: 'a' },
                row.actions.map(function (action) {
                  var armKey = c.id + ':' + row.key + ':' + action.decision
                  var isArmed = props.confirming === armKey
                  var label = isArmed ? action.label + '?' : action.label
                  return h(
                    'button',
                    {
                      key: action.decision || action.label,
                      type: 'button',
                      className: 'loom-btn' + (action.danger ? ' danger' : ''),
                      disabled: busy === c.id + ':decide',
                      title: isArmed ? '再点一次确认' : action.title,
                      onClick: function () {
                        if (action.confirm && !isArmed) {
                          props.setConfirming(armKey)
                          return
                        }
                        props.act(c.id, action.action, action.decision, action.checkpoint)
                      },
                    },
                    label,
                  )
                }),
              ),
            )
          }
          return h(
            'div',
            {
              key: row.key,
              className: 'loom-node',
              'data-depth': String(row.depth),
              'data-last': row.last ? '1' : '0',
            },
            parts,
          )
        })

        return h(
          'div',
          { className: 'loom-camp' },
          h(
            'div',
            { onClick: function () { props.onToggle(c.id) }, style: { cursor: 'pointer' } },
            head,
            h('div', { className: 'loom-obj' }, text(c.objective, '未记录目标')),
            h('div', { className: 'loom-vitals' }, sparkNode, metersNode),
            h('div', { className: 'loom-tri', title: tri.map(function (chip) { return chip.title }).join(' · ') }, triKids),
            metaLine,
            when(chain, h('div', { className: 'loom-chain', title: chain }, chain)),
          ),
          when(treeRows.length > 0, h('div', { className: 'loom-tree' }, treeRows)),
          h(
            'div',
            { className: 'loom-acts' },
            h(
              'button',
              {
                type: 'button',
                className: 'loom-btn bare',
                title: '暂停这一战役',
                disabled: busy === c.id + ':pause',
                onClick: function () { props.act(c.id, 'pause') },
              },
              busy === c.id + ':pause' ? '…' : '暂停',
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'loom-btn bare',
                title: '继续这一战役',
                disabled: busy === c.id + ':resume',
                onClick: function () { props.act(c.id, 'resume') },
              },
              busy === c.id + ':resume' ? '…' : '继续',
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'loom-btn bare danger',
                title: armed ? '再点一次即停止这一战役' : '停止 ' + c.id,
                disabled: busy === c.id + ':stop',
                onClick: function () {
                  if (!armed) {
                    props.setConfirming(c.id + ':stop')
                    return
                  }
                  props.act(c.id, 'stop')
                },
              },
              busy === c.id + ':stop' ? '…' : armed ? '停止?' : '停止',
            ),
            h('span', { className: 'sep' }),
            h(
              'button',
              {
                type: 'button',
                className: 'loom-btn bare',
                title: '收起这一战役',
                onClick: function () {
                  props.onToggle(c.id)
                },
              },
              '收起',
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
              react.createElement('path', { d: 'M3 3.2h10M3 3.2v4.2h3.6M3 7.4v4.2h3.6M10.4 3.2v4.2h2.6' }),
              react.createElement('circle', { cx: 2.6, cy: 12.8, r: 1.1 }),
              react.createElement('circle', { cx: 2.6, cy: 8.6, r: 1.1 }),
              react.createElement('circle', { cx: 2.6, cy: 4.2, r: 0 }),
              react.createElement('path', { d: 'M6.6 12.1h6.6M6.6 8h6.6' }),
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
      triangleChips: triangleChips,
      sparkOf: sparkOf,
      budgetMeters: budgetMeters,
      attemptChips: attemptChips,
      liveOf: liveOf,
      riskTone: riskTone,
      paintInk: paintInk,
      ensureStyle: ensureStyle,
      CSS: CSS,
      STYLE_ID: STYLE_ID,
      statusLabel: statusLabel,
      qualityLabel: qualityLabel,
      kindLabel: kindLabel,
      checkpointLabel: checkpointLabel,
      nodeLabel: nodeLabel,
      riskLabel: riskLabel,
      treeOf: treeOf,
      flattenTree: flattenTree,
      treeLines: treeLines,
      STATE_ZH: STATE_ZH,
      CP_ZH: CP_ZH,
      NODE_ZH: NODE_ZH,
    }
    return module.exports
  },
})
