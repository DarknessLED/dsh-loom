/**
 * Which stage a task is in, and which harness that stage gets.
 *
 * The operator asked for a second switch beside the loop's: one that plans a
 * workflow and then gives each stage the harness that suits it. On this machine
 * every model is the same family and the loop runs one harness, so the difference
 * a stage can make is *how the work is framed* and which preset the child runs
 * under -- not which model answers, and not which CLI executes. Writing it that
 * way keeps the feature honest: the plan is a list of stages with names, and
 * switching it on cannot silently promise a rotation this host cannot deliver.
 *
 * The five stages are the ones `research/harness-bench/HANDOFF.md` measured
 * against five harnesses (8 tasks x 5 harnesses, `telemetry_iso.json`). `ARMS`
 * records the arm that stage's measurement favoured *and the number that carried
 * the decision*, because a routing table without its basis is a preference
 * dressed as a finding. The arm is a declared target, not an execution: nothing
 * in this loop spawns `cc`/`codex`/`gcli`/`agy` today. It is written onto the
 * attempt as `armTarget` so the day a second harness exists, the record already
 * says where this round would have gone and on what evidence.
 *
 * Off is the default and off computes nothing: `dispatchPlan` answers `null`, so
 * no downstream code can read a stage that was invented here. That is what makes
 * "byte-identical when off" a fact rather than an intention.
 *
 * Pure and dependency-free: plain objects in, plain objects out.
 */

/** The workflow this loop knows how to plan. Order is the plan's order. */
export const STAGES = ['triage', 'spec', 'implement', 'verify', 'review']

/**
 * The arm the bench favoured per stage, with the measurement behind it.
 *
 * Numbers are the ones in the handoff's §4 table (8 tasks x 5 harnesses). They are
 * directional, not an upper bound: two tasks per cell, one run each. Quoting them
 * here is not a claim that they transfer; it is a claim that this table was not
 * invented in this file.
 */
export const ARMS = {
  triage: {
    arm: 'dsh',
    why: 'fewest tool calls on this stage (56 across 8 tasks) -- triage is one model call and needs no tools',
  },
  spec: {
    arm: 'cc',
    why: 'read the most before writing (49 reads against 23-36), which is what a spec is',
  },
  implement: {
    arm: 'codex',
    why: 'fewest edit attempts (12 against 13-24), one atomic patch when a model catalog exists',
  },
  verify: {
    arm: 'gcli',
    why: 'cheapest single-command run (build class in 16.9s with 6 tool calls)',
  },
  review: {
    arm: 'agy',
    why: 'shortest wall clock (170s against 208-259s) and it never saw the implementer reasoning',
  },
}

/**
 * A name this loop used to call a stage, kept as an alias so an older task or
 * campaign does not silently fall out of the plan. `plan` was the third of three
 * stages before the measured five replaced them; it means the same work `spec`
 * means now.
 */
export const STAGE_ALIASES = { plan: 'spec' }

/**
 * The stage each *chain node* works in, when the node knows better than the task.
 *
 * This is the fix for the trap a live round demonstrated: a task that declared
 * `stage: "verify"` but whose work was "change impl.txt to step:1" was filed as a
 * verifier and would have been handed a reviewer's preset to write code with. A
 * node's role is a fact about the loop; a task's declaration is a hint about the
 * work. The fact wins for the nodes that have one, and the hint only decides the
 * worker's own stage.
 */
export const NODE_STAGES = { recon: 'spec', plan: 'spec', worker: null }

/**
 * The stage a task is in, from `taskKind` (preferred) or the older `stage` field.
 *
 * Both names are accepted because campaigns already on disk wrote `stage`, and a
 * rename that silently re-files them would rewrite history. New campaigns should
 * write `taskKind`: `stage` reads like the loop's own phases, and the loop's
 * phases are not this table's stages.
 */
export function taskKindOf(task) {
  return canonicalStage(task?.taskKind) ?? canonicalStage(task?.stage) ?? 'implement'
}

/**
 * The stage this dispatch belongs to, node role first.
 *
 * `role` is the chain node ('recon', 'worker') or null for an unlabelled attempt.
 * Returns the stage and where it came from, so a record can be audited: a stage
 * that nobody declared and a stage the loop imposed are different facts.
 */
