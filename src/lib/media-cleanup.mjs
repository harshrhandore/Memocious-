// Shared bounded reconciliation. Paths are derived only from trusted job UUIDs.
export async function cleanupMedia(db) {
  const started = Date.now();
  const { data: jobs, error } = await db.rpc("memocious_media_cleanup", {
    job_id: null,
    quarantine_only: false,
  });
  if (error || !Array.isArray(jobs))
    throw new Error("Cleanup queue unavailable");
  let processed = 0,
    failed = 0;
  for (const job of jobs.slice(0, 25)) {
    if (Date.now() - started > 20000) break;
    if (!/^[a-f0-9-]{36}$/.test(job.id))
      throw new Error("Invalid cleanup record");
    try {
      const original = await db.storage
        .from("memocious-quarantine")
        .remove([job.id]);
      if (original.error) throw new Error();
      if (!job.quarantineOnly) {
        const safe = await db.storage
          .from("memocious-sanitized")
          .remove([job.id + ".webp"]);
        if (safe.error) throw new Error();
      }
      const result = await db.rpc("memocious_media_cleanup", {
        job_id: job.id,
        quarantine_only: job.quarantineOnly,
      });
      if (result.error) throw new Error();
      processed++;
    } catch {
      failed++;
    }
  }
  return {
    operation: "media-cleanup",
    processed,
    failed,
    remaining: jobs.length - processed - failed,
  };
}
