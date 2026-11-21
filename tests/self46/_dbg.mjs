import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runRound } from '../../src/runtime/round.js'
const git=(d,...a)=>execFileSync('git',['-C',d,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']})
const dir=mkdtempSync(join(tmpdir(),'dbg-'))
git(dir,'init','-q'); git(dir,'config','user.email','a@b'); git(dir,'config','user.name','a')
writeFileSync(join(dir,'keep.txt'),'keep\n'); git(dir,'add','-A'); git(dir,'commit','-qm','base')
mkdirSync(join(dir,'campaign'),{recursive:true})
const events=[]
const runtime={home:join(dir,'home'),append(_v,t,d,by){events.push({type:t,data:d});return {rounds:[]}},artifactsDir(){return join(dir,'artifacts')},sessionFor(){return {id:'s',cwd:dir}}}
const rounds=[1,2].map(n=>({n,status:'no-gain',taskId:'t1',chainVersion:1,durationMs:90000,promoted:false,landed:false,attempts:[{id:`r${n}a1`,score:0,verifierOk:false,durationMs:80000,costUsd:0.004},{id:`r${n}a2`,score:0,verifierOk:false,durationMs:85000,costUsd:0.004}]}))
const state={id:'c1',status:'running',objective:'x',workspace:dir,createdAt:Date.now()-30*60000,updatedAt:Date.now(),budget:{usd:5,minutes:240,rounds:10,spentUsd:0},evalset:{tasks:[{id:'t1',prompt:'change nothing',verify:{cmd:'true'}}],holdout:[]},chain:{activeVersion:1,versions:[{version:1,spec:{name:'n',params:{},nodes:[]},status:'active'}]},rounds}
const cfg={models:{worker:'test/model'},halving:{enabled:false,keepRatio:0.5,screenTimeoutMs:1000},checkpoint:{on:['gate'],window:3},verify:{timeoutMs:60000},session:{attemptTimeoutMs:60000,maxConcurrent:2},chain:{maxMutations:3},loopPolicy:{planMode:'off'}}
const REPORT=JSON.stringify({summary:'nothing',whatChanged:[],howVerified:'read',confidence:0.2,openQuestions:[],nextHint:''})
const dispatcher={async run(_p,{label}){return {stopReason:'completed',failureKind:'ok',text:REPORT,structured:null,timedOut:false,error:null,sessionId:String(label),durationMs:1}}}
await runRound({runtime,view:{state,dir:join(dir,'campaign')},config:cfg,dispatcher,log:()=>{}})
const s=events.find(e=>e.type==='round.started')
console.log('started keys:',Object.keys(s?.data||{}))
console.log('candidatePlan:',JSON.stringify(s?.data?.candidatePlan))
console.log('types:',events.map(e=>e.type).join(','))