export function stageForNode(role, task) {
  const byNode = typeof role === 'string' && role in NODE_STAGES ? NODE_STAGES[role] : null
  if (byNode) return { stage: byNode, from: `node:${role}` }
  if (canonicalStage(task?.taskKind)) return { stage: canonicalStage(task.taskKind), from: 'taskKind' }
  if (canonicalStage(task?.stage)) return { stage: canonicalStage(task.stage), from: 'stage' }
  return { stage: 'implement', from: 'default' }
}

function stagesOf(config) {
  const raw = config?.session?.dispatch?.stages
  return raw && typeof raw === 'object' ? raw : {}
}

function isStage(name) {
  return typeof name === 'string' && STAGES.includes(name)
}

/** The stage a name refers to, following aliases, or null when it is not a stage. */
export function canonicalStage(name) {
  const raw = typeof name === 'string' ? name.trim() : ''
  if (!raw) return null
  const hit = isStage(raw) ? raw : STAGE_ALIASES[raw]
  return hit && isStage(hit) ? hit : null
}

/**
 * The stage a task runs in: what it declared, or implementation.
 *
 * A stage this loop does not know is not invented -- guessing it would put the
 * task in a harness nobody configured. Falling back to implementation is the
 * conservative answer: it is the stage every task is in until proven otherwise.
 */
export function stageOf(task) {
  return canonicalStage(task?.stage) ?? 'implement'
}

/** The harness a stage gets: the configured one, or the stage's own name. */
export function harnessFor(stage, config) {
  const canonical = canonicalStage(stage)
  const entry = stagesOf(config)[canonical ?? stage]
  const named = typeof entry?.harness === 'string' ? entry.harness.trim() : ''
  return named || canonical || 'implement'
}

/** The arm the bench measured for a stage, and why. Never null: every stage has one. */
export function armFor(stage) {
  const canonical = canonicalStage(stage) ?? 'implement'
  const hit = ARMS[canonical]
  return { arm: hit.arm, why: hit.why }
}

/** The preset a planned stage runs under, or null for "let the host decide". */
export function presetFor(plan, stage) {
  const canonical = canonicalStage(stage) ?? stage
  const hit = Array.isArray(plan?.stages) ? plan.stages.find((s) => s.stage === canonical) : null
  const preset = hit?.preset
  return typeof preset === 'string' && preset.trim() ? preset.trim() : null
}

/**
 * The named model groups this install can route through.
 *
 * A group is not a model: `auto/deepseek-v4.1-flash` is the gateway's own Auto
 * option, and `opencode-go/hungerg-free` is the free tier. Naming them here lets
 * a role say *which kind of model it wants* without hard-coding a vendor slug
 * that will be gone when the plan changes — which is exactly what has to be
 * possible once `gpt-6.2-sol` or `claude-opus-5-5` show up.
 */
export const MODEL_GROUPS = { premium: 'auto/deepseek-v4.1-flash', free: 'opencode-go/hungerg-free' }

/** Which group a role asks for by default; measured work wants the stronger one. */
export const ROLE_MODEL_GROUPS = {
  triage: 'free',
  spec: 'premium',
  implement: 'premium',
  verify: 'free',
  review: 'premium',
}

/**
 * Resolve one named choice into `{model, group}`.
 *
 * A value that matches a key in `groups` is a group name; anything else is taken
 * as a literal model slug. Both are legitimate — the group is how a role states
 * its intent, the slug is how someone pins a vendor for one experiment — and the
 * caller must be able to tell which one it got, because a pinned slug is not
 * re-routed by the gateway.
 */
export function resolveModel(choice, config) {
  const groups = config?.session?.dispatch?.models?.groups
  const table = groups && typeof groups === 'object' ? groups : MODEL_GROUPS
  if (typeof choice !== 'string' || !choice.trim()) return { model: null, group: null }
  const name = choice.trim()
  if (typeof table[name] === 'string' && table[name].trim()) return { model: table[name].trim(), group: name }
  // The same slug written as a value is the same group seen from the other side:
  // `default: 'auto/deepseek-v4.1-flash'` is the premium group's model, and a
  // reader should not see "pinned" just because the install wrote the slug.
  const named = Object.keys(table).find((key) => typeof table[key] === 'string' && table[key].trim() === name)
  return { model: name, group: named ?? null }
}

