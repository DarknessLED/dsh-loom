import fs from 'node:fs'
const edges = [
{ from:'ana-001', rel:'refines', to:'tri-cost-per-solved-task', note:'Adds human minutes to the denominator the cost literature uses.' },
{ from:'ana-001', rel:'supports', to:'ctx-013', note:'A stated budget changes behaviour, so a stated attention budget may too.' },
{ from:'ana-002', rel:'contradicts', to:'rsi-001', note:'Textbook-baseline evidence says open-ended self-modification is not where the gain is.' },
{ from:'ana-002', rel:'supports', to:'tri-textbook-baseline', note:'Pre-registered DGM port: textbook move beats the searched agent.' },
{ from:'ana-003', rel:'applies-to', to:'tri-verifier-precision-ceiling', note:'Our verifier is a shell command; its precision is unmeasured.' },
{ from:'ana-003', rel:'supports', to:'ver-f01', note:'Zero collected tests exiting 0 is a real instance of low precision looking like success.' },
{ from:'ana-004', rel:'applies-to', to:'tri-greedy-gate-false-commits', note:'minGain is the same acceptor PACE attacks.' },
{ from:'ana-004', rel:'supports', to:'rsi-005', note:'Self-Harness held-in and held-out non-regression is the acceptor we should adopt.' },
{ from:'ana-005', rel:'applies-to', to:'orch-003', note:'Cohere says the lead should implement; we delegate anyway to stay idle.' },
{ from:'ana-005', rel:'supports', to:'rsi-027', note:'Silent handoff failures are the mechanism that makes delegation lossy.' },
]
fs.writeFileSync('research/kg/_inbox/link1.json', JSON.stringify({ edges }))
console.log('edges', edges.length)
