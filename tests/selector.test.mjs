#!/usr/bin/env node
/**
 * Selector tests: rounds must chase tasks that still have headroom.
 * A round spent on an already-perfect task costs tokens and teaches nothing.
 */
import { bestScores, isSolved, pickTask } from '../src/runtime/selector.js'

let pass = 0
const fails = []
function ok(name, cond, detail) {
  if (cond) {
    pass += 1
    console.log(`ok ${pass} - ${name}`)
  } else {
    fails.push(`${name}${detail ? ` (${detail})` : ''}`)
    console.log(`not ok - ${name}${detail ? ` (${detail})` : ''}`)
  }
}

const attempt = (id, score, extra = {}) => ({ id, score, verifierOk: true, ...extra })
const round = (n, taskId, attempts) => ({ n, taskId, attempts })

const tasks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

// --- bestScores -----------------------------------------------------------
ok('bestScores: empty rounds', bestScores([]).size === 0)
ok('bestScores: keeps the highest passing score', bestScores([
  round(1, 'a', [attempt('r1a1', 0.4)]),
  round(2, 'a', [attempt('r2a1', 0.9)]),
]).get('a') === 0.9)
ok('bestScores: ignores failing attempts', bestScores([
  round(1, 'a', [attempt('r1a1', 0.7, { verifierOk: false })]),
]).has('a') === false)
ok('bestScores: ignores screened-out attempts', bestScores([
  round(1, 'a', [attempt('r1a1', 0.7, { screenedOut: true })]),
]).has('a') === false)
ok('bestScores: ignores abandoned attempts', bestScores([
  round(1, 'a', [attempt('r1a1', 0.7, { abandoned: true })]),
]).has('a') === false)
ok('bestScores: ignores non-finite scores', bestScores([
  round(1, 'a', [attempt('r1a1', Number.NaN)]),
]).has('a') === false)

// --- isSolved -------------------------------------------------------------
ok('isSolved: 1.0 is solved', isSolved('a', new Map([['a', 1]])) === true)
ok('isSolved: 0.99 is not solved', isSolved('a', new Map([['a', 0.99]])) === false)
ok('isSolved: unknown task is not solved', isSolved('zz', new Map()) === false)

// --- pickTask -------------------------------------------------------------
const solvedA = [round(1, 'a', [attempt('r1a1', 1)])]
const first = pickTask(tasks, solvedA, { round: 1 })
ok('pickTask: skips the solved task', first.task.id !== 'a', JSON.stringify(first))
ok('pickTask: reports the open pool size', first.poolSize === 2, String(first.poolSize))
ok('pickTask: reports solved count', first.solvedCount === 1, String(first.solvedCount))

const second = pickTask(tasks, solvedA, { round: 2 })
ok('pickTask: rotates within the open pool', second.task.id !== first.task.id, JSON.stringify(second))

const allSolved = [
  round(1, 'a', [attempt('r1a1', 1)]),
  round(2, 'b', [attempt('r2a1', 1)]),
  round(3, 'c', [attempt('r3a1', 1)]),
]
const fallback = pickTask(tasks, allSolved, { round: 4 })
ok('pickTask: falls back to every task when all are solved', fallback.task !== null && fallback.poolSize === 3)
ok('pickTask: fallback still rotates', fallback.task.id === 'a', JSON.stringify(fallback))

const withHoldout = pickTask([{ id: 'x' }], [], { round: 1 })
ok('pickTask: single task is picked', withHoldout.task.id === 'x')
ok('pickTask: empty list is null', pickTask([], [], { round: 1 }).task === null)
ok('pickTask: undefined list is null', pickTask(undefined, [], { round: 1 }).task === null)
ok('pickTask: round 0 behaves like round 1', pickTask(tasks, [], { round: 0 }).task.id === 'a')
ok('pickTask: large rounds wrap', pickTask(tasks, [], { round: 7 }).task.id === 'a')

// A task solved on a *different* task's round must not hide headroom here.
const mixed = [round(1, 'a', [attempt('r1a1', 1)]), round(2, 'b', [attempt('r2a1', 0.5)])]
ok('pickTask: a solved task does not mask an unsolved one', pickTask(tasks, mixed, { round: 1 }).task.id !== 'a')

console.log(`\n${pass}/${pass + fails.length} passed`)
if (fails.length) {
  console.error(fails.join('\n'))
  process.exitCode = 1
}
