import fs from 'node:fs';
const rows=fs.readFileSync('results/episodes.jsonl','utf8').trim().split('\n').map(JSON.parse),summary=JSON.parse(fs.readFileSync('results/summary.json'));
const pairs=new Map();for(const r of rows){const key=`${r.family}/${r.seed}/${r.policy}`;if(!pairs.has(key))pairs.set(key,{});pairs.get(key)[r.layer]=r;}
const candidates=[];for(const [key,p]of pairs){if(!p['nominal-model'].bufferViolation&&p['extended-model'].bufferViolation)candidates.push({id:`C/${key}`,requirement:'R-STOP-5',scenarioId:key,nominalVerdict:'pass',extendedVerdict:'fail',minClearance:p['extended-model'].minGap,collision:p['extended-model'].collision,evidenceKind:'simulation',modelHash:summary.metadata.engineSHA256,proposedNextLayer:'E1',humanApproval:null,physicalConfirmation:null});}
const guarded=rows.filter(r=>r.policy==='guarded'&&r.layer==='extended-model'),failures=guarded.filter(r=>r.bufferViolation),collisions=guarded.filter(r=>r.collision);
const physicalEvidence=[]; // No physical tests were performed for this artifact.
const reasons=[];
if(!physicalEvidence.some(e=>e.layer==='E1')||!physicalEvidence.some(e=>e.layer==='E2'))reasons.push('No complete ground and field evidence has been collected.');
if(failures.length)reasons.push(`Guarded controller: ${failures.length}/${guarded.length} extended-model requirement violations, including ${collisions.length} collisions.`);
const gate={requirement:'R-STOP-5',metric:'minimum longitudinal bumper clearance (m)',criterion:'>= 5',catalogScope:'four synthetic stopped-truck encounter families',candidateCount:candidates.length,baselineCandidateCount:candidates.filter(c=>c.scenarioId.endsWith('/baseline')).length,physicalTestsConducted:physicalEvidence.length,releaseVerdict:reasons.length?'BLOCKED':'REVIEW_REQUIRED',reasons,candidates};
fs.writeFileSync('results/evidence-ledger.json',JSON.stringify(gate,null,2)+'\n');console.log({candidateCount:gate.candidateCount,baseline:gate.baselineCandidateCount,release:gate.releaseVerdict});
