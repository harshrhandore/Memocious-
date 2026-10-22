#!/usr/bin/env python3
"""Bounded secret-pattern scan of unignored working files and all available Git blobs.
Does not print matched secret values. This is not a credential-validity check.
"""
import re,subprocess,json,pathlib,sys
patterns={
 'supabase-secret':rb'sb_secret_[A-Za-z0-9_-]{16,}',
 'stripe-live':rb'sk_live_[A-Za-z0-9]{16,}',
 'private-key':rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
 'github-token':rb'(?:ghp_|github_pat_)[A-Za-z0-9_]{30,}',
 'assigned-server-secret':rb'(?:SUPABASE_SECRET_KEY|TURNSTILE_SECRET_KEY|UPSTASH_REDIS_REST_TOKEN|SESSION_ENCRYPTION_KEY)[^\S\r\n]*=[^\S\r\n]*[A-Za-z0-9_./+=-]{20,}',
}
findings=[]
def scan(data,path):
 if b'\x00' in data[:8000]:return
 for name,pattern in patterns.items():
  if re.search(pattern,data):findings.append({'path':path,'kind':name})
files=subprocess.check_output(['git','ls-files','-z','-c','-o','--exclude-standard']).split(b'\0')
for file in set(files):
 if not file:continue
 p=pathlib.Path(file.decode());
 if p.is_file():scan(p.read_bytes(),str(p))
objects=subprocess.run(['git','rev-list','--objects','--all'],capture_output=True,text=True,check=True).stdout.splitlines()
blobs=0
for line in objects:
 oid,*path=line.split(' ',1)
 if subprocess.check_output(['git','cat-file','-t',oid]).strip()!=b'blob':continue
 blobs+=1;scan(subprocess.check_output(['git','cat-file','blob',oid]),'git:'+oid[:12]+':'+(path[0] if path else ''))
shallow=subprocess.check_output(['git','rev-parse','--is-shallow-repository']).decode().strip()=='true'
report={'status':'FAIL' if findings else 'PASS','workingFiles':len(set(files))-1,'historyBlobs':blobs,'shallow':shallow,'patterns':list(patterns),'findings':findings,'limitation':'Pattern-based equivalent scan; cannot identify all possible secrets or validate credential revocation.'}
pathlib.Path('evidence/secret-scan.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report));sys.exit(bool(findings))
