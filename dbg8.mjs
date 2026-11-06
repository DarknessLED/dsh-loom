import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runRound } from './src/runtime/round.js'
const dir = mkdtempSync(join(tmpdir(), 'dbg8-'))
const g=(...a)=>execFileSync('git',['-C',dir,...a],{encoding:'utf8'})
g('init','-q');g('config','user.email','l@l');g('config','user.name','l');g('config','core.autocrlf','false')
writeFileSync(join(dir,'keep.txt'),'keep\n');g('add','-A');g('commit','-qm','base')
const events=[]
const rt={home:join(dir,'home'),events,dir,watchAttempt(){},unwatchAttempt(){},stallReason(){return null},append(_v,t,d){events.push({type:t,data:d})},status(){return {}}}
const view={dir:join(dir,'c'),state:{id:'h',status:'running',workspace:dir,rounds:[],constraints:[],lessons:[],checkpoints:[],autopilot:{enabled:true,guard:null},budget:{rounds:10,roundsUsed:0,usd:5,spentUsd:0},evalset:{tasks:[{id:'t1',family:'f',prompt:'write',verify:{cmd:'exit 0'}}],holdout:[]},chain:{activeVersion:1,versions:[{version:1,spec:{name:'c',version:1,nodes:[{id:'attempts',type:'map',over:'candidates',of:{id:'work',type:'agent',role:'worker',prompt:'W'}},{id:'verify',type:'verifier',cmd:'exit 0',cwd:'.'},{id:'gate',type:'human',when:'always',prompt:'R'}]},params:{candidates:1}}]}}}
const config={session:{attemptTimeoutMs:60000,maxConcurrent:1},verify:{timeoutMs:30000},loopPolicy:{},knowledge:{enabled:false,maxShown:0},halving:{enabled:false},gate:{minGain:0.05},models:{}}
const dispatcher={run:async(_p,opts)=>{writeFileSync(join(opts?.cwd??dir,'new.txt'),'written\n');return {sessionId:'w',text:'{"changed":["new.txt"],"why":"w","evidence":["ok"],"openQuestions":[],"confidence":0.9,"nextHint":""}',stopReason:'completed'}}}
await runRound({runtime:rt,view,config,dispatcher,log:(...a)=>console.log('log:',...a),notify:()=>{}})
for (const e of events) console.log(e.type, JSON.stringify(e.data).slice(0,160))
