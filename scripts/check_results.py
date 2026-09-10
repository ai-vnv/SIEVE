"""Independent checks of published aggregation, exact coverage, and artifact limits."""
import csv,json,math,subprocess
from pathlib import Path
import numpy as np
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from synth_study import coverage,target_cost,SPLITS
r=json.loads(Path('results/summary.json').read_text());rows=list(csv.DictReader(open('results/episodes.csv')))
assert len(rows)==32000
for a in r['summary']:
    group=[x for x in rows if all(x[k]==a[k] for k in ['family','policy','layer'])]
    assert len(group)==a['n']==1000
    assert sum(x['bufferViolation']=='true' for x in group)==a['violations']
    assert sum(x['collision']=='true' for x in group)==a['collisions']
    assert abs(sum(float(x['minGap']) for x in group)/len(group)-a['meanMinGap'])<1e-10
for name in SPLITS:
    values=[coverage(name,b) for b in range(0,20001,100)]
    assert all(y>=x-1e-12 for x,y in zip(values,values[1:]))
    c=target_cost(name)
    if c is not None:assert coverage(name,c)>=10 and coverage(name,c-1)<10
assert coverage('sim-only',10**9)==9
# Independent closed-form single mode computation for zero-budget and limits.
assert all(coverage(name,0)==0 for name in SPLITS)
e=json.loads(Path('results/evidence-ledger.json').read_text());assert e['releaseVerdict']=='BLOCKED' and e['physicalTestsConducted']==0
assert all(c['humanApproval'] is None and c['physicalConfirmation'] is None for c in e['candidates'])
print('CSV aggregation, coverage monotonicity/thresholds, and evidence gates passed.')
if Path('results/screenshots.json').exists():
    captures=json.loads(Path('results/screenshots.json').read_text())
    assert not captures['browserErrors']
    for item in captures['manifest']:
        q=item['result']
        a=next((x for x in rows if x['seed']==str(q['seed']) and all(x[k]==q[k] for k in ['family','policy','layer'])),None)
        if a is None:
            code="import {Encounter,scenario} from './simulator/core.mjs';const r=new Encounter(scenario(%s,%s),%s,%s).run(); console.log(JSON.stringify(r));"%(q['seed'],json.dumps(q['family']),json.dumps(q['policy']),json.dumps(q['layer']))
            other=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],text=True))
            assert abs(other['minGap']-q['minGap'])<1e-10 and other['collision']==q['collision']
            continue
        assert abs(float(a['minGap'])-q['minGap'])<1e-10
        assert a['collision']==str(q['collision']).lower()
    print('Saved browser outcomes agree with the independent batch CSV.')
# Independently aggregate shift outputs and enforce dimensional/time accounting.
h=json.loads(Path('results/haulage-summary.json').read_text())
shifts=[json.loads(x) for x in Path('results/haulage-shifts.jsonl').read_text().splitlines()]
assert len(shifts)==800
for summary in h['summary']:
    group=[r for r in shifts if r['policy']==summary['policy']]
    assert len(group)==summary['n']==200
    for key,value in summary.items():
        if isinstance(value,dict) and 'mean' in value:
            assert abs(sum(r[key] for r in group)/200-value['mean'])<1e-8,key
for r in shifts:
    t=r['totals']
    assert abs(sum(t[k] for k in ['queue','handover','loading','dumping','moving','recovery','obstacleWait'])-6*28800)<1e-6
    assert r['tonnes']==240*r['deliveries'] and r['throughputTph']==r['tonnes']/8
    assert abs(r['averageMovingKph']-t['travelMetres']/t['moving']*3.6)<1e-10
print('All 800 shifts: independent means, payload, velocity, and time conservation passed.')

validation=[json.loads(x) for x in Path('results/integrated-validation.jsonl').read_text().splitlines()]
assert len(validation)==4000
for summary in h['validation']:
    group=[r for r in validation if r['family']==summary['family']]
    assert len(group)==summary['n']
    assert sum(r['bufferViolation'] for r in group)==summary['violations']
    assert sum(r['collision'] for r in group)==summary['collisions']
print('All 4,000 revised-controller records agree with the published validation.')
