#!/usr/bin/env node
// Compare the two answers to "which role runs next": the measured table and the
// change's own task list.
//
// This is a report, not a route: it prints both plans and where they disagree.
// Nothing here dispatches anything, and the reader is read-only, so running it
// twice tells you the same thing about the same bytes.
//
//   node scripts/ssf-plan-compare.mjs <change-dir> [--json]
import { resolve } from 'node:path'

import { comparePlans, ssfPlan } from '../src/dispatch/ssf.js'
import { STAGES } from '../src/dispatch/stage-plan.js'

export function compareChange({ dir, measured = STAGES, ssf = ssfPlan }) {
  const plan = ssf({ dir, doctor: false })
  const dynamic = plan.available ? plan.roles : []
  const comparison = comparePlans({ measured, dynamic, phase: plan.available ? plan.phase : null })
  return {
    dir,
    available: plan.available === true,
    reason: plan.available ? null : plan.reason ?? null,
    phase: plan.available ? plan.phase : null,
    change: plan.available ? plan.change : null,
    open: plan.available ? plan.open : 0,
    tasks: plan.available ? plan.tasks.map((task) => ({ id: task.id, done: task.done, role: task.role, text: task.text })) : [],
    ...comparison,
  }
}

export function renderComparison(result) {
  const lines = []
  lines.push(`change: ${result.change ?? '(none)'}  phase: ${result.phase ?? '(none)'}  open steps: ${result.open}`)
  lines.push(`measured table: ${result.staticRoles.join(' → ') || '(none)'}`)
  lines.push(`this change:    ${result.dynamicRoles.join(' → ') || '(none)'}`)
  lines.push('')
  lines.push(result.sentence)
  if (result.onlyMeasured.length) lines.push(`  table-only: ${result.onlyMeasured.join(', ')} (this change does not ask for them)`)
  if (result.onlyDynamic.length) lines.push(`  change-only: ${result.onlyDynamic.join(', ')} (no arm was measured for them)`)
  if (result.tasks.length) {
    lines.push('')
    for (const task of result.tasks) lines.push(`  [${task.done ? 'x' : ' '}] ${task.id ?? '?'} ${task.role ?? '(no role)'} — ${task.text}`)
  }
  return lines.join('\n')
}

function parseArgs(argv) {
  const out = { dir: null, json: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--json') out.json = true
    else if (!arg.startsWith('-') && !out.dir) out.dir = arg
  }
  return out
}

const invokedDirectly = process.argv[1] && /ssf-plan-compare\.mjs$/.test(process.argv[1].replace(/\\/g, '/'))
if (invokedDirectly) {
  const args = parseArgs(process.argv.slice(2))
  if (!args.dir) {
    console.error('usage: node scripts/ssf-plan-compare.mjs <change-dir> [--json]')
    process.exit(2)
  }
  const result = compareChange({ dir: resolve(args.dir) })
  console.log(args.json ? JSON.stringify(result, null, 2) : renderComparison(result))
  if (!result.available) process.exit(1)
}
