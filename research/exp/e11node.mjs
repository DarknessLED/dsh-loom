import fs from 'node:fs'
const nodes=[{
id:'exp-wall-001',kind:'number',confidence:0.95,topic:'rsi',
title:'A round costs 6 minutes of wall clock at the median and 28 hours total across 231 rounds; a human wrote 11% of the ledger',
body:'Measured from round.started to round.finished in ledger time (the envelope carries `t` in ms; nothing else does, which is why earlier attempts to compute this returned zero). Over 231 rounds in 69 campaigns: p10 2.2s, median 6.1 min, p90 15.6 min, mean 7.3 min, 28.05 hours of round wall clock in total.\n\nThe 2.2s p10 is not a fast round; it is a round that died early (setup failure, empty patch, provider error) and it inflates the apparent supply of rounds. The p90 of 15.6 min is the number that matters for a product claim about attention: a checkpoint arriving on a round that long means a human who answers within an hour is still 4x faster than the next round.\n\nActor split over 3,262 ledger events: system 2,762 (85%), human 362 (11%), agent 138 (4%). The 11% human share is the audible part of the human-in-the-loop design — it is what a reviewer reads — while the 85% system share is what makes the loop autonomous. Gap-w1-003 says nobody attributes wall clock inside an RSI loop\'s own machinery; this is that attribution for one loop, and it says the dominant cost is one long serialised round at a time, not the orchestration around it.',
source:null}]
fs.writeFileSync('research/exp/e11.json',JSON.stringify({nodes,edges:[
{from:'exp-wall-001',rel:'contradicts',to:'gap-w1-003',note:'Wall clock inside one RSI loop\'s machinery is measurable from its own ledger; here is the attribution.'},
{from:'exp-wall-001',rel:'supports',to:'exp-human-001',note:'Supplies the time denominator for the attention metric: 6 min median per round, 0.44 decisions per promotion.'},
{from:'exp-wall-001',rel:'refines',to:'w2-human-gap-batching-vs-streaming',note:'At a 15.6 min p90 round, batching decisions to round boundaries costs little; at the 2.2s p10 it costs nothing.'},
]}))
console.log('ok')
