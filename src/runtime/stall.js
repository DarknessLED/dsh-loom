/**
 * Why a stall card was raised.
 *
 * A plateau is not one condition. Three flat rounds that each cost two cents
 * mean "the objective is a dead end; perhaps stop". Three flat rounds that each
 * cost a worker session mean "this is eating the budget; perhaps change the
 * approach or the price". The card used to distinguish these only if the
 * operator had hand-set `checkpoint.burnUsd`, which no config did, so `burn`
 * was unreachable in practice.
 *
 * The order is deliberate: spending money outranks being close to winning. A
 * near-miss that has already cost the window is still a burn, because the
 * decision it needs (stop paying for this shape) is the burn decision.
 *
 * @param {{progress?: number, spendUsd?: number, burnUsd?: number}} input
 * @returns {'burn'|'near-miss'|'flat'}
 */
export function stallTrigger({ progress = 0, spendUsd = 0, burnUsd } = {}) {
  const threshold = Number(burnUsd)
  const spent = Number(spendUsd)
  if (Number.isFinite(threshold) && threshold > 0 && Number.isFinite(spent) && spent >= threshold) {
    return 'burn'
  }
  if (Number(progress) >= 0.5) return 'near-miss'
  return 'flat'
}
