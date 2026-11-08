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

    // Tones are names, never values: every tone resolves through the custom
    // property the stylesheet already declares, so a palette change is one edit
    // and the screen cannot disagree with the stylesheet.
    var TONES = {
      ok: 'var(--loom-ok)',
      warn: 'var(--loom-warn)',
      bad: 'var(--loom-bad)',
      idle: 'var(--loom-idle)',
    }

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
      // A campaign row is a div with role=button, not a native button, so the
      // ring has to be drawn here too: without it the keyboard lands on a row
      // nobody can see. The outline is real and sits outside the row.
      '.loom-camp .loom-hit:focus-visible{outline:1px solid var(--loom-soft);outline-offset:2px}',
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
      // campaign blocks: a responsive grid, so a wide panel spends its width on
      // more campaigns instead of stretching one column of text. Cards hold the
      // grid track (`minmax(0,1fr)` children are what actually prevents the
      // overflow), and only the campaign that needs a decision is opened.
      '.loom-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(296px,1fr));',
      ' gap:8px;align-items:start;min-width:0}',
      // knowledge is short claims, not prose: pack them into as many columns as
      // the panel has room for instead of one tall list of dim text
      '.loom-kgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(164px,1fr));',
      ' gap:1px 10px;padding:0 12px 2px;min-width:0}',
      '.loom-camp{padding:9px 11px 10px;border:1px solid var(--loom-line);border-radius:6px;min-width:0;',
      ' background:color-mix(in srgb,var(--loom-base) 1.5%,transparent)}',
      '.loom-camp.folded{padding:0}',
      '.loom-camp .loom-hit{display:flex;align-items:center;gap:6px;padding:7px 9px;min-width:0;cursor:pointer;',
      ' border-radius:5px;transition:background 150ms var(--loom-ease)}',
      '.loom-camp .loom-hit:hover{background:var(--loom-hover)}',
      '.loom-camp:not(.folded) .loom-hit{padding:0 0 2px}',
      '.loom-camp .loom-caret{margin-left:auto;flex:0 0 auto;font-family:var(--loom-mono);font-size:10px;',
      ' color:var(--loom-faint);line-height:1}',
      '.loom-camp .loom-flag{flex:0 0 auto;font-family:var(--loom-mono);font-size:9px;letter-spacing:.04em;',
      ' padding:1px 4px;border-radius:3px;color:var(--loom-warn);',
      ' background:color-mix(in srgb,var(--loom-warn) 14%,transparent)}',
      '.loom-camp .loom-brief{flex:1 1 auto;min-width:0;font-family:var(--loom-mono);font-size:10px;',
      ' color:var(--loom-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loom-camp:hover{background:color-mix(in srgb,var(--loom-base) 2.5%,transparent)}',
      '.loom-titlerow{display:flex;align-items:baseline;gap:7px;min-width:0}',
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
      // An unscored round draws nothing at all: no min-height, so height 0 is
      // truly invisible instead of a 2px stub that reads as a zero score.
      '.loom-spark .pt{display:block;width:4px;border-radius:1px;background:var(--loom-faint);',
      ' transition:background 150ms var(--loom-ease)}',
      '.loom-spark .pt[data-tone="ok"]{background:var(--loom-ok)}',
      '.loom-spark .pt[data-tone="warn"]{background:var(--loom-warn)}',
      '.loom-spark .pt[data-tone="bad"]{background:var(--loom-bad)}',
      '.loom-spark .pt[data-tone="idle"]{background:var(--loom-faint)}',
      // A measured zero is a neutral baseline tick, not a verdict-coloured bar:
      // it must be visible, and it must not be mistaken for an unscored slot.
      '.loom-spark .pt[data-zero="true"]{background:var(--loom-line2);border-radius:0}',
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
      // A checkpoint row can carry three buttons (approve / reject / snooze) and
      // a signature-like value; at 320px they do not fit on one line, and a row
      // that cannot wrap pushes the buttons outside the panel where overflow-x
      // clips them - visible nowhere and clickable nowhere. So the row wraps, and
      // the actions keep their own line rather than being squeezed to nothing.
      '.loom-node{position:relative;display:flex;flex-wrap:wrap;align-items:baseline;gap:6px;min-width:0;',
      ' row-gap:2px;padding:3px 0 3px 18px;transition:background 150ms var(--loom-ease)}',
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
      '.loom-node .acts{flex:0 1 auto;display:flex;flex-wrap:wrap;gap:2px;margin-left:auto;min-width:0}',
      '.loom-node .acts .loom-btn{font-size:10.5px;padding:2px 5px}',
      // 检查点解释换行显示：读者不必 hover 才知道这一行是什么、不管会怎样。
      '.loom-node .help{flex:1 0 100%;font-size:10px;line-height:1.45;color:var(--loom-faint);white-space:normal}',
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
      '.loom-lesson{display:flex;align-items:baseline;gap:8px;padding:2px 0;font-size:11.5px;color:var(--loom-soft);min-width:0}',
      '.loom-lesson .claim{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.loom-lesson .score{font-family:var(--loom-mono);font-size:10px;color:var(--loom-quiet);white-space:nowrap}',
      '.loom-kind{padding:3px 12px 1px 18px;font-size:10px;letter-spacing:.04em;color:var(--loom-quiet)}',
      '.loom-note{padding:1px 12px 5px 18px;font-size:10px;line-height:1.5;color:var(--loom-faint)}',
      // shell
      '.loom-scroll{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;min-height:0;',
      ' scrollbar-width:thin}',
      '.loom-foot{display:flex;align-items:center;gap:6px;padding:7px 12px;border-top:1px solid var(--loom-line);',
      ' font-size:9.5px;letter-spacing:.04em;color:var(--loom-soft)}',
      '.loom-foot .sep{margin-left:auto}',
      '.loom-empty{padding:14px 12px 16px;font-size:11.5px;line-height:1.6;color:var(--loom-quiet)}',
      '.loom-empty code{font-size:11px;color:var(--loom-soft)}',
      '.loom-err{padding:10px 12px;font-family:var(--loom-mono);font-size:10.5px;color:var(--loom-bad);word-break:break-word}',
      // the failure explains itself in three layers: a Chinese title, what it
      // does and does not mean, then the raw message in a quieter tone so it
      // stays available without being the headline
      '.loom-err b{display:block;margin-bottom:4px;font-family:inherit;font-size:11.5px;letter-spacing:.04em}',
      '.loom-err .hint{font-family:inherit;font-size:11px;line-height:1.55;color:var(--loom-soft);margin-bottom:6px}',
      '.loom-err .detail{margin-top:7px;font-size:10px;color:var(--loom-quiet);word-break:break-all}',
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

    /**
     * What a campaign has spent, or null when the host has not measured it.
     *
     * `triangle.usd === null` and `measured: false` both mean "unknown", not
     * "free", and the difference is the whole point of the money strip. A
     * payload without a triangle falls back to the budget, then to spendUsd,
     * which is what older hosts sent.
     */
    function costOf(c) {
      var t = c && c.triangle
      if (t) {
        if (t.measured === false) return null
        return typeof t.usd === 'number' && isFinite(t.usd) ? t.usd : null
      }
      var budget = c && c.budget
      if (budget && typeof budget.spentUsd === 'number' && isFinite(budget.spentUsd)) return budget.spentUsd
      return c && typeof c.spendUsd === 'number' && isFinite(c.spendUsd) ? c.spendUsd : null
    }

    /** A campaign's cost, said out loud: 未定价 rather than a $0 it cannot back. */
    function costLabel(c) {
      var usd = costOf(c)
      return usd === null ? '未定价' : money(usd)
    }

    /** Whether the payload carries any cost figure for this campaign. */
    function costKnown(c) {
      return !!(c && (c.triangle || c.budget || typeof c.spendUsd === 'number'))
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
      if (status === 'running') return TONES.ok
      if (status === 'paused') return TONES.warn
      if (status === 'failed' || status === 'error') return TONES.bad
      return TONES.idle
    }

    function qualityTone(verdict) {
      if (verdict === 'healthy') return TONES.ok
      if (verdict === 'stalled') return TONES.warn
      if (verdict === 'regressing') return TONES.bad
      return TONES.idle
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

    // 每种检查点的说明：发生了什么，以及放着不管要付什么代价。
    // 标签只是名字，读者还得知道「门不可达」意味着什么、不点会不会自己好。
    // 键集合与 CP_ZH 一致；未知类型也要说明自己未知，而不是渲染成空白。
    var CP_HELP = {
      gate: {
        what: '有一轮改动通过了验收，正等一次人工点头才会落地成提交。',
        ifIgnored: '这一轮会一直停在待审状态，晋升不会落地，战役也不会继续往下跑。',
      },
      anomaly: {
        what: '循环在账本里发现了前后矛盾的记录，例如记了落地却没有对应的提交。',
        ifIgnored: '矛盾不会被自动修复，之后的轮次会继续基于错误的账本累积。',
      },
      plateau: {
        what: '连续多轮没有出现晋升，循环怀疑这条链已经不再带来增益。',
        ifIgnored: '循环会按原策略继续空转，继续消耗预算却不改变结论。',
      },
      holdout: {
        what: '留出集上的分数出现回退，晋升门因此把这一轮的候选挡了下来。',
        ifIgnored: '回退不会自己消失，后续候选会继续在留出集上失分。',
      },
      stuck: {
        what: '工作树里的验收门始终不可达，候选跑完了也拿不到一个裁决。',
        ifIgnored: '同一道门会一轮轮重试，每轮都烧掉一次完整的候选成本。',
      },
      exhausted: {
        what: '链里所有模型的预算都已耗尽，这一轮根本没跑起来。',
        ifIgnored: '循环会反复重试同样的模型，继续失败却不产生任何新证据。',
      },
      budget: {
        what: '这一轮的预计花费会越过战役设定的美元或轮次上限。',
        ifIgnored: '预算会被悄悄超支，或者轮次在你还想要结果时就被截断。',
      },
      human: {
        what: '这是一个需要人给方向的确认点，循环自己无法决定下一步。',
        ifIgnored: '循环会停在原地等待，不产生新的轮次，也不会自动越过这个决定。',
      },
    }

    /** 某类检查点的解释；未知类型如实说自己未知，并带上类型名。 */
    function checkpointHelp(kind) {
      var known = CP_HELP[kind]
      if (known) return { what: known.what, ifIgnored: known.ifIgnored }
      var label = kind === undefined || kind === null || kind === '' ? '(未命名)' : String(kind)
      return {
        what: '未知的检查点类型「' + label + '」，面板还没有为它写过说明。',
        ifIgnored: '不知道它意味着什么，也就无法判断放着不管要付什么代价；请先看事件日志里这一条的原始数据。',
      }
    }

    /** 一行里同时给出「是什么」和「不管会怎样」。 */
    function checkpointHelpText(kind) {
      var help = checkpointHelp(kind)
      return help.what + ' 若忽略：' + help.ifIgnored
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
      var o = { campaigns: 0, running: 0, rounds: 0, spend: 0, priced: 0, open: 0, live: 0, lessons: 0 }
      for (var i = 0; i < rows.length; i += 1) {
        var c = rows[i]
        if (!c || c.error) continue
        o.campaigns += 1
        if (c.status === 'running') o.running += 1
        o.rounds += num(c.rounds)
        // Only measured money enters the sum: an unpriced campaign must not
        // pad the total with a zero it did not earn.
        var usd = costOf(c)
        if (usd !== null) {
          o.spend += usd
          o.priced += 1
        }
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
        // Zero measured campaigns is "unpriced", not "$0": a total over no
        // measurements is not a measurement.
        { key: 'spend', label: '花费', value: o.priced === 0 ? '未定价' : money(o.spend) },
        { key: 'lessons', label: '知识', value: String(o.lessons) },
      ]
    }

    var RISK_ORDER = { high: 0, normal: 1, low: 2 }
    /**
     * How many checkpoints are waiting on this campaign.
     *
     * The host sends both `open` (a number, for the badge) and `openCheckpoints`
     * (the rows themselves). Reading the array as a count is the bug this
     * function exists to prevent: `Number([])` is 0 and `Number([{}])` is NaN, so
     * a campaign with a real question pending rendered no badge at all and was
     * never the one opened by default.
     */
    function openCount(c) {
      if (!c) return 0
      if (typeof c.open === 'number' && Number.isFinite(c.open)) return c.open
      if (Array.isArray(c.openCheckpoints)) return c.openCheckpoints.filter(Boolean).length
      if (Array.isArray(c.checkpoints)) return c.checkpoints.length
      var n = Number(c.openCheckpoints)
      return Number.isFinite(n) && n > 0 ? n : 0
    }

    function riskOf(value) {
      return RISK_ORDER[value] === undefined ? 9 : RISK_ORDER[value]
    }

    /**
     * What to say when the state fetch itself failed.
     *
     * The panel is a reader, not the loop: an HTTP 500 on this one request says
     * nothing about whether rounds are still running. Printing the raw error
     * (usually an English "Failed to fetch") left the reader unable to tell a
     * dead panel from a dead campaign, so the title and the hint carry that
     * distinction and the raw message stays visible underneath for debugging.
     * `retry` is optional; without one the panel offers no action it cannot
     * honour rather than a button that does nothing.
     */
    function errorState(error, opts) {
      var retry = opts && typeof opts.retry === 'function' ? opts.retry : null
      var detail = ''
      if (error) {
        if (typeof error === 'string') detail = error
        else if (typeof error.message === 'string') detail = error.message
        else detail = String(error)
      }
      return {
        title: '读取失败',
        hint: '循环仍在运行 —— 读不到的是这个面板，不是战役。它会自动重试；也可以点“重试”立刻再读一次。',
        detail: detail,
        action: retry ? { label: '重试', onClick: retry } : null,
      }
    }

    // A campaign in any other state is still work in progress (or broken in a
    // way the panel renders as a card), so only these may count as settled.
    var FINISHED = { done: true, stopped: true, failed: true, error: true }

    /**
     * The one message that stands in for the campaign list — or null.
     *
     * "no campaign yet" and "every campaign finished" used to be the same
     * sentence, which read as a lie once the loop had run. Neither may replace
     * live work: running/paused/planning campaigns and a checkpoint waiting on
     * a human are both reasons to say nothing here and render the rows.
     */
    function emptyState(data) {
      var rows = data && Array.isArray(data.campaigns) ? data.campaigns : []
      if (!rows.length) {
        return {
          title: '还没有战役',
          hint: '让 agent 调 rsi_start，给它一个目标和一个工作区，其余交给循环。',
        }
      }
      for (var i = 0; i < rows.length; i += 1) {
        var c = rows[i]
        if (!c) continue
        if (!FINISHED[c.status]) return null
        if (openCount(c) > 0) return null
      }
      return {
        title: '都处理完了',
        hint: '每个战役都已结束，也没有待处理的检查点。调用 rsi_start 可以开一个新的。',
      }
    }

    /**
     * Every decision waiting on a human, across every campaign, riskiest first.
     * A checkpoint is the loop asking a question; hiding it one campaign card
     * down is how a person misses the one that mattered.
     */
    function pending(data, opts) {
      // A checkpoint's wait is its own: the campaign may have run for hours, but
      // the question on the table may have been asked a minute ago. `now` is
      // injectable so the queue can be read as of a fixed instant.
      var now = opts && typeof opts.now === 'number' && isFinite(opts.now) ? opts.now : Date.now()
      var verbs = ['approve', 'reject', 'snooze']
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
          // No `at` means the wait is unknown; borrowing the campaign's age
          // would make a fresh question look stale (and vice versa).
          var at = typeof cp.at === 'number' && isFinite(cp.at) ? cp.at : null
          // A human hold postpones the question without answering it. It is
          // only a postponement until it expires: after `until` the question is
          // live again and must rank like any other.
          var heldUntil =
            cp.held && typeof cp.held === 'object' && typeof cp.held.until === 'number' && isFinite(cp.held.until)
              ? cp.held.until
              : null
          var deferred = heldUntil !== null && heldUntil > now
          out.push({
            campaign: c.id,
            id: cp.id,
            kind: cp.kind,
            risk: review ? review.risk : 'normal',
            // Where the risk came from. The host trims each campaign's reviews
            // to three, so a fourth open checkpoint arrives with no assessment
            // at all; calling that risk "normal" is a quiet lie. `default` says
            // nobody has looked yet.
            riskSource: review ? 'review' : 'default',
            summary: review ? review.summary : '',
            // The queue is often the only place a checkpoint is read, so the
            // row carries the same explanation the campaign tree shows.
            help: checkpointHelpText(cp.kind),
            waitMs: at === null ? null : Math.max(0, now - at),
            // A postponed row says so, and says when it is worth reading again;
            // it stays in the queue so it is not silently forgotten.
            deferred: deferred,
            deferUntil: deferred ? heldUntil : null,
            actions: verbs,
          })
        }
      }
      out.sort(function (a, b) {
        // Risk still decides first; among equally risky rows, work that is
        // actually waiting outranks work a human already postponed.
        return (
          riskOf(a.risk) - riskOf(b.risk) ||
          (a.deferred ? 1 : 0) - (b.deferred ? 1 : 0) ||
          (a.campaign < b.campaign ? -1 : a.campaign > b.campaign ? 1 : 0) ||
          (a.id < b.id ? -1 : 1)
        )
      })
      return out
    }

    /**
     * The open-checkpoint queue with its own arithmetic.
     *
     * `pending` returns the rows but no count, so a caller that trims what it
     * draws also shrinks what it claims exists. Here `total` is the number of
     * questions actually waiting (before any display cap), `shown` is how many
     * are being drawn, and `assessed` counts the rows whose risk came from a
     * real review rather than the `normal` default.
     *
     * The host can ship a campaign's open questions as a count with fewer (or
     * no) `openCheckpoints` rows, because it trims what it sends. Counting rows
     * alone would let `total` fall to whatever survived that trim — the exact
     * lie this queue exists to prevent — so each campaign contributes the
     * larger of its listed rows and its reported open count.
     */
    function queueOf(data, opts) {
      var rows = pending(data, opts)
      var listed = {}
      for (var i = 0; i < rows.length; i += 1) {
        listed[rows[i].campaign] = (listed[rows[i].campaign] || 0) + 1
      }
      var campaigns = (data && data.campaigns) || []
      var total = 0
      for (var c = 0; c < campaigns.length; c += 1) {
        var campaign = campaigns[c]
        if (!campaign || campaign.error) continue
        total += Math.max(listed[campaign.id] || 0, openCount(campaign))
      }
      var raw = opts && opts.limit
      var limit = typeof raw === 'number' && isFinite(raw) && raw >= 0 ? Math.floor(raw) : null
      var drawn = limit === null ? rows : rows.slice(0, limit)
      var reviewed = 0
      for (var k = 0; k < rows.length; k += 1) {
        if (rows[k].riskSource === 'review') reviewed += 1
      }
      return {
        rows: drawn,
        total: total,
        shown: drawn.length,
        limit: limit,
        assessed: reviewed,
        // Questions the host counted but did not itemise. They are waiting
        // too; the header must not hide them just because no row can be drawn.
        unlisted: Math.max(0, total - rows.length),
      }
    }

    /**
     * The props that make a campaign row a real button: focusable, announced as
     * expanded/collapsed, and operable with Enter or Space. Pure, so the keyboard
     * contract can be pinned without a browser. `onToggle` is optional (a row
     * that is only a label must still be safe to press) and receives the
     * campaign id, like the click it replaces.
     */
    function hitProps(c, expanded, onToggle) {
      function fire() {
        if (typeof onToggle === 'function') onToggle(c && c.id)
      }
      return {
        role: 'button',
        tabIndex: 0,
        'aria-expanded': expanded === true,
        onClick: fire,
        onKeyDown: function (e) {
          var key = e && e.key
          // Only the two keys that activate a button; everything else (typing,
          // Tab, arrows) belongs to the page and must not be consumed.
          if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') return
          if (typeof e.preventDefault === 'function') e.preventDefault()
          fire()
        },
      }
    }

    /**
     * The loop control as a real switch: announced as a switch, says whether it
     * is on, sits in the tab order, and toggles on Enter/Space only. Pure for
     * the same reason as hitProps: the keyboard contract is pinned without a
     * browser. A missing handler is not a crash, only a switch that cannot act.
     */
    function switchProps(on, onToggle) {
      var checked = on === true
      return {
        role: 'switch',
        'aria-checked': checked,
        tabIndex: 0,
        onKeyDown: function (e) {
          var key = e && e.key
          // Only the two keys that flip a switch; everything else (letters,
          // Tab, arrows) belongs to the page and must not be consumed.
          if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') return
          if (typeof e.preventDefault === 'function') e.preventDefault()
          if (typeof onToggle === 'function') onToggle(!checked)
        },
      }
    }

    /**
     * The one place that decides which lessons the panel has, and in what order.
     * Two views read it: the section groups by kind and caps at four (a section
     * can afford four), and each campaign's tree takes the top three of the
     * same rows (it sits inside a card). The caps differ on purpose; the order
     * and the corpus must not. `byCampaign` keeps every lesson, uncapped, so a
     * projection never has to re-derive what "first" means.
     */
    function lessonKind(kind) {
      return kind === 'hazard' || kind === 'recipe' ? kind : 'fact'
    }

    function knowledgeOf(data) {
      var rows = (data && data.campaigns) || []
      var groups = { fact: [], hazard: [], recipe: [] }
      var byCampaign = {}
      var active = 0
      var quarantined = 0
      var rank = 0
      for (var i = 0; i < rows.length; i += 1) {
        var c = rows[i]
        // A campaign that failed to load has no lessons to show; carrying its
        // error row into the corpus would invent lessons it never had.
        if (!c || c.error) continue
        active += num(c.lessons)
        quarantined += num(c.quarantined)
        var top = c.lessonsTop || []
        var pending = []
        for (var j = 0; j < top.length; j += 1) {
          var l = top[j] || {}
          pending.push({
            campaign: c.id,
            id: l.id,
            claim: l.claim,
            kind: lessonKind(l.kind),
            score: num(l.score),
            at: j,
          })
        }
        // Score-descending, and the insertion index is the tiebreak: two
        // lessons with the same score keep the order the host sent them in,
        // so every view reads the same "first".
        pending.sort(function (a, b) {
          return b.score - a.score || a.at - b.at
        })
        var ordered = []
        for (var k = 0; k < pending.length; k += 1) {
          var lesson = {
            campaign: pending[k].campaign,
            id: pending[k].id,
            claim: pending[k].claim,
            kind: pending[k].kind,
            score: pending[k].score,
          }
          ordered.push(lesson)
          // rank records corpus order across campaigns; the kind groups are a
          // stable re-sort of the very same rows.
          groups[lesson.kind].push({ row: lesson, rank: rank })
          rank += 1
        }
        byCampaign[c.id] = ordered
      }
      var kinds = []
      for (var key in groups) {
        var bucket = groups[key]
        if (!bucket.length) continue
        bucket.sort(function (a, b) {
          return b.row.score - a.row.score || a.rank - b.rank
        })
        var items = []
        for (var t = 0; t < bucket.length && t < 4; t += 1) items.push(bucket[t].row)
        kinds.push({ kind: key, label: kindLabel(key), items: items, total: bucket.length })
      }
      return { active: active, quarantined: quarantined, kinds: kinds, byCampaign: byCampaign }
    }

    /**
     * The section is a projection of the corpus, never a second pass: same
     * grouping, same order, same objects.
     */
    function knowledge(data) {
      var corpus = knowledgeOf(data)
      return {
        active: corpus.active,
        quarantined: corpus.quarantined,
        kinds: corpus.kinds,
        byCampaign: corpus.byCampaign,
      }
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
      // A folded row must carry the unpriced label: the meters only exist on
      // the expanded card, so silence here would read as "it cost nothing".
      if (costKnown(c) && costOf(c) === null) out.push(costLabel(c))
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
     * the window, colour is the verdict. Three states, three marks: no score is
     * `unknown` and draws nothing, a measured zero is `zero` and keeps a
     * baseline mark, a scored round scales with the score. No rounds is an
     * empty sparkline, not an error — a campaign one minute old has nothing to
     * trend yet.
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
        // Three different states, three different marks: a round with no score
        // is unknown and draws nothing, a round that ran and scored zero keeps
        // a baseline mark, and a scored round is proportional to its score.
        var unknown = score === null
        var zero = !unknown && score <= 0
        var share = unknown || zero ? 0 : Math.min(1, score / max)
        var px = unknown ? 0 : zero ? 2 : 2 + Math.max(1, Math.round(share * (SPARK_PX - 2)))
        return {
          key: 'r' + r.n,
          n: r.n,
          score: score,
          unknown: unknown,
          zero: zero,
          px: px,
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

    /** How long one node took, in the units the rest of the panel speaks. */
    function nodeDuration(ms) {
      var total = amount(ms)
      if (total === null || total < 0) return ''
      var secs = Math.floor(total / 1000)
      if (secs < 60) return secs + '秒'
      var mins = Math.floor(secs / 60)
      var rest = secs % 60
      return rest ? mins + '分' + rest + '秒' : mins + '分'
    }

    /**
     * The node rows the host ships as `c.nodes` (newest round first) as chips:
     * 规划 and how long it took, 丢失 for a node the ledger never saw finish. A
     * campaign from before node identity has no rows, and gets no chips - the
     * panel must not invent an attribution it was not given.
     */
    function nodeChips(c) {
      var rows = c && Array.isArray(c.nodes) ? c.nodes : []
      return rows.map(function (n, i) {
        var id = n && n.id !== null && n.id !== undefined ? String(n.id) : 'node'
        var role = n && n.role ? String(n.role) : ''
        var label = role === 'planner' ? '规划' : role ? nodeLabel(role) : id
        var lost = n && n.status === 'lost'
        if (lost) label += ' 丢失'
        else {
          var took = nodeDuration(n && n.durationMs)
          if (took) label += ' ' + took
        }
        return {
          key: id + '@' + (n && n.round !== null && n.round !== undefined ? n.round : '?') + '#' + i,
          label: label,
          title: id + (n && n.round !== null && n.round !== undefined ? ' · 第 ' + n.round + ' 轮' : '') +
            (n && n.status ? ' · ' + n.status : ''),
          tone: lost ? TONES.bad : n && n.status === 'done' ? TONES.ok : TONES.warn,
        }
      })
    }

    /**
     * One 8px band for a round: each *measured* node's share of the time.
     *
     * Research: `research/ui-refs-2026-11.md` P1. Chips answer "how long did each
     * node take"; the band answers "where did the round go" in one glance, the way
     * Grafana strips and GitHub's job bar do.
     *
     * The split uses the largest-remainder method so the parts sum to exactly 100
     * percent: rounding each share on its own is how a bar ends up lying at 99 or
     * 101, and the width is the argument. A node without a duration is counted in
     * `unknown` and given no width at all - unknown is not zero seconds. When no
     * node is measurable the function returns null, so the caller can omit the
     * element instead of drawing an empty bar.
     *
     * @param {{nodes?: Array<object>}} [c] campaign payload with node rows
     * @returns {{total: number, unknown: number, segments: Array<{key: string, label: string, ms: number, pct: number, tone: string, title: string}>}|null}
     */
    function nodeBand(c) {
      var rows = c && Array.isArray(c.nodes) ? c.nodes : []
      var measured = []
      var unknown = 0
      for (var i = 0; i < rows.length; i += 1) {
        var n = rows[i]
        var ms = amount(n && n.durationMs)
        if (ms !== null && ms > 0) measured.push({ node: n, ms: ms, index: i })
        else unknown += 1
      }
      if (!measured.length) return null

      var total = 0
      for (var m = 0; m < measured.length; m += 1) total += measured[m].ms

      var shares = measured.map(function (x) {
        return (x.ms / total) * 100
      })
      var pcts = shares.map(function (v) {
        return Math.floor(v)
      })
      var used = 0
      for (var u = 0; u < pcts.length; u += 1) used += pcts[u]

      // Largest remainder: hand the missing points to the largest fractions first,
      // ties in reading order, so the ordering never drifts with the sort.
      var order = shares.map(function (v, idx) {
        return { idx: idx, rest: v - Math.floor(v) }
      }).sort(function (a, b) {
        return b.rest - a.rest || a.idx - b.idx
      })
      var left = 100 - used
      for (var o = 0; o < order.length && left > 0; o += 1) {
        pcts[order[o].idx] += 1
        left -= 1
      }
      // A 1px sliver must still be visible: no measured part may claim 0 percent.
      // Take the point from the widest part, never from a segment already at one.
      if (measured.length <= 100) {
        for (var q = 0; q < pcts.length; q += 1) {
          if (pcts[q] > 0) continue
          var donor = 0
          for (var d = 1; d < pcts.length; d += 1) if (pcts[d] > pcts[donor]) donor = d
          if (pcts[donor] <= 1) break
          pcts[donor] -= 1
          pcts[q] += 1
        }
      }

      var seen = {}
      var segments = measured.map(function (x, j) {
        var n = x.node
        var id = n && n.id !== null && n.id !== undefined ? String(n.id) : 'node'
        var key = id
        // A node id repeats across rounds (recon runs every round); keep the keys
        // unique for React without changing the id a reader can grep.
        if (seen[key]) key = id + '#' + x.index
        seen[key] = true
        var role = n && n.role ? String(n.role) : ''
        var label = role === 'planner' ? '规划' : role ? nodeLabel(role) : id
        var lost = n && n.status === 'lost'
        var took = nodeDuration(x.ms)
        var title = label + (took ? ' ' + took : '') +
          (n && n.round !== null && n.round !== undefined ? ' · 第 ' + n.round + ' 轮' : '') +
          (n && n.status ? ' · ' + n.status : '')
        return {
          key: key,
          label: label,
          ms: x.ms,
          pct: pcts[j],
          tone: lost ? TONES.bad : n && n.status === 'done' ? TONES.ok : TONES.warn,
          title: title,
        }
      })
      return { total: total, unknown: unknown, segments: segments }
    }

    /** Live attempts of one campaign, newest first, as the ids a person can grep. */
    function liveOf(data, campaign) {
      return ((data && data.live) || []).filter(function (a) {
        return a && a.campaign === campaign
      })
    }

    function riskTone(risk) {
      if (risk === 'high') return TONES.bad
      if (risk === 'low') return TONES.idle
      return TONES.warn
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
          tone: a.verifierOk ? TONES.ok : TONES.bad,
          mono: true,
        }
      })
      return {
        key: 'round',
        label: '第 ' + lr.n + ' 轮',
        meta: [roundStatusLabel(lr), lr.score === null || lr.score === undefined ? '' : String(lr.score)].filter(Boolean).join(' · '),
        tone: lr.promoted ? TONES.ok : TONES.warn,
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
        tone: TONES.warn,
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
            help: checkpointHelpText(cp.kind),
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
        tone: TONES.ok,
        children: live.map(function (a) {
          var idle = typeof a.idleMs === 'number' ? ' · 静默 ' + Math.round(a.idleMs / 1000) + ' 秒' : ''
          return { key: 'live-' + a.attemptId, label: String(a.attemptId), meta: '运行中' + idle, mono: true, tone: TONES.ok }
        }),
      }
    }

    function lessonsNode(c, corpus) {
      if (!c) return null
      // The tree is the same ordered list, capped at three. Callers that already
      // have the corpus pass it in; callers that only have the campaign row get
      // the identical order from the same function.
      var ordered =
        (corpus && corpus.byCampaign && corpus.byCampaign[c.id]) ||
        knowledgeOf({ campaigns: [c] }).byCampaign[c.id] ||
        []
      if (!ordered.length) return null
      return {
        key: 'lessons',
        label: '知识',
        meta: String(num(c.lessons)),
        children: ordered.slice(0, 3).map(function (l) {
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

    function treeOf(c, live, corpus) {
      var nodes = []
      var round = lastRoundNode(c)
      if (round) nodes.push(round)
      var waiting = waitingNode(c)
      if (waiting) nodes.push(waiting)
      var flying = liveNode(c, live)
      if (flying) nodes.push(flying)
      var learned = lessonsNode(c, corpus)
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
          help: node.help || '',
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
        var switchToggle = function () {
          act('', rsiOn ? 'disable' : 'enable')
        }
        // Same shape as a campaign row: the pure props first, then the look.
        var switchLook = switchProps(rsiOn, switchToggle)
        switchLook.type = 'button'
        switchLook.className = 'loom-switch'
        switchLook.onClick = switchToggle
        switchLook.title = rsiOn ? '循环正在派发；点这里停掉，战役历史不受影响' : '循环已停；在你打开之前不会派发任何一轮'
        var switchBtn = h(
          'button',
          switchLook,
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

        var queue = queueOf(data)
        var tree = knowledge(data)

        // Which campaign is worth opening by default: the one that is waiting on
        // a human, else the one that is moving. Everything else stays a single
        // line -- a panel that opens every campaign forces the reader to scroll
        // past detail they did not ask for.
        var attention = null
        if (data && data.campaigns) {
          var waiting = data.campaigns.filter(function (c) {
            return c && !c.error && openCount(c) > 0
          })[0]
          var moving = data.campaigns.filter(function (c) {
            return c && !c.error && c.status === 'running'
          })[0]
          attention = (waiting || moving || {}).id || null
        }
        var isFolded = function (c) {
          var chosen = folded[c.id]
          if (chosen === true) return true
          if (chosen === false) return false
          return c.id !== attention
        }
        var anyOpen = Boolean(data && data.campaigns && data.campaigns.some(function (c) {
          return c && !c.error && !isFolded(c)
        }))
        var foldAll = function (collapse) {
          setFolded(function (prev) {
            var next = {}
            for (var key in prev) next[key] = prev[key]
            if (data && data.campaigns) {
              data.campaigns.forEach(function (c) {
                if (c) next[c.id] = collapse
              })
            }
            writeCollapsed(next)
            return next
          })
        }

        // The header must answer two questions, not one: how many are waiting,
        // and how many of those anybody has actually assessed. The host trims
        // reviews to three, so the difference is not decoration.
        var queueUnassessed = Math.max(0, queue.total - queue.assessed)
        var queueNotes = []
        if (queueUnassessed > 0) queueNotes.push('「未评估」表示宿主没有看过这条检查点的风险，不是低优先级。')
        if (queue.unlisted > 0) queueNotes.push('另有 ' + queue.unlisted + ' 条宿主只给了数量，没有明细。')
        var queueNote = queueNotes.length ? h('div', { className: 'loom-note' }, queueNotes.join('')) : null

        var pendingBlock =
          queue.total === 0
            ? null
            : h(
                'div',
                {
                  className: 'loom-sec',
                  // A checkpoint can arrive while the panel is already open, so
                  // the whole queue is a polite live region: additions are
                  // announced, and nothing interrupts what is being read. The
                  // quoted keys below are React props; the canonical names are
                  // aria-live: 'polite' and aria-label: '待你处理'.
                  'aria-live': 'polite',
                  'aria-label': '待你处理',
                },
                h(
                  'div',
                  { className: 'loom-sec-head' },
                  '待你处理',
                  h(
                    'span',
                    {
                      className: 'n',
                      title:
                        queue.total + ' 条等待中，其中 ' + queue.assessed + ' 条有风险评估，' +
                        queueUnassessed + ' 条没有（宿主最多只评估三条）',
                    },
                    queue.total + ' 条 · ' + queue.assessed + ' 已评估',
                  ),
                ),
                queueNote,
                queue.rows.map(function (q) {
                  var key = q.campaign + ':' + q.id
                  var busyKey = q.campaign + ':decide'
                  var armed = confirming === key
                  var assessed = q.riskSource === 'review'
                  var why = assessed ? q.summary || checkpointLabel(q.kind) : '宿主没有评估这条检查点的风险'
                  // What happened and what ignoring it costs, in the tooltip:
                  // the queue row is too narrow to wrap the whole explanation.
                  var rowTitle = q.help ? why + ' · ' + q.help : why
                  return h(
                    'div',
                    { key: key, className: 'loom-row' },
                    h('span', {
                      className: 'loom-dot',
                      // An unreviewed checkpoint has unknown risk, not normal:
                      // the dot stays neutral instead of borrowing the "normal"
                      // amber the host never sent.
                      style: { color: assessed ? riskTone(q.risk) : 'var(--loom-faint)' },
                    }),
                    h(
                      'span',
                      { className: 'txt', title: rowTitle },
                      h('b', null, q.campaign),
                      ' · ' + checkpointLabel(q.kind) + (q.summary ? ' — ' + q.summary : ''),
                      assessed
                        ? null
                        : h('span', { className: 'loom-chip quiet', style: { marginLeft: 6 } }, '未评估'),
                      // A held row is still in the queue on purpose, but it says
                      // so: 暂缓 postponed it, it did not answer it.
                      q.deferred
                        ? h(
                            'span',
                            {
                              className: 'loom-chip quiet',
                              style: { marginLeft: 6 },
                              title: '已暂缓至 ' + new Date(q.deferUntil).toLocaleString('zh-CN'),
                            },
                            '已暂缓',
                          )
                        : null,
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
                    h(
                      'div',
                      { className: 'loom-kgrid' },
                      g.items.map(function (item) {
                        return h(
                          'div',
                          { key: item.campaign + ':' + item.id, className: 'loom-lesson', title: text(item.claim, item.id) },
                          h('span', { className: 'claim' }, text(item.claim, item.id)),
                          h(
                            'span',
                            { className: 'score', style: { color: item.score > 0 ? TONES.ok : item.score < 0 ? TONES.bad : undefined } },
                            (item.score > 0 ? '+' : '') + item.score,
                          ),
                        )
                      }),
                    ),
                  )
                }),
              )

        var body
        if (box.loading) {
          body = h('div', { className: 'loom-loading' }, '正在读取 ~/.dsh/loom…')
        } else if (box.error) {
          // Retry is this panel's own reload: a failed read is not a failed
          // loop, so the reader is told so and offered the one action that can
          // actually change the answer.
          var failure = errorState(box.error, { retry: load })
          body = h(
            'div',
            { className: 'loom-err', role: 'alert' },
            h('b', null, failure.title),
            h('div', { className: 'hint' }, failure.hint),
            failure.action
              ? h(
                  'button',
                  { type: 'button', className: 'loom-btn', onClick: failure.action.onClick },
                  failure.action.label,
                )
              : null,
            failure.detail ? h('div', { className: 'detail', title: '原始错误信息' }, failure.detail) : null,
          )
        } else if (!data || !data.campaigns || data.campaigns.length === 0) {
          var none = emptyState(data)
          body = h('div', { className: 'loom-empty' }, h('b', null, none.title), h('br'), none.hint)
        } else {
          // A settled ledger still shows its campaigns: the note says the loop
          // has nothing in flight, the cards below are the history it left.
          var settled = emptyState(data)
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
              h(
                'button',
                {
                  type: 'button',
                  className: 'loom-btn bare',
                  style: { marginLeft: 'auto', fontSize: '9.5px' },
                  title: anyOpen ? '把所有战役收成一行' : '展开所有战役',
                  onClick: function () {
                    foldAll(anyOpen)
                  },
                },
                anyOpen ? '全收起' : '全展开',
              ),
            ),
            settled ? h('div', { className: 'loom-empty' }, h('b', null, settled.title), h('br'), settled.hint) : null,
            h(
              'div',
              { className: 'loom-cards' },
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
                  all: tree,
                  live: liveOf(data, c.id),
                  busy: box.busy,
                  act: act,
                  folded: isFolded(c),
                  onToggle: toggle,
                  confirming: confirming,
                  setConfirming: setConfirming,
                })
              }),
            ),
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
          h('span', { className: 'loom-age', title: age(c.ageMs) ? '最近活动 ' + age(c.ageMs) + '前' : '' }, folded ? '' : age(c.ageMs)),
          folded ? null : h('span', { className: 'loom-caret' }, '⌄'),
        )

        if (folded) {
          // One line per idle campaign: what it is, where it stands, and whether
          // it wants something from the reader. Everything else is one click
          // away, and that click is the whole card.
          var openCp = openCount(c)
          var hit = hitProps(c, false, props.onToggle)
          hit.className = 'loom-hit'
          return h(
            'div',
            { className: 'loom-camp folded' },
            h(
              'div',
              hit,
              h('span', { className: 'loom-dot', style: { color: statusTone(c.status) } }),
              h('span', { className: 'loom-name', title: c.id }, c.id),
              h('span', { className: 'loom-state' }, statusLabel(c.status)),
              openCp > 0 ? h('span', { className: 'loom-flag', title: openCp + ' 个检查点等你处理' }, '待 ' + openCp) : null,
              h('span', { className: 'loom-brief', title: meta.join(' · ') }, meta.slice(0, 3).join(' · ')),
              h('span', { className: 'loom-caret' }, '›'),
            ),
          )
        }

        var tri = triangleChips(c)
        var spark = sparkOf(c)
        var meters = budgetMeters(c)
        var nodeKids = nodeChips(c)

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
        // the colour is the verdict. An unscored round has no bar, a measured
        // zero is a neutral baseline tick, and the rest scale with the score.
        var sparkNode = spark.count > 0
          ? h(
            'div',
            { className: 'loom-spark', title: '最近 ' + spark.count + ' 轮：柱高按分数、柱色按结果；空白=未计分，底线=0 分' },
            spark.bars.map(function (bar) {
              return h('span', {
                key: bar.key,
                className: 'pt',
                'data-tone': bar.tone,
                'data-zero': bar.zero ? 'true' : 'false',
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

        var rows = flattenTree(treeOf(c, live, props.all), 1, [])

        var treeRows = rows.map(function (row) {
          var parts = []
          // a dot marks a *branch*, not every leaf: thirty dots in a 300px
          // column is noise, four is a legend.
          if (row.tone && row.depth === 1) parts.push(h('span', { className: 'loom-dot', key: 'd', style: { color: row.tone, marginRight: 2 } }))
          if (row.kind) parts.push(h('span', { className: 'k', key: 'k' }, row.kind))
          parts.push(h('span', { className: 't' + (row.mono ? ' mono' : ''), key: 't', title: row.help || row.label }, row.label))
          if (row.meta) parts.push(h('span', { className: 'v', key: 'v' }, row.meta))
          // The explanation wraps onto its own line: the row says what the
          // checkpoint is and what ignoring it costs without a hover.
          if (row.help) parts.push(h('span', { className: 'help', key: 'h' }, row.help))
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
            when(nodeKids.length > 0, h('div', { className: 'loom-chips' }, nodeKids.map(function (chip) {
              return h('span', { key: chip.key, className: 'loom-chip quiet', title: chip.title }, chip.label)
            }))),
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
      TONES: TONES,
      money: money,
      costOf: costOf,
      costLabel: costLabel,
      costKnown: costKnown,
      age: age,
      statusTone: statusTone,
      qualityTone: qualityTone,
      text: text,
      Panel: Panel,
      Card: Card,
      overview: overview,
      metrics: metrics,
      pending: pending,
      queueOf: queueOf,
      hitProps: hitProps,
      switchProps: switchProps,
      knowledge: knowledge,
      knowledgeOf: knowledgeOf,
      lessonsNode: lessonsNode,
      chainPath: chainPath,
      campaignMeta: campaignMeta,
      triangleChips: triangleChips,
      sparkOf: sparkOf,
      budgetMeters: budgetMeters,
      attemptChips: attemptChips,
      nodeChips: nodeChips,
      nodeBand: nodeBand,
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
      checkpointHelp: checkpointHelp,
      checkpointHelpText: checkpointHelpText,
      openCount: openCount,
      errorState: errorState,
      emptyState: emptyState,
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
