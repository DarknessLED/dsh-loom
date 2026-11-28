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
      // A finished campaign and a stopped one are not the same event, and
      // neither is "not started yet": three greys here is why the audit found
      // the dot unreadable without the word beside it.
      done: 'var(--loom-done)',
      stopped: 'var(--loom-stopped)',
    }

    // The reference's tokens, expressed as one stylesheet rather than inline
    // objects: hover, focus and transition states are half of a design system
    // and inline styles cannot express them.
    // The visual system, stated once so it can be argued with: a quiet
    // instrument panel. Air instead of rules, one filled action per row, a
    // type ramp that starts at 11px and lets the numbers speak, and colour
    // reserved for state. The palette is still measured ink mixed against an
    // opaque base, so the panel reads correctly on a light canvas and a dark
    // one without a theme switch of its own.
    var CSS = [
      '.loom{',
      ' --loom-ink:currentColor;',
      // tint everything against an OPAQUE ink base. Mixing against currentColor
      // looks identical until you nest: a half-transparent heading mixes again
      // and the alphas multiply (0.58 × 0.5 → 0.29). The base is written inline
      // at mount from the panel's computed colour, so alphas simply add up.
      ' --loom-base:var(--loom-ink-base,currentColor);',
      // the canvas the panel is drawn on, derived from the measured ink at
      // mount: filled buttons invert against it the way a native control does.
      ' --loom-canvas:var(--loom-ink-canvas,#fff);',
      ' --loom-soft:rgba(127,127,127,1);--loom-soft:color-mix(in srgb,var(--loom-base) 78%,transparent);',
      ' --loom-quiet:rgba(127,127,127,.8);--loom-quiet:color-mix(in srgb,var(--loom-base) 56%,transparent);',
      ' --loom-faint:rgba(127,127,127,.6);--loom-faint:color-mix(in srgb,var(--loom-base) 54%,transparent);',
      ' --loom-line:rgba(127,127,127,.18);--loom-line:color-mix(in srgb,var(--loom-base) 10%,transparent);',
      ' --loom-line2:rgba(127,127,127,.3);--loom-line2:color-mix(in srgb,var(--loom-base) 18%,transparent);',
      ' --loom-surface:rgba(127,127,127,.05);--loom-surface:color-mix(in srgb,var(--loom-base) 3.4%,transparent);',
      ' --loom-surface2:rgba(127,127,127,.09);--loom-surface2:color-mix(in srgb,var(--loom-base) 6%,transparent);',
      ' --loom-hover:rgba(127,127,127,.1);--loom-hover:color-mix(in srgb,var(--loom-base) 7%,transparent);',
      // accents sit where they clear 4.2:1 on BOTH canvases -- one value per
      // hue, so the panel needs no theme switch of its own.
      ' --loom-ok:#2f7d54;--loom-warn:#8a6f24;--loom-bad:#c2564a;--loom-idle:#70747c;',
      ' --loom-done:#3f7a63;--loom-stopped:#8a6a6a;',
      ' --loom-mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;',
      ' --loom-sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif;',
      ' --loom-ease:cubic-bezier(.2,.7,.2,1);',
      ' --loomlift:0 1px 1px color-mix(in srgb,var(--loom-base) 3%,transparent),',
      '  0 10px 24px -18px color-mix(in srgb,var(--loom-base) 45%,transparent);',
      ' display:flex;flex-direction:column;height:100%;min-height:0;min-width:0;',
      // the panel is a sidebar: it must answer to the width the host hands it,
      // never to the width of the window the sidebar sits in
      ' container-type:inline-size;',
      ' font-family:var(--loom-sans);font-size:13px;line-height:1.5;letter-spacing:-.001em;',
      ' color:var(--loom-ink);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden;',
      '}',
      '.loom *{box-sizing:border-box}',
      '.loom .num,.loom code,.loom .m{font-family:var(--loom-mono);font-variant-numeric:tabular-nums;letter-spacing:-.01em}',
      '.loom-titlerow,.loom-obj,.loom-meta,.loom-chain,.loom-tri,.loom-vitals,.loom-cp-head,.loom-hero-row{min-width:0}',
      // ---- header ---------------------------------------------------------
      // the header is the one fixed band; a hairline under it is what says the
      // rows are sliding beneath something rather than being cut in half
      '.loom-head{display:flex;align-items:center;gap:10px;padding:12px 14px 10px;position:relative;z-index:2;',
      ' border-bottom:1px solid var(--loom-line2);background:var(--loom-canvas)}',
      '.loom-mark{font-size:13px;font-weight:650;letter-spacing:.02em;white-space:nowrap;line-height:1}',
      '.loom-wait{display:inline-flex;align-items:center;gap:5px;margin-left:8px;padding:2px 7px;',
      ' border:1px solid color-mix(in srgb,var(--loom-warn) 34%,transparent);border-radius:999px;',
      ' background:color-mix(in srgb,var(--loom-warn) 12%,transparent);color:var(--loom-warn);',
      ' font:500 11px/1.4 var(--loom-mono);cursor:pointer;transition:background-color 180ms cubic-bezier(.2,.7,.2,1)}',
      '.loom-wait:hover{background:color-mix(in srgb,var(--loom-warn) 20%,transparent)}',
      '.loom-wait .dot{width:5px;height:5px;border-radius:999px;background:currentColor}',
      '.loom-spacer{flex:1 1 auto;min-width:4px}',
      // an install-level switch reads as a name and a track, the way a system
      // setting does: the state is the knob's position, not a word to parse
      '.loom-switch{display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid transparent;',
      ' padding:2px 4px;border-radius:999px;font-family:var(--loom-sans);font-size:11.5px;font-weight:500;',
      ' letter-spacing:0;color:var(--loom-faint);cursor:pointer;line-height:1;white-space:nowrap;',
      ' transition:color 180ms var(--loom-ease),border-color 180ms var(--loom-ease)}',
      '.loom-track{position:relative;display:inline-block;flex:0 0 auto;width:30px;height:18px;border-radius:999px;',
      ' background:var(--loom-line2);transition:background 180ms var(--loom-ease)}',
      '.loom-knob{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:999px;background:#fff;',
      ' box-shadow:0 1px 2px rgba(0,0,0,.28);transition:transform 180ms var(--loom-ease)}',
      '.loom-switch[aria-checked="true"] .loom-track{background:var(--loom-ok)}',
      '.loom-switch[aria-checked="true"] .loom-knob{transform:translateX(12px)}',
      '.loom-switch[aria-checked="true"]{color:var(--loom-soft)}',
      '.loom-switch:hover{color:var(--loom-ink)}',
      '.loom-switch:focus-visible{outline:2px solid color-mix(in srgb,var(--loom-base) 32%,transparent);outline-offset:1px}',
      '.loom-dot{display:inline-block;width:6px;height:6px;border-radius:999px;background:currentColor;flex:0 0 auto}',
      '.loom-dot.on{color:var(--loom-ok);box-shadow:0 0 0 3px color-mix(in srgb,var(--loom-ok) 16%,transparent)}',
      '.loom-dot.off{color:var(--loom-warn);box-shadow:0 0 0 3px color-mix(in srgb,var(--loom-warn) 14%,transparent)}',
      // ---- buttons --------------------------------------------------------
      '.loom-btn{appearance:none;background:var(--loom-surface);border:1px solid transparent;color:var(--loom-soft);',
      ' font-family:var(--loom-sans);font-size:12px;font-weight:500;line-height:1;padding:6px 10px;border-radius:8px;cursor:pointer;',
      ' transition:background 180ms var(--loom-ease),color 180ms var(--loom-ease),border-color 180ms var(--loom-ease),transform 180ms var(--loom-ease);',
      ' white-space:nowrap;min-height:26px}',
      '.loom-btn:hover{background:var(--loom-surface2);color:var(--loom-ink);border-color:var(--loom-line)}',
      '.loom-btn:active{transform:scale(.985)}',
      '.loom-btn:focus-visible{outline:2px solid color-mix(in srgb,var(--loom-base) 30%,transparent);outline-offset:1px}',
      '.loom-btn[disabled]{opacity:.4;cursor:default;transform:none}',
      '.loom-btn.bare{background:transparent;padding:6px 8px}',
      '.loom-btn.bare:hover{background:var(--loom-hover);border-color:transparent}',
      // the pair around a decision: two things you can do, neither of them
      // pretending to be a link
      '.loom-btn.line{background:transparent;border-color:var(--loom-line2)}',
      '.loom-btn.line:hover{background:var(--loom-surface2);border-color:var(--loom-line2);color:var(--loom-ink)}',
      '.loom-btn.line.danger:hover{color:var(--loom-bad);border-color:color-mix(in srgb,var(--loom-bad) 40%,transparent)}',
      // the one filled action in a row: ink against canvas, the way a native
      // control inverts. Never a hue -- colour here would be a second voice.
      '.loom-btn.solid{background:color-mix(in srgb,var(--loom-base) 90%,transparent);color:var(--loom-canvas);',
      ' font-weight:600;border-color:transparent}',
      '.loom-btn.solid:hover{background:var(--loom-base);color:var(--loom-canvas)}',
      '.loom-btn.danger:hover{color:var(--loom-bad);background:color-mix(in srgb,var(--loom-bad) 10%,transparent);border-color:transparent}',
      '.loom-camp .loom-hit:focus-visible{outline:2px solid color-mix(in srgb,var(--loom-base) 30%,transparent);outline-offset:1px}',
      // ---- the queue: the reason this panel exists ------------------------
      // the queue is pinned: a decision you have to scroll back to is a decision
      // you postpone. The blur keeps the cards readable underneath it without
      // painting an opaque band over the host's own background.
      // The queue is the first block, not a floating one. It used to be sticky
      // with a blurred backdrop, which meant the taller it got the more of the
      // panel it hid: three checkpoints covered the campaigns they were about.
      // It scrolls away like everything else; the header keeps a count so a
      // reader who scrolled past still knows something is waiting.
      '.loom-hero{margin:2px 12px 14px;border:1px solid var(--loom-line);',
      ' border-radius:14px;background:color-mix(in srgb,var(--loom-base) 5%,transparent);',
      ' box-shadow:var(--loomlift);overflow:hidden}',
      '.loom-hero-head{display:flex;align-items:baseline;gap:8px;padding:12px 14px 8px;min-width:0}',
      '.loom-hero-head .k{font-size:11.5px;font-weight:600;letter-spacing:.02em;color:var(--loom-ink)}',
      '.loom-hero-head .v{margin-left:auto;font-family:var(--loom-mono);font-size:22px;font-weight:500;line-height:1;',
      ' letter-spacing:-.02em;color:var(--loom-warn)}',
      '.loom-hero-head .v.zero{color:var(--loom-faint)}',
      '.loom-hero-row{display:flex;align-items:center;gap:10px;padding:11px 14px;border-top:1px solid var(--loom-line);',
      ' transition:background 180ms var(--loom-ease)}',
      '.loom-hero-row:hover{background:var(--loom-hover)}',
      '.loom-hero-row .txt{flex:1 1 auto;min-width:0;font-size:12.5px;line-height:1.45;color:var(--loom-quiet)}',
      '.loom-hero-row .txt b{font-weight:600;color:var(--loom-ink)}',
      '.loom-hero-row .txt .what{display:block;font-size:12.5px;line-height:1.35;color:var(--loom-quiet)}',
      // the consequence sentence is why the row is here at all: two lines, then
      // the full text lives in the title
      '.loom-hero-row .txt .why{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;',
      ' overflow:hidden;margin-top:2px;font-size:11.5px;line-height:1.5;color:var(--loom-faint)}',
      // what the thumb does, in the reader's words -- one line, quiet, and the
      // only place that separates "lands a commit" from "says carry on"
      '.loom-hero-row .txt .then{display:block;margin-top:3px;font-size:11px;line-height:1.5;color:var(--loom-soft)}',
      // the flag is emphasis, not another hue: at 11px a warn tone measured
      // 3.7:1 on the dark canvas, and the words already carry the meaning
      '.loom-hero-row .txt .then .flag{color:var(--loom-ink);font-weight:500}',
      '.loom-hero-acts{flex:0 0 auto;display:flex;align-items:center;gap:2px}',
      '.loom-hero-empty{display:flex;align-items:center;gap:8px;padding:12px 14px;font-size:12px;color:var(--loom-quiet)}',
      '.loom-hero-empty .dot{width:6px;height:6px;border-radius:999px;background:var(--loom-ok);flex:0 0 auto}',
      '.loom-hero-empty .rest{min-width:0}',
      '.loom-hero-empty .rest .id{white-space:nowrap}',
      '.loom-note{padding:0 14px 10px;font-size:11.5px;line-height:1.5;color:var(--loom-faint)}',
      // ---- overview: a caption, not a table -------------------------------
      // Six boxed tiles read as a dashboard of six equal facts, and four of
      // them repeat a number printed somewhere else on this panel. One quiet
      // line keeps the totals available without competing with the queue.
      '.loom-figures{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px;padding:0 14px 12px;',
      ' font-size:11.5px;line-height:1.5;color:var(--loom-quiet)}',
      '.loom-figures .f{white-space:nowrap}',
      '.loom-figures .f b{font-family:var(--loom-mono);font-size:12px;font-weight:500;letter-spacing:-.01em;',
      ' color:var(--loom-soft)}',
      '.loom-figures .f.hot b{color:var(--loom-warn)}',
      // ---- sections -------------------------------------------------------
      '.loom-sec{padding:0 12px 6px}',
      '.loom-sec-head{display:flex;align-items:center;gap:8px;padding:12px 2px 8px;font-size:11.5px;font-weight:600;',
      ' letter-spacing:.01em;color:var(--loom-ink)}',
      '.loom-sec-head .n{margin-left:auto;font-family:var(--loom-mono);font-size:11.5px;font-weight:400;letter-spacing:0;',
      ' color:var(--loom-faint)}',
      // ---- campaign cards -------------------------------------------------
      '.loom-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:8px;align-items:start;min-width:0}',
      // rows would stretch every card to the height of the tallest one in its
      // band, which is a screen of empty space beside an expanded campaign;
      // columns let each card take the height it earns
      // A wide panel shows the campaign you are reading at full width and packs
      // the folded ones two-up underneath: masonry columns squeezed the open
      // card into half the panel, which made the detail narrower than it was in
      // the 400px sidebar.
      '@container (min-width:560px){.loom-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));',
      ' gap:8px;align-items:start}',
      '.loom-cards .loom-camp:not(.folded){grid-column:1/-1}',
      // the open card may span the panel, but its rows stay one readable column:
      // a label on the left and a score 500px to its right is not a row
      '.loom-cards .loom-camp:not(.folded) .loom-tree{max-width:32em}}',
      '.loom-camp{padding:12px 13px 11px;border:1px solid var(--loom-line);border-radius:14px;min-width:0;',
      ' background:color-mix(in srgb,var(--loom-base) 1.4%,transparent);',
      ' transition:border-color 180ms var(--loom-ease),box-shadow 180ms var(--loom-ease),background 180ms var(--loom-ease)}',
      '.loom-camp:hover{border-color:var(--loom-line2)}',
      '.loom-camp.folded{padding:0;background:transparent;border-color:transparent}',
      '.loom-camp .loom-hit{display:flex;align-items:center;gap:8px;padding:10px 11px;min-width:0;cursor:pointer;',
      ' border-radius:12px;transition:background 180ms var(--loom-ease)}',
      '.loom-camp .loom-hit:hover{background:var(--loom-hover)}',
      '.loom-camp:not(.folded) .loom-hit{padding:0 0 3px}',
      '.loom-camp .loom-caret{margin-left:auto;flex:0 0 auto;font-size:11px;color:var(--loom-faint);line-height:1}',
      '.loom-camp .loom-flag{flex:0 0 auto;font-family:var(--loom-mono);font-size:11px;letter-spacing:0;',
      ' padding:2px 6px;border-radius:999px;color:var(--loom-warn);',
      ' background:color-mix(in srgb,var(--loom-warn) 13%,transparent)}',
      '.loom-camp .loom-brief{flex:1 1 auto;min-width:0;font-size:11.5px;color:var(--loom-faint);',
      ' white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loom-titlerow{display:flex;align-items:center;gap:8px;min-width:0}',
      '.loom-name{font-size:13.5px;font-weight:600;letter-spacing:-.005em;line-height:1.25;min-width:0;',
      ' white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loom-state{flex:0 0 auto;font-size:11.5px;font-weight:500;letter-spacing:0;color:var(--loom-quiet);white-space:nowrap}',
      '.loom-age{margin-left:auto;font-family:var(--loom-mono);font-size:11px;color:var(--loom-faint);white-space:nowrap}',
      // the objective is the one sentence that says what this campaign is for;
      // clipping it to two lines clipped it at every width, so it is shown whole
      // in the expanded card (the folded row has its own one-line brief)
      '.loom-obj{margin-top:5px;max-width:44em;font-size:12.5px;line-height:1.5;color:var(--loom-soft)}',
      '.loom-meta{margin-top:5px;font-size:11.5px;color:var(--loom-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      // The verdict sits under the meta line: a cause is quieter than a title
      // and slightly warmer than metadata, because it is the one line a reader
      // of a stopped campaign came for.
      '.loom-end{margin-top:4px;font-size:11.5px;line-height:1.45;color:var(--loom-stopped);overflow-wrap:anywhere}',
      '.loom-chain{margin-top:4px;font-family:var(--loom-mono);font-size:11px;color:var(--loom-quiet);',
      ' white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loom-models{margin-top:5px;display:grid;grid-template-columns:1fr auto;gap:2px 8px}',
      '.loom-model{display:flex;align-items:baseline;gap:6px;min-width:0}',
      '.loom-model .ref{font-family:var(--loom-mono);font-size:11px;color:var(--loom-quiet);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}',
      '.loom-model .ratio{font-family:var(--loom-mono);font-size:11px;color:var(--loom-soft);font-variant-numeric:tabular-nums;}',
      '.loom-model .ratio[data-tone=bad]{color:var(--loom-bad);}',
      '.loom-model .ratio[data-tone=warn]{color:var(--loom-warn);}',
      '.loom-model .note{font-size:11px;color:var(--loom-faint);}',
      '.loom-model .p90{font-family:var(--loom-mono);font-size:11px;color:var(--loom-faint);text-align:right;font-variant-numeric:tabular-nums;}',
      // the spend block is one column of full-width rows: model on the left,
      // dollars then their share on the right, so the two numbers line up
      // across models the way the rest of the card's mono columns do.
      '.loom-spend{grid-template-columns:1fr}',
      '.loom-spend .loom-model .usd{font-family:var(--loom-mono);font-size:11px;color:var(--loom-soft);margin-left:auto;font-variant-numeric:tabular-nums;}',
      '.loom-spend .loom-model .share{font-family:var(--loom-mono);font-size:11px;color:var(--loom-faint);min-width:34px;text-align:right;font-variant-numeric:tabular-nums;}',
      // ---- the measured triangle, the trend, the budget -------------------
      '.loom-tri{margin-top:7px;display:block;min-width:0;font-family:var(--loom-mono);',
      ' font-size:11px;letter-spacing:-.01em;line-height:1.55;color:var(--loom-quiet);',
      ' white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loom-tri .seg{color:var(--loom-soft)}',
      // the line wraps between figures, never inside one: "18.4k / tok" is two
      // lines of a number, which is not a number
      '.loom-tri .seg,.loom-tri .loom-chip{white-space:nowrap}',
      '.loom-tri .sep{padding:0 5px;color:var(--loom-line2)}',
      '.loom-tri .loom-chip{margin-left:0}',
      // the trend and the budget meters were side by side, which left each meter
      // about ninety pixels of track in a 320px sidebar. Stacked, every row can
      // be read left to right without a squeezed number.
      '.loom-vitals{margin-top:11px;display:flex;flex-direction:column;gap:10px;min-width:0}',
      '.loom-sparkwrap{display:flex;align-items:flex-end;gap:10px;min-width:0}',
      '.loom-sparkwrap .cap{font-size:11px;line-height:1.2;color:var(--loom-faint);letter-spacing:0}',
      '.loom-sparkwrap .spacer{flex:1 1 auto}',
      '.loom-spark{display:flex;align-items:flex-end;gap:3px;height:22px;flex:0 0 auto;padding-bottom:1px}',
      '.loom-spark .pt{display:block;width:4px;border-radius:2px;background:var(--loom-faint);',
      ' transition:background 180ms var(--loom-ease),height 180ms var(--loom-ease)}',
      '.loom-spark .pt[data-tone="ok"]{background:var(--loom-ok)}',
      '.loom-spark .pt[data-tone="warn"]{background:var(--loom-warn)}',
      '.loom-spark .pt[data-tone="bad"]{background:var(--loom-bad)}',
      '.loom-spark .pt[data-tone="idle"]{background:var(--loom-faint)}',
      '.loom-spark .pt[data-zero="true"]{background:var(--loom-line2);border-radius:0}',
      '.loom-band{margin-top:9px;display:flex;width:100%;height:6px;border-radius:3px;',
      ' background:var(--loom-line);overflow:hidden}',
      '.loom-band-seg{display:block;height:100%;flex:0 0 auto;background:var(--loom-faint)}',
      '.loom-meters{width:100%;min-width:0;display:flex;flex-direction:column;gap:7px}',
      '.loom-meter{display:grid;grid-template-columns:4.2em minmax(0,1fr) auto;align-items:center;gap:10px;min-width:0}',
      '.loom-meter .k{font-size:11px;line-height:1;letter-spacing:0;color:var(--loom-faint);white-space:nowrap}',
      '.loom-meter .bar{display:block;height:4px;border-radius:2px;background:var(--loom-line);overflow:hidden}',
      '.loom-meter .fill{display:block;height:100%;border-radius:2px;background:var(--loom-ok);',
      ' transition:width 180ms var(--loom-ease)}',
      '.loom-meter[data-tone="warn"] .fill{background:var(--loom-warn)}',
      '.loom-meter[data-tone="bad"] .fill{background:var(--loom-bad)}',
      '.loom-meter .num{justify-self:end;white-space:nowrap;font-family:var(--loom-mono);font-size:11px;line-height:1;',
      ' color:var(--loom-soft);white-space:nowrap}',
      '.loom-metric b,.loom-age,.loom-tri,.loom-meter .num,.loom-node .v{font-variant-numeric:tabular-nums}',
      // ---- the tree -------------------------------------------------------
      // the rail is one hairline: structure, not decoration. Deeper rows
      // indent and lose the rail rather than growing a second one.
      '.loom-tree{margin-top:10px;position:relative}',
      '.loom-node{position:relative;display:flex;flex-wrap:wrap;align-items:baseline;gap:6px;min-width:0;',
      ' row-gap:3px;padding:5px 0 5px 16px;transition:background 180ms var(--loom-ease);border-radius:6px}',
      '.loom-node:hover{background:var(--loom-hover)}',
      '.loom-node[data-depth="1"]:before{content:"";position:absolute;left:5px;top:0;bottom:0;width:1px;',
      ' background:var(--loom-line)}',
      '.loom-node[data-depth="1"]:after{content:"";position:absolute;left:5px;top:13px;width:8px;height:1px;',
      ' background:var(--loom-line)}',
      '.loom-node[data-depth="1"][data-last="1"]:before{bottom:auto;height:13px}',
      '.loom-node[data-depth="2"]{padding-left:26px}',
      '.loom-node[data-depth="2"]:before{content:"";position:absolute;left:15px;top:13px;width:7px;height:1px;',
      ' background:var(--loom-line)}',
      '.loom-node[data-depth="3"]{padding-left:36px}',
      '.loom-node .k{flex:0 0 auto;font-family:var(--loom-mono);font-size:11px;letter-spacing:.02em;color:var(--loom-faint)}',
      // a lesson reads file-and-weight first, the sentence second: the claim is
      // the longest string on the row, so it takes its own line instead of
      // shoving the weight into a stray column
      '.loom-node[data-role="lesson"] .v{order:2;margin-left:auto}',
      '.loom-node[data-role="lesson"] .t{order:3;flex:1 0 100%;white-space:normal;line-height:1.45;',
      ' display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.loom-node[data-role="wait"] .help{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.loom-node .t{flex:1 1 auto;min-width:0;font-size:12px;color:var(--loom-soft);',
      ' overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.loom-node .t.mono{font-family:var(--loom-mono);font-size:11.5px}',
      '.loom-node .v{flex:0 0 auto;font-family:var(--loom-mono);font-size:11px;color:var(--loom-quiet);white-space:nowrap}',
      '.loom-node .acts{flex:0 1 auto;display:flex;flex-wrap:wrap;gap:4px;margin-left:auto;min-width:0}',
      '.loom-node .acts .loom-btn{font-size:11.5px;padding:4px 7px}',
      '.loom-node .help{flex:1 0 100%;font-size:11.5px;line-height:1.5;color:var(--loom-faint);white-space:normal}',
      '.loom-cp{margin:0;padding:7px 0 8px}',
      '.loom-cp-head{display:flex;align-items:center;gap:8px;font-family:var(--loom-mono);font-size:11px;',
      ' letter-spacing:.01em;color:var(--loom-quiet);justify-content:space-between}',
      '.loom-cp-head b{font-weight:500;color:var(--loom-ink);letter-spacing:.02em}',
      '.loom-cp-body{margin-top:4px;font-size:12px;line-height:1.5;color:var(--loom-soft)}',
      '.loom-cp-acts{margin-top:7px;display:flex;gap:6px}',
      '.loom-acts{margin-top:11px;display:flex;align-items:center;gap:4px}',
      '.loom-acts .sep{width:1px;height:14px;background:var(--loom-line);margin:0 6px}',
      '.loom-chips{margin-top:7px;display:flex;flex-wrap:wrap;gap:5px}',
      '.loom-chip{font-family:var(--loom-sans);font-size:11px;line-height:1;padding:4px 7px;border-radius:999px;',
      ' background:var(--loom-surface);border:1px solid transparent;color:var(--loom-soft);white-space:nowrap}',
      '.loom-chip.ok{color:var(--loom-ok);border-color:color-mix(in srgb,var(--loom-ok) 30%,transparent)}',
      '.loom-chip.bad{color:var(--loom-bad);border-color:color-mix(in srgb,var(--loom-bad) 30%,transparent)}',
      '.loom-chip.live{color:var(--loom-ok)}',
      '.loom-chip.quiet{background:transparent;border-color:var(--loom-line);color:var(--loom-faint);letter-spacing:0}',
      // ---- knowledge ------------------------------------------------------
      // A claim is one sentence and it is the deliverable: splitting the list into
      // two columns at 400px buys 80px of width and spends the end of every
      // sentence. One column until there is room for two readable ones.
      '.loom-kfiles{display:block;padding:0 0 4px;min-width:0}',
      '.loom-kfile{min-width:0;padding:9px 11px;border-radius:12px;background:var(--loom-surface)}',
      '.loom-kfile .loom-kind{display:flex;align-items:baseline;gap:6px;padding:0 0 3px;min-width:0;',
      ' font-size:11px;letter-spacing:0;color:var(--loom-quiet)}',
      '.loom-kfile .loom-kind .p{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
      ' direction:rtl;text-align:left;font-family:var(--loom-mono);color:var(--loom-soft)}',
      '.loom-kfile .loom-kind .c{margin-left:auto;flex:0 0 auto;font-family:var(--loom-mono);color:var(--loom-faint)}',
      '.loom-lesson{display:flex;align-items:baseline;gap:8px;padding:2px 0;font-size:12px;color:var(--loom-soft);min-width:0}',
      '.loom-lesson .claim{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.loom-lesson .score{font-family:var(--loom-mono);font-size:11px;color:var(--loom-quiet);white-space:nowrap}',
      '.loom-lesson .score[data-tone=up]{color:color-mix(in srgb,var(--loom-base) 55%,var(--loom-ok));}',
      '.loom-lesson .score[data-tone=down]{color:color-mix(in srgb,var(--loom-base) 52%,var(--loom-bad));}',
      '.loom-kfile .loom-lesson{padding-left:0;padding-right:0;align-items:flex-start}',
      '.loom-kfile .loom-lesson .claim{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;',
      ' -webkit-box-orient:vertical;line-height:1.45}',
      '.loom-kfile .loom-lesson .kind{flex:0 0 auto;font-family:var(--loom-mono);font-size:11px;padding-top:1px;',
      ' color:var(--loom-faint);letter-spacing:.02em}',
      '.loom-kfile .loom-lesson .kind[data-kind=hazard]{color:color-mix(in srgb,var(--loom-base) 45%,var(--loom-bad))}',
      '.loom-kfile .loom-lesson .kind[data-kind=recipe]{color:color-mix(in srgb,var(--loom-base) 45%,var(--loom-ok))}',
      '.loom-more{padding:4px 0 2px 0;font-size:11.5px;color:var(--loom-faint)}',
      '.loom-more-groups{padding:6px 2px 10px}',
      // turn the tail of a section into a control, not a paragraph
      '.loom-morebtn{appearance:none;background:transparent;border:0;padding:6px 2px;font-family:var(--loom-sans);',
      ' font-size:11.5px;color:var(--loom-quiet);cursor:pointer;text-align:left;line-height:1.4}',
      '.loom-morebtn:hover{color:var(--loom-ink)}',
      '.loom-morebtn:focus-visible{outline:2px solid color-mix(in srgb,var(--loom-base) 30%,transparent);outline-offset:1px}',
      // ---- shell ----------------------------------------------------------
      '.loom-scroll{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;min-height:0;scrollbar-width:thin;padding-top:2px}',
      '.loom-foot{display:flex;align-items:center;gap:6px;padding:9px 14px;font-size:11px;',
      ' letter-spacing:0;color:var(--loom-faint)}',
      '.loom-foot .sep{margin-left:auto}',
      '.loom-empty{padding:16px 14px 18px;font-size:12.5px;line-height:1.6;color:var(--loom-quiet)}',
      '.loom-empty code{font-size:12px;color:var(--loom-soft)}',
      '.loom-err{margin:0 12px 12px;padding:12px 14px;border-radius:12px;background:color-mix(in srgb,var(--loom-bad) 8%,transparent);',
      ' font-size:12px;color:var(--loom-bad);word-break:break-word}',
      '.loom-err b{display:block;margin-bottom:4px;font-size:12.5px;letter-spacing:0}',
      '.loom-err .hint{font-size:12px;line-height:1.55;color:var(--loom-soft);margin-bottom:6px}',
      '.loom-err .detail{margin-top:7px;font-family:var(--loom-mono);font-size:11px;color:var(--loom-quiet);word-break:break-all}',
      // ---- the research shelf ---------------------------------------------
      // One line per direction, then the works of the opened one. The panel is
      // read at 320px in the sidebar and at full width in a window, so nothing
      // here sets a width: rows pack with the container, and the title column is
      // the only one that grows.
      '.loom-dirs{display:flex;flex-direction:column;gap:2px;padding:0 0 2px}',
      '.loom-dirrow{min-width:0}',
      '.loom-dirhit{display:flex;align-items:baseline;gap:8px;width:100%;padding:7px 10px;border:0;border-radius:10px;',
      ' background:transparent;color:inherit;font:inherit;font-size:12px;text-align:left;cursor:pointer;min-width:0;',
      ' transition:background 180ms var(--loom-ease)}',
      '.loom-dirhit:hover{background:var(--loom-hover)}',
      '.loom-dirrow.active .loom-dirhit{background:var(--loom-surface)}',
      '.loom-dirhit .nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--loom-ink)}',
      '.loom-dirhit .c,.loom-dirhit .g,.loom-dirhit .s{flex:0 0 auto;font-family:var(--loom-mono);font-size:11px;',
      ' letter-spacing:0;color:var(--loom-faint)}',
      // A direction where nobody has written a summary yet is a direction with
      // zero prose: the number is quiet, not absent, because "0/12" says which
      // column is empty and a missing column says nothing at all.
      '.loom-dirhit .s{margin-left:auto;color:var(--loom-quiet)}',
      '.loom-cluster{display:flex;flex-direction:column;gap:1px;padding:6px 0 2px}',
      '.loom-cluster-head{display:flex;align-items:baseline;gap:8px;padding:4px 10px 3px;font-size:11px;',
      ' letter-spacing:.01em;color:var(--loom-faint)}',
      '.loom-cluster-head .n{margin-left:auto;font-family:var(--loom-mono);letter-spacing:0}',
      '.loom-workrow{min-width:0}',
      '.loom-workhit{display:flex;align-items:baseline;gap:8px;width:100%;padding:6px 10px;border:0;border-radius:9px;',
      ' background:transparent;color:inherit;font:inherit;font-size:12px;text-align:left;cursor:pointer;min-width:0}',
      '.loom-workhit:hover{background:var(--loom-hover)}',
      '.loom-workrow.open .loom-workhit{background:var(--loom-surface)}',
      '.loom-workhit .id{flex:0 0 auto;font-family:var(--loom-mono);font-size:11px;letter-spacing:0;color:var(--loom-faint)}',
      '.loom-workhit .t{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--loom-soft)}',
      '.loom-workhit .m,.loom-workhit .f,.loom-workhit .c{flex:0 0 auto;font-family:var(--loom-mono);font-size:11px;',
      ' letter-spacing:0;color:var(--loom-faint)}',
      '.loom-workhit .f{margin-left:auto}',
      '.loom-workpage{padding:8px 10px 12px;border-left:1px solid var(--loom-line);margin:2px 0 6px 10px;min-width:0}',
      '.loom-mermaid{margin:2px 0 10px}',
      '.loom-mermaid pre{margin:0;font-family:var(--loom-mono);font-size:11.5px;line-height:1.5;',
      ' white-space:pre-wrap;overflow-wrap:anywhere;padding:8px 10px;border-radius:8px;border:1px solid var(--loom-line);',
      ' background:color-mix(in srgb,var(--loom-base) 4%,transparent)}',
      '.loom-mermaid .note{display:block;margin-top:4px;opacity:.6;font-size:11px;line-height:1.5}',
      '.loom-fig{display:block;margin:0 0 10px;text-decoration:none}',
      '.loom-fig img{display:block;max-width:100%;height:auto;border-radius:10px;border:1px solid var(--loom-line);',
      ' background:var(--loom-surface)}',
      '.loom-fig .cap{display:block;margin-top:5px;font-size:11px;line-height:1.5;color:var(--loom-faint)}',
      '.loom-wsec{padding:0 0 10px}',
      '.loom-wsec-head{font-size:11.5px;font-weight:600;letter-spacing:.01em;color:var(--loom-ink);padding:6px 0 4px}',
      '.loom-wsec p{margin:0 0 6px;font-size:12px;line-height:1.65;color:var(--loom-soft);white-space:pre-wrap;',
      ' overflow-wrap:anywhere}',
      '.loom-worknote{padding:8px 10px;font-size:12px;line-height:1.55;color:var(--loom-quiet)}',
      '.loom-worknote.bad{color:var(--loom-warn)}',
      '.loom-worklink{display:inline-block;padding:2px 0;font-family:var(--loom-mono);font-size:11px;',
      ' letter-spacing:0;color:var(--loom-quiet);text-decoration:none}',
      '.loom-worklink:hover{color:var(--loom-ink)}',
      // a wide panel has room for the figure beside the text, and a 720px-wide
      // screenshot is unreadable squeezed into a 320px sidebar
      '@container (min-width:560px){.loom-works{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));',
      ' gap:2px 10px;align-items:start}}',
      '.loom-loading{padding:14px;font-size:12px;color:var(--loom-quiet)}',
      '.loom-broken{display:flex;align-items:baseline;gap:6px;padding:8px 14px;font-family:var(--loom-mono);font-size:11.5px;color:var(--loom-quiet)}',
      '.loom-broken b{font-weight:500;color:var(--loom-soft)}',
      // a wide panel spends its width on two honest columns, never on a longer
      // line of prose
      '@container (min-width:560px){',
      '.loom-kfiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}',
      // with room to spare the consequence sentence is read in full; the clamp
      // exists for the 320px sidebar, not for a half-window panel
      '.loom-hero-row .txt .why{-webkit-line-clamp:unset;overflow:visible}',
      // the queue stays one column at every width: it is read top to bottom and
      // answered in that order, and two columns put the second row lower than
      // the third while the buttons landed on two different x-axes
      '.loom-hero-row .txt .then{max-width:46em}}',
      // a sidebar narrower than ~400px cannot hold a sentence and two buttons
      // on one line: the sentence takes the width, the actions drop below it
      '@container (max-width:400px){',
      '.loom-hero-row{flex-wrap:wrap;align-items:flex-start;padding:11px 14px}',
      '.loom-hero-row .txt{flex:1 1 auto}',
      '.loom-hero-acts{flex:1 0 100%;justify-content:flex-end;margin-top:7px}',
      // five figures plus separators do not fit 320px on one line; wrapping
      // keeps every one of them readable instead of clipping the last
      '.loom-tri{white-space:normal;line-height:1.7}}',
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
        if (!ink) return
        root.style.setProperty('--loom-ink-base', ink)
        // A filled button paints ink and puts the canvas in the label, so the
        // canvas has to be known. It is the ink's complement by definition --
        // the host guarantees the text is readable on the surface it painted:
        // light ink means a dark canvas, and the other way round.
        var rgb = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(ink)
        if (!rgb) return
        var ch = [1, 2, 3].map(function (i) {
          var v = Number(rgb[i]) / 255
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
        })
        var lum = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
        root.style.setProperty('--loom-ink-canvas', lum > 0.5 ? '#101113' : '#ffffff')
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
      if (status === 'done') return TONES.done
      if (status === 'stopped') return TONES.stopped
      return TONES.idle
    }

    /**
     * Which dot a card row draws, as a TONES key.
     *
     * `statusTone` answers "what state is this campaign in"; the head row has to
     * answer "is it waiting on me", which is a different question and outranks
     * the state: a running campaign holding three questions is not `ok`, and a
     * failed one stays `bad` even with a queue behind it. Returning the key
     * (not the resolved colour) keeps the caller able to read the decision.
     */
    function cardTone(c) {
      if (!c) return 'idle'
      if (c.status === 'failed' || c.status === 'error') return 'bad'
      if (openCount(c) > 0) return 'warn'
      if (c.status === 'running') return 'ok'
      if (c.status === 'paused') return 'warn'
      if (c.status === 'done') return 'done'
      if (c.status === 'stopped') return 'stopped'
      return 'idle'
    }

    // The card's own verbs, as data rather than JSX: the header can render
    // them and a spec can assert the set. Only a live campaign has verbs — a
    // finished or unknown one has nothing worth stopping, and offering a dead
    // button teaches the reader that the buttons do not mean anything. `stop`
    // is destructive, so it carries `confirm` and the UI asks twice.
    function cardActions(campaign) {
      var status = campaign && campaign.status
      if (status === 'running') {
        return [
          { key: 'pause', label: '暂停', action: 'pause' },
          { key: 'stop', label: '停止', action: 'stop', danger: true, confirm: true },
        ]
      }
      if (status === 'paused') {
        return [
          { key: 'resume', label: '继续', action: 'resume' },
          { key: 'stop', label: '停止', action: 'stop', danger: true, confirm: true },
        ]
      }
      return []
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
    // Every status the host can write. A missing key does not fail loudly -- the
    // raw English value shows through -- which is how `converged` ended up as the
    // one English word on an otherwise Chinese card. `src/runtime/runtime.js`
    // holds the authoritative list; this map is asserted against it.
    var STATE_ZH = {
      draft: '草稿',
      planning: '规划中',
      running: '运行中',
      paused: '已暂停',
      converged: '已收敛',
      plateaued: '已平台',
      done: '已完成',
      stopped: '已停止',
      failed: '已失败',
      error: '出错',
    }
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

    // What a thumb on "approve" actually does. The three checkpoints in a queue
    // are not the same act -- one lands a patch as a commit, one switches the
    // chain, one merely says "carry on" -- so the row has to say which, and the
    // button has to be the verb rather than the word "approve" three times.
    function approveEffect(cp) {
      var payload = (cp && cp.payload) || {}
      if (payload.patch) {
        return {
          verb: '落地提交',
          what: payload.attempt
            ? '把 ' + payload.attempt + ' 的补丁写进工作区并提交'
            : '把这一轮的补丁写进工作区并提交',
          fatal: true,
        }
      }
      if (cp && cp.kind === 'chain' && payload.chainVersion !== undefined && payload.chainVersion !== null) {
        return { verb: '切换', what: '把工作链切到 v' + payload.chainVersion, fatal: false }
      }
      if (cp && cp.kind === 'policy' && payload.policyVersion !== undefined && payload.policyVersion !== null) {
        return { verb: '生效', what: '把策略 v' + payload.policyVersion + ' 设为这一战役的策略', fatal: false }
      }
      // Three kinds raise a checkpoint and apply nothing on approval. Saying "no
      // patch is landed" three times is true and useless: say what carrying on
      // means for this one.
      var pass = {
        stuck: '这一轮没有裁决，循环下一轮会再试同一道门',
        holdout: '这一轮的候选作废，下一轮重新挑任务',
        anomaly: '账本里的矛盾保持原样，之后按现状继续',
        plateau: '保持当前工作链继续跑',
        budget: '按当前预算继续，不再追加',
        exhausted: '按当前模型配置继续，不再换模型',
        human: '循环按现在的方向继续',
      }
      return {
        verb: '放行',
        what: pass[cp && cp.kind] || '只表示可以继续，不落地任何补丁',
        fatal: false,
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
     *
     * `primary` names the cells that survive when the sidebar is too narrow for
     * six (max-width:360px, see CSS). It is a property of the payload, not a
     * stylesheet trick, so the decision can be asserted: running and spend are
     * always the headline, while pending only earns width when something is
     * actually waiting — a strip that shows "0 waiting" is answering a question
     * nobody asked.
     */
    function metrics(data) {
      var o = overview(data)
      return [
        { key: 'campaigns', label: '战役', value: String(o.campaigns), primary: false },
        { key: 'running', label: '运行中', value: String(o.running), primary: true },
        { key: 'rounds', label: '轮数', value: String(o.rounds), primary: false },
        { key: 'pending', label: '待处理', value: String(o.open), hot: o.open > 0, primary: o.open > 0 },
        // Zero measured campaigns is "unpriced", not "$0": a total over no
        // measurements is not a measurement.
        { key: 'spend', label: '花费', value: o.priced === 0 ? '未定价' : money(o.spend), primary: true },
        { key: 'lessons', label: '知识', value: String(o.lessons), primary: false },
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
      //
      // The host stamps every poll with its own clock (`data.now`), and that is
      // the clock the checkpoint `at` values were written with. Reading the
      // browser clock here makes a fresh question look stale (or an old one
      // fresh) whenever the two machines disagree by more than the age in
      // question, so the host clock wins whenever it is present; `opts.now`
      // remains the override a caller or a spec can pin.
      var hostNow = data && typeof data.now === 'number' && isFinite(data.now) ? data.now : null
      var now = hostNow !== null
        ? hostNow
        : opts && typeof opts.now === 'number' && isFinite(opts.now)
          ? opts.now
          : Date.now()
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
            // row carries the full explanation -- "what it is" is on screen,
            // "what ignoring it costs" rides in the tooltip. `brief` is the
            // on-screen half, so three checkpoints do not reprint three
            // paragraphs inside the campaign.
            help: checkpointHelpText(cp.kind),
            brief: checkpointHelp(cp.kind).what,
            approve: approveEffect(cp),
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
     * The words a queue row shows: which campaign asked, and how long it waited.
     *
     * Both the row label and its tooltip read this function, so the two can
     * never disagree about the wait, and a spec can assert the sentence without
     * rendering React. An undated checkpoint returns an empty `wait` on purpose:
     * the queue has no idea how old the question is, and borrowing the
     * campaign's age would be a confident lie.
     */
    function queueRowText(row) {
      var campaign = row && row.campaign != null ? String(row.campaign) : ''
      var ms = row && typeof row.waitMs === 'number' && isFinite(row.waitMs) ? row.waitMs : null
      return {
        campaign: campaign,
        // `age` already speaks the one Chinese duration dialect the panel uses
        // (10分 / 3小时 / 2天), so the wait does not grow a second formatter.
        wait: ms === null ? '' : age(Math.max(0, ms)),
      }
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
     *
     * The queue is a front, not a list: a reader handed a stack of questions
     * answers the cheapest one, so by default exactly one row is drawn and
     * `more` says how many wait behind it. Callers that want the whole list
     * (the audit, the preview) pass an explicit `limit`.
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
      // One question on the table at a time: a stack of decisions is a stack a
      // reader postpones. An explicit limit still opens the list for the tools
      // that need to measure all of it.
      var limit = typeof raw === 'number' && isFinite(raw) && raw >= 0 ? Math.floor(raw) : 1
      var drawn = rows.slice(0, limit)
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
        // What the drawn row is standing in front of. `total` is the true count
        // (including questions the host only numbered), so subtract only the
        // rows actually drawn; `unlisted` rows wait too and are already inside
        // the difference.
        more: Math.max(0, total - drawn.length),
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

    // A lesson is a statement about *somewhere*. The corpus used to be grouped
    // only by kind -- and since every claim the loop writes is a `fact`, that
    // produced one undifferentiated bucket of ninety-nine sentences, which is
    // what "scattered" looks like. Grouping by file is the axis a reader can
    // actually use: it answers "what does the loop know about this file", and
    // it degrades honestly (claims that name no file fall into one named group)
    // instead of inventing structure.
    var NO_FILE = '(未指明文件)'
    var KIND_ORDER = ['hazard', 'recipe', 'fact']
    // What the section draws, not what it knows: 29 groups of 86 claims is a
    // wall in a 320px column. The first groups are the ones with the most
    // claims; the rest are counted in one line so nothing is silently dropped.
    var KGROUPS_SHOWN = 6
    var KITEMS_SHOWN = 4

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
        // `lessons` from the host is the whole corpus. Counting it as "active"
        // made the header claim more live knowledge than exists: the words and
        // the number have to mean the same thing.
        active += c.lessonsActive === undefined || c.lessonsActive === null
          ? num(c.lessons) - num(c.quarantined)
          : num(c.lessonsActive)
        quarantined += num(c.quarantined)
        // `lessonsAll` is the whole corpus; `lessonsTop` is what an older host
        // sent (three per campaign). Reading both keeps a stale panel payload
        // readable instead of blanking the section.
        var top = c.lessonsAll || c.lessonsTop || []
        var pending = []
        for (var j = 0; j < top.length; j += 1) {
          var l = top[j] || {}
          pending.push({
            campaign: c.id,
            id: l.id,
            claim: l.claim,
            kind: lessonKind(l.kind),
            score: num(l.score),
            confidence: num(l.confidence),
            // A lesson's worth is what it has been used for, not the rounded
            // gain it was born with: ninety-nine rows all printing `0` is a
            // column nobody reads.
            uses: num(l.uses),
            harm: num(l.harm),
            files: Array.isArray(l.files) ? l.files : [],
            createdRound: l.createdRound === undefined ? null : l.createdRound,
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
            confidence: pending[k].confidence,
            uses: pending[k].uses,
            harm: pending[k].harm,
            files: pending[k].files,
            createdRound: pending[k].createdRound,
          }
          ordered.push(lesson)
          // rank records corpus order across campaigns; every grouping below is
          // a stable re-sort of the very same rows.
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
      kinds.sort(function (a, b) {
        var ai = KIND_ORDER.indexOf(a.kind)
        var bi = KIND_ORDER.indexOf(b.kind)
        return (ai < 0 ? 9 : ai) - (bi < 0 ? 9 : bi)
      })

      // One row per lesson, filed under the first file it names. A claim that
      // names several files appears once: the tree is for reading, not for
      // counting, and a duplicate row would read as more evidence than exists.
      var files = {}
      var order = []
      var all = []
      for (var f = 0; f < rows.length; f += 1) {
        var camp = rows[f]
        if (!camp || camp.error) continue
        var list = byCampaign[camp.id] || []
        for (var m = 0; m < list.length; m += 1) {
          var entry = list[m]
          all.push(entry)
          var where = entry.files.length ? entry.files[0] : NO_FILE
          if (!files[where]) {
            files[where] = { path: where, items: [], total: 0 }
            order.push(where)
          }
          files[where].items.push(entry)
          files[where].total += 1
        }
      }
      var byFile = order.map(function (path) {
        var group = files[path]
        group.items.sort(function (a, b) {
          // What a lesson has been used for outranks the gain it was born with:
          // a claim reused five times in real rounds is more useful than one
          // that never left the shelf, however confident it sounded.
          // `||` binds looser than the ternaries below, so every tiebreak has
          // to be parenthesised or the whole comparison collapses to a branch.
          return b.uses - a.uses || b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
        })
        return {
          path: path,
          total: group.total,
          // The whole group is kept: the section is the only place a reader can
          // see what the loop believes about one file, so truncating it here
          // would hide exactly the comparison it exists to support.
          items: group.items,
        }
      })
      byFile.sort(function (a, b) {
        // A named file outranks the residual bucket: the bucket is where claims
        // that said nothing about their location collect, and it is the least
        // useful group to open first.
        if (a.path === NO_FILE) return 1
        if (b.path === NO_FILE) return -1
        return b.total - a.total || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
      })
      return {
        active: active,
        quarantined: quarantined,
        kinds: kinds,
        files: byFile,
        all: all,
        byCampaign: byCampaign,
      }
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
        files: corpus.files,
        all: corpus.all,
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

    /**
     * What the research leg bought, as one line: rounds that read, pages that
     * came back, and how many readings the worker used or ignored.
     *
     * The host computes the four counts (`reads` on a campaign row); this only
     * formats them. `unused` is printed beside `used` rather than folded into
     * it: a page nobody read is the number that says a leg is not paying for
     * itself, and "used 2 of 3" would hide how many reads were never measured.
     */
    function readsLine(c) {
      var r = c && c.reads
      if (!r || num(r.rounds) <= 0) return ''
      return 'reads ' + num(r.read) + ' · pages ' + num(r.pages) +
        ' · used ' + num(r.used) + ' · unused ' + num(r.unused)
    }

    /**
     * The one line the read/do trial gets, if one is running.
     *
     * `panelState` has shipped `researchTrial` since `b6258b9` and the panel drew
     * none of it: the comparison reached the JSON and stopped there, which is the
     * same failure as a read nobody records -- one level up. The wording is built
     * server-side in `trialSummary` so the panel and the API cannot disagree about
     * what "cannot distinguish" means, and this function only decides whether
     * there is a line to draw.
     */
    function trialLine(c) {
      var r = c && c.trial
      if (!r || !r.line) return ''
      return r.line
    }

    /**
     * The one line a folded campaign row carries.
     *
     * The folded row used to slice `campaignMeta`, which is empty for the most
     * common shape — a campaign that has not run and owns no figures — so the
     * row rendered a blank span. Never blank, at most three facts, and every
     * figure formatted: a brief is a claim, so `undefined`/`NaN` must not be
     * able to become one.
     */
    function foldBrief(c) {
      if (!c) return '暂无记录'
      var meta = campaignMeta(c)
      var bits = []
      var rounds = amount(c.rounds)
      if (rounds !== null) bits.push(num(rounds) + ' 轮')
      if (costKnown(c)) bits.push(costLabel(c))
      if (c.incumbent && amount(c.incumbent.score) !== null && bits.length < 3) bits.push('最佳 ' + c.incumbent.score)
      if (amount(c.lessons) > 0 && bits.length < 3) bits.push(num(c.lessons) + ' 条知识')
      if (bits.length > 0) return bits.join(' · ')
      // Nothing measured: the artefacts campaignMeta owns are still facts, but
      // a folded row can only carry three of them.
      return meta.slice(0, 3).join(' · ') || statusLabel(c.status) || '暂无记录'
    }

    // The statuses that end a campaign, mirroring `src/runtime/runtime.js` and
    // `src/report/end.js`. A ledger older than the verdict still ended; it just
    // did not record why, and the card must say that rather than go quiet.
    var ENDED = { converged: true, plateaued: true, done: true, stopped: true }

    // One label per cause, so a campaign with no headline still reads as a
    // verdict instead of a status. The raw cause is free-form (`human stop`,
    // `round budget exhausted`), so the fallback matches on words, not just the
    // exact keys the runtime happens to write today.
    var END_CAUSE_ZH = {
      budget: '预算耗尽',
      exhausted: '额度耗尽',
      'no-incumbent': '没有留下可比的分数',
      spawn: '工作进程没起来',
      plateau: '连续多轮没有增益',
      holdout: '留出集回退',
      stuck: '验证门不可达',
      infrastructure: '基础设施故障',
      'all-tasks-solved': '任务全部完成',
      'human stop': '人工停止',
      human: '人工停止',
      'human:panel': '人工停止',
      unrecorded: '原因未记录',
    }

    /** The per-cause label for a campaign whose headline is empty. */
    function endCauseLabel(cause) {
      var key = String(cause || '').toLowerCase()
      if (END_CAUSE_ZH[key]) return END_CAUSE_ZH[key]
      if (key.indexOf('budget') !== -1 || key.indexOf('cost') !== -1) return '预算耗尽'
      if (key.indexOf('token') !== -1 || key.indexOf('exhaust') !== -1) return '额度耗尽'
      if (key.indexOf('spawn') !== -1) return '工作进程没起来'
      if (key.indexOf('infra') !== -1) return '基础设施故障'
      return cause || END_CAUSE_ZH.unrecorded
    }

    /**
     * The verdict a stopped campaign owes: why it ended, in the report's own
     * words.
     *
     * `src/report/end.js` is the one place that turns a ledger into a cause and
     * a headline, and `src/panel/api.js` ships its answer as `end`; the card
     * must show that answer instead of inferring a story from `status` plus a
     * round count. `end.cause === null` is the report's "has not ended" — a
     * running campaign still carries a headline, so the cause is the flag.
     * Returns null while there is nothing to say, and a sentence once the
     * campaign has stopped.
     */
    function endNote(campaign) {
      if (!campaign || typeof campaign !== 'object') return null
      var end = campaign.end && typeof campaign.end === 'object' ? campaign.end : null
      var status =
        (end && typeof end.status === 'string' && end.status.trim()) ||
        (typeof campaign.status === 'string' && campaign.status.trim()) ||
        ''
      var cause = end && typeof end.cause === 'string' ? end.cause.trim() : ''
      var recorded = end !== null && end.cause !== null && end.cause !== undefined && cause !== ''
      if (!recorded && !ENDED[status]) return null
      var headline = end && typeof end.headline === 'string' ? end.headline.trim() : ''
      if (headline) return headline
      // No headline to quote: name the status and the cause, never the status
      // alone. `unrecorded` is itself a cause, not an absence of one.
      return statusLabel(status) + ' · ' + endCauseLabel(cause)
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
     * The five figures of the triangle as one mono line, plus the planner when
     * the host measured one. `measured === false` is a claim by the host that
     * it looked and found nothing to measure — that is one quiet chip, not five
     * dashes pretending to be data.
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
      // The planner is the leg most often absent from the strip, but a
      // campaign whose rounds never reported `planMs` has no measurement to
      // show — a fake 0% would be a claim the ledger never made. A share of
      // wall clock is a fact about time, not about the planner's worth, so the
      // title states what the division was over and that a timeout only means
      // the bound was hit.
      var plan = t.planning && typeof t.planning === 'object' ? t.planning : null
      var planRounds = plan ? num(plan.rounds) : 0
      if (planRounds > 0) {
        var planShare = amount(plan.planShare)
        if (planShare === null) planShare = amount(t.planShare)
        if (planShare === null) {
          var planMs = amount(plan.ms)
          var spanMs = amount(t.durationMs)
          if (planMs !== null && spanMs !== null && spanMs > 0) planShare = planMs / spanMs
        }
        var planTimeouts = num(plan.timedOut)
        var planFailed = num(plan.failed)
        var planLabel = '规划'
        if (planShare !== null) planLabel += ' ' + fmtPercent(planShare)
        if (planTimeouts > 0) planLabel += ' · 超时 ' + planTimeouts
        // 46 of 117 rounds paid a planner and got nothing back — more than the
        // 24 that hit the deadline. Omitting that bucket made the strip read as
        // "the planner works" when most of its failures were simply silent.
        if (planFailed > 0) planLabel += ' · 空手 ' + planFailed
        var planTitle = planShare === null
          ? '规划节点耗时 ÷ 战役墙钟：这次没有同时记下两者，算不出占比'
          : '规划节点耗时 ÷ 战役墙钟 = ' + fmtPercent(planShare) + '（' + planRounds + ' 轮记录了规划耗时）'
        planTitle += planTimeouts > 0
          ? '；其中 ' + planTimeouts + ' 轮撞到规划时限，规划没有在时限内返回，只影响那几轮的结果'
          : '；没有一轮撞到规划时限'
        if (planFailed > 0) {
          planTitle += '；另有 ' + planFailed + ' 轮规划跑完了但没交出任何结论（子进程出错或返回空），这些轮次白白付出了规划时间'
        }
        chips.push({ key: 'planning', label: planLabel, title: planTitle })
      }
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
     * Which model actually did the work, one row per ref.
     *
     * The triangle computes this (`perModel`) and the digest prints one line, but
     * a card is where an operator decides whether the chain is a good bet. A
     * campaign whose primary provider died forty times while every promotion came
     * from the fallback used to look identical to a healthy one.
     *
     * Two numbers must not be conflated:
     *   * `judged` = attempts minus the ones we stopped on purpose. We abort a
     *     sibling because another candidate already won; that is not a provider
     *     failure, and counting it turns three wins out of three into 3/6.
     *   * `p90 === '-'` = never measured. A ref that answered instantly and a ref
     *     nobody timed are different findings.
     *
     * Sorted by attempts desc then ref asc so the rows do not reshuffle between
     * two reads of the same ledger.
     */
    function modelRows(c) {
      var t = (c && c.triangle) || null
      if (!t || t.measured === false || !t.perModel || typeof t.perModel !== 'object') return []
      var rows = []
      Object.keys(t.perModel).forEach(function (ref) {
        var h = t.perModel[ref] || {}
        var attempts = amount(h.attempts) || 0
        if (attempts <= 0) return
        var abandoned = amount(h.abandoned) || 0
        var judged = Math.max(0, attempts - abandoned)
        var ok = amount(h.ok) || 0
        var p90Ms = amount(h.p90Ms)
        var p90 = p90Ms === null || p90Ms < 0 ? '-' : fmtSeconds(p90Ms / 1000) + 's'
        var note = abandoned > 0 ? abandoned + ' stopped' : ''
        var tone = judged > 0 && ok === 0 ? 'bad' : ok < judged ? 'warn' : 'ok'
        rows.push({
          key: ref,
          ref: ref,
          judged: judged,
          ok: ok,
          label: ok + '/' + judged,
          p90: p90,
          note: note,
          tone: tone,
          title: ref + '：判过 ' + judged + ' 次（另有 ' + abandoned + ' 次被主动停止，不算成败）· 赢 ' + ok + ' 次 · p90 ' + p90,
        })
      })
      rows.sort(function (a, b) {
        var d = (amount(t.perModel[b.ref].attempts) || 0) - (amount(t.perModel[a.ref].attempts) || 0)
        return d !== 0 ? d : a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0
      })
      return rows
    }

    /**
     * Which model spent the money, one row per model.
     *
     * The card shows one blended dollar figure, which cannot answer "where did
     * the $0.31 go" when a campaign routes to four providers at four prices.
     * Every attempt records `model`, `costUsd` and `tokens`, so the answer is a
     * sum per model -- and the share is by dollars, not by attempt count: two
     * candidates at the same price do not split the bill evenly with a fallback
     * that ran once.
     *
     * An attempt that never recorded a model is `unknown`, not dropped: that is
     * spend the host can see and the card would otherwise hide. A campaign that
     * spent nothing has no rows at all -- there is no share of zero to draw, and
     * a $0 row would claim a measurement the ledger does not contain.
     */
    function modelSpend(c) {
      var attempts = c && Array.isArray(c.attempts) ? c.attempts : []
      var by = Object.create(null)
      var keys = []
      attempts.forEach(function (a) {
        if (!a || typeof a !== 'object') return
        var ref = typeof a.model === 'string' && a.model.length > 0 ? a.model : 'unknown'
        if (!by[ref]) {
          by[ref] = { model: ref, usd: 0, tokens: 0 }
          keys.push(ref)
        }
        var usd = amount(a.costUsd)
        var tokens = amount(a.tokens)
        by[ref].usd += usd === null ? 0 : usd
        by[ref].tokens += tokens === null ? 0 : tokens
      })
      var total = keys.reduce(function (sum, key) { return sum + by[key].usd }, 0)
      if (!(total > 0)) return []
      return keys
        .map(function (key) {
          var row = by[key]
          return { model: row.model, usd: row.usd, tokens: row.tokens, share: row.usd / total }
        })
        .sort(function (a, b) {
          if (b.usd !== a.usd) return b.usd - a.usd
          return a.model < b.model ? -1 : a.model > b.model ? 1 : 0
        })
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
            (n && n.status ? ' · ' + n.status : '') +
            (n && n.model ? ' · ' + n.model : ''),
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

    /**
     * The band's one spoken sentence: what it is, where the time went, and how
     * many nodes nobody measured. `unknown` is a count, not a zero-width
     * segment, so it is said out loud instead of drawn as "no time spent".
     */
    function bandLabel(band) {
      var parts = []
      for (var i = 0; i < band.segments.length; i += 1) {
        parts.push(band.segments[i].label + ' ' + band.segments[i].pct + '%')
      }
      var label = '节点耗时占比：' + parts.join(' · ')
      if (band.unknown > 0) label += '；另有 ' + band.unknown + ' 个节点未测量'
      return label
    }

    /**
     * One segment's inline geometry. React wants the `style` prop to be an
     * object, while the spec reads `String(props.style)` as CSS text, so the
     * object carries a non-enumerable `toString` that spells the declarations
     * out. Non-enumerable on purpose: React walks the style object's own keys,
     * and a visible `toString` there would be sent to the CSSOM as a property.
     */
    function bandSegStyle(pct, tone) {
      var style = { width: pct + '%', background: tone }
      Object.defineProperty(style, 'toString', {
        value: function () { return 'width:' + pct + '%;background:' + tone },
        enumerable: false,
      })
      return style
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
      var lr = c && c.lastRound
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

    // A round that did not promote opens the tree with the answer to "why",
    // before the round number: the number is what the reader already knows, the
    // verdict is what they came for. A promoted round, or a round with nothing
    // to say about itself, grows no such branch - the panel must not cry wolf.
    function whyNode(c) {
      var lr = c && c.lastRound
      if (!lr || lr.n === null || lr.n === undefined || lr.promoted) return null
      var status = roundStatusLabel(lr)
      if (!status || status === '已晋升') return null
      return {
        key: 'why',
        label: '为什么' + status,
        meta: ['第 ' + lr.n + ' 轮', lr.score === null || lr.score === undefined ? '' : String(lr.score)].filter(Boolean).join(' · '),
        tone: TONES.warn,
        lead: true,
      }
    }

    function waitingNode(c) {
      var cps = (c && c.openCheckpoints) || []
      if (!cps.length) return null
      return {
        key: 'wait',
        // One action surface, at the top of the panel, and it stays there while
        // you read (it is sticky). Repeating 批准/驳回 on every row here turned
        // a three-item queue into nine buttons and pushed the campaign's own
        // state off the first screen.
        label: '待审',
        meta: cps.length + ' · 在顶部处理',
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
            // the card names the checkpoint; the full consequence sentence is
            // the hero's job (and this row's tooltip), so three checkpoints do
            // not reprint three paragraphs inside the campaign
            help: checkpointHelpText(cp.kind),
            brief: checkpointHelp(cp.kind).what,
            mono: true,
            role: 'wait',
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
          // The kind is the same word on almost every row (`fact`), so it says
          // nothing here; the file does. A row reads "src/panel/api.js · +0.4".
          var where = (l.files && l.files.length ? String(l.files[0]) : '').split('/').pop()
          return {
            key: 'l-' + l.id,
            role: 'lesson',
            kind: where || kindLabel(l.kind),
            label: text(l.claim, l.id),
            meta: (num(l.score) > 0 ? '+' : '') + num(l.score),
            mono: false,
          }
        }),
      }
    }

    function treeOf(c, live, corpus) {
      var nodes = []
      // A losing round is named once. The why branch already carries 第 N 轮 and
      // the score, so drawing the round row below it repeats the same line at
      // 22.7px apiece (research/ui-eff-2026-11.md P3). When there is a why, it
      // owns the round and takes its attempts as children.
      var why = whyNode(c)
      var round = lastRoundNode(c)
      if (why) {
        if (round && Array.isArray(round.children) && round.children.length) why.children = round.children
        nodes.push(why)
      } else if (round) {
        nodes.push(round)
      }
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
          brief: node.brief || node.help || '',
          tone: node.tone || '',
          mono: node.mono === true,
          lead: node.lead === true,
          role: node.role || '',
          actions: node.actions || [],
        }
        rows.push(row)
        if (node.children && node.children.length) flattenTree(node.children, depth + 1, rows)
      }
      return rows
    }

    /** The tree as text: what a test asserts and what a reader would draw. */
    function treeLines(nodes) {
      var list = nodes || []
      var rows = flattenTree(list, 1, [])
      // An elbow says where a row sits among its siblings. The tree's answer
      // ("why" lead) is a headline rather than a sibling, and a tree with only
      // one branch has nothing to sit beside, so neither draws one.
      var solo = list.length === 1
      return rows.map(function (row, index) {
        var marks = []
        for (var i = 1; i < row.depth; i += 1) marks.push('  ')
        var bare = index === 0 && (row.lead === true || solo)
        var mark = bare ? '' : row.last ? '└─ ' : '├─ '
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

    // The library's shelf, rendered where the reader already looks.
    //
    // The route serves one prefix path with three answers, so this section keeps
    // its own small decode step: a direction list, one direction's classified
    // rows, and one work's page. Nothing here renders Markdown into HTML -- the
    // bundle requires react and nothing else, so the diagram block is shown as
    // text and the figure is a real image from arXiv. A page that pretended to
    // draw the diagram would be claiming a renderer the host never installed.
    function Research(react) {
      var h = react.createElement
      var useState = react.useState
      var useEffect = react.useEffect

      var SHELF = '/dsh-loom/research'

      function get(url) {
        return fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status)
          return r.json()
        })
      }

      // Cut the page at its "## " headings, ignoring anything inside a fence.
      // This is the same five sections the Markdown file has, not a re-labelled
      // summary of them.
      function sectionsOf(markdown) {
        var lines = String(markdown || '').split('\n')
        var out = []
        var current = null
        var fence = false
        for (var i = 0; i < lines.length; i += 1) {
          var line = lines[i]
          if (line.indexOf('\u0060\u0060\u0060') === 0) fence = !fence
          if (fence) {
            if (current) current.lines.push(line)
            continue
          }
          if (line.indexOf('## ') === 0) {
            current = { name: line.slice(3).trim(), lines: [] }
            out.push(current)
            continue
          }
          if (current && line.indexOf('# ') !== 0) current.lines.push(line)
        }
        return out
      }

      // Prose and diagram source are different things to a reader: the diagram is
      // the paper's own section map and reads as a picture, the prose reads as
      // paragraphs. The bundle may require only `react`, so nothing here draws
      // the diagram -- it is shown as its source in a <pre>, under a line that
      // says so. Printing it as a paragraph, which is what this used to do,
      // made `N0["§2 Method"] --> N1["§2.1 ..."]` look like a sentence.
      function blocks(body) {
        var out = []
        var lines = String(body || '').split('\n')
        var prose = []
        var mermaid = null
        var flush = function () {
          var text = prose.join('\n').trim()
          prose = []
          if (!text) return
          text
            .split(/\n{2,}/)
            .map(function (part) {
              return part.trim()
            })
            .filter(Boolean)
            .forEach(function (part) {
              out.push({ kind: 'text', text: part })
            })
        }
        for (var i = 0; i < lines.length; i += 1) {
          var line = lines[i]
          if (!mermaid && /^\s*\u0060\u0060\u0060\s*mermaid\s*$/.test(line)) {
            flush()
            mermaid = []
            continue
          }
          if (mermaid && /^\s*\u0060\u0060\u0060\s*$/.test(line)) {
            out.push({ kind: 'mermaid', text: mermaid.join('\n') })
            mermaid = null
            continue
          }
          if (mermaid) mermaid.push(line)
          else prose.push(line)
        }
        if (mermaid) out.push({ kind: 'mermaid', text: mermaid.join('\n') })
        flush()
        return out
      }

      function workPage(state) {
        if (state.loading) return h('div', { className: 'loom-worknote' }, '正在读取这一篇…')
        if (state.error) return h('div', { className: 'loom-worknote bad' }, state.error)
        var record = state.record || {}
        var figure = record.pipeline && record.pipeline.figure
        return h(
          'div',
          { className: 'loom-workpage' },
          figure && figure.url
            ? h(
                'a',
                { href: figure.url, target: '_blank', rel: 'noreferrer', className: 'loom-fig' },
                h('img', { src: figure.url, alt: figure.caption || 'pipeline figure', loading: 'lazy' }),
                h('span', { className: 'cap' }, figure.caption || 'pipeline figure'),
              )
            : null,
          sectionsOf(state.markdown).map(function (section) {
            return h(
              'div',
              { key: section.name, className: 'loom-wsec' },
              h('div', { className: 'loom-wsec-head' }, section.name),
              blocks(section.lines.join('\n')).map(function (part, index) {
                if (part.kind === 'mermaid') {
                  return h(
                    'div',
                    { key: index, className: 'loom-mermaid' },
                    h('pre', null, part.text),
                    h('span', { className: 'note' }, '论文自己的小节地图（宿主没有图渲染器，这是它的源码）'),
                  )
                }
                return h('p', { key: index }, part.text)
              }),
            )
          }),
          record.id
            ? h(
                'a',
                { className: 'loom-worklink', href: 'https://arxiv.org/abs/' + record.id, target: '_blank', rel: 'noreferrer' },
                'arXiv:' + record.id,
              )
            : null,
        )
      }

      return function ResearchSection(props) {
        var shelf = (props && props.shelf) || { loading: true, error: null, directions: [], total: null }
        var pick = useState(null)
        var chosen = pick[0]
        var setChosen = pick[1]
        var detail = useState({ loading: false, error: null, works: [], clusters: [] })
        var d = detail[0]
        var setDetail = detail[1]
        var page = useState(null)
        var p = page[0]
        var setPage = page[1]
        var open = useState(null)
        // `props.openId` / `props.open` are a controlled door: a caller that
        // already holds one page (a deep link, or the spec that mounts this
        // section without a browser) passes it in instead of waiting for a
        // click to fetch it. Internal state is the uncontrolled default.
        var openId = open[0] || (props && props.openId) || null
        var setOpenId = open[1]
        // A supplied page wins over a click: the shelf object may already
        // carry one (a deep link, or the spec that mounts this section with no
        // browser). Rendering it does not require an `openId`, because a page
        // that is here is a page the caller asked to show.
        var shown = p || (props && props.open) || (shelf && shelf.open) || null

        useEffect(
          function () {
            if (!chosen) return
            setDetail({ loading: true, error: null, works: [], clusters: [] })
            get(SHELF + '/' + chosen)
              .then(function (body) {
                setDetail({ loading: false, error: null, works: body.works || [], clusters: body.clusters || [] })
              })
              .catch(function (err) {
                setDetail({ loading: false, error: String((err && err.message) || err), works: [], clusters: [] })
              })
          },
          [chosen],
        )

        useEffect(
          function () {
            if (!chosen || !openId) {
              setPage(null)
              return
            }
            setPage({ loading: true, error: null, markdown: '' })
            get(SHELF + '/' + chosen + '/' + openId)
              .then(function (body) {
                setPage({ loading: false, error: null, markdown: body.markdown || '', record: body.record || null })
              })
              .catch(function (err) {
                setPage({ loading: false, error: String((err && err.message) || err), markdown: '' })
              })
          },
          [chosen, openId],
        )

        if (shelf.loading) {
          return h('div', { className: 'loom-sec' }, h('div', { className: 'loom-sec-head' }, '调研'), h('div', { className: 'loom-worknote' }, '正在读取调研库…'))
        }
        if (shelf.error) {
          return h('div', { className: 'loom-sec' }, h('div', { className: 'loom-sec-head' }, '调研'), h('div', { className: 'loom-worknote bad' }, shelf.error))
        }
        var directions = shelf.directions || []
        if (!directions.length) {
          // "not built yet" is the first state a reader meets, so it is said in
          // a sentence rather than shown as an empty list under a title.
          return h(
            'div',
            { className: 'loom-sec' },
            h('div', { className: 'loom-sec-head' }, '调研'),
            h('div', { className: 'loom-worknote' }, '还没有建过库：scripts/research-work.mjs 还没有为任何方向跑过。'),
          )
        }

        var total = shelf.total || {}
        var head = h(
          'div',
          { className: 'loom-sec-head' },
          '调研',
          h('span', { className: 'n' }, (total.works || 0) + ' 篇 · ' + directions.length + ' 个方向 · ' + (total.figures || 0) + ' 张图'),
        )

        var rows = directions.map(function (dir) {
          var active = dir.slug === chosen
          return h(
            'div',
            { key: dir.slug, className: 'loom-dirrow' + (active ? ' active' : '') },
            h(
              'button',
              {
                type: 'button',
                className: 'loom-dirhit',
                onClick: function () {
                  setChosen(active ? null : dir.slug)
                  setOpenId(null)
                },
                title: dir.name,
              },
              h('span', { className: 'nm' }, dir.name),
              h('span', { className: 'c' }, dir.works + ' 篇'),
              // How many works somebody actually wrote about is the one number
              // that separates a shelf from a pile.
              h('span', { className: 's', title: dir.summaries + ' 篇有人写过总结' }, '总结 ' + dir.summaries + '/' + dir.works),
              h('span', { className: 'g' }, dir.figures + ' 图'),
            ),
          )
        })

        var detailBlock = null
        if (chosen) {
          if (d.loading) detailBlock = h('div', { className: 'loom-worknote' }, '正在读取 ' + chosen + '…')
          else if (d.error) detailBlock = h('div', { className: 'loom-worknote bad' }, d.error)
          else {
            detailBlock = h(
              'div',
              { className: 'loom-works' },
              (d.clusters || []).map(function (cluster) {
                var items = (d.works || []).filter(function (work) {
                  return work.cluster === cluster.label
                })
                if (!items.length) return null
                return h(
                  'div',
                  { key: cluster.label, className: 'loom-cluster' },
                  h('div', { className: 'loom-cluster-head' }, cluster.label, h('span', { className: 'n' }, String(cluster.count))),
                  items.map(function (work) {
                    var isOpen = work.id === openId
                    return h(
                      'div',
                      { key: work.id, className: 'loom-workrow' + (isOpen ? ' open' : '') },
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'loom-workhit',
                          onClick: function () {
                            setOpenId(isOpen ? null : work.id)
                          },
                          title: work.title,
                        },
                        h('span', { className: 'id' }, work.id),
                        h('span', { className: 't' }, work.title || '(no title)'),
                        h('span', { className: 'm', title: '机制点' }, String(work.mechanisms)),
                        h('span', { className: 'f', title: work.hasFigure ? '有 pipeline 图' : '论文没有可取的图' }, work.hasFigure ? '图' : '—'),
                        h('span', { className: 'c', title: '被本库几篇引用' }, work.citedBy ? String(work.citedBy) : ''),
                      ),
                    )
                  }),
                )
              }),
            )
          }
        }

        return h('div', { className: 'loom-sec' }, head, h('div', { className: 'loom-dirs' }, rows), detailBlock, shown ? workPage(shown) : null)
      }
    }

    function Panel(react, CardView) {
      var h = react.createElement
      var useState = react.useState
      var useEffect = react.useEffect
      var useCallback = react.useCallback

      var ResearchSection = Research(react)

      return function LoomPanel() {
        var s = useState({ loading: true, data: null, error: null, busy: null })
        var box = s[0]
        var setBox = s[1]

        // which campaigns the reader folded away, and which destructive action
        // is one click into being confirmed
        var f = useState(readCollapsed)
        var folded = f[0]
        var setFolded = f[1]

        // The shelf has its own route and its own cadence: it changes when a
        // library is built, not every five seconds, so it is fetched once and
        // refreshed on demand instead of riding the campaign poll.
        var sh = useState({ loading: true, error: null, directions: [], total: null })
        var shelf = sh[0]
        var setShelf = sh[1]
        var reloadShelf = useCallback(function () {
          setShelf(function (prev) {
            return { loading: true, error: null, directions: prev.directions || [], total: prev.total }
          })
          fetch('/dsh-loom/research', { headers: { accept: 'application/json' }, cache: 'no-store' })
            .then(function (r) {
              if (!r.ok) throw new Error('HTTP ' + r.status)
              return r.json()
            })
            .then(function (body) {
              setShelf({ loading: false, error: null, directions: body.directions || [], total: body.total || null })
            })
            .catch(function (err) {
              setShelf({ loading: false, error: String((err && err.message) || err), directions: [], total: null })
            })
        }, [])
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
          reloadShelf()
          var t = setInterval(function () {
            // re-pin on every tick: if the reader flips the host theme, the
            // ink base has to follow it without a reload
            paintInk(typeof document === 'undefined' ? null : document)
            load()
          }, POLL_MS)
          return function () {
            clearInterval(t)
          }
        }, [load, reloadShelf])

        var act = useCallback(
          function (campaign, action, decision, checkpoint, extra) {
            setBox(function (prev) {
              return { loading: false, data: prev.data, error: prev.error, busy: campaign + ':' + action }
            })
            fetch(ROUTE, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(
                Object.assign({ campaign: campaign, action: action, decision: decision, checkpoint: checkpoint }, extra || {}),
              ),
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
          h('span', { className: 'loom-track' }, h('span', { className: 'loom-knob' })),
          h('span', null, '循环'),
        )
        // Planning is the other install-level control: it changes what a round buys,
        // not what a campaign is. It sits next to the switch for the same reason --
        // it never asks which campaign it refers to.
        var planOn = !!(data && data.planning && data.planning.on)
        var planToggle = function () {
          act('', 'plan', null, null, { enabled: !planOn })
        }
        var planLook = switchProps(planOn, planToggle)
        planLook.type = 'button'
        planLook.className = 'loom-switch'
        planLook.onClick = planToggle
        planLook.title = planOn
            ? '每轮先派一个规划 agent 找落点；约 25% 轮钟。点这里关掉'
            : '不派规划 agent，候选直接开工；故障位置不明显时打开它'
        var planBtn = h(
          'button',
          planLook,
          h('span', { className: 'loom-track' }, h('span', { className: 'loom-knob' })),
          h('span', null, '规划'),
        )
        // the header is drawn before the queue block, so it asks for the count
        // itself rather than waiting for that variable to exist
        var waitTotal = queueOf(data).total

        var header = h(
          'div',
          { className: 'loom-head' },
          h('span', { className: 'loom-mark' }, 'RSI'),
          // The queue scrolls with the page now, so the count lives where the
          // reader looks for state: the header. Pressing it goes back up.
          waitTotal > 0
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'loom-wait',
                  title: waitTotal + ' 条检查点等你决定 — 点一下回到队列',
                  'aria-label': '待你决定 ' + waitTotal + ' 条，回到队列',
                  onClick: function (e) {
                    // stay inside this panel: the host may show more than one
                    var home =
                      e && e.currentTarget && e.currentTarget.closest
                        ? e.currentTarget.closest('.loom')
                        : globalThis.document && globalThis.document.querySelector('.loom')
                    var sc = home && home.querySelector ? home.querySelector('.loom-scroll') : null
                    if (sc) sc.scrollTop = 0
                  },
                },
                h('span', { className: 'dot' }),
                String(waitTotal),
              )
            : null,
          h('span', { className: 'loom-spacer' }),
          planBtn,
          switchBtn,
          h(
            'button',
            {
              type: 'button',
              className: 'loom-btn bare',
              style: { padding: '5px 6px', minHeight: 24 },
              title: '重新读取 ~/.dsh/loom',
              'aria-label': '刷新',
              onClick: load,
            },
            '↻',
          ),
        )

        // The queue count is the hero's figure; repeating it in a caption would
        // put the same number on screen twice. "轮数" is the data function's
        // name for it -- a caption has room for the short word.
        var caption = { rounds: '轮' }
        var figs = metrics(data).filter(function (m) {
          return m.key !== 'pending'
        })
        var strip = h(
          'div',
          { className: 'loom-figures' },
          figs.map(function (m) {
            return h(
              'span',
              { key: m.key, className: 'f' + (m.hot ? ' hot' : '') },
              h('b', null, m.value),
              ' ' + (caption[m.key] || m.label),
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

        // The queue is the product. It is the first thing on the panel, it shows
        // the count as a figure rather than a caption, and each row carries its
        // consequence in a second line -- a decision the reader cannot price is
        // a decision they will postpone.
        var queueRows = queue.rows.map(function (q, rowIndex) {
          var key = q.campaign + ':' + q.id
          var busyKey = q.campaign + ':decide'
          // Two clicks for the act that cannot be undone, one for the acts that
          // change nothing on disk. The armed state says what it will do, so a
          // reader never has to remember why the button changed.
          var arming = confirming === key
          var armingReject = confirming === key + ':reject'
          var effect = q.approve || { verb: '放行', what: '只表示可以继续，不落地任何补丁', fatal: false }
          var assessed = q.riskSource === 'review'
          var why = assessed ? q.summary || checkpointLabel(q.kind) : '宿主没有评估这条检查点的风险'
          // What happened and what ignoring it costs, in the tooltip: the queue
          // row is too narrow to wrap the whole explanation.
          var rowTitle = q.help ? why + ' · ' + q.help : why
          return h(
            'div',
            { key: key, className: 'loom-hero-row' },
            h('span', {
              className: 'loom-dot',
              style: { color: assessed ? riskTone(q.risk) : 'var(--loom-faint)', marginTop: 5 },
            }),
            h(
              'span',
              { className: 'txt', title: rowTitle },
              h(
                'span',
                { className: 'what' },
                h('b', null, q.campaign),
                h('span', { style: { color: 'var(--loom-faint)' } }, ' · ' + checkpointLabel(q.kind)),
                assessed
                  ? null
                  : h('span', { className: 'loom-chip quiet', style: { marginLeft: 6, padding: '2px 6px', fontSize: 10.5 } }, '未评估'),
                q.deferred
                  ? h(
                      'span',
                      {
                        className: 'loom-chip quiet',
                        style: { marginLeft: 6, padding: '2px 6px', fontSize: 10.5 },
                        title: '已暂缓至 ' + new Date(q.deferUntil).toLocaleString('zh-CN'),
                      },
                      '已暂缓',
                    )
                  : null,
              ),
              h('span', { className: 'why' }, why),
              // The row is the only place most checkpoints are read, and a
              // decision you cannot price is one you will postpone: say what the
              // thumb actually does, and whether it can be taken back.
              h(
                'span',
                { className: 'then' },
                '批准后：' + effect.what,
                effect.fatal ? h('span', { className: 'flag' }, ' · 不可撤销') : null,
              ),
            ),
            h(
              'span',
              { className: 'loom-hero-acts' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'loom-btn line danger',
                  disabled: box.busy === busyKey,
                  title: armingReject ? '再点一次即驳回' : '驳回 — 需要再点一次确认',
                  onClick: function () {
                    if (!armingReject) {
                      setConfirming(key + ':reject')
                      return
                    }
                    setConfirming(null)
                    act(q.campaign, 'decide', 'reject', q.id)
                  },
                },
                armingReject ? '确认驳回' : '驳回',
              ),
              h(
                'button',
                {
                  type: 'button',
                  // the filled button is the one that changes the repository: a
                  // rule a reader can learn, instead of "whichever row is first"
                  className: effect.fatal ? 'loom-btn solid' : 'loom-btn line',
                  disabled: box.busy === busyKey,
                  title: arming
                    ? '再点一次：' + effect.what
                    : effect.what + (effect.fatal ? '（不可撤销，需要再点一次）' : ''),
                  onClick: function () {
                    if (effect.fatal && !arming) {
                      setConfirming(key)
                      return
                    }
                    setConfirming(null)
                    act(q.campaign, 'decide', 'approve', q.id)
                  },
                },
                arming ? '确认' + effect.verb : effect.verb,
              ),
            ),
          )
        })

        // An empty queue is not an empty screen: it is the loop working without
        // you. So the resting state answers "is anything happening" with the
        // campaign that moved last, instead of a zero.
        var movingNow = ((data && data.campaigns) || []).filter(function (c) {
          return c.status === 'running'
        })
        // the busiest first: the campaign furthest into its budget is the one a
        // reader wants named first
        movingNow.sort(function (a, b) {
          var an = (a.lastRound && a.lastRound.n) || 0
          var bn = (b.lastRound && b.lastRound.n) || 0
          return bn - an
        })
        // Name every campaign that is moving, not just the busiest one: "2 个在跑"
        // beside a single name reads like one of them is unaccounted for.
        var restKids = movingNow.length
          ? [movingNow.length + ' 个战役在跑（']
              .concat(
                movingNow.slice(0, 3).reduce(function (all, c, i) {
                  var n = (c.lastRound && c.lastRound.n) || 0
                  if (i > 0) all.push('、')
                  // an id is one word: it must not break between "loom-" and the
                  // campaign's name at 320px
                  all.push(h('span', { key: c.id, className: 'id' }, c.id + (n ? ' 第 ' + n + ' 轮' : '')))
                  return all
                }, []),
              )
              .concat([(movingNow.length > 3 ? ' 等' : '') + '）'])
          : ['循环在自己跑；需要人时，它会出现在这里']
        var restLine = h('span', { className: 'rest' }, restKids)

        var pendingBlock = h(
          'div',
          { className: 'loom-hero', 'aria-live': 'polite', 'aria-label': '待你处理' },
          h(
            'div',
            { className: 'loom-hero-head' },
            h('span', { className: 'k' }, queue.total > 0 ? '需要你决定' : '没有待处理的决定'),
            // a zero is not a figure worth 22px; when the queue is empty the
            // count line simply is not there
            queue.total > 0
              ? h('span', { className: 'v', title: queue.total + ' 条等待中' }, String(queue.total))
              : null,
          ),
          queue.total === 0
            ? h(
                'div',
                { className: 'loom-hero-empty' },
                h('span', { className: 'dot' }),
                h('span', null, restLine),
              )
            : h('div', { className: 'loom-hero-rows' }, queueRows),
          // The front is one row; the rest must still be visible as a count or
          // the panel would claim the only question is the one on screen.
          queue.more > 0
            ? h(
                'div',
                { className: 'loom-more' },
                '还有 ' + queue.more + ' 条决定在排队，先处理这一条',
              )
            : null,
          queueNote,
        )


        // Knowledge is filed by file, not by kind. Every claim the loop writes
        // is a `fact`, so a kind grouping was one undifferentiated bucket --
        // ninety-nine sentences in a row with nothing to hold on to. A file
        // group is the axis a reader can use ("what does it know about this
        // module?"), and a claim that names no file says so instead of being
        // filed somewhere arbitrary.
        var reusedAny = tree.files.some(function (g) {
          return (g.items || []).some(function (it) {
            return it.uses > 0
          })
        })
        var treeBlock =
          tree.files.length === 0
            ? null
            : h(
                'div',
                { className: 'loom-sec' },
                h(
                  'div',
                  { className: 'loom-sec-head' },
                  '知识',
                  h(
                    'span',
                    { className: 'n' },
                    tree.active + ' 有效' + ' · ' + tree.files.length + ' 处' + (tree.quarantined ? ' · ' + tree.quarantined + ' 隔离' : ''),
                  ),
                ),
                h(
                  'div',
                  { className: 'loom-kfiles' },
                  tree.files.slice(0, KGROUPS_SHOWN).map(function (g) {
                  return h(
                    'div',
                    { key: 'kf-' + g.path, className: 'loom-kfile' },
                    h(
                      'div',
                      { className: 'loom-kind', title: g.path },
                      h('span', { className: 'p' }, g.path),
                      h('span', { className: 'c' }, String(g.total)),
                    ),
                    g.items.slice(0, KITEMS_SHOWN).map(function (item) {
                      return h(
                        'div',
                        {
                          key: item.campaign + ':' + item.id,
                          className: 'loom-lesson',
                          // The full sentence is the tooltip; the card is one
                          // wrapped line pair, because a claim longer than that
                          // is a claim that has not been stated sharply enough.
                          title: text(item.claim, item.id) + (item.createdRound ? ' · 第 ' + item.createdRound + ' 轮' : ''),
                        },
                        h('span', { className: 'kind', 'data-kind': item.kind }, kindLabel(item.kind).slice(0, 2)),
                        h('span', { className: 'claim' }, text(item.claim, item.id)),
                        // A badge on every row is a badge on none: when nothing
                        // here has been reused yet, "新" fifteen times says only
                        // that the section is new, and the header already says
                        // how many there are.
                        item.uses > 0 || reusedAny
                          ? h(
                              'span',
                              {
                                className: 'score',
                                'data-tone': item.harm > 0 ? 'down' : item.uses > 0 ? 'up' : 'flat',
                                title: item.uses > 0
                                  ? '用上过 ' + item.uses + ' 次' + (item.harm > 0 ? '，其中 ' + item.harm + ' 次有害' : '')
                                  : '还没有哪一轮用上过它',
                              },
                              // A reusable claim is described by how often it
                              // was reused; the gain it was born with is a
                              // number about a round that is over.
                              item.uses > 0 ? '用 ' + item.uses : '新',
                            )
                          : null,
                      )
                    }),
                    g.items.length > KITEMS_SHOWN
                      ? h('div', { className: 'loom-more' }, '还有 ' + (g.items.length - KITEMS_SHOWN) + ' 条')
                      : null,
                  )
                }),
                ),
                tree.files.length > KGROUPS_SHOWN
                  ? h(
                      'div',
                      { className: 'loom-more loom-more-groups' },
                      '另有 ' + (tree.files.length - KGROUPS_SHOWN) + ' 处 · 共 ' + tree.active + ' 条',
                    )
                  : null,
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
              h('span', { className: 'n' }, data.campaigns.filter(function (c) {
                return c && !c.error
              }).length + ' 个'),
              h(
                'button',
                {
                  type: 'button',
                  className: 'loom-btn bare',
                  style: { marginLeft: 'auto', fontSize: '11px' },
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

        var researchBlock = h(ResearchSection, {
          shelf: shelf,
          onReload: reloadShelf,
        })

        var footer = h(
          'div',
          { className: 'loom-foot' },
          // The one fact a reader must not have to discover by closing the
          // window: the loop lives in this process. Say what closing costs, not
          // just where it runs -- "runs in this window" alone reads like a
          // detail, and the reader closes the window to find out it was a rule.
          h(
            'span',
            {
              title:
                '循环跑在这个窗口的进程里。关掉窗口 = 循环暂停：' +
                (queue.total > 0 ? '待你决定的 ' + queue.total + ' 条会保留，' : '') +
                '正在跑的候选会中断（这一轮的支出不退）。',
            },
            data && data.ownership && data.ownership.mine === false
              ? '由另一个窗口运行'
              : '关窗 = 循环暂停' + (queue.total > 0 ? ' · 待决定 ' + queue.total + ' 条保留' : ''),
          ),
          data && data.lean ? h('span', { className: 'sep' }, 'Lean ' + (data.lean.available ? '就绪' : '未安装')) : null,
        )

        // The header, the figures and the footer stay put; only the middle
        // scrolls, so the loop switch never scrolls out of reach.
        return h(
          'div',
          { className: 'loom', style: { height: '100%' } },
          header,
          h('div', { className: 'loom-scroll', style: { overflowY: 'auto' } }, pendingBlock, strip, body, treeBlock, researchBlock),
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
        // The read leg's counts are the same kind of fact as the round and
        // score figures, so they hang off the same card body.
        var readsText = readsLine(c)
        // The trial is the comparison the whole read/do work exists to produce;
        // until this line existed it was shipped and never drawn.
        var trialText = trialLine(c)
        var chain = chainPath(c.chain)
        var armed = props.confirming === c.id + ':stop'

        var head = h(
          'div',
          { className: 'loom-titlerow' },
          h('span', { className: 'loom-dot', style: { color: TONES[cardTone(c)], marginBottom: 1 } }),
          h('span', { className: 'loom-name', title: c.id }, c.id),
          h('span', { className: 'loom-state' }, statusLabel(c.status)),
          // "42秒" beside a running campaign reads as uptime; the card means
          // "last thing that happened was 42 seconds ago", and says so
          h(
            'span',
            {
              className: 'loom-age',
              title: age(c.ageMs) ? '最近一次活动在 ' + age(c.ageMs) + '前' : '',
            },
            folded || !age(c.ageMs) ? '' : age(c.ageMs) + '前',
          ),
          folded ? null : h('span', { className: 'loom-caret' }, '⌄'),
        )

        if (folded) {
          // One line per idle campaign: what it is, where it stands, and whether
          // it wants something from the reader. Everything else is one click
          // away, and that click is the whole card.
          var openCp = openCount(c)
          var brief = foldBrief(c)
          var hit = hitProps(c, false, props.onToggle)
          hit.className = 'loom-hit'
          return h(
            'div',
            { className: 'loom-camp folded' },
            h(
              'div',
              hit,
              h('span', { className: 'loom-dot', style: { color: TONES[cardTone(c)] } }),
              h('span', { className: 'loom-name', title: c.id }, c.id),
              h('span', { className: 'loom-state' }, statusLabel(c.status)),
              openCp > 0 ? h('span', { className: 'loom-flag', title: openCp + ' 个检查点等你处理' }, '待 ' + openCp) : null,
              h('span', { className: 'loom-brief', title: brief }, brief),
              h('span', { className: 'loom-caret' }, '›'),
            ),
          )
        }

        var tri = triangleChips(c)
        var modelRows_ = modelRows(c)
        // A separate block, not a column on the reliability rows: `modelRows_`
        // comes from the triangle and lists only providers it measured, while
        // spend rides on the attempts themselves. A campaign can have one and
        // not the other, and joining them would silently drop spend rows.
        var spendRows_ = modelSpend(c)
        var spendTitle = spendRows_.length > 0
          ? '按模型拆分花费（共 ' + money(spendRows_.reduce(function (sum, row) { return sum + row.usd }, 0)) + '）'
          : ''
        var spark = sparkOf(c)
        var meters = budgetMeters(c)
        var nodeKids = nodeChips(c)
        var band = nodeBand(c)

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

        // Where the round went, in one glance: one segment per key the host
        // actually measured. No node measured means no element at all - the
        // element is the claim, and an empty 8px track claims "no time spent".
        var bandNode = band
          ? h(
            'div',
            {
              className: 'loom-band',
              role: 'img',
              'aria-label': bandLabel(band),
              title: bandLabel(band),
            },
            band.segments.map(function (seg) {
              return h('span', {
                key: seg.key,
                className: 'loom-band-seg',
                title: seg.title,
                style: bandSegStyle(seg.pct, seg.tone),
              })
            }),
          )
          : null

        var sparkWrap = sparkNode
          ? h(
            'div',
            { className: 'loom-sparkwrap' },
            h('span', { className: 'cap' }, '最近 ' + spark.count + ' 轮'),
            h('span', { className: 'spacer' }),
            sparkNode,
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

        // Why it stopped, when it has: the card used to show a status and a
        // round count, which is a state, not a verdict.
        var verdict = endNote(c)
        var endLine = verdict ? h('div', { className: 'loom-end', title: verdict }, verdict) : null

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
          // the row shows the short half; the tooltip on the label carries
          // the whole sentence (what it is, and what ignoring it costs)
          if (row.brief) parts.push(h('span', { className: 'help', key: 'h' }, row.brief))
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
              'data-role': row.role || undefined,
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
            h('div', { className: 'loom-vitals' }, sparkWrap, metersNode),
            h('div', { className: 'loom-tri', title: tri.map(function (chip) { return chip.title }).join(' · ') }, triKids),
            metaLine,
            // Reads get their own line under the meta row: the meta row is the
            // campaign's artefacts and verdicts, while these are one leg's
            // measurements, and appending them let a truncated line hide them.
            when(readsText, h('div', { className: 'loom-meta', key: 'reads', title: readsText }, readsText)),
            // Below the reads line, for the same reason: one trial summary, not
            // another artefact of the campaign.
            when(trialText, h('div', { className: 'loom-meta', key: 'trial', title: trialText }, trialText)),
            endLine,
            when(nodeKids.length > 0, h('div', { className: 'loom-chips' }, nodeKids.map(function (chip) {
              return h('span', { key: chip.key, className: 'loom-chip quiet', title: chip.title }, chip.label)
            }))),
            when(chain, h('div', { className: 'loom-chain', title: chain }, chain)),
            when(modelRows_.length > 0, h('div', { className: 'loom-models' }, modelRows_.map(function (row) {
              return [
                h('div', { key: row.key + ':l', className: 'loom-model', title: row.title },
                  h('span', { className: 'ref' }, row.ref),
                  h('span', { className: 'ratio', 'data-tone': row.tone }, row.label),
                  row.note ? h('span', { className: 'note' }, row.note) : null),
                h('div', { key: row.key + ':r', className: 'p90', title: 'p90 用时（判过的尝试）' }, row.p90),
              ]
            }).reduce(function (all, pair) { return all.concat(pair) }, []))),
            // Below the reliability rows: same block class, one full-width row
            // per model, so the card reads "who ran it" then "who paid for it".
            when(spendRows_.length > 0, h('div', { className: 'loom-models loom-spend', title: spendTitle }, spendRows_.map(function (row) {
              return h('div', {
                key: 'spend:' + row.model,
                className: 'loom-model',
                title: row.model + '：' + money(row.usd) + ' · 占 ' + Math.round(row.share * 100) + '% · ' + row.tokens + ' tokens',
              },
                h('span', { className: 'ref' }, row.model),
                h('span', { className: 'usd' }, money(row.usd)),
                h('span', { className: 'share' }, Math.round(row.share * 100) + '%'))
            }))),
          ),
          bandNode,
          when(treeRows.length > 0, h('div', { className: 'loom-tree' }, treeRows)),
          // The card's verbs come from cardActions(), the same list a spec can
          // assert: a running campaign offers 暂停 and 停止, a paused one 继续 and
          // 停止. 收起 is gone -- the caret in the header already folds the card,
          // and a view action sitting beside two state changes invites the wrong
          // click.
          h(
            'div',
            { className: 'loom-acts' },
            cardActions(c).map(function (item) {
              var key = c.id + ':' + item.key
              var stopping = item.confirm && armed
              return h(
                'button',
                {
                  key: item.key,
                  type: 'button',
                  className: 'loom-btn bare' + (item.danger ? ' danger' : ''),
                  disabled: busy === key,
                  title: item.confirm
                    ? stopping
                      ? '再点一次即停止 ' + c.id + '：本轮作废，已花的时间不退'
                      : '停止 ' + c.id + ' — 需要再点一次确认'
                    : item.label + '这一战役',
                  onClick: function () {
                    if (item.confirm && !armed) {
                      props.setConfirming(key)
                      return
                    }
                    props.act(c.id, item.action)
                  },
                },
                busy === key ? '…' : stopping ? '确认停止' : item.label,
              )
            }),
          ),
        )
      }
    }

    // Two pills beside the composer's permission control: the loop's master
    // switch, and the workflow switch that plans stages and dispatches each one
    // to its own harness.
    //
    // They live in the composer and not in the sidebar because they are not about
    // one campaign -- they change what the next round will do. A pill shows the
    // value the host reports, never the value it was clicked to: a switch that
    // renders "on" before the host agreed is the one failure this control must
    // not have, so a click posts and then re-reads.
    //
    // Styling is inline and token-free on purpose: the composer is not inside
    // `loom-root`, so the panel's custom properties are not in scope here.
    function Pills(react) {
      var h = react.createElement
      var useState = react.useState
      var useEffect = react.useEffect
      var useCallback = react.useCallback

      var CAP = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        height: '22px',
        padding: '0 4px',
        marginRight: '6px',
        border: '0',
        borderRadius: '8px',
        background: 'transparent',
        color: 'inherit',
        font: 'inherit',
        fontSize: '12px',
        lineHeight: '20px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
      }

      // A switch, not a badge: a pill track with a knob that slides to the side
      // it is on, so the state is readable from position before it is read from
      // colour. On is the host's own brand accent, not one mixed here: the
      // composer sits inside the host theme, `--dsw-alias-brand-primary` is that
      // theme's declared accent, and `#4D6BFE` is only the fallback for a host
      // that does not publish it (the hex is the brand blue the shell's own
      // marks are drawn in). The panel's `--loom-*` properties are not in scope
      // outside `loom-root`, which is why this one reads a `--dsw-*` token.
      var ON_TRACK = 'var(--dsw-alias-brand-primary, #4D6BFE)'
      var OFF_TRACK = 'rgba(127,127,127,.32)'
      var KNOB_ON = 'translateX(13px)'
      var KNOB_OFF = 'translateX(2px)'

      function track(on) {
        return h(
          'span',
          {
            key: 'track',
            'aria-hidden': 'true',
            style: {
              display: 'inline-block',
              boxSizing: 'border-box',
              position: 'relative',
              width: '26px',
              height: '15px',
              borderRadius: '999px',
              background: on ? ON_TRACK : OFF_TRACK,
              transition: 'background 180ms ease',
              verticalAlign: 'middle',
            },
          },
          h('span', {
            key: 'knob',
            style: {
              display: 'block',
              boxSizing: 'border-box',
              position: 'absolute',
              top: '2px',
              left: '0',
              width: '11px',
              height: '11px',
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 1px 2px rgba(0,0,0,.28)',
              transform: on ? KNOB_ON : KNOB_OFF,
              transition: 'transform 180ms ease',
            },
          }),
        )
      }

      return function ComposerPills() {
        var s = useState({ loading: true, error: null, data: null, busy: null })
        var box = s[0]
        var setBox = s[1]

        var read = useCallback(function () {
          fetch(ROUTE, { headers: { accept: 'application/json' }, cache: 'no-store' })
            .then(function (r) {
              if (!r.ok) throw new Error('HTTP ' + r.status)
              return r.json()
            })
            .then(function (data) {
              setBox({ loading: false, error: null, data: data, busy: null })
            })
            .catch(function (err) {
              setBox(function (prev) {
                return { loading: false, error: String(err && err.message ? err.message : err), data: prev.data, busy: null }
              })
            })
        }, [])

        useEffect(function () {
          read()
        }, [read])

        var send = useCallback(
          function (tag, body) {
            setBox(function (prev) {
              return { loading: false, error: prev.error, data: prev.data, busy: tag }
            })
            fetch(ROUTE, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(body),
            })
              .then(function (r) {
                return r.json().then(function (payload) {
                  if (!r.ok) throw new Error(String(payload && payload.error ? payload.error : 'HTTP ' + r.status))
                  return payload
                })
              })
              .then(function () {
                read()
              })
              .catch(function (err) {
                setBox(function (prev) {
                  return { loading: false, error: String(err && err.message ? err.message : err), data: prev.data, busy: null }
                })
              })
          },
          [read],
        )

        var data = box.data
        var rsiOn = !!(data && data.rsi && data.rsi.enabled !== false)
        var dispatchOn = !!(data && data.dispatch && data.dispatch.enabled === true)
        var stages = data && data.dispatch && Array.isArray(data.dispatch.stages) ? data.dispatch.stages : []
        var arms = data && data.dispatch && data.dispatch.arms ? data.dispatch.arms : null
        // The arms are what a bench measured each stage wants, not what this
        // loop spawned; the sentence says so rather than letting a list of
        // harness names read as "four of them ran".
        var armLine =
          arms && stages.length
            ? stages
                .map(function (stage) {
                  return stage + ' → ' + (arms[stage] || 'dsh')
                })
                .join(' · ')
            : ''
        var whyRsi = box.error
          ? box.error
          : data
            ? rsiOn
              ? '循环开着：会自己起下一轮'
              : '循环关着：不会自己起轮'
            : '正在读取…'
        var whyDispatch = box.error
          ? box.error
          : data
            ? 'Auto：每轮先规划流程（' +
              (stages.length ? stages.join(' → ') : 'triage → spec → implement → verify → review') +
              '），再按阶段换最合适的 harness（' +
              (dispatchOn ? '现在开着' : '现在关着') +
              '）。' +
              (armLine ? '实测该给谁：' + armLine + '——今天只有一个 harness，所以只登记该给谁、不真换。' : '') +
              '当前只有 DSH 一个模型族，所以换的是框架与 preset，不换模型；关着时与今天逐字节一致。'
            : '正在读取…'

        return h(
          'div',
          { key: 'loom-pills', style: { display: 'inline-flex', alignItems: 'center' } },
          h(
            'button',
            {
              key: 'rsi',
              type: 'button',
              style: CAP,
              role: 'switch',
              'aria-checked': rsiOn,
              'aria-label': 'RSI',
              title: whyRsi,
              disabled: box.busy === 'rsi',
              onClick: function () {
                send('rsi', { action: rsiOn ? 'disable' : 'enable', reason: 'composer pill' })
              },
            },
            h('span', { key: 'label' }, box.busy === 'rsi' ? '…' : 'RSI'),
            track(rsiOn),
          ),
          h(
            'button',
            {
              key: 'dispatch',
              type: 'button',
              style: CAP,
              role: 'switch',
              'aria-checked': dispatchOn,
              'aria-label': 'Auto',
              title: whyDispatch,
              disabled: box.busy === 'dispatch',
              onClick: function () {
                send('dispatch', { action: 'dispatch', enabled: !dispatchOn, reason: 'composer pill' })
              },
            },
            h('span', { key: 'label' }, box.busy === 'dispatch' ? '…' : 'Auto'),
            track(dispatchOn),
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
      var ComposerPills = Pills(react)

      ctx.inject(['slots'], function (scope) {
        // The composer's left tool row holds the permission control; the two
        // switches go beside it. `order` keeps them after the host's own
        // controls rather than in front of them.
        scope.slots.inject('conversation.input.left', function* () {
          yield scope.slots.register(
            { name: 'conversation.input.left', id: 'dsh-loom-pills', order: 40, label: () => 'RSI / Auto' },
            ComposerPills,
          )
        })
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
      cardTone: cardTone,
      cardActions: cardActions,
      qualityTone: qualityTone,
      text: text,
      Panel: Panel,
      Card: Card,
      Research: Research,
      Pills: Pills,
      overview: overview,
      metrics: metrics,
      pending: pending,
      queueRowText: queueRowText,
      queueOf: queueOf,
      hitProps: hitProps,
      switchProps: switchProps,
      knowledge: knowledge,
      knowledgeOf: knowledgeOf,
      lessonsNode: lessonsNode,
      chainPath: chainPath,
      campaignMeta: campaignMeta,
      foldBrief: foldBrief,
      // The verdict a stopped campaign owes, and the label behind it, so a
      // test can pin the sentence without rendering the panel.
      endNote: endNote,
      endCauseLabel: endCauseLabel,
      triangleChips: triangleChips,
      modelRows: modelRows,
      modelSpend: modelSpend,
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
      QUALITY_ZH: QUALITY_ZH,
      KIND_ZH: KIND_ZH,
      CP_ZH: CP_ZH,
      NODE_ZH: NODE_ZH,
    }
    return module.exports
  },
})
