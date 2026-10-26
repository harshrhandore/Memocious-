// Bounded idempotent reconciliation. Never log private paths or file contents.
export async function cleanupPhase2(db) {
 const {data,error}=await db.rpc("memocious_phase2_cleanup");
 if(error||!Array.isArray(data))throw new Error("Phase 2 cleanup unavailable");
 let processed=0,failed=0;const started=Date.now();
 for(const a of data.slice(0,25)){
  if(Date.now()-started>20000)break;
  if(!/^[a-f0-9-]{36}$/.test(a.id)||a.path!==`phase2/${a.id}.webp`||(a.copy&&!/^phase2-public\/[a-f0-9-]{36}\.webp$/.test(a.copy)))throw new Error("Invalid cleanup record");
  try{const q=await db.storage.from("memocious-quarantine").remove([`phase2/${a.id}`]);if(q.error)throw new Error();const safe=await db.storage.from("memocious-sanitized").remove([a.path,...(a.copy?[a.copy]:[])]);if(safe.error)throw new Error();const done=await db.rpc("memocious_phase2_cleanup",{asset:a.id,finished:true});if(done.error)throw new Error();processed++;}catch{failed++;}
 }
 return {operation:"phase2-cleanup",processed,failed,remaining:data.length-processed-failed};
}
