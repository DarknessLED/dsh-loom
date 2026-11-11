const { secondCandidateGate, admitSecondCandidate } = await import('file:///C:/Projects/RSI/src/runtime/candidates.js')
// Would the gate have admitted the second candidate on the real graded rounds?
console.log('A: p from a 1-in-3 promotion streak, round 83s, tail 45s')
console.log(admitSecondCandidate({ p: 0.5, roundMs: 82845, tailMs: 45000, marginMs: 0 }))
console.log('B: the same with the observed 0 promotions out of 3 (Beta(1,1) prior -> p=0.25)')
console.log(admitSecondCandidate({ p: 0.25, roundMs: 82845, tailMs: 45000 }))
console.log('C: p = 0.8 (campaigns that promote early)')
console.log(admitSecondCandidate({ p: 0.8, roundMs: 82845, tailMs: 45000 }))
console.log('D: measured from the real ledger shape (window of graded rounds)')
const rounds = [
  { n: 1, status: 'no-gain', score: 1, durationMs: 82845, planMs: 30000, promoted: false, candidates: 2, attempts: [{ id: 'r1a1', durationMs: 62000, verifierOk: false }, { id: 'r1a2', durationMs: 78000, verifierOk: true }] },
  { n: 2, status: 'no-gain', score: 1, durationMs: 90000, planMs: 28000, promoted: false, candidates: 2, attempts: [{ id: 'r2a1', durationMs: 70000, verifierOk: true }, { id: 'r2a2', durationMs: 88000, verifierOk: false }] },
  { n: 3, status: 'no-gain', score: 1, durationMs: 87000, planMs: 25000, promoted: false, candidates: 2, attempts: [{ id: 'r3a1', durationMs: 69000, verifierOk: false }, { id: 'r3a2', durationMs: 85000, verifierOk: true }] },
]
console.log(secondCandidateGate(rounds))
