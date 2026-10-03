import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "pg";

export const LOCK_KEY = [705032026, 2];
export function migrationBody(source) {
  // Only reviewed single-transaction SQL is allowed. Runner owns the transaction.
  const match = source.match(/^([\s\S]*?)\bbegin\s*;([\s\S]*?)\bcommit\s*;\s*$/i);
  if (!match || /\b(begin|commit|rollback)\s*;/i.test(match[2]) || /\b(concurrently|vacuum)\b/i.test(match[2])) {
    throw new Error("Migration must have one outer BEGIN/COMMIT and no nontransactional statements.");
  }
  return match[1]+match[2];
}
export async function loadMigrations(directory) {
  const names=(await readdir(directory)).filter(name=>/^\d{12,}_[-_a-z0-9]+\.sql$/.test(name)).sort();
  if(!names.length) throw new Error("No operational migrations.");
  const versions=new Set();
  return Promise.all(names.map(async filename=>{
    const version=filename.split("_")[0];
    if(versions.has(version)) throw new Error("Duplicate migration version.");
    versions.add(version);
    const source=await readFile(path.join(directory,filename),"utf8");
    return {filename,checksum:createHash("sha256").update(source).digest("hex"),body:migrationBody(source)};
  }));
}
export async function migrationPlan(client,migrations) {
  const metadata=await client.query("select to_regclass('zqx.migration_ledger')::text ledger, to_regnamespace('zqx')::text schema");
  if(metadata.rows[0].schema && !metadata.rows[0].ledger) throw new Error("Untracked zqx schema: manual review required; no automatic baseline.");
  const applied=metadata.rows[0].ledger?(await client.query("select filename,checksum,applied_at from zqx.migration_ledger order by filename")).rows:[];
  for(const entry of applied) {
    const current=migrations.find(m=>m.filename===entry.filename);
    if(!current || current.checksum!==entry.checksum) throw new Error("Applied migration checksum mismatch or missing source.");
  }
  const plan=migrations.map(m=>({filename:m.filename,checksum:m.checksum,status:applied.some(a=>a.filename===m.filename)?"APPLIED":"PENDING",appliedAt:applied.find(a=>a.filename===m.filename)?.applied_at || null}));
  let pendingSeen=false;
  for(const entry of plan) {
    if(entry.status==="PENDING") pendingSeen=true;
    else if(pendingSeen) throw new Error("Out-of-order applied migration.");
  }
  return plan;
}
export async function migrate(client,migrations,mode="status") {
  if(!["status","dry-run","apply"].includes(mode)) throw new Error("Unknown mode.");
  let locked=false;
  try {
    if(mode==="apply") {
      locked=(await client.query("select pg_try_advisory_lock($1,$2) locked",LOCK_KEY)).rows[0].locked;
      if(!locked) throw new Error("Another migration process holds the advisory lock.");
    }
    const plan=await migrationPlan(client,migrations);
    if(mode!=="apply") return plan; // No schema/table/role writes during inspection.
    for(const entry of plan.filter(e=>e.status==="PENDING")) {
      const migration=migrations.find(m=>m.filename===entry.filename);
      await client.query("begin");
      try {
        await client.query(migration.body);
        await client.query(`create table if not exists zqx.migration_ledger(
          filename text primary key, checksum text not null check(length(checksum)=64),
          applied_at timestamptz not null default now())`);
        await client.query("alter table zqx.migration_ledger enable row level security");
        await client.query("revoke all on zqx.migration_ledger from public");
        await client.query("revoke all on zqx.migration_ledger from zqx_app");
        await client.query("insert into zqx.migration_ledger(filename,checksum) values($1,$2)",[migration.filename,migration.checksum]);
        await client.query("commit");
      } catch(error) {
        await client.query("rollback"); throw error;
      }
    }
    return await migrationPlan(client,migrations);
  } finally {
    if(locked) await client.query("select pg_advisory_unlock($1,$2)",LOCK_KEY);
  }
}
async function main() {
  const mode=process.argv[2] || "status";
  const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../supabase/migrations");
  const url=process.env.ZQX_MIGRATION_DATABASE_URL;
  if(!url) throw new Error("Migration connection must be supplied privately through the environment.");
  const parsed=new URL(url);
  const local=process.env.ZQX_MIGRATION_TARGET==="local-fixture" && ["database","zqx-phase2c-migration-db"].includes(parsed.hostname) && parsed.pathname==="/zqx_local";
  if(["sslmode","sslcert","sslkey","sslrootcert"].some(key=>parsed.searchParams.has(key))) throw new Error("SSL URL options are forbidden; use verified TLS configuration.");
  if(!local && mode==="apply" && process.env.ZQX_REMOTE_MIGRATION_APPROVAL!=="APPLY ZQX V2 REMOTE MIGRATIONS") throw new Error("Explicit remote approval gate is absent.");
  const client=new Client({connectionString:url,ssl:local?false:{rejectUnauthorized:true},connectionTimeoutMillis:5000});
  await client.connect();
  try { console.log(JSON.stringify(await migrate(client,await loadMigrations(directory),mode),null,2)); }
  finally {await client.end();}
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 main().catch(()=>{console.error("Migration stopped. Review configuration, ledger/checksums and database privileges; no automatic rollback.");process.exitCode=1;});
}
