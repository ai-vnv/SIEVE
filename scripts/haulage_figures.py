"""Publication figures and numbers for the haulage and calibration experiments."""
import os
os.environ.setdefault('MPLCONFIGDIR','/tmp/sieve-mpl')
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
from matplotlib import font_manager
for p in Path('/System/Library/Fonts/Supplemental').glob('Times New Roman*.ttf'):font_manager.fontManager.addfont(str(p))
import matplotlib.pyplot as plt
import numpy as np
plt.rcParams.update({'font.family':'Times New Roman','font.size':11,'axes.labelsize':12,'axes.spines.top':False,'axes.spines.right':False,'pdf.fonttype':42,'ps.fonttype':42,'savefig.bbox':'tight'})
h=json.loads(Path('results/haulage-summary.json').read_text());c=json.loads(Path('results/calibration.json').read_text());rows=[json.loads(x) for x in Path('results/haulage-shifts.jsonl').read_text().splitlines()]
policies=['fast','blanket','context','coordinated'];names=['Fast / blind','Blanket','Context aware','Coordinated'];colors=['#a65447','#627d98','#b29454','#397d80'];by={r['policy']:r for r in h['summary']}
fig,axes=plt.subplots(1,2,figsize=(7.1,3.2),gridspec_kw={'width_ratios':[1.1,1]})
for i,p in enumerate(policies):
 r=by[p];x=r['collisions']['mean'];y=r['throughputTph']['mean'];ci=r['throughputTph']['ci'];axes[0].errorbar(x,y,yerr=[[y-ci[0]],[ci[1]-y]],fmt=['s','^','D','o'][i],color=colors[i],ms=6,capsize=3)
 axes[0].annotate(names[i],(x,y),xytext=((-8,-24) if i==0 else (9,0)),textcoords='offset points',ha='right' if i==0 else 'left',va='center',fontsize=11,color=colors[i])
axes[0].set_xlim(-.5,9);axes[0].set_ylim(2500,4500);axes[0].set_xlabel('Collisions per eight-hour shift');axes[0].set_ylabel('Delivered throughput (t/h)');axes[0].grid(alpha=.15);axes[0].text(0,1.03,'(a) Productivity–safety tradeoff',transform=axes[0].transAxes,fontsize=12)
keys=[('moving','Moving','#397d80'),('queue','Queue','#b29454'),('service','Load / dump','#627d98'),('handover','Handover','#a8b8c3'),('obstacleWait','Hold','#bcb79e'),('recovery','Recovery','#a65447')]
left=np.zeros(4)
for j,(key,label,color) in enumerate(keys):
 v=[]
 for p in policies:
  a=[r['totals'] for r in rows if r['policy']==p];v.append(np.mean([(r['loading']+r['dumping'] if key=='service' else r[key])/(6*28800)*100 for r in a]))
 axes[1].barh(range(4),v,left=left,color=color,edgecolor='white',lw=.3,label=label,hatch=['','..','///','','xx','\\\\'][j]);left+=v
axes[1].set_yticks(range(4),names);axes[1].invert_yaxis();axes[1].set_xlim(0,100);axes[1].set_xlabel('Fleet time (%)');axes[1].legend(ncol=2,loc='upper center',bbox_to_anchor=(.4,-.2),fontsize=11,frameon=False,columnspacing=.9,handlelength=1.2);axes[1].text(0,1.03,'(b) Time accounting',transform=axes[1].transAxes,fontsize=12)
fig.tight_layout(w_pad=2);fig.savefig('figures/productivity.pdf');fig.savefig('figures/productivity.png',dpi=300);plt.close(fig)
fig,axes=plt.subplots(1,2,figsize=(7.1,2.8))
from importlib.machinery import SourceFileLoader
# Plot domain bounds as shaded scope; sample points are actual imported records.
for family,color in zip(['nominal','dust','wet','combined'],colors):
 a=[r for r in c['samples'] if r['family']==family];axes[0].scatter([r['visibility'] for r in a],[r['brake'] for r in a],s=22,color=color,edgecolor='white',lw=.35,label=family.capitalize(),zorder=3)
axes[0].add_patch(plt.Rectangle((28,1.6),87,1.8,fill=False,ec='#444',ls='--',lw=1.0))
axes[0].set_xlim(20,120);axes[0].set_ylim(1.45,3.55);axes[0].set_xlabel('Detection range (m)');axes[0].set_ylabel('Braking parameter (m/s²)');axes[0].legend(fontsize=11,frameon=False,ncol=2,loc='lower center',bbox_to_anchor=(.5,1.02),columnspacing=1);axes[0].grid(alpha=.14)
x=np.arange(4);a=np.array([r['fittedFailures']/10 for r in c['validation']]);b=np.array([r['selectedFailures']/10 for r in c['validation']]);axes[1].bar(x-.16,a,.32,color='#a65447',label='Sample-fit speed');axes[1].bar(x+.16,b,.32,color='#397d80',label='Stress-selected speed',hatch='///');axes[1].set_xticks(x,['Nom.','Dust','Wet','Both']);axes[1].set_ylim(0,55);axes[1].set_ylabel('Validation violations (%)');axes[1].legend(fontsize=11,frameon=False,loc='lower center',bbox_to_anchor=(.5,1.02));axes[1].grid(axis='y',alpha=.14)
fig.tight_layout();fig.savefig('figures/calibration.pdf');fig.savefig('figures/calibration.png',dpi=300);plt.close(fig)
macros={'CalibrationSamples':str(len(c['samples'])),'ValidationRuns':f"{sum(r['n'] for r in h['validation']):,}",'CoordinatedTph':f"{by['coordinated']['throughputTph']['mean']:,.0f}",'BlanketTph':f"{by['blanket']['throughputTph']['mean']:,.0f}",'FastTph':f"{by['fast']['throughputTph']['mean']:,.0f}",'ContextTph':f"{by['context']['throughputTph']['mean']:,.0f}",'GainBlanket':f"{100*(by['coordinated']['throughputTph']['mean']/by['blanket']['throughputTph']['mean']-1):.1f}",'GainContext':f"{100*(by['coordinated']['throughputTph']['mean']/by['context']['throughputTph']['mean']-1):.1f}",'FastCollisions':f"{by['fast']['collisions']['mean']:.2f}",'CoordinatedCycle':f"{by['coordinated']['meanCycleMin']['mean']:.2f}"}
Path('results/haulage-numbers.tex').write_text(''.join('\\newcommand{\\'+k+'}{'+v+'}\n' for k,v in macros.items()))
lines=[]
for name,p in zip(['Fast','Blanket','Context','Coordinated'],policies):
 r=by[p];lines.append(f"{name} & {r['throughputTph']['mean']:,.0f} & {r['meanCycleMin']['mean']:.2f} & {r['averageMovingKph']['mean']:.2f} & {r['collisions']['mean']:.2f} "+r'\\')
Path('results/haulage-table.tex').write_text('\n'.join(lines)+'\n')
print(macros)
