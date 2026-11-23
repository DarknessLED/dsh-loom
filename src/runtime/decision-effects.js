// What "approve" means, in one place.
//
// The tool and the panel button are two doors onto the same checkpoint. They
// used to diverge: the panel learned to activate a chain but still answered a
// policy card without promoting it, so the same word did different things
// depending on where the person clicked. The effect table is the fix — both
// doors call this, and a new checkpoint kind gains exactly one implementation.
import { adoptFromCheckpoint } from '../chain/adopt.js'
import { diffPolicy, effectivePolicy } from '../loop/policy.js'

/**
 * Apply the effects of approving one checkpoint.
 *
 * Patch landings are deliberately not here: applying a diff needs the workspace,
 * a guard run and a commit, which only the tool door can await. The panel still
 * answers a patch card (it must not leave it open forever), but it does not
 * land code — `landed` in the tool's reply is the only claim of a landing.
 *
 * @param {object} input
 * @param {object} input.runtime
 * @param {object} input.view
 * @param {object} input.target  open checkpoint
 * @param {object} input.config
 * @param {string} [input.actor]
 * @returns {{chain: number|null, policy: boolean}}
 */
export function applyApprovalEffects({ runtime, view, target, config, actor = 'human' } = {}) {
  const out = { chain: null, policy: false }
  if (!target || !runtime || !view) return out

  // Chain, plateau and chain-revert cards all name a version to put in force;
  // adopting a revert is the same decision in the other direction.
  const adopted = adoptFromCheckpoint({ runtime, view, checkpoint: target, actor })
  if (adopted) out.chain = adopted.activated

  if (target.kind === 'policy' && target.payload?.policy) {
    // A promotion is a change to the policy in force, so the event carries the
    // diff. Unset fields fall back to config, which is why the comparison is
    // between two *effective* policies rather than two raw blobs.
    const before = effectivePolicy({ state: view.state, config })
    const after = effectivePolicy({
      state: { ...view.state, policy: { ...(view.state.policy || {}), policy: target.payload.policy } },
      config,
    })
    runtime.append(
      view,
      'policy.promoted',
      {
        version: target.payload.policyVersion ?? null,
        policy: target.payload.policy,
        diff: diffPolicy(before, after),
      },
      actor,
    )
    out.policy = true
  }
  return out
}

/**
 * Apply the effects of *refusing* one checkpoint.
 *
 * Refusing a chain, plateau or revert card is a decision about a forecast, and
 * the forecast does not expire because a person said no. Recording the decline
 * is what makes the next round able to grade it: the chain in force did not
 * change, so that round's delta is what happened without the change.
 *
 * This is deliberately separate from approving. The two doors (tool, panel)
 * both call it, so a panel reject cannot be a notification that leaves the
 * ledger prettier than the decision was.
 *
 * @param {object} input
 * @param {object} input.runtime
 * @param {object} input.view
 * @param {object} input.target  open checkpoint being refused
 * @param {string} [input.actor]
 * @param {string} [input.note]
 * @returns {null | {declined:number}}
 */
export function applyRejectionEffects({ runtime, view, target, actor = 'human', note = null } = {}) {
  if (!target || !runtime || !view) return null
  if (target.kind === 'gate') {
    // A passing patch that a person refused. The ledger had no place for this:
    // the round recorded "not promoted" and the card closed, so the only
    // available summary of a campaign was "fewer promotions", never whether the
    // refusals were right. The card already carries the task id (through
    // `cardEvidence`) and the score it was shown with, so recording the refusal
    // costs no extra measurement — only the later round is needed to grade it.
    const payload = target.payload ?? {}
    const taskId = payload?.evidence?.task?.id ?? payload?.taskId ?? null
    // `cardScore` is what the refused patch itself reached, not a baseline of
    // the task: the delta against a later round is then "what the patch bought",
    // which is the only thing a refusal can be graded on.
    const cardScore = Number.isFinite(Number(payload?.score)) ? Number(payload.score) : null
    const at = Date.now()
    runtime.append(
      view,
      'gate.declined',
      { taskId: taskId == null ? null : String(taskId), cardScore, note: note || null, at },
      actor,
    )
    // `measured: false` is not a placeholder: a card with no task id can never
    // be graded, and a refusal whose counterfactual never ran looks exactly
    // like one that cost nothing unless the difference is written down.
    return { kind: 'gate.declined', taskId: taskId == null ? null : String(taskId), cardScore, measured: false, at }
  }
  if (target.kind !== 'chain' && target.kind !== 'plateau' && target.kind !== 'chain-revert') return null
  const payload = target.payload
  if (!payload || payload.chainVersion == null) return null
  const version = Number(payload.chainVersion)
  if (!Number.isFinite(version)) return null
  runtime.append(view, 'chain.declined', { version, note: note || null }, actor)
  return { declined: version }
}
