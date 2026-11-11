import fs from 'node:fs'
const nodes=[{
id:'exp-slot-001',kind:'failure',confidence:0.95,topic:'rsi',
title:'The tie-break makes the lesson experiment one-sided: in 83 rounds where both arms verified a patch, a2 won 0 and a1 won 43',
body:'Measured the two candidate slots over the whole ledger. The arms are near-identical in quality: a1 verified 50.7% of 227 attempts vs a2 46.2% of 225, errored 26.9% vs 28.9%, produced a patch 96.9% vs 93.8%, and took 4.0 vs 3.8 mean minutes. Nothing separates them in aggregate.\n\nBut in the 83 rounds where both arms verified and both produced a patch, a1 was promoted 43 times and a2 exactly zero. The remaining 40 rounds promoted nothing at all. That is not a quality difference; it is `rankAttempts` in src/gate/gate.js:154, whose tie-break is score, then verifierOk, then `id` lexicographic ascending — and "rNa1" sorts before "rNa2". Two verified candidates with the same binary score of 1 are always tied, so a1 always wins.\n\nWhy this poisons the lesson experiment: a2 (the treated arm, lessons injected) can only ever be promoted when a1 fails. So the treated arm\'s only observed successes are conditioned on control failure, and `lesson.impact` deltas are drawn from that conditioned sample. The measured mean of +0.017 in exp-lesson-001 is therefore not a statement about lesson value at all — it describes a distribution where the treated arm is never allowed to win a fair comparison.\n\nThe fix is one line and does not change gate semantics on unequal scores: break ties on something that is not the slot index, and for an A/B measurement alternate the winner on ties (or randomise treated/control per round). Both are cheaper than the hundreds of pairs a properly powered experiment needs.',
source:null}]
fs.writeFileSync('research/exp/e14.json',JSON.stringify({nodes,edges:[
{from:'exp-slot-001',rel:'contradicts',to:'exp-lesson-001',note:'The null lesson effect is explained by a one-line tie-break, not by lessons being worthless.'},
{from:'exp-slot-001',rel:'refines',to:'exp-score-001',note:'Binary scores make every round a tie, which converts the tie-break into the actual selection rule.'},
{from:'exp-slot-001',rel:'supports',to:'ana-004',note:'A gate whose decisions are made by lexicographic id order is the extreme case of a decision rule nobody validated.'},
]}))
console.log('ok')
