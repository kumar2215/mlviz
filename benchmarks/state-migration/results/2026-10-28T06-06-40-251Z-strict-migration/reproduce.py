"""Reconstruct the measured candidate and harness in ignored caches; never changes checkout."""
from pathlib import Path
import subprocess,json,base64,hashlib,shutil
artifact=Path(__file__).resolve().parent
repo=Path(subprocess.check_output(['git','rev-parse','--show-toplevel'],text=True).strip())
metadata=json.loads((artifact/'candidate-snapshot.json').read_text())
changes=json.loads((artifact/'candidate-changes.json').read_text())
report=json.loads((artifact/'raw.json').read_text())
cache=repo/'benchmarks/state-migration/.cache'
experiment=cache/'strict-migration'
snapshot=cache/('strict-'+metadata['sourceSha256'])
def normalized(data):
 try: data.decode('utf-8')
 except UnicodeDecodeError: return data
 return data if b'\0' in data else data.replace(b'\r\n',b'\n')
for name,expected in metadata['files'].items():
 assert name.startswith('frontend/') and '..' not in Path(name).parts
 data=base64.b64decode(changes[name]) if name in changes else normalized(subprocess.check_output(['git','show',metadata['baselineCommit']+':'+name],cwd=repo))
 assert hashlib.sha256(data).hexdigest()==expected,name
 target=snapshot/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
manifest={name:metadata['files'][name] for name in sorted(metadata['files'])}
assert hashlib.sha256(json.dumps(manifest,separators=(',',':')).encode()).hexdigest()==metadata['sourceSha256']
experiment.mkdir(parents=True,exist_ok=True)
metadata['snapshot']=str(snapshot)
(experiment/'candidate-snapshot.json').write_text(json.dumps(metadata,indent=2)+'\n')
for name in ['candidate-changes.json','candidate-tracked.patch','original-state.json']:
 shutil.copyfile(artifact/name,experiment/name)
harness=experiment/'harness';harness.mkdir(exist_ok=True)
archived=artifact/'harness'/report['harnessSha256']
for file in archived.iterdir():
 if file.is_file():shutil.copyfile(file,harness/file.name)
for file in (artifact/'analysis').iterdir():
 if file.is_file():shutil.copyfile(file,harness/file.name)
print('Candidate source verified:',metadata['sourceSha256'])
print('Current checkout was not changed. Install benchmark tools if needed:')
print('npm ci --prefix benchmarks/state-migration')
print('Run: npm run suite --prefix benchmarks/state-migration/.cache/strict-migration/harness -- --comparison strict --baseline '+metadata['baselineCommit']+' --candidate WORKTREE')
