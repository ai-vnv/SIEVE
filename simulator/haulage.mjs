/** Finite-shift discrete-event mine: one loader, one dump, six autonomous trucks.
 * All timing assumptions except the 240 t payload class are synthetic.
 * Human coordination overlaps clearance acknowledgment with loading; it does not
 * omit the acknowledgment or alter the assumed environment distribution.
 */
import {Encounter,scenario,rng,operatingSpeed} from './core.mjs';
export const HAUL_CONFIG={trucks:6,shiftSeconds:28800,legMetres:3000,payloadTonnes:240,ackSeconds:45,recoverySeconds:1800,hazardProbability:.1,obstacleHoldSeconds:45};
export const HAUL_POLICIES=['fast','blanket','context','coordinated'];
function draw(seed,truck,trip,leg){return rng((seed*2654435761+truck*2246822519+trip*3266489917+leg*668265263)>>>0);}
const tri=(r,a,m,b)=>{const u=r(),f=(m-a)/(b-a);return u<f?a+Math.sqrt(u*(b-a)*(m-a)):b-Math.sqrt((1-u)*(b-a)*(b-m));};
export function haulShift(seed,policy,overrides={}){
 if(!HAUL_POLICIES.includes(policy))throw Error('Unknown haulage policy');
 const cfg={...HAUL_CONFIG,...overrides},H=cfg.shiftSeconds;
 const trucks=Array.from({length:cfg.trucks},(_,id)=>({id,ready:0,trip:0}));let loader=0,dump=0;
 const totals={tonnes:0,deliveries:0,collisions:0,violations:0,encounters:0,queue:0,handover:0,loading:0,dumping:0,moving:0,travelMetres:0,recovery:0,obstacleWait:0,completedCycles:0,cycleSeconds:0};const events=[];
 const duration=(a,b)=>Math.max(0,Math.min(H,b)-Math.max(0,a));
 function addTime(key,start,seconds){const clipped=duration(start,start+seconds);totals[key]+=clipped;return clipped;}
 function legPlan(truck,trip,leg){const r=draw(seed,truck,trip,leg),u=r();const family=u<.6?'nominal':u<.75?'dust':u<.9?'wet':'combined';const encounterSeed=Math.floor(r()*4294967296);const s={...scenario(encounterSeed,family),horizon:90};const speed=policy==='fast'?12:policy==='blanket'?4:operatingSpeed(s);
 const hazard=r()<cfg.hazardProbability;let encounter=null,moveSeconds=cfg.legMetres/speed,metres=cfg.legMetres,wait=0,eventTime=null;
 if(hazard){const e=new Encounter({...s,initialSpeed:speed,speedCap:speed},policy==='fast'?'baseline':'guarded');const start=e.s;encounter=e.run();const advance=e.s-start;eventTime=1500/speed+encounter.stopTime;
  if(encounter.collision){moveSeconds=eventTime;metres=1500+advance;}
  else{moveSeconds=1500/speed+encounter.stopTime+(cfg.legMetres-1500-advance)/speed+speed/(2*.8);wait=cfg.obstacleHoldSeconds;}
 }
 return {family,speed,hazard,encounter,moveSeconds,metres,wait,eventTime};}
 function executeLeg(t,plan,truck,trip,leg){const moved=addTime('moving',t,plan.moveSeconds);totals.travelMetres+=plan.metres*moved/plan.moveSeconds;
  if(plan.hazard&&t+plan.eventTime<=H){totals.encounters++;totals.violations+=Number(plan.encounter.bufferViolation);totals.collisions+=Number(plan.encounter.collision);}
  const arrive=t+plan.moveSeconds+plan.wait;addTime('obstacleWait',t+plan.moveSeconds,plan.wait);
  events.push({truck,trip,leg,start:t,end:arrive,phase:'travel',family:plan.family,speed:plan.speed,metres:plan.metres,collision:!!plan.encounter?.collision,violation:!!plan.encounter?.bufferViolation});
  return arrive;
 }
 while(true){trucks.sort((a,b)=>a.ready-b.ready||a.id-b.id);const truck=trucks[0],start=truck.ready;if(start>=H)break;const trip=truck.trip++,r=draw(seed,truck.id,trip,9),loading=tri(r,150,180,210),dumping=tri(r,45,60,75);
  const loadStart=Math.max(start,loader);addTime('queue',start,loadStart-start);addTime('loading',loadStart,loading);
  const ack=policy==='coordinated'?0:cfg.ackSeconds;
  addTime('handover',loadStart+loading,ack);const depart=loadStart+loading+ack;loader=depart;
  events.push({truck:truck.id,trip,phase:'loading',start:loadStart,end:depart,ackOverlapped:policy==='coordinated'});
  const loaded=legPlan(truck.id,trip,0);let t=executeLeg(depart,loaded,truck.id,trip,0);
  if(loaded.encounter?.collision){addTime('recovery',t,cfg.recoverySeconds);truck.ready=t+cfg.recoverySeconds;continue;}
  const dumpStart=Math.max(t,dump);addTime('queue',t,dumpStart-t);addTime('dumping',dumpStart,dumping);t=dumpStart+dumping;dump=t;
  if(t<=H){totals.tonnes+=cfg.payloadTonnes;totals.deliveries++;}
  const empty=legPlan(truck.id,trip,1);t=executeLeg(t,empty,truck.id,trip,1);
  if(empty.encounter?.collision){addTime('recovery',t,cfg.recoverySeconds);truck.ready=t+cfg.recoverySeconds;continue;}
  truck.ready=t;if(t<=H){totals.completedCycles++;totals.cycleSeconds+=t-start;}
 }
 return {seed,policy,throughputTph:totals.tonnes/(H/3600),tonnes:totals.tonnes,deliveries:totals.deliveries,meanCycleMin:totals.cycleSeconds/Math.max(1,totals.completedCycles)/60,averageMovingKph:totals.travelMetres/Math.max(1,totals.moving)*3.6,shiftAverageKph:totals.travelMetres/(cfg.trucks*H)*3.6,queueMinPerTruck:totals.queue/cfg.trucks/60,handoverMinPerTruck:totals.handover/cfg.trucks/60,recoveryMinPerTruck:totals.recovery/cfg.trucks/60,movingUtilization:totals.moving/(cfg.trucks*H),collisions:totals.collisions,violations:totals.violations,encounters:totals.encounters,totals,events};
}
