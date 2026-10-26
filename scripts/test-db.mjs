import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir, writeFile } from "node:fs/promises";
const db = new PGlite();
await db.exec(
  `create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text);alter table storage.objects enable row level security;create schema auth;create table auth.users(id uuid primary key,email text, email_confirmed_at timestamptz, is_anonymous boolean default false);grant usage on schema public,auth to service_role;grant select on auth.users to service_role;`,
);
for (const name of (await readdir("supabase/migrations")).sort()) {
  await db.exec(await readFile("supabase/migrations/" + name, "utf8"));
  console.log("Applied", name);
}
let result;
try {
  await db.exec(await readFile("tests/admin-database.sql", "utf8"));
  console.log(JSON.stringify((await db.exec(await readFile("tests/wishlist-database.sql", "utf8"))).at(-1).rows));
  console.log(JSON.stringify((await db.exec(await readFile("tests/phase2-database.sql", "utf8"))).at(-1).rows));
  result = await db.exec(await readFile("tests/database.sql", "utf8"));
} catch (e) {
  console.error(
    JSON.stringify({ message: e.message, code: e.code, where: e.where }),
  );
  await db.close();
  process.exit(1);
}
console.log(JSON.stringify(result.at(-1).rows));
await writeFile(
  "evidence/local-postgres.json",
  JSON.stringify(
    {
      runtime:
        "PGlite embedded PostgreSQL; auth.users fixture is a minimal stub, not Supabase Auth",
      adminSuite:
        "PASS: service-role editor/media/publication, quota, option/MOQ/message bounds, stale bulk confirmation, snapshot retention, taxonomy, gate, role and recent-MFA assertions",
      date: new Date().toISOString(),
      result: result.at(-1).rows,
    },
    null,
    2,
  ),
);
await db.exec(
  `insert into public.memocious_catalogue_products(id,slug,data,search_vector,price_paise,featured,created_at) select gen_random_uuid(),'scale-'||n,jsonb_build_object('slug','scale-'||n,'name','Scale gift '||n,'categories',jsonb_build_array('gift-hampers'),'occasions',jsonb_build_array('birthday'),'customizable',true,'inStock',true,'colour','rose','lead','made-to-order'),to_tsvector('english',case when n%10=0 then 'hamper' else 'keepsake' end),n*100,n%20=0,now()-make_interval(days=>n%60) from generate_series(1,10000) n; analyze public.memocious_catalogue_products;`,
);
const scaled = await db.query(
  `select public.memocious_catalogue('{"q":"hamper","min":500,"max":1500,"limit":24}'::jsonb) result`,
);
const payload = scaled.rows[0].result;
if (payload.products.length > 24 || payload.total < 1)
  throw new Error("Scale pagination failed");
const plan = await db.query(
  `explain (analyze,format json) select id from public.memocious_catalogue_products where search_vector@@websearch_to_tsquery('english','hamper') and price_paise between 50000 and 150000 order by price_paise,id limit 24`,
);
await writeFile(
  "evidence/scale-postgres.json",
  JSON.stringify(
    {
      runtime:
        "Embedded PostgreSQL, 10,000 synthetic local publication rows; not Supabase latency/load evidence",
      date: new Date().toISOString(),
      matching: payload.total,
      returned: payload.products.length,
      plan: plan.rows,
    },
    null,
    2,
  ),
);
console.log("Local 10k fixture: bounded page and query plan recorded");

await db.close();
