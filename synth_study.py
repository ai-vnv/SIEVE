"""Exact expected coverage for the original synthetic discovery model.

All probabilities/costs are assumptions, not estimates from the 3D simulator.
No Monte Carlo and no inferred real-world cost advantage.
"""
import json
from pathlib import Path
import numpy as np

SIM = np.array([.004,.003,.002,.0015,.001,.0008,.0006,.0004,.0003,0,0,0])
GROUND = np.array([.02]*9+[.01,.008,0])
FIELD = np.array([.01]*9+[.006,.005,.004])
TARGET_GROUND = np.array([.06]*9+[.05,.04,0])
TARGET_FIELD = np.array([.03]*9+[.025,.02,.015])
COSTS = np.array([1,40,400])
SPLITS = {'field-heavy':[.1,0,.9], 'sim-heavy':[.8,0,.2], 'sim-only':[1,0,0], 'staged-unguided':[.5,.3,.2], 'staged-guided':[.5,.3,.2]}

def coverage(strategy,budget,boost=12,physical_gain=1,costs=COSTS):
    counts=np.floor(budget*np.array(SPLITS[strategy])/costs).astype(int)
    guided=strategy=='staged-guided'
    probs=np.array([np.minimum(SIM*(boost if guided else 1),.5), GROUND+(TARGET_GROUND-GROUND)*physical_gain if guided else GROUND, FIELD+(TARGET_FIELD-FIELD)*physical_gain if guided else FIELD])
    miss=np.exp((counts[:,None]*np.log1p(-probs)).sum(axis=0))
    return float((1-miss).sum())

def target_cost(strategy,**kwargs):
    lo,hi=0,2000000
    if coverage(strategy,hi,**kwargs)<10:return None
    while lo+1<hi:
        mid=(lo+hi)//2
        if coverage(strategy,mid,**kwargs)>=10:hi=mid
        else:lo=mid
    return hi

def main():
    budgets=[500,1000,2000,4000,8000,16000,32000,64000,128000]
    curves=[{'budget':b,**{s:coverage(s,b) for s in SPLITS}} for b in budgets]
    thresholds={s:target_cost(s) for s in SPLITS}
    sensitivity=[]
    for boost in [1,4,12]:
        for physical_gain in [0,.5,1]:
            cost=target_cost('staged-guided',boost=boost,physical_gain=physical_gain)
            sensitivity.append(dict(boost=boost,physical_gain=physical_gain,cost=cost,ratio=thresholds['field-heavy']/cost))
    out={'assumptions':{'costs':COSTS.tolist(),'p_sim':SIM.tolist(),'p_ground':GROUND.tolist(),'p_field':FIELD.tolist(),'p_ground_targeted':TARGET_GROUND.tolist(),'p_field_targeted':TARGET_FIELD.tolist(),'splits':SPLITS},'curves':curves,'thresholds':thresholds,'sensitivity':sensitivity}
    Path('results').mkdir(exist_ok=True)
    Path('results/discovery.json').write_text(json.dumps(out,indent=2)+'\n')
    print(json.dumps({'thresholds':thresholds,'sensitivity':sensitivity},indent=2))

if __name__=='__main__':main()
