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
 * The plan for one task, or null when the switch is off.
 *
 * Every stage is present even when the campaign configured only some of them: a
 * plan with a hole silently drops a stage, which is worse than a stage that has
 * to fall back to its own name.
 */
export function dispatchPlan({ task, config } = {}) {
  if (config?.session?.dispatch?.enabled !== true) return null
  const stage = stageOf(task)
  const stages = STAGES.map((name) => {
    const entry = stagesOf(config)[name] ?? {}
    const harness = harnessFor(name, config)
    const preset = typeof entry.preset === 'string' && entry.preset.trim() ? entry.preset.trim() : null
    return { stage: name, harness, preset, ...armFor(name) }
  })
  const current = stages.find((s) => s.stage === stage) ?? stages[stages.length - 1]
  return {
    stage,
    harness: current.harness,
    preset: current.preset,
    armTarget: current.arm,
    armWhy: current.why,
    why: `${task?.id ?? 'this task'} is in the ${stage} stage`,
    stages,
  }
}
