from pathlib import Path
import subprocess, hashlib, json, base64, tarfile
repo=Path.cwd(); experiment=repo/'benchmarks/state-migration/.cache/strict-migration'
cache=experiment.parent
baseline='3bee6f351a810b6d6ff847a3c29e2378a5925ca6'
candidate_base='5da4d3f1adcc42761a35531e819fdb3f1c090275'
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==candidate_base
baseline_root=cache/baseline
if not (baseline_root/'frontend/package.json').exists():
 baseline_root.mkdir(parents=True,exist_ok=True)
 archive=experiment/'baseline.tar'
 subprocess.run(['git','archive','--format=tar','-o',str(archive),baseline,'frontend'],check=True)
 subprocess.run(['tar','-xf',str(archive),'-C',str(baseline_root)],check=True)
def normalize_bytes(data):
 try: data.decode('utf-8')
 except UnicodeDecodeError: return data
 return data if b'\0' in data else data.replace(b'\r\n',b'\n')
def normalized(p): return normalize_bytes(p.read_bytes())
names=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','--','frontend'],text=True).splitlines()
sources={name:normalized(repo/name) for name in sorted(set(names)) if (repo/name).is_file()}
manifest={name:hashlib.sha256(data).hexdigest() for name,data in sources.items()}
digest=hashlib.sha256(json.dumps(manifest,sort_keys=True,separators=(',',':')).encode()).hexdigest()
snapshot=cache/('strict-'+digest)
snapshot.mkdir(exist_ok=True)
for name,data in sources.items():
 p=snapshot/name; p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
old_names=subprocess.check_output(['git','ls-tree','-r','--name-only',baseline,'--','frontend'],text=True).splitlines()
old={}
for name in old_names:
 data=subprocess.check_output(['git','show',baseline+':'+name])
 data=normalize_bytes(data)
 old[name]=data
changes={name:(None if name not in sources else base64.b64encode(sources[name]).decode()) for name in sorted(set(old)|set(sources)) if old.get(name)!=sources.get(name)}
protected=['frontend/package.json','frontend/package-lock.json','frontend/vite.config.ts','frontend/src/components/visualisation/BaseVisualisation.tsx','frontend/src/pages/traditional_ml/decision_tree/BaseVisualisation.tsx','frontend/src/store/useConfig.ts','frontend/src/store/useDataset.ts','frontend/src/store/useStory.ts','frontend/src/store/useVisualisation.ts']
protected.extend(name for name in old if name.startswith('frontend/public/') or 'Renderer.' in name or 'rendererUtils.' in name)
for name in protected: assert sources[name]==old[name], 'Unrelated change: '+name
assert not any(name.startswith('frontend/public/') for name in changes)
assert not any(b'useDecisionTree()' in data or b'useKNN()' in data or b'useKMeans()' in data or b'useLinearRegression()' in data or b'useSVM()' in data for name,data in sources.items() if name.endswith(('.ts','.tsx')))
metadata={'source':'uncommitted-working-tree','baseCommit':candidate_base,'baselineCommit':baseline,'sourceSha256':digest,'snapshot':str(snapshot),'files':manifest,'changedFilesFromBaseline':list(changes),'protectedFilesIdentical':protected,'normalization':'CRLF to LF for UTF-8 source text without NUL bytes; binaries unchanged','changesEncoding':'base64 file bytes; null means delete'}
(experiment/'candidate-snapshot.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
(experiment/'candidate-changes.json').write_text(json.dumps(changes,indent=2)+'\n',encoding='utf-8')
(experiment/'candidate-tracked.patch').write_bytes(subprocess.check_output(['git','diff','--binary',baseline,'--','frontend']))
print(json.dumps({'snapshot':str(snapshot),'sourceSha256':digest,'sourceFiles':len(sources),'changedFiles':len(changes),'protectedFiles':len(protected)}))
