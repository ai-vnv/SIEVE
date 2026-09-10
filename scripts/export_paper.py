"""Export versioned numerical/figure inputs into a separate manuscript checkout."""
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('paper_directory');args=p.parse_args()
root=Path(__file__).resolve().parents[1];dest=Path(args.paper_directory).resolve()
assert (dest/'main.tex').is_file(),'Destination must be an existing SIEVE-paper checkout.'
subprocess.run(['python3','scripts/check_assurance.py'],cwd=root,check=True)
assets=['results/'+x for x in ['numbers.tex','haulage-numbers.tex','safety-table.tex','haulage-table.tex']]+['figures/'+x for x in ['framework.tex','mine-nominal.jpg','mine-extreme-dust.jpg','mine-field-crew.jpg','mine-loading.jpg','mine-passing.jpg','mine-unloading.jpg','calibration.pdf','productivity.pdf']]
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
dirty=bool(subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip())
hashes={}
for name in assets:
 target=dest/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/name,target);hashes[name]=hashlib.sha256(target.read_bytes()).hexdigest()
record={'repository':'https://github.com/mansurarief/SIEVE','commit':commit,'workingTreeDirty':dirty,'modelVersion':'sieve-1.1.0','evidenceOrigin':'synthetic','assets':hashes,'assuranceSHA256':hashlib.sha256((root/'results/assurance-case.json').read_bytes()).hexdigest()}
(dest/'code-provenance.json').write_text(json.dumps(record,indent=2)+'\n')
print(f'Exported {len(assets)} inputs from {commit}; workingTreeDirty={dirty}')
