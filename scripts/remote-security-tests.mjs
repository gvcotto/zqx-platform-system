import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Client} from 'pg';
import {migrationBody} from './migrate.mjs';
const url=process.env.ZQX_DATABASE_URL;
if(process.env.ZQX_REMOTE_TEST_APPROVAL!=='SYNTHETIC ZQX SECURITY TESTS') throw new Error('Approval required');
const client=(connectionString)=>new Client({connectionString,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:10000});
const admin=client(process.env.ZQX_MIGRATION_DATABASE_URL); const app=client(url);
const id=n=>'10000000-0000-0000-0000-'+String(n).padStart(12,'0');
const auth=n=>'20000000-0000-0000-0000-'+String(n).padStart(12,'0');
const org=n=>'30000000-0000-0000-0000-'+String(n).padStart(12,'0');
const customer=n=>'40000000-0000-0000-0000-'+String(n).padStart(12,'0');
const tables=['users','organizations','memberships','organization_modules','platform_roles','platform_scopes','customers','leads','appointments','tasks','invoices','payments','audit_events'];
const report={status:'RUNNING',tests:[],catalog:{},cleanup:'PENDING'};
let seeded=false;
async function test(name,category,statement,expected,actor=2,principal=app,deny=false,codes=['42501','23503','23514']){
 await principal.query('begin'); let error;
 try{await principal.query("select set_config('zqx.auth_subject',$1,true)",[actor?auth(actor):'']);
 const result=await principal.query(statement);
 if(deny) throw new Error('Unexpected allowance');
 const results=Array.isArray(result)?result:[result];const last=results.filter(r=>r.rows.length).at(-1);
 assert.equal(String(Object.values(last?.rows[0]||{})[0]),String(expected));
 }catch(e){error=e;}finally{await principal.query('rollback');}
 if(deny) assert.ok(error&&codes.includes(error.code),name);
 else if(error) throw error;
 report.tests.push({name,category,result:'PASS'});
}
const deny=(name,cat,sql,actor=2,codes)=>test(name,cat,sql,null,actor,app,true,codes);
async function main(){
 await admin.connect();await app.connect();
 try{
 const catalog=(await admin.query("select count(*)::int physical,count(*) filter(where relrowsecurity)::int rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='zqx' and relkind='r'")).rows[0];
 assert.equal(catalog.physical,14);assert.equal(catalog.rls,14);
 report.catalog={...catalog,...(await admin.query("select (select count(*)::int from pg_policies where schemaname='zqx') policies,(select count(*)::int from pg_constraint where connamespace='zqx'::regnamespace and contype='f') foreignKeys,(select count(*)::int from pg_trigger t join pg_class c on t.tgrelid=c.oid where c.relnamespace='zqx'::regnamespace and not t.tgisinternal) triggers,(select count(*)::int from pg_indexes where schemaname='zqx') indexes")).rows[0]};
 for(const t of tables) assert.equal((await admin.query(`select count(*)::int n from zqx.${t}`)).rows[0].n,0,'Expected empty application tables; stop on unexpected data');
 const dependencies=await admin.query("select 1 from pg_constraint c join pg_class own on own.oid=c.conrelid join pg_class target on target.oid=c.confrelid where target.relnamespace='zqx'::regnamespace and own.relnamespace<>'zqx'::regnamespace");
 assert.equal(dependencies.rowCount,0,'External dependency; stop');
 await admin.query('begin');try{await admin.query(migrationBody(readFileSync('supabase/local/seed.sql','utf8')));await admin.query('commit');seeded=true;}catch(e){await admin.query('rollback');throw e;}
 await test('runtime flags restricted','security',"select rolsuper::text||':'||rolbypassrls::text||':'||rolcreatedb::text||':'||rolcreaterole::text from pg_roles where rolname=current_user",'false:false:false:false');
 await test('A cannot select B','tenant',`select count(*) from zqx.customers where organization_id='${org(2)}'`,0);
 await test('unauthenticated reads nothing','rbac','select count(*) from zqx.customers',0,0);
 await test('viewer reads A','rbac','select count(*) from zqx.customers',2,3);
 const newCustomer=`insert into zqx.customers(organization_id,name,email) values('${org(1)}','Synthetic new','new@example.invalid')`;
 await deny('viewer cannot insert','rbac',newCustomer,3);
 await deny('unauthenticated cannot insert','rbac',newCustomer,0);
 await test('viewer cannot update','rbac',"with changed as(update zqx.customers set name='Blocked' returning id) select count(*) from changed",0,3);
 await test('viewer cannot delete','rbac','with changed as(delete from zqx.leads returning id) select count(*) from changed',0,3);
 await deny('operator cannot manage memberships','rbac',`insert into zqx.memberships(user_id,organization_id,role) values('${id(7)}','${org(1)}','viewer')`);
 await deny('org admin cannot escalate','rbac',`insert into zqx.platform_roles values('${id(1)}','platform_owner')`,1);
 await test('assigned admin reads A','rbac',`select count(*) from zqx.customers where organization_id='${org(1)}'`,2,5);
 await test('unassigned admin cannot read B','rbac',`select count(*) from zqx.customers where organization_id='${org(2)}'`,0,5);
 await test('owner global read','rbac','select count(*) from zqx.customers',3,6);
 await test('temporary support read','rbac','select count(*) from zqx.customers',2,7);
 await deny('support cannot write','rbac',newCustomer,7);
 await test('operator create','positive',`with changed as(${newCustomer} returning id) select count(*) from changed`,1);
 await deny('A cannot insert B','tenant',`insert into zqx.customers(organization_id,name,email) values('${org(2)}','Blocked','blocked@example.invalid')`);
 const appt=`insert into zqx.appointments(organization_id,customer_id,title,starts_at,ends_at,status) values('${org(1)}','${customer(3)}','Blocked','2026-10-02T10:00Z','2026-10-02T11:00Z','scheduled')`;
 const task=`insert into zqx.tasks(organization_id,customer_id,title,priority,status) values('${org(1)}','${customer(3)}','Blocked','high','open')`;
 const invoice=`insert into zqx.invoices(organization_id,customer_id,subtotal,total,status,due_at) values('${org(1)}','${customer(3)}',100,100,'pending','2026-10-02')`;
 for(const [name,sql] of [['appointment',appt],['task',task],['invoice',invoice]]){
 await deny('cross-tenant '+name,'tenant',sql);await deny('owner FK '+name,'tenant',sql,6,['23503']);}
 const payment=(amount,c=1,o=1)=>`insert into zqx.payments(organization_id,invoice_id,customer_id,amount,currency,method,paid_at) values('${org(o)}','${id(501)}','${customer(c)}',${amount},'USD','cash','2026-10-02')`;
 await deny('cross-tenant payment invoice','tenant',payment(1,1,2),6);
 await deny('cross-tenant payment customer','tenant',payment(1,3),6,['23503']);
 await deny('overpayment','finance',payment(350001));
 await test('remaining balance paid','finance',payment(350000)+`;select status from zqx.invoices where id='${id(501)}'`,'paid');
 await deny('paid invoice cannot shrink','finance',`update zqx.invoices set total=100,subtotal=100 where id='${id(501)}'`);
 await deny('paid status cannot be invented','finance',`update zqx.invoices set status='paid' where id='${id(501)}'`);
 await deny('payments append-only','audit','delete from zqx.payments');
 await deny('audit immutable','audit',"update zqx.audit_events set action='tamper'",6);
 await deny('audit arbitrary insert','audit',"insert into zqx.audit_events(actor_type,action,resource_type,source) values('user','fake','users','browser')",6);
 await test('audit excludes contacts','audit',newCustomer+";select count(*) from zqx.audit_events where coalesce(after::text,'') like '%new@example.invalid%'",0,6);
 await deny('runtime cannot SET ROLE postgres','security','set local role postgres');
 await deny('runtime cannot access ledger','security','select * from zqx.migration_ledger');
 await test('14 tables RLS including ledger','security',"select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='zqx' and relkind='r' and relrowsecurity",14);
 // Admin changes synthetic scope; assertions still use the real runtime login.
 await admin.query(`update zqx.platform_scopes set expires_at='2000-01-01' where user_id='${id(7)}'`);
 await test('expired support denied','rbac','select count(*) from zqx.customers',0,7);
 await admin.query(`update zqx.platform_scopes set expires_at='2099-01-01' where user_id='${id(7)}'`);
 await admin.query(`update zqx.organizations set status='inactive' where id='${org(1)}'`);
 await test('inactive organization denies operator','rbac','select count(*) from zqx.customers',0,2);
 await admin.query(`update zqx.organizations set status='active' where id='${org(1)}'`);
 await test('owner access creates audit','audit',`select zqx.record_access('${org(1)}');select count(*) from zqx.audit_events where actor_user_id='${id(6)}' and action='read'`,1,6);
 await deny('owner cannot move tenant','tenant',`update zqx.customers set organization_id='${org(2)}' where id='${customer(1)}'`,6,['23514']);
 // Real runtime socket through transaction pooler, no owner connection masquerading as runtime.
 await app.query('begin');await app.query("select set_config('zqx.auth_subject',$1,true),set_config('zqx.request_id','request-A',true)",[auth(2)]);await app.query('commit');
 await app.query('begin');const cleared=(await app.query("select coalesce(current_setting('zqx.auth_subject',true),'') subject,coalesce(current_setting('zqx.request_id',true),'') request")).rows[0];assert.deepEqual(cleared,{subject:'',request:''});
 await app.query("select set_config('zqx.auth_subject',$1,true)",[auth(3)]);assert.equal((await app.query('select zqx.actor_id() actor')).rows[0].actor,id(3));await app.query('rollback');
 report.tests.push({name:'A commit / B isolation and rollback context',category:'pooling',result:'PASS'});
 const racer=async()=>{const c=client(url);await c.connect();try{await c.query('begin');await c.query("select set_config('zqx.auth_subject',$1,true)",[auth(2)]);await c.query(payment(350000));await c.query('commit');return 'PASS';}catch(e){await c.query('rollback');assert.equal(e.code,'23514');return 'REJECTED';}finally{await c.end();}};
 const race=await Promise.all([racer(),racer()]);assert.deepEqual(race.sort(),['PASS','REJECTED']);
 report.tests.push({name:'concurrent payments cannot overpay',category:'finance',result:'PASS'});
 report.status='PASS';
 }finally{
 if(seeded){
  // All domain rows originated in this empty-schema synthetic suite. No auth writes.
  const unexpected=(await admin.query("select count(*)::int n from zqx.users where email !~ '^fixture[1-7]@example[.]invalid$'")).rows[0].n;
  assert.equal(unexpected,0,'Unexpected identity data; refuse cleanup');
  const external=await admin.query("select 1 from pg_constraint c join pg_class own on own.oid=c.conrelid join pg_class target on target.oid=c.confrelid where target.relnamespace='zqx'::regnamespace and own.relnamespace<>'zqx'::regnamespace");assert.equal(external.rowCount,0);
  await admin.query('truncate table '+tables.map(t=>'zqx.'+t).join(',')+' restrict');
  for(const t of tables) assert.equal((await admin.query(`select count(*)::int n from zqx.${t}`)).rows[0].n,0);
  assert.equal((await admin.query('select count(*)::int n from zqx.migration_ledger')).rows[0].n,3);report.cleanup='PASS';
 }
 await app.end();await admin.end();
 writeFileSync('../docs/phase2/phase2c-remote-security-results.json',JSON.stringify(report,null,2)+'\n');
 }
 console.log(JSON.stringify({status:report.status,tests:report.tests.length,catalog:report.catalog,cleanup:report.cleanup}));
}
main().catch(e=>{console.error(JSON.stringify({status:'STOP',code:e.code||null,testsPassed:report.tests.length,cleanup:report.cleanup}));process.exitCode=1;});
