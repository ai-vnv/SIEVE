import fs from 'node:fs';
import {Encounter,scenario,FAMILIES} from '../simulator/core.mjs';
import {haulShift,HAUL_POLICIES,HAUL_CONFIG} from '../simulator/haulage.mjs';
const n=200,rows=[],example={};
for(let i=0;i<n;i++)for(const policy of HAUL_POLICIES){const {events,...r}=haulShift(51000+i,policy);rows.push(r);if(i===0)example[policy]={...r,events};}
const metrics=['throughputTph','meanCycleMin','averageMovingKph','shiftAverageKph','queueMinPerTruck','handoverMinPerTruck','recoveryMinPerTruck','movingUtilization','collisions','violations','encounters'];
const summary=HAUL_POLICIES.map(policy=>{const a=rows.filter(r=>r.policy===policy),out={policy,n};for(const key of metrics){const values=a.map(r=>r[key]),mean=values.reduce((x,y)=>x+y,0)/n,variance=values.reduce((x,y)=>x+(y-mean)**2,0)/(n-1),half=1.972*Math.sqrt(variance/n);out[key]={mean,ci:[mean-half,mean+half]};}return out;});
// Independent encounter check of the analytically selected operating envelope.
const validation=[],validationRows=[];for(const family of FAMILIES){let collisions=0,violations=0,unfinished=0;for(let i=0;i<1000;i++){const {trace,...r}=new Encounter({...scenario(41000+i,family),horizon:90},'integrated').run();validationRows.push({...r,horizon:90,requirement:'R-STOP-5',evidenceKind:'simulation'});collisions+=Number(r.collision);violations+=Number(r.bufferViolation);unfinished+=Number(!r.stopped&&!r.collision);}validation.push({family,n:1000,seedStart:41000,seedEnd:41999,collisions,violations,unfinished});}
// The overlap advantage is an explicit assumption; remove it as a sensitivity.
const sensitivity=[];for(const ackSeconds of [0,30,60]){let context=0,coordinated=0;for(let i=0;i<50;i++){context+=haulShift(51000+i,'context',{ackSeconds}).throughputTph;coordinated+=haulShift(51000+i,'coordinated',{ackSeconds}).throughputTph;}sensitivity.push({ackSeconds,context:context/50,coordinated:coordinated/50,gainPct:100*(coordinated/context-1)});}
fs.writeFileSync('results/integrated-validation.jsonl',validationRows.map(r=>JSON.stringify(r)).join('\n')+'\n');
fs.writeFileSync('results/haulage-summary.json',JSON.stringify({config:HAUL_CONFIG,n,seedStart:51000,seedEnd:51199,summary,validation,sensitivity},null,2)+'\n');
fs.writeFileSync('results/haulage-shifts.jsonl',rows.map(r=>JSON.stringify(r)).join('\n')+'\n');fs.writeFileSync('results/haulage-replay.json',JSON.stringify(example));
console.table(summary.map(s=>({policy:s.policy,tph:s.throughputTph.mean,cycle:s.meanCycleMin.mean,speed:s.averageMovingKph.mean,collisions:s.collisions.mean,violations:s.violations.mean,queue:s.queueMinPerTruck.mean})));
console.log({validation,sensitivity});
