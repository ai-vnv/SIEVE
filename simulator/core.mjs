import {TRAINED_CAPS} from '../config/policy.mjs';
/** SIEVE longitudinal encounter model. SI units. No graphics or external dependencies. */
export const VERSION = 'sieve-1.1.0';
export const DT = 0.05;
export const FAMILIES = ['nominal', 'dust', 'wet', 'combined'];
export const STRESS_FAMILIES=['extreme-dust','landslide','human-crossing'];
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function scenario(seed, family = 'combined') {
  if (![...FAMILIES,...STRESS_FAMILIES].includes(family)) throw new Error('Unknown scenario family');
  const r = rng(seed), u = (lo, hi) => lo + (hi - lo) * r();
  const dust = ['dust', 'combined','extreme-dust'].includes(family), wet = ['wet', 'combined'].includes(family);
  return {seed, family, gap: u(100,180), initialSpeed:u(8,12), grade:u(0.02,0.08),
    brake: wet ? u(1.6,2.4) : u(2.8,3.4), visibility:family==='extreme-dust'?u(8,20):dust ? u(28,65) : u(85,115),
    latency:family==='extreme-dust'?u(2.5,5):dust ? u(0.8,2.4) : u(0.2,0.6), dust, wet, obstacleS:400, length:12,
    roadClosed:family==='landslide',crewPresent:family==='human-crossing',extremeDust:family==='extreme-dust',horizon:35, dt:DT};
}
export function effectiveScenario(s, layer) {
  if (layer === 'nominal-model') return {...s, brake:3.1, visibility:100, latency:0.4};
  if (layer === 'extended-model') return {...s};
  throw new Error('Unknown model layer');
}
// Stopping envelope from lower visibility and braking bounds, upper latency,
// and an 8 m margin. The extra 2 dt accounts for discrete detection/control.
export function operatingSpeed(s,limit=12) {
 if(s.roadClosed||s.crewPresent||s.extremeDust)return 0;
 const b=Math.max(.2,1.6-9.81*s.grade),R=s.dust?28:85,delay=(s.dust?2.4:.6)+2*s.dt;
 return Math.min(limit,TRAINED_CAPS[s.family]??limit,b*(Math.sqrt(delay*delay+2*(R-8)/b)-delay));
}
export class Encounter {
  constructor(s, policy='baseline', layer='extended-model') {
    if (!['baseline','guarded','no-speed-cap','no-brake-bound','integrated'].includes(policy)) throw new Error('Unknown policy');
    this.spec = effectiveScenario(s,layer); this.policy = policy; this.layer = layer;
    this.t=0; this.s = s.obstacleS-s.length-s.gap; this.v=s.initialSpeed;
    this.minGap=s.gap; this.braking=false; this.detected=false; this.visibleSince=null;
    this.brakeTime=null; this.collision=false; this.done=false; this.trace=[];
    this.record();
  }
  get gap() { return this.spec.obstacleS-this.spec.length-this.s; }
  get decel() {return Math.max(0.2,this.spec.brake-9.81*this.spec.grade);}
  get targetSpeed() {if(this.spec.speedCap!==undefined)return this.spec.speedCap;if(this.policy==='integrated')return operatingSpeed(this.spec);return this.policy !== 'baseline' && this.policy !== 'no-speed-cap' && (this.spec.dust || this.spec.wet) ? 6 : 12;}
  get bound() { return this.policy !== 'baseline' && this.policy !== 'no-brake-bound' ? Math.max(0.2,1.6-9.81*this.spec.grade) : 3.1-9.81*this.spec.grade; }
  get triggerDistance() {return this.v*this.spec.dt+this.v*this.v/(2*this.bound)+8;}
  step(dt=this.spec.dt) {
    if(this.done) return this.snapshot();
    const s=this.spec;
    if(this.visibleSince===null && this.gap<=s.visibility) this.visibleSince=this.t;
    if(this.visibleSince!==null && this.t-this.visibleSince>=s.latency-1e-9) this.detected=true;
    if(this.detected && this.gap<=this.triggerDistance && !this.braking){this.braking=true;this.brakeTime=this.t;}
    if(this.policy==='integrated'&&this.targetSpeed===0&&!this.braking){this.braking=true;this.brakeTime=this.t;}
    const a=this.braking ? -this.decel : Math.max(-this.decel,Math.min(0.8,1.2*(this.targetSpeed-this.v)));
    const h=a<0 ? Math.min(dt,this.v/(-a)) : dt;
    this.s += this.v*h+0.5*a*h*h; this.v=Math.max(0,this.v+a*dt); this.t+=dt;
    this.minGap=Math.min(this.minGap,this.gap);
    if(this.gap<=0){this.collision=true; this.done=true;}
    if((this.braking && this.v===0)||this.t>=s.horizon-1e-9)this.done=true;
    this.record(); return this.snapshot();
  }
  snapshot(){return {t:this.t,s:this.s,v:this.v,gap:this.gap,braking:this.braking,detected:this.detected,collision:this.collision,done:this.done,trigger:this.triggerDistance};}
  record(){this.trace.push(this.snapshot());}
  run(){while(!this.done)this.step();return this.result();}
  result(){return {seed:this.spec.seed,family:this.spec.family,policy:this.policy,layer:this.layer,
    collision:this.collision,bufferViolation:this.minGap<5,minGap:this.minGap,stopTime:this.t,
    stopped:this.v===0,brakeTime:this.brakeTime,finalSpeed:this.v,trace:this.trace};}
}
