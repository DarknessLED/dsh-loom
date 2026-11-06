// Browser half of dsh-loom: a campaign dashboard in the sidebar's panel list.
//
// Hand-written in the lazy-CJS bundle protocol (`window.__ModuleLoader__.load`
// with a factory returning cordis-plugin exports), so there is no build step
// and no import from a dsh client package: the same zero-dependency stance as
// the host half. It reads and writes one JSON route, `/dsh-loom/state`, which
// owns `~/.dsh/loom`: the browser never touches campaign files.
window.__ModuleLoader__.load({
  id: 'dsh-loom',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var PANEL_KEY = 'dsh-loom'
    var ROUTE = '/dsh-loom/state'
    var POLL_MS = 5000

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
      if (s < 60) return s + 's ago'
      var m = Math.round(s / 60)
      if (m < 60) return m + 'm ago'
      var h = Math.round(m / 60)
      if (h < 48) return h + 'h ago'
      return Math.round(h / 24) + 'd ago'
    }

    function statusTone(status) {
      if (status === 'running') return '#2e7d32'
      if (status === 'paused') return '#8a6d00'
      if (status === 'stopped' || status === 'done') return '#555'
      if (status === 'failed' || status === 'error') return '#b3261e'
      return '#555'
    }

    function when(cond, node) {
      return cond ? node : null
    }

    function Panel(react) {
      var h = react.createElement
      var useState = react.useState
      var useEffect = react.useEffect
      var useCallback = react.useCallback

      return function LoomPanel() {
        var s = useState({ loading: true, data: null, error: null, busy: null })
        var box = s[0]
        var setBox = s[1]

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
          load()
          var t = setInterval(load, POLL_MS)
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

        var data = box.data
        var header = h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 6px' } },
          h('div', { style: { fontWeight: 600, fontSize: 13 } }, 'RSI campaigns'),
          h('div', { style: { flex: 1 } }),
          h(
            'button',
            {
              type: 'button',
              onClick: load,
              style: { font: 'inherit', fontSize: 11, padding: '2px 8px', cursor: 'pointer', borderRadius: 6 },
            },
            'refresh',
          ),
        )

        var body
        if (box.loading) {
          body = h('div', { style: { padding: '6px 14px 14px', opacity: 0.6, fontSize: 12 } }, 'loading…')
        } else if (box.error) {
          body = h('div', { style: { padding: '6px 14px 14px', color: '#b3261e', fontSize: 12 } }, box.error)
        } else if (!data || !data.campaigns || data.campaigns.length === 0) {
          body = h(
            'div',
            { style: { padding: '6px 14px 14px', opacity: 0.7, fontSize: 12, lineHeight: 1.6 } },
            'No campaigns yet.',
            h('br'),
            'Ask the agent to call ',
            h('code', null, 'rsi_start'),
            ' with an objective and a workspace.',
          )
        } else {
          body = h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px 12px' } },
            data.campaigns.map(function (c) {
              return h(Card, { key: c.id, c: c, live: data.live, busy: box.busy, act: act })
            }),
          )
        }

        var footer = h(
          'div',
          { style: { padding: '0 14px 10px', fontSize: 11, opacity: 0.6 } },
          data && data.ownership && data.ownership.mine === false
            ? 'another window drives the loop'
            : 'this window drives the loop',
          data && data.lean ? ' · lean ' + (data.lean.available ? 'available' : 'missing') : '',
        )

        return h('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0 } }, header, body, footer)
      }
    }

    function Card(react) {
      var h = react.createElement
      return function CampaignCard(props) {
        var c = props.c
        var busy = props.busy
        if (c.error) {
          return h('div', { style: { border: '1px solid rgba(127,127,127,.3)', borderRadius: 8, padding: 8, fontSize: 12 } }, c.id, ': ', c.error)
        }
        var live = (props.live || []).filter(function (a) {
          return a && a.campaign === c.id
        })
        var pill = h(
          'span',
          {
            style: {
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 999,
              border: '1px solid currentColor',
              color: statusTone(c.status),
            },
          },
          c.status,
        )
        var meta = []
        meta.push(c.rounds + ' round' + (c.rounds === 1 ? '' : 's'))
        meta.push(money(c.spendUsd))
        if (c.chainVersion !== null && c.chainVersion !== undefined) meta.push('chain v' + c.chainVersion)
        if (c.incumbent && c.incumbent.score !== null) meta.push('best ' + c.incumbent.score)
        if (c.lessons) meta.push(c.lessons + ' lesson' + (c.lessons === 1 ? '' : 's'))
        if (c.holdout) meta.push(c.holdout + ' holdout')

        var buttons = h(
          'div',
          { style: { display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' } },
          ['pause', 'resume', 'stop'].map(function (action) {
            var key = c.id + ':' + action
            return h(
              'button',
              {
                key: action,
                type: 'button',
                disabled: busy === key,
                onClick: function () {
                  props.act(c.id, action)
                },
                style: { font: 'inherit', fontSize: 11, padding: '2px 8px', borderRadius: 6, cursor: 'pointer' },
              },
              busy === key ? '…' : action,
            )
          }),
        )

        var checkpoints = (c.openCheckpoints || []).map(function (cp) {
          var verdict = cp.payload && cp.payload.verdict ? String(cp.payload.verdict) : ''
          var delta = cp.payload && cp.payload.delta !== undefined ? ' Δ' + cp.payload.delta : ''
          return h(
            'div',
            {
              key: cp.id,
              style: {
                marginTop: 6,
                padding: '6px 8px',
                borderRadius: 6,
                background: 'rgba(255,193,7,.12)',
                border: '1px solid rgba(255,193,7,.4)',
                fontSize: 11,
              },
            },
            h('div', { style: { fontWeight: 600 } }, cp.kind, verdict ? ' · ' + verdict + delta : ''),
            h(
              'div',
              { style: { display: 'flex', gap: 4, marginTop: 4 } },
              ['approve', 'reject', 'hold'].map(function (decision) {
                var key = c.id + ':' + decision + ':' + cp.id
                return h(
                  'button',
                  {
                    key: decision,
                    type: 'button',
                    disabled: busy === c.id + ':decide',
                    onClick: function () {
                      props.act(c.id, 'decide', decision, cp.id)
                    },
                    style: { font: 'inherit', fontSize: 11, padding: '1px 7px', borderRadius: 6, cursor: 'pointer' },
                  },
                  decision,
                )
              }),
            ),
          )
        })

        return h(
          'div',
          {
            style: {
              border: '1px solid rgba(127,127,127,.3)',
              borderRadius: 8,
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              fontSize: 12,
            },
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 6 } },
            h('span', { style: { fontWeight: 600 } }, c.id),
            pill,
            h('span', { style: { flex: 1 } }),
            h('span', { style: { opacity: 0.55, fontSize: 10 } }, age(c.ageMs)),
          ),
          h(
            'div',
            {
              style: {
                opacity: 0.85,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              },
            },
            text(c.objective, '(no objective)'),
          ),
          h('div', { style: { opacity: 0.6, fontSize: 11 } }, meta.join(' · ')),
          when(
            live.length > 0,
            h(
              'div',
              { style: { fontSize: 11, color: '#2e7d32' } },
              'live: ' +
                live
                  .map(function (a) {
                    return a.attemptId + (typeof a.idleMs === 'number' ? ' (' + Math.round(a.idleMs / 1000) + 's)' : '')
                  })
                  .join(', '),
            ),
          ),
          when(
            c.lastRound && c.lastRound.attempts && c.lastRound.attempts.length > 0,
            h(
              'div',
              { style: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 } },
              c.lastRound.attempts.map(function (a) {
                var label = a.id + ' ' + (a.score === null ? '—' : a.score)
                if (a.screenedOut) label += ' screened'
                if (a.abandoned) label += ' ' + a.abandoned
                return h(
                  'span',
                  {
                    key: a.id,
                    style: {
                      fontSize: 10,
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: a.verifierOk ? 'rgba(46,125,50,.14)' : 'rgba(179,38,30,.12)',
                    },
                  },
                  label,
                )
              }),
            ),
          ),
          checkpoints,
          buttons,
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
      var PanelView = Panel(react)
      var CardView = Card(react)

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
    exports.__panel = { money: money, age: age, statusTone: statusTone, text: text, Panel: Panel, Card: Card }
    return module.exports
  },
})
