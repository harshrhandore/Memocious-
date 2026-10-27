// Return counts only. Storage paths never enter scheduler logs.
export async function cleanupBuilderFiles(db){
 const {data,error}=await db.rpc("memocious_builder_file_cleanup");if(error||!Array.isArray(data))throw new Error("Builder file queue unavailable");
 let processed=0,failed=0;const started=Date.now();
 for(const file of data.slice(0,25)){if(Date.now()-started>20000)break;if(!/^[a-f0-9-]{36}$/.test(file.id)||file.path!==`builder/${file.id}.webp`||file.quarantine!==`builder/${file.id}`)throw new Error("Invalid builder cleanup record");try{
 const q=await db.storage.from("memocious-quarantine").remove([file.quarantine]);if(q.error)throw new Error();
 if(!file.quarantineOnly){const safe=await db.storage.from("memocious-sanitized").remove([file.path]);if(safe.error)throw new Error();}
 const done=await db.rpc("memocious_builder_file_cleanup",{file_id:file.id,finished:true,quarantine_only:file.quarantineOnly});if(done.error)throw new Error();processed++;}catch{failed++;}}
 return {operation:"builder-file-cleanup",processed,failed,remaining:data.length-processed-failed};
}
