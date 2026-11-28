/**
 * Which stage a task is in, and which harness that stage gets.
 *
 * The operator asked for a second switch beside the loop's: one that plans a
 * workflow and then gives each stage the harness that suits it. On this machine
 * every model is the same family, so the difference a stage can make is *how the
 * work is framed* and which preset the child runs under -- not which model
 * answers. Writing it that way keeps the feature honest: the plan is a list of
 * stages with names, and switching it on cannot silently promise a model
 * rotation this host cannot deliver.
 *
 * Off is the default and off computes nothing: `dispatchPlan` answers `null`, so
 * no downstream code can read a stage that was invented here. That is what makes
 * "byte-identical when off" a fact rather than an intention.
 *
 * Pure and dependency-free: plain objects in, plain objects out.
 */

/** The workflow this loop knows how to plan. Order is the plan's order. */
export const STAGES = ['plan', 'implement', 'verify']

function stagesOf(config) {
  const raw = config?.session?.dispatch?.stages
  return raw && typeof raw === 'object' ? raw : {}
}

function isStage(name) {
  return typeof name === 'string' && STAGES.includes(name)
}

/**
 * The stage a task runs in: what it declared, or implementation.
 *
 * A stage this loop does not know is not invented -- `review` is a real word and
 * not a stage here, and guessing it would put the task in a harness nobody
 * configured. Falling back to implementation is the conservative answer: it is
 * the stage every task is in until proven otherwise.
 */
export function stageOf(task) {
  const declared = task?.stage
  return isStage(declared) ? declared : 'implement'
}

/** The harness a stage gets: the configured one, or the stage's own name. */
export function harnessFor(stage, config) {
  const entry = stagesOf(config)[stage]
  const named = typeof entry?.harness === 'string' ? entry.harness.trim() : ''
  return named || (isStage(stage) ? stage : 'implement')
}

/** The preset a planned stage runs under, or null for "let the host decide". */
export function presetFor(plan, stage) {
  const hit = Array.isArray(plan?.stages) ? plan.stages.find((s) => s.stage === stage) : null
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
    return { stage: name, harness, preset }
  })
  const current = stages.find((s) => s.stage === stage) ?? stages[stages.length - 1]
  return {
    stage,
    harness: current.harness,
    preset: current.preset,
    why: `${task?.id ?? 'this task'} is in the ${stage} stage`,
    stages,
  }
}
