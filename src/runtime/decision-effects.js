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
