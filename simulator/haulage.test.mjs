import test from 'node:test';import assert from 'node:assert/strict';
import {haulShift,HAUL_CONFIG} from './haulage.mjs';
import {scenario,Encounter,STRESS_FAMILIES} from './core.mjs';
test('zero handover time removes the coordination advantage',()=>{const a=haulShift(51003,'context',{ackSeconds:0}),b=haulShift(51003,'coordinated',{ackSeconds:0});assert.deepEqual(a.totals,b.totals);});
test('truck time is conserved across queue, service, motion, holds and recovery',()=>{for(const p of ['fast','blanket','context','coordinated']){const r=haulShift(51003,p),t=r.totals;const sum=t.queue+t.handover+t.loading+t.dumping+t.moving+t.recovery+t.obstacleWait;assert.ok(Math.abs(sum-HAUL_CONFIG.trucks*HAUL_CONFIG.shiftSeconds)<1e-6,`${p}: ${sum}`);assert.equal(r.tonnes,r.deliveries*HAUL_CONFIG.payloadTonnes);assert.equal(r.throughputTph,r.tonnes/8);}});
test('a zero-duration shift has zero delivered payload',()=>{assert.equal(haulShift(1,'fast',{shiftSeconds:0}).tonnes,0);});
test('an announced out-of-domain condition stops the revised controller',()=>{for(const family of STRESS_FAMILIES){const m=new Encounter(scenario(71000,family),'integrated');assert.equal(m.targetSpeed,0);const r=m.run();assert.equal(r.stopped,true);assert.equal(r.bufferViolation,false);}});
