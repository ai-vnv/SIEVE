"""Reject stale evidence when a recorded dependency changes."""
import hashlib,json
from pathlib import Path
record=json.loads(Path('results/assurance-case.json').read_text())
for name,expected in {**record['dependencies'],**record['artifacts']}.items():
    actual=hashlib.sha256(Path(name).read_bytes()).hexdigest()
    assert actual==expected,f'Stale evidence: {name}; rerun experiments and review.'
assert record['release']['verdict']=='BLOCKED'
assert record['release']['approver'] is None
assert sum(r['failures'] for r in record['requirements'] if 'failures' in r)==0
print('Evidence dependency hashes and release boundary verified.')
