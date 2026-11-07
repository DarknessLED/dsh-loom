// Audit the panel in a real browser: contrast, truncation, overflow, fonts.
//
// The preview says what the panel looks like; this says whether it *works* —
// whether the ink actually reads on both canvases, whether a label is clipped
// where nothing declares a clamp, whether the mono figures really render in a
// mono face. It drives headless Chrome over the same generated preview and
// reads back a JSON audit the page writes into itself.
//
//   node scripts/panel-audit.mjs
//
// Exits non-zero when a finding is a defect rather than a deliberate ellipsis.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const preview = join(root, 'docs', 'panel-preview.html')
const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]

if (!existsSync(preview)) {
  console.error('missing ' + preview + ' — run: node scripts/panel-preview.mjs')
  process.exit(1)
}
const chrome = CHROME_CANDIDATES.find((p) => existsSync(p))
if (!chrome) {
  console.error('no Chrome or Edge found; skipping the browser audit')
  process.exit(0)
}

const AUDIT = `
<script>
(function () {
  // Chrome serialises color-mix() results as color(srgb 0.99 0.99 0.99 / .62)
  // — 0..1 floats, in a colour space canvas2d's fillStyle will not accept. So
  // parse the serialised forms directly: hex, rgb/rgba (0–255), and CSS Color 4
  // color(srgb …) (0–1). Alpha is composited over the resolved background,
  // because that composite is what the eye actually gets.
  function norm(color) {
    var s = String(color).trim();
    if (s.charAt(0) === '#') {
      var hex = s.slice(1);
      if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255,
        hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
      ];
    }
    if (s.indexOf('color(') === 0) {
      var cm = s.match(/[\\d.]+/g) || [];
      var scale = /srgb-linear|srgb/i.test(s) ? 1 : 1;
      return [
        Math.min(1, parseFloat(cm[0]) * scale),
        Math.min(1, parseFloat(cm[1]) * scale),
        Math.min(1, parseFloat(cm[2]) * scale),
        cm.length > 3 ? parseFloat(cm[3]) : 1,
      ];
    }
    var m = s.match(/[\\d.]+/g) || [];
    if (m.length < 3) return [0, 0, 0, 1];
    var pct = s.indexOf('%') >= 0 ? 2.55 : 1;
    return [
      Math.min(1, (parseFloat(m[0]) * pct) / 255),
      Math.min(1, (parseFloat(m[1]) * pct) / 255),
      Math.min(1, (parseFloat(m[2]) * pct) / 255),
      m.length > 3 ? parseFloat(m[3]) : 1,
    ];
  }
  function over(fg, bg) {
    var a = fg[3];
    return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
  }
  function lum(c) {
    var f = [c[0], c[1], c[2]].map(function (x) { return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4) });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  }
  function ratio(fg, bg) {
    var f = over(norm(fg), norm(bg)), b = norm(bg);
    var l1 = lum(f), l2 = lum(b), hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function bgOf(el) {
    var n = el;
    while (n && n !== document.documentElement) {
      var b = getComputedStyle(n).backgroundColor;
      if (b && b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent') return b;
      n = n.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  }
  function hasOwnText(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent.trim().length > 0) return true;
    }
    return false;
  }
  var out = { canvases: [], truncated: 0, clipped: [], contrast: [], shadows: 0, fonts: {}, dots: 0 };
  var canvases = document.querySelectorAll('.canvas');
  for (var i = 0; i < canvases.length; i++) {
    var cv = canvases[i];
    var name = cv.classList.contains('dark') ? 'dark' : 'light';
    var panel = cv.querySelector('.loom');
    var scroller = panel.querySelector('.loom-scroll');
    out.canvases.push({
      name: name,
      panelWidth: Math.round(panel.getBoundingClientRect().width),
      scroller: Math.round(scroller.clientHeight) + '/' + Math.round(scroller.scrollHeight),
      scrolls: scroller.scrollHeight > scroller.clientHeight + 1,
      hScroll: panel.scrollWidth > panel.clientWidth + 1 || scroller.scrollWidth > scroller.clientWidth + 1,
      dividers: cv.querySelectorAll('.loom-head, .loom-metrics, .loom-row, .loom-camp, .loom-foot').length
    });
    var all = panel.querySelectorAll('*');
    for (var j = 0; j < all.length; j++) {
      var el = all[j];
      var cs = getComputedStyle(el);
      if (cs.boxShadow && cs.boxShadow !== 'none') out.shadows++;
      if (/loom-dot/.test(el.className || '')) out.dots++;
      // overflow only counts when the element itself holds the text and has no
      // clamp/ellipsis of its own: a parent's scrollWidth also measures a child
      // that is deliberately truncating.
      var overPx = el.scrollWidth - el.clientWidth;
      var clamped = cs.textOverflow === 'ellipsis' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && cs.webkitLineClamp !== '');
      if (overPx > 1 && hasOwnText(el)) {
        if (clamped || cs.overflow === 'hidden') out.truncated++;
        else out.clipped.push(name + ' ' + (el.className || el.tagName) + ' +' + overPx + 'px "%' + (el.textContent || '').trim().slice(0, 24) + '"');
      }
      if (el.childNodes.length === 1 && hasOwnText(el)) {
        var txt = (el.textContent || '').trim();
        if (txt.length > 1 && txt.length < 80) {
          var r = ratio(cs.color, bgOf(el));
          var size = parseFloat(cs.fontSize);
          var floor = size >= 13 ? 4.5 : 3.8;
          if (r < floor) out.contrast.push(name + ' ' + size + 'px ' + (el.className || el.tagName) + ' ' + r.toFixed(2) + ' "' + txt.slice(0, 28) + '"');
        }
      }
      if (/loom-metric|loom-name|loom-age|loom-meta|loom-mark|loom-state/.test(el.className || '')) {
        var fam = cs.fontFamily.split(',')[0].replace(/"/g, '');
        out.fonts[el.className] = fam;
      }
    }
    // the figures an engineer scans by shape must really be in a mono face
    var wanted = ['.loom-mark', '.loom-metric b', '.loom-name', '.loom-age', '.loom-meta', '.loom-state', '.loom-chain', '.loom-cp-head b', '.loom-lesson .score'];
    for (var kw = 0; kw < wanted.length; kw++) {
      var pick = panel.querySelector(wanted[kw]);
      if (pick) out.fonts[wanted[kw]] = getComputedStyle(pick).fontFamily.split(',')[0].replace(/"/g, '');
    }
  }
  out.truncatedPerCanvas = Math.round(out.truncated / 2);
  var pre = document.createElement('pre');
  pre.id = 'loom-audit';
  pre.textContent = JSON.stringify(out);
  document.body.appendChild(pre);
})();
</script>
`

