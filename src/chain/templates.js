/** Seeded templates: the main agent copies one and rewrites it for the task. */

export const CODE_FIX = {
  name: 'code-fix',
  version: 1,
  description: 'Explore → attempt in parallel → mechanically verify → promote the best attempt.',
  params: { candidates: 2, maxSteps: 40 },
  nodes: [
    {
      id: 'recon',
      type: 'agent',
      role: 'planner',
      prompt:
        'Inspect the repository and the task. Produce: (1) the exact failure or gap, ' +
        '(2) the files likely involved, (3) the verification command that proves success, ' +
        '(4) one alternative approach. Be terse; the next agent only needs the plan.',
    },
    {
      id: 'attempts',
      type: 'map',
      over: 'candidates',
      of: {
        id: 'work',
        type: 'agent',
        role: 'worker',
        prompt:
          'Implement the change in your own worktree. Run the project tests yourself. ' +
          'Report: what you changed, the commands you ran, and the final test output. ' +
          'Do not claim success without a green run.',
      },
    },
    {
      id: 'verify',
      type: 'verifier',
      cmd: 'npm test',
      cwd: '.',
      description: 'Mechanical gate: exit code 0 required; extra metrics parsed from stdout when configured.',
    },
    { id: 'gate', type: 'human', when: 'on_gain', prompt: 'Promote the winning attempt?' },
  ],
}

export const REFACTOR = {
  name: 'refactor',
  version: 1,
  description: 'Behaviour-preserving refactor: baseline tests must stay green while a quality metric improves.',
  params: { candidates: 2, maxSteps: 40 },
  nodes: [
    { id: 'baseline', type: 'verifier', cmd: 'npm test', cwd: '.', description: 'Record the baseline: all tests green before touching code.' },
    {
      id: 'attempts',
      type: 'map',
      over: 'candidates',
      of: {
        id: 'work',
        type: 'agent',
        role: 'worker',
        prompt: 'Refactor without changing behaviour. Keep the diff reviewable; the test suite must stay green.',
      },
    },
    { id: 'verify', type: 'verifier', cmd: 'npm test', cwd: '.', description: 'Green tests are necessary; the quality metric decides the winner.' },
    { id: 'gate', type: 'human', when: 'on_gain', prompt: 'Adopt this refactor?' },
  ],
}

export const TEMPLATES = { 'code-fix': CODE_FIX, refactor: REFACTOR }

export function templateFor(name) {
  return TEMPLATES[name] || null
}
