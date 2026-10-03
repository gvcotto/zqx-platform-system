import {Client,Pool} from "pg";
import assert from "node:assert/strict";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {writeFile} from "node:fs/promises";
import {loadMigrations,migrate,LOCK_KEY} from "./migrate.mjs";
const migrations=await loadMigrations(path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../supabase/migrations"));
const client=new Client({connectionString:process.env.ZQX_MIGRATION_DATABASE_URL});
await client.connect();
const tests=[];
const pass=name=>tests.push({name,result:"PASS"});
try {
 assert((await migrate(client,migrations,"dry-run")).every(m=>m.status==="PENDING"));pass("dry-run has ordered pending checksums");
 assert.equal((await client.query("select to_regnamespace('zqx')::text name")).rows[0].name,null);pass("dry-run makes no schema writes");
 await client.query("select pg_advisory_lock($1,$2)",LOCK_KEY);
 const contender=new Client({connectionString:process.env.ZQX_MIGRATION_DATABASE_URL});
 await contender.connect();
 try {await assert.rejects(()=>migrate(contender,migrations,"apply"),/advisory lock/);pass("concurrent runner rejected");}
 finally {await contender.end();await client.query("select pg_advisory_unlock($1,$2)",LOCK_KEY);}
 const plan=await migrate(client,migrations,"apply");
 assert(plan.every(m=>m.status==="APPLIED" && m.appliedAt));pass("four migrations applied and ledger timestamped");
 assert.equal((await migrate(client,migrations,"apply")).length,4);pass("repeat apply is idempotent");
 await assert.rejects(()=>migrate(client,migrations.map((m,i)=>i?m:{...m,checksum:"0".repeat(64)}),"status"),/checksum mismatch/);pass("checksum drift rejected");
 const fake={filename:"202610020005_failure.sql",checksum:"f".repeat(64),body:"create table zqx.should_rollback(id integer); select missing_test_function();"};
 await assert.rejects(()=>migrate(client,[...migrations,fake],"apply"));pass("failed migration stops");
 assert.equal((await client.query("select to_regclass('zqx.should_rollback')::text name")).rows[0].name,null);
 assert.equal((await client.query("select count(*)::integer n from zqx.migration_ledger")).rows[0].n,4);pass("failed schema and ledger writes rolled back atomically");
 const flags=(await client.query("select rolsuper,rolbypassrls,rolcreatedb,rolcreaterole from pg_roles where rolname='zqx_app'")).rows[0];
 assert(Object.values(flags).every(v=>v===false));pass("restricted runtime role flags");
 const pool=new Pool({connectionString:process.env.ZQX_TEST_RUNTIME_DATABASE_URL,max:1});
 try {
  const a=await pool.connect();
  await a.query("begin");
  await a.query("select set_config('zqx.auth_subject',$1,true),set_config('zqx.request_id',$2,true)",["20000000-0000-0000-0000-000000000002","request-A"]);
  const pidA=(await a.query("select pg_backend_pid() pid")).rows[0].pid;
  await a.query("commit");a.release();
  const b=await pool.connect();
  assert.equal((await b.query("select pg_backend_pid() pid")).rows[0].pid,pidA);
  const cleared=(await b.query("select current_setting('zqx.auth_subject',true) subject,current_setting('zqx.request_id',true) request")).rows[0];
  assert(!cleared.subject && !cleared.request);pass("same pooled connection clears A identity after commit");
  await b.query("begin");await b.query("select set_config('zqx.auth_subject',$1,true)",["20000000-0000-0000-0000-000000000003"]);
  assert.equal((await b.query("select current_setting('zqx.auth_subject') subject")).rows[0].subject,"20000000-0000-0000-0000-000000000003");
  await b.query("rollback");b.release();pass("B identity is distinct and rollback clears it");
  await assert.rejects(()=>pool.query("select * from zqx.migration_ledger"));pass("runtime cannot access migration ledger");
 } finally {await pool.end();}
 const report={status:"PASS",scope:"isolated local fixture; no remote connection",tests,plan,domainTables:13,metadataTables:1};
 if(process.env.ZQX_TEST_REPORT_PATH) await writeFile(process.env.ZQX_TEST_REPORT_PATH,JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify(report,null,2));
} finally {await client.end();}
