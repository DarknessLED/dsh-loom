import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { readJsonl } from '../src/core/atomic.js';

const home = process.env.DSH_LOOM_HOME || join(homedir(), '.dsh', 'loom');
const dir = join(home, 'campaigns');
const agg = { rounds:0, promoted:0, noGain:0, interrupted:0, budget:0,
  attemptTotal:0, attemptOk:0, attemptTimeout:0, attemptDied:0, attemptCtx:0,
  withPatch:0, lostWithPatch:0,
  planMs:0, planRounds:0, planEmpty:0, planDecided:0, planTimedOut:0,
  holdoutMs:0, holdoutRounds:0, wallMs:0, wallRounds:0,
  lessons:0, lessonsMeasured:0, lessonsGain:0, lessonsHarm:0 };
const perCampaign = [];
if (existsSync(dir)) {
  for (const id of readdirSync(dir)) {
    const file = join(dir, id, 'events.jsonl');
    if (!existsSync(file)) continue;
    const events = readJsonl(file);
    const attempts = new Map();
    const seenLessons = new Set();
    const c = { id, rounds:0, prom:0, wall:0, wallN:0 };
    for (const e of events) {
      const d = e.data || {};
      if (e.type === 'round.started') { agg.rounds++; c.rounds++; }
      if (e.type === 'round.finished') {
        const st = d.status;
        if (st === 'promoted') { agg.promoted++; c.prom++; }
        else if (st === 'no-gain') agg.noGain++;
        else if (st === 'interrupted') agg.interrupted++;
        else if (st === 'budget') agg.budget++;
        if (Number.isFinite(d.durationMs) && d.durationMs > 0) { agg.wallMs += d.durationMs; agg.wallRounds++; c.wall += d.durationMs; c.wallN++; }
        if (Number.isFinite(d.planMs) && d.planMs > 0) { agg.planMs += d.planMs; agg.planRounds++; }
        if (d.planTimedOut === true) agg.planTimedOut++;
        if (d.planUsable === false) { agg.planEmpty++; agg.planDecided++; }
        else if (d.planUsable === true) agg.planDecided++;
        if (Number.isFinite(d.holdoutMs) && d.holdoutMs > 0) { agg.holdoutMs += d.holdoutMs; agg.holdoutRounds++; }
      }
      if (e.type === 'attempt.finished') {
        const prev = attempts.get(d.id) || {};
        attempts.set(d.id, { ...prev, ...d });
        agg.attemptTotal++;
        if (d.verifierOk === true) agg.attemptOk++;
        if (d.failureKind === 'timeout') agg.attemptTimeout++;
        else if (d.failureKind === 'died') agg.attemptDied++;
        else if (d.failureKind === 'context') agg.attemptCtx++;
        if ((d.patchBytes ?? 0) > 0) agg.withPatch++;
      }
      if (e.type === 'lesson.added') { agg.lessons++; seenLessons.add(d.id); }
      if (e.type === 'lesson.impact') { agg.lessonsMeasured++; if (d.harm) agg.lessonsHarm++; agg.lessonsGain += Number(d.delta)||0; }
    }
    for (const a of attempts.values()) if ((a.patchBytes ?? 0) > 0 && a.verifierOk !== true) agg.lostWithPatch++;
    perCampaign.push(c);
  }
}
const pct = (a,b) => b>0 ? `${((100*a)/b).toFixed(0)}%` : '—';
const sec = (ms) => `${(ms/1000).toFixed(0)}s`;
console.log('== rounds ==');
console.log(`total ${agg.rounds}  promoted ${agg.promoted} (${pct(agg.promoted,agg.rounds)})  no-gain ${agg.noGain} (${pct(agg.noGain,agg.rounds)})  interrupted ${agg.interrupted}  budget ${agg.budget}`);
const wallPerRound = agg.wallRounds ? agg.wallMs/agg.wallRounds : 0;
console.log(`wall/round ${sec(wallPerRound)} (measured ${agg.wallRounds}/${agg.rounds})  wall/promotion ${sec(agg.promoted ? agg.wallMs/agg.promoted : 0)}`);
console.log('\n== attempts ==');
console.log(`total ${agg.attemptTotal}  verifierOk ${agg.attemptOk} (${pct(agg.attemptOk,agg.attemptTotal)})  timeout ${agg.attemptTimeout}  died ${agg.attemptDied}  context ${agg.attemptCtx}`);
console.log(`carried patch ${agg.withPatch} (${pct(agg.withPatch,agg.attemptTotal)})  patch-but-not-verified ${agg.lostWithPatch} (${pct(agg.lostWithPatch,agg.withPatch)})`);
console.log('\n== planning ==');
const planMean = agg.planRounds ? agg.planMs/agg.planRounds : 0;
console.log(`mean plan ${sec(planMean)} over ${agg.planRounds} rounds = ${(100*(wallPerRound?planMean/wallPerRound:0)).toFixed(0)}% of a round`);
console.log(`planTimedOut ${agg.planTimedOut}  empty-handed ${agg.planEmpty}/${agg.planDecided} (${pct(agg.planEmpty,agg.planDecided)})`);
console.log('\n== holdout ==');
const holdMean = agg.holdoutRounds ? agg.holdoutMs/agg.holdoutRounds : 0;
console.log(`mean holdout ${sec(holdMean)} over ${agg.holdoutRounds} rounds = ${pct(agg.holdoutMs,agg.wallMs)} of measured wall`);
console.log('\n== knowledge ==');
console.log(`lessons added ${agg.lessons}  impact measurements ${agg.lessonsMeasured}  summed delta ${agg.lessonsGain.toFixed(2)}  harm ${agg.lessonsHarm}`);
console.log('\n== per campaign (worst first) ==');
perCampaign.filter(c=>c.wallN>0).sort((a,b)=>b.wall/b.wallN-a.wall/a.wallN).slice(0,12)
  .forEach(c=>console.log(`${c.id.padEnd(16)} rounds ${String(c.rounds).padStart(2)} prom ${String(c.prom).padStart(2)} wall/round ${sec(c.wall/c.wallN)}`));
