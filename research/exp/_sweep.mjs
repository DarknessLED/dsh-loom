// Sweep: mutation score of a module under (a) its own focused spec and (b) the
// whole project suite, to measure whether a shared verifier is really stronger.
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, copyFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'
const root = 'C:/Projects/RSI'
const NODE = process.env.MUT_NODE
const MUT = [
  ['return true','return false'],['return false','return true'],
  ['=== ','!== '],[' > 0',' >= 0'],[' >= 0',' > 0'],
  ['&&','||'],['||','&&'],['+ 1','+ 2'],['- 1','- 2'],
  ['Math.min','Math.max'],['Math.max','Math.min'],
]
function mutantsOf(file){const src=readFileSync(file,'utf8');const out=[];for(const [f,t] of MUT){let i=0;while((i=src.indexOf(f,i))!==-1){out.push({f,t,at:i,text:src.slice(0,i)+t+src.slice(i+f.length)});i+=f.length;if(out.length>=20)return out}}return out}
function run(cmd){const r=spawnSync(cmd,{cwd:root,shell:true,timeout:600000,encoding:'utf8'});return r.status??1}
const file=process.argv[2]
const cmds=process.argv.slice(3)
const target=join(root,file), backup=target+'.orig'
copyFileSync(target,backup)
try{
  const muts=mutantsOf(target)
  const report=[]
  for(const c of cmds){
    const base=run(c)
    if(base!==0){report.push({cmd:c,baseline:base,note:'baseline fails'});continue}
    let killed=0;const survived=[]
    for(const m of muts){writeFileSync(target,m.text);if(run(c)!==0)killed++;else survived.push(m.f+'->'+m.t+'@'+m.at)}
    writeFileSync(target,readFileSync(backup))
    report.push({cmd:c.slice(-70),mutants:muts.length,killed,score:+(killed/muts.length).toFixed(3),survived})
  }
  console.log(JSON.stringify({file,report},null,2))
} finally { copyFileSync(backup,target); unlinkSync(backup) }