/**
 * The model a role asks for, and the group that named it.
 *
 * Order: `perRole[role]` (a group name or a pinned slug) → `perStage[stage]`
 * (kept for installs configured before roles had models) → `default`. The
 * default is a magpie *routing group*, which is the closest thing to an Auto
 * option on this gateway: the group decides the concrete model, and the loop
 * only decides that this role wants the group. A name that is not advertised by
 * whichever provider ends up running is adjusted once, visibly, by the
 * transport.
 */
export function modelChoiceFor(stage, config) {
  const models = config?.session?.dispatch?.models
  const canonical = canonicalStage(stage) ?? stage
  // A whole-install override, used to run the same work through the free group
  // and then the premium one. It is a test knob, so it sits above everything and
  // is named after what it is: a plan, not a role's preference.
  const plan = typeof models?.plan === 'string' ? models.plan.trim() : ''
  if (plan === 'premium' || plan === 'free') return plan
  const perRole = models?.perRole && typeof models.perRole === 'object' ? models.perRole : {}
  const perStage = models?.perStage && typeof models.perStage === 'object' ? models.perStage : {}
  // The role's own intent sits between the install's two overrides and its
  // default: an install that never mentioned models still gets "the strong group
  // for writing, the free one for checking", because that is what the role means.
  const named = [perRole[canonical], perStage[canonical], ROLE_MODEL_GROUPS[canonical], models?.default].find(
    (v) => typeof v === 'string' && v.trim(),
  )
  return named ? named.trim() : null
}

export function modelFor(stage, config) {
  const choice = modelChoiceFor(stage, config)
  if (!choice) return null
  return resolveModel(choice, config).model
}

/** The group name behind a role's model, or null when the role pins a slug. */
export function modelGroupFor(stage, config) {
  const choice = modelChoiceFor(stage, config)
  if (!choice) return null
  return resolveModel(choice, config).group
}

/**
 * The plan for one dispatch, or null when the switch is off.
 *
 * Every stage is present even when the campaign configured only some of them: a
 * plan with a hole silently drops a stage, which is worse than a stage that has
 * to fall back to its own name.
 *
 * `role` is the chain node asking ('recon', 'worker'); when it is given the node
 * decides the stage and the task's declaration is only a hint (see
 * `stageForNode`). `execute` says whether this plan may be *run* on another
 * harness or is only being recorded; the dispatcher reads the same setting, and
 * it is repeated here so a plan printed in a log says what it would do.
 */
/**
 * Whether this run's arm may be executed, from the two places that answer.
 *
 * The campaign's own word is the operator's latest instruction and wins; absent
 * one, the install decides. Resolved here rather than at the call site because
 * two readers picking differently is how "recorded" and "ran" drift apart.
 */
export function executionWanted({ campaignOverride = null, install = null } = {}) {
  if (campaignOverride === 'execute' || campaignOverride === 'off') return campaignOverride === 'execute'
  return install === 'execute'
}

export function dispatchPlan({ task, config, role = null, planRoles = null } = {}) {
  if (config?.session?.dispatch?.enabled !== true) return null
  const chosen = stageForNode(role, task)
  const stage = chosen.stage
  // A change that declares its own roles narrows the plan to those; a change that
  // declares none gets the measured table for every stage, because an empty role
  // list is a silence, not a decision to hire nobody.
  const declared = Array.isArray(planRoles) ? planRoles.map((r) => canonicalStage(r)).filter(Boolean) : []
  const wanted = declared.length ? [...new Set(declared)] : STAGES
  const stages = wanted.map((name) => {
    const entry = stagesOf(config)[name] ?? {}
    const harness = harnessFor(name, config)
    const preset = typeof entry.preset === 'string' && entry.preset.trim() ? entry.preset.trim() : null
    return {
      stage: name,
      harness,
      preset,
      model: modelFor(name, config),
      modelGroup: modelGroupFor(name, config),
      ...armFor(name),
    }
  })
  const current = stages.find((s) => s.stage === stage) ?? stages[stages.length - 1]
  const source = declared.length ? 'the change declares its roles' : 'the measured table'
  return {
    stage,
    stageFrom: chosen.from,
    harness: current.harness,
    preset: current.preset,
    model: current.model,
    modelGroup: current.modelGroup,
    armTarget: current.arm,
    armWhy: current.why,
    roles: wanted,
    execute: config?.session?.dispatch?.armExecution === 'execute',
    why: `${task?.id ?? 'this task'} is in the ${stage} stage (${chosen.from}); ${wanted.length} role(s) planned from ${source}`,
    stages,
  }
}
