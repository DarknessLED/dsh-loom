// The checkpoint card for an L2 proposal: why change the loop, what it is
// expected to buy, what it costs, what could go wrong, and the exact diff.
//
// The rule this file enforces is that a proposal may not be a bare spec. If the
// loop asks a human to adopt a new chain, the card carries the campaign's own
// record, a forecast with a stated basis, a risk statement, and the change in
// the form a reviewer can read in ten seconds. When the record is too thin to
// forecast from, `missing` says so instead of the card pretending otherwise.

import { predictGain, regressionRisk, measuredRounds } from './predict.js'
import { diffSpec, renderDiff } from './spec-diff.js'

const round4 = (n) => Math.round(Number(n) * 1e4) / 1e4 + 0
const cost = (r) => (Number.isFinite(Number(r?.costUsd)) ? Number(r.costUsd) : 0)

function proposalSpec(p) {
  return p?.spec ?? p
}

/**
 * @param {{
 *   active: {version:number, spec:object},
 *   proposals: Array<object>,
 *   rounds?: Array<object>,
 *   config?: object
 * }} input
 */
export function buildProposalCard({ active, proposals = [], rounds = [], config = {} } = {}) {
  const activeVersion = active?.version != null ? Number(active.version) : null
  const measured = measuredRounds(rounds)
  const onChain = activeVersion == null ? measured : measured.filter((r) => Number(r.chainVersion) === activeVersion)
  const promotions = onChain.filter((r) => r.promoted === true).length
  const spendUsd = round4(onChain.reduce((sum, r) => sum + cost(r), 0))
  const window = Number(config?.checkpoint?.window) || 3
  const current = Number(active?.spec?.params?.candidates) || 1

  const items = (Array.isArray(proposals) ? proposals : []).map((p) => {
    const spec = proposalSpec(p)
    const kind = p?.kind ?? spec?.meta?.kind ?? null
    const prediction = p?.prediction ?? predictGain({ kind, rounds: onChain, config, candidates: current })
    const risk = p?.risk ?? regressionRisk({ rounds: onChain, window, kind, candidates: current })
    const diff = p?.diff ?? diffSpec(active?.spec, spec)
    return {
      version: Number(spec?.version ?? p?.version),
      kind,
      rationale: p?.rationale ?? spec?.meta?.rationale ?? null,
      status: p?.status ?? null,
      evidence: p?.evidence ?? null,
      prediction,
      risk,
      diff,
      diffLines: p?.diffLines ?? renderDiff(diff),
      spec,
    }
  })

  const recommended = items.find((i) => i.status === 'fresh') ?? items[0] ?? null
  const missing = []
  if (activeVersion == null) missing.push('the active chain (nothing to diff against)')
  if (!items.length) missing.push('any applicable mutation')
  if (!onChain.length) missing.push('rounds measured on the current chain: the forecast is a prior')
  if (items.some((i) => i.prediction?.basis === 'prior')) {
    missing.push('a measured change of this kind: that forecast is a prior')
  }

  return {
    activeVersion,
    rounds: { onChain: onChain.length, measured: measured.length, promotions },
    spendUsd,
    items,
    proposals: items,
    recommendedVersion: recommended?.version ?? null,
    missing,
  }
}

function pct(n) {
  return `${(Number(n) * 100).toFixed(1)}%`
}

/** The card as the lines a checkpoint message shows. */
export function renderCard(card) {
  const lines = []
  const version = card?.activeVersion == null ? '?' : `v${card.activeVersion}`
  const r = card?.rounds ?? { onChain: 0, measured: 0, promotions: 0 }
  lines.push(
    `chain ${version}: ${r.onChain} round(s) measured on it (${r.measured} in total), ${r.promotions} promoted, $${card?.spendUsd ?? 0} spent`,
  )
  for (const item of card?.items ?? []) {
    const p = item.prediction
    const risk = item.risk
    lines.push('')
    lines.push(`v${item.version} ${item.kind}${item.rationale ? ` — ${item.rationale}` : ''}`)
    lines.push(`  predicted gain ${pct(p.point)} (${pct(p.low)} .. ${pct(p.high)}), basis ${p.basis}: ${p.method}`)
    lines.push(`  risk ${risk.level} (${pct(risk.probability)}): ${risk.reasons.join('; ') || 'none stated'}`)
    if (item.diffLines?.length) {
      lines.push('  diff:')
      for (const line of item.diffLines) lines.push(`    ${line}`)
    }
  }
  if (card?.missing?.length) {
    lines.push('')
    lines.push(`not available yet: ${card.missing.join('; ')}`)
  }
  return lines
}