const dir = mkdtempSync(join(tmpdir(), 'loom-audit-'))
const page = join(dir, 'audit.html')
writeFileSync(page, readFileSync(preview, 'utf8').replace('</body>', AUDIT + '</body>'))

let dom = ''
try {
  dom = execFileSync(
    chrome,
    ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--user-data-dir=' + join(dir, 'profile'), '--virtual-time-budget=1500', '--window-size=900,1500', '--dump-dom', 'file:///' + page.replace(/\\/g, '/')],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60_000 },
  )
} finally {
  rmSync(dir, { recursive: true, force: true })
}

const m = dom.match(/<pre id="loom-audit">([\s\S]*?)<\/pre>/)
if (!m) {
  console.error('the audit did not run (no #loom-audit in the DOM)')
  process.exit(1)
}
const data = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))

for (const c of data.canvases) {
  console.log(
    `${c.name.padEnd(5)}  ${c.panelWidth}px wide · scroller ${c.scroller}px${c.scrolls ? ' (scrolls)' : ' (fits)'} · ` +
      `${c.hScroll ? 'HORIZONTAL OVERFLOW' : 'no h-overflow'} · ${c.dividers} hairlines`,
  )
}
console.log('font: ' + Object.entries(data.fonts).map(([k, v]) => `${k}=${v}`).join(' '))
console.log(`truncations: ${data.truncatedPerCanvas} ellipsised nodes per canvas (by design)`)
console.log(`shadows: ${data.shadows} · state dots: ${data.dots} (one shadow each)`)

const problems = []
if (data.canvases.some((c) => c.hScroll)) problems.push('a canvas scrolls horizontally')
if (data.clipped.length) problems.push('unclipped overflow: ' + data.clipped.slice(0, 6).join(', '))
if (data.contrast.length) problems.push('contrast below floor:\n  ' + data.contrast.slice(0, 10).join('\n  '))
if (data.shadows > 2) problems.push(`too many shadows (${data.shadows})`)

if (problems.length) {
  console.error('\nFAIL\n- ' + problems.join('\n- '))
  process.exit(1)
}
console.log('\nOK — every canvas reads, nothing overflows, contrast clears the floor.')
