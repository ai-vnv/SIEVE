import test from 'node:test';import assert from 'node:assert/strict';
import {cinematicTraffic,intersect,overlapPairs,wheelAngle,payloadFraction} from './traffic.mjs';
const truck=(id,x,z,yaw=0)=>({id,x,z,yaw,halfLength:6.2,halfWidth:3.8,kind:'truck'});
test('footprints detect same-lane interpenetration and head-on contact',()=>{assert(intersect(truck('a',0,0),truck('b',10,0,Math.PI)));assert.equal(overlapPairs([truck('a',0,0),truck('b',10,0)]).length,1);});
test('opposing lanes have physical separation and rotated footprints are checked',()=>{assert(!intersect(truck('a',0,8),truck('b',0,-8,Math.PI),.5));assert(intersect(truck('a',0,0,Math.PI/4),truck('b',5,3,-Math.PI/4)));});
test('background traffic moves forward in its lane and stays clear of hero progress',()=>{for(const start of [6,20])for(let t=start;t<start+(start===6?7.9:3.9);t+=.05){const a=cinematicTraffic(t),b=cinematicTraffic(t+.01);for(let i=0;i<a.background.length;i++){const p=a.background[i],q=b.background[i];assert((q.s-p.s)*p.direction>0);if(p.lane===a.hero.lane)assert(Math.abs(p.s-a.hero.s)>=79.9);}}});
test('return leg is empty and every phase is deterministic',()=>{assert.equal(cinematicTraffic(22).hero.loaded,false);assert.equal(cinematicTraffic(10).hero.loaded,true);assert.deepEqual(cinematicTraffic(9),cinematicTraffic(9));});

test('wheel rotation follows traveled distance and remains fixed at a stop',()=>{assert.equal(wheelAngle(1.65),-1);assert(Math.abs(wheelAngle(0))<1e-12);assert.equal(wheelAngle(10)-wheelAngle(5),-5/1.65);assert.equal(wheelAngle(7),wheelAngle(7));});
test('loading fills the bed before departure; loaded haul stays full and return stays empty',()=>{assert.equal(payloadFraction('loading',0),0);assert.equal(payloadFraction('loading',5.5),1);for(let t=6;t<14;t+=.1)assert.equal(payloadFraction('hauling',t),1);assert.equal(payloadFraction('unloading',14),1);assert.equal(payloadFraction('unloading',19.5),0);assert.equal(payloadFraction('return',22),0);});
