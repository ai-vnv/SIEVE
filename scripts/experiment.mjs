import fs from 'node:fs';
import crypto from 'node:crypto';
import {Encounter,scenario,FAMILIES,VERSION} from '../simulator/core.mjs';
fs.mkdirSync('results',{recursive:true});
const n=1000, rows=[], traces={};
for(const family of FAMILIES) for(let k=0;k<n;k++) {
  const seed=27000+k,s=scenario(seed,family);
  for(const policy of ['baseline','guarded','no-speed-cap','no-brake-bound']) for(const layer of ['nominal-model','extended-model']) {
    const {trace,...r}=new Encounter(s,policy,layer).run(); rows.push(r);
    if(k===0)traces[`${family}/${policy}/${layer}`]={scenario:s,...r,trace};
  }
}
function wilson(k,n){const z=1.95996398454,p=k/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [Math.max(0,c-h),Math.min(1,c+h)];}
const summary=[];
for(const family of FAMILIES)for(const policy of ['baseline','guarded','no-speed-cap','no-brake-bound'])for(const layer of ['nominal-model','extended-model']){
  const rr=rows.filter(r=>r.family===family&&r.policy===policy&&r.layer===layer),collisions=rr.filter(r=>r.collision).length,violations=rr.filter(r=>r.bufferViolation).length;
  summary.push({family,policy,layer,n:rr.length,collisions,violations,collisionCI:wilson(collisions,n),violationCI:wilson(violations,n),meanMinGap:rr.reduce((a,r)=>a+r.minGap,0)/n,meanStopTime:rr.reduce((a,r)=>a+r.stopTime,0)/n});
}
// Discovery by paired counterexample: nominal passes 5 m, extended fails 5 m.
const discordance=FAMILIES.map(family=>{const r=rows.filter(r=>r.family===family&&r.policy==='baseline');let masked=0;for(let k=0;k<n;k++){let q=r.filter(x=>x.seed===27000+k);if(!q.find(x=>x.layer==='nominal-model').bufferViolation&&q.find(x=>x.layer==='extended-model').bufferViolation)masked++;}return {family,masked,n};});
// Step-size convergence checks use the same 100 scenarios, independent of rendering.
const convergence=[];
for(const family of FAMILIES) for(const policy of ['baseline','guarded']) {
 let changed=0, maxGapDelta=0;
 for(let k=0;k<100;k++){const s=scenario(27000+k,family),a=new Encounter(s,policy).run(),b=new Encounter({...s,dt:0.025},policy).run(); changed+=Number(a.bufferViolation!==b.bufferViolation); if(!a.collision&&!b.collision) maxGapDelta=Math.max(maxGapDelta,Math.abs(a.minGap-b.minGap));}
 convergence.push({family,policy,n:100,changed,maxGapDelta});
}
const metadata={version:VERSION,seedStart:27000,seedEnd:27999,nPerCell:n,totalRuns:rows.length,dt:0.05,node:process.version,engineSHA256:crypto.createHash('sha256').update(fs.readFileSync('simulator/core.mjs')).digest('hex')};
fs.writeFileSync('results/summary.json',JSON.stringify({metadata,summary,discordance,convergence},null,2)+'\n');
fs.writeFileSync('results/episodes.jsonl',rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
fs.writeFileSync('results/replays.json',JSON.stringify(traces));
const head=Object.keys(rows[0]);fs.writeFileSync('results/episodes.csv',[head.join(','),...rows.map(r=>head.map(h=>r[h]).join(','))].join('\n')+'\n');
console.table(summary.filter(r=>r.layer==='extended-model').map(({family,policy,collisions,violations,meanMinGap})=>({family,policy,collisions,violations,meanMinGap:meanMinGap.toFixed(2)})));
console.log({metadata,discordance,convergence});
