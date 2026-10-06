import assert from 'node:assert/strict';
import {Client} from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
import {loadMigrations,migrate,migrationBody} from './migrate.mjs';
import {fileURLToPath} from 'node:url';
const connectionString=process.env.ZQX_MIGRATION_DATABASE_URL;
const local=process.env.ZQX_MIGRATION_TARGET==='local-fixture';
if(!local || !['database','zqx-phase2c-migration-db'].includes(new URL(connectionString).hostname)) throw new Error('Isolated local fixture required');
const config={connectionString};
const db=new Client(config); await db.connect();
const tests=[]; const pass=name=>tests.push({name,result:'PASS'});
const org='30000000-0000-0000-0000-000000000001', customer='40000000-0000-0000-0000-000000000001';
try {
 const migrations=await loadMigrations(fileURLToPath(new URL('../supabase/migrations',import.meta.url)));
 await migrate(db,migrations.filter(m=>m.filename<'202610020004'),'apply');
 await db.query(await readFile(new URL('../supabase/local/seed.sql',import.meta.url),'utf8'));
 const before=(await db.query('select id,status,total,customer_id from zqx.invoices order by id')).rows;
 const source=await readFile(new URL('../supabase/migrations/202610020004_invoice_numbers.sql',import.meta.url),'utf8');
 await db.query('begin'); await db.query(migrationBody(source)); await db.query('commit');
 assert.deepEqual((await db.query('select id,status,total,customer_id from zqx.invoices order by id')).rows,before);pass('backfill preserves UUID, status, total and customer');
 assert.equal((await db.query('select invoice_number from zqx.invoices')).rows[0].invoice_number,'INV-2026-000001');pass('existing invoice deterministic backfill');
 const insert=async(client,organizationId=org,customerId=customer)=> (await client.query(`insert into zqx.invoices(organization_id,customer_id,subtotal,total,status,due_at,invoice_sequence,invoice_number) values($1,$2,100,100,'draft','2026-10-20',999,'CLIENT-FORGED') returning invoice_sequence,invoice_number`,[organizationId,customerId])).rows[0];
 const issued=await insert(db); assert.equal(Number(issued.invoice_sequence),2);assert.notEqual(issued.invoice_number,'CLIENT-FORGED');pass('server overwrites client supplied identifiers');
 await assert.rejects(()=>db.query("update zqx.invoices set invoice_number='CLIENT-FORGED'"),e=>e.code==='23514');pass('number immutable');
 await assert.rejects(()=>db.query('update zqx.invoices set invoice_sequence=99'),e=>e.code==='23514');pass('sequence immutable');
 const clients=await Promise.all(Array.from({length:8},async()=>{const c=new Client(config);await c.connect();return c;}));
 try {const results=await Promise.all(clients.map(c=>insert(c)));assert.equal(new Set(results.map(r=>r.invoice_number)).size,8);assert.deepEqual(results.map(r=>Number(r.invoice_sequence)).sort((a,b)=>a-b),[3,4,5,6,7,8,9,10]);pass('eight concurrent inserts serialize unique per-org sequence');}
 finally {await Promise.all(clients.map(c=>c.end()));}
 const other='30000000-0000-0000-0000-000000000002',otherCustomer='40000000-0000-0000-0000-000000000003';
 assert.equal(Number((await insert(db,other,otherCustomer)).invoice_sequence),1);pass('sequences isolated per organization');
 await db.query('begin');await db.query('set local role zqx_app');await db.query("select set_config('zqx.auth_subject','20000000-0000-0000-0000-000000000002',true)");
 assert.equal((await db.query('select count(*)::int n from zqx.invoices where organization_id=$1',[other])).rows[0].n,0);pass('numbering does not bypass tenant RLS');
 await db.query('savepoint negative');await assert.rejects(()=>insert(db,org,otherCustomer),e=>e.code==='23503');await db.query('rollback to savepoint negative');pass('cross-tenant customer reference remains rejected');
 await db.query('savepoint negative');await assert.rejects(()=>db.query('select zqx.assign_invoice_number()'),e=>e.code==='42501');await db.query('rollback to savepoint negative');pass('runtime cannot directly execute definer numbering helper');
 await db.query('rollback');
 const report={status:'PASS',scope:'isolated local database only',tests};
 if(process.env.ZQX_TEST_REPORT_PATH) await writeFile(process.env.ZQX_TEST_REPORT_PATH,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
} finally {await db.end();}
