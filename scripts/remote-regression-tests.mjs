// Non-destructive: every synthetic row is inside one transaction rolled back.
import {Client,Pool} from 'pg';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const ssl={rejectUnauthorized:true};
const admin=new Client({connectionString:process.env.ZQX_MIGRATION_DATABASE_URL,ssl,connectionTimeoutMillis:5000});
const runtime=new Pool({connectionString:process.env.ZQX_DATABASE_URL,ssl,max:1,connectionTimeoutMillis:5000});
const tests=[];const pass=name=>tests.push({name,result:'PASS'});
const ids=Array.from({length:18},randomUUID),[a,b,ca,cb,invoice]=ids;
await admin.connect();
try {
 const meta=(await admin.query(`select (select count(*)::int from information_schema.tables where table_schema='zqx') tables,(select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='zqx' and c.relkind='r' and c.relrowsecurity) rls`)).rows[0];
 assert.equal(meta.tables,14);assert.equal(meta.rls,14);pass('14 tables including ledger retain RLS');
 assert.equal((await admin.query('select count(*)::int n from zqx.migration_ledger')).rows[0].n,4);pass('four applied ledger entries');
 assert.equal((await admin.query("select count(*)::int n from zqx.invoices where invoice_number !~ '^INV-[0-9]{4}-[0-9]{6,}$' or invoice_sequence<1")).rows[0].n,0);pass('existing invoice numbering valid');
 const baseline=(await admin.query('select count(*)::int n from zqx.audit_events')).rows[0].n;
 await admin.query('begin');
 await admin.query("insert into zqx.organizations(id,slug,name,contact_email) values($1,$2,'Synthetic rollback A','fixture@example.invalid'),($3,$4,'Synthetic rollback B','fixture@example.invalid')",[a,'regression-'+a,b,'regression-'+b]);
 const subjects={};
 for(const [i,role] of ['org_admin','operator','viewer','zqx_admin','support','unmember'].entries()) {
  const user=ids[5+i],subject=ids[11+i];subjects[role]=subject;
  await admin.query("insert into zqx.users(id,auth_user_id,email,name) values($1,$2,$3,'Synthetic rollback actor')",[user,subject,subject+'@example.invalid']);
  if(['org_admin','operator','viewer'].includes(role)) await admin.query('insert into zqx.memberships(user_id,organization_id,role) values($1,$2,$3)',[user,a,role]);
  if(['zqx_admin','support'].includes(role)) {
   await admin.query('insert into zqx.platform_roles(user_id,role) values($1,$2)',[user,role]);
   await admin.query("insert into zqx.platform_scopes(user_id,organization_id,expires_at,approved_by,reason) values($1,$2,$3,$4,'Synthetic rollback scope')",[user,a,role==='support'?'2000-01-01':null,ids[5]]);
  }
 }
 await admin.query("insert into zqx.customers(id,organization_id,name,email) values($1,$2,'Synthetic A','fixture@example.invalid'),($3,$4,'Synthetic B','fixture@example.invalid')",[ca,a,cb,b]);
 await admin.query("insert into zqx.invoices(id,organization_id,customer_id,subtotal,total,status,due_at) values($1,$2,$3,100,100,'pending','2026-10-20')",[invoice,a,ca]);
 // Supabase's migration principal is not a superuser. This test-only grant is
 // confined to the enclosing transaction and rolled back with all fixtures.
 // The runtime is never granted membership in the migration/admin role.
 await admin.query('grant zqx_app to current_user');
 await admin.query('set local role zqx_app');
 const subject=async role=>admin.query("select set_config('zqx.auth_subject',$1,true),set_config('zqx.request_id','synthetic-rollback-regression',true)",[subjects[role]||role||'']);
 const denied=async(name,sql,args=[])=>{await admin.query('savepoint negative');await assert.rejects(()=>admin.query(sql,args),e=>['42501','23503','23514'].includes(e.code));await admin.query('rollback to savepoint negative');pass(name);};
 const invisible=async(name,role,org=a)=>{await subject(role);assert.equal((await admin.query('select count(*)::int n from zqx.customers where organization_id=$1',[org])).rows[0].n,0);pass(name);};
 await invisible('unauthenticated denied','');await invisible('unlinked authenticated subject denied',randomUUID());await invisible('linked without membership denied','unmember');
 await subject('operator');assert.equal((await admin.query('select count(*)::int n from zqx.customers where organization_id=$1',[a])).rows[0].n,1);pass('operator reads assigned tenant');
 assert.equal((await admin.query('select count(*)::int n from zqx.customers where organization_id=$1',[b])).rows[0].n,0);pass('tenant A cannot SELECT B');
 await denied('operator cannot manage memberships',"insert into zqx.memberships(user_id,organization_id,role) values($1,$2,'viewer')",[ids[10],a]);
 await denied('cross-tenant appointment reference',"insert into zqx.appointments(organization_id,customer_id,title,starts_at,ends_at,status) values($1,$2,'Synthetic',now(),now()+interval '1 hour','scheduled')",[a,cb]);
 await denied('cross-tenant task reference',"insert into zqx.tasks(organization_id,customer_id,title,priority,status) values($1,$2,'Synthetic','low','open')",[a,cb]);
 await denied('cross-tenant invoice reference',"insert into zqx.invoices(organization_id,customer_id,subtotal,total,status,due_at) values($1,$2,100,100,'draft',now())",[a,cb]);
 await denied('cross-tenant payment reference',"insert into zqx.payments(organization_id,invoice_id,customer_id,amount,currency,method,paid_at) values($1,$2,$3,1,'USD','cash',now())",[b,invoice,cb]);
 await denied('number helper unavailable to runtime','select zqx.assign_invoice_number()');
 await denied('identifier cannot be forged after insert',"update zqx.invoices set invoice_number='FORGED' where id=$1",[invoice]);
 await admin.query("insert into zqx.payments(organization_id,invoice_id,customer_id,amount,currency,method,paid_at) values($1,$2,$3,40,'USD','cash',now())",[a,invoice,ca]);
 assert.equal((await admin.query('select status from zqx.invoices where id=$1',[invoice])).rows[0].status,'partial');pass('partial payment derives partial invoice');
 await denied('overpayment rejected',"insert into zqx.payments(organization_id,invoice_id,customer_id,amount,currency,method,paid_at) values($1,$2,$3,61,'USD','cash',now())",[a,invoice,ca]);
 await admin.query("insert into zqx.payments(organization_id,invoice_id,customer_id,amount,currency,method,paid_at) values($1,$2,$3,60,'USD','cash',now())",[a,invoice,ca]);
 assert.equal((await admin.query('select status from zqx.invoices where id=$1',[invoice])).rows[0].status,'paid');pass('final payment derives paid invoice');
 await subject('viewer');await denied('viewer cannot INSERT',"insert into zqx.customers(organization_id,name,email) values($1,'Synthetic','fixture@example.invalid')",[a]);
 assert.equal((await admin.query("update zqx.customers set name='FORGED' where id=$1",[ca])).rowCount,0);pass('viewer cannot UPDATE');
 assert.equal((await admin.query('delete from zqx.customers where id=$1',[ca])).rowCount,0);pass('viewer cannot DELETE');
 await subject('org_admin');await denied('org admin cannot become platform owner',"insert into zqx.platform_roles(user_id,role) values($1,'platform_owner')",[ids[5]]);
 await invisible('zqx admin cannot see unassigned tenant','zqx_admin',b);await subject('zqx_admin');assert((await admin.query("select zqx.allowed($1,'write') allowed",[a])).rows[0].allowed);pass('zqx admin assigned scope works');
 await invisible('expired support scope denied','support');
 await subject('org_admin');const audits=(await admin.query('select before,after from zqx.audit_events where organization_id=$1',[a])).rows;
 assert(audits.length>0);assert(!JSON.stringify(audits).includes('fixture@example.invalid'));pass('audit excludes contact and free text');
 await denied('audit append-only',"delete from zqx.audit_events where organization_id=$1",[a]);
 await admin.query('rollback');assert.equal((await admin.query('select count(*)::int n from zqx.audit_events')).rows[0].n,baseline);pass('synthetic fixtures and audit rolled back without deletion');
 const c=await runtime.connect();try {
  assert.equal((await c.query('select current_user name')).rows[0].name,'zqx_app');pass('actual pooled runtime principal is zqx_app');
  await c.query('begin');await c.query("select set_config('zqx.auth_subject',$1,true),set_config('zqx.request_id','pool-A',true)",[randomUUID()]);await c.query('commit');
 }finally{c.release();}
 const d=await runtime.connect();try{const row=(await d.query("select current_setting('zqx.auth_subject',true) subject,current_setting('zqx.request_id',true) request")).rows[0];assert(!row.subject&&!row.request);pass('pooled transaction does not leak prior identity');}finally{d.release();}
 const report={status:'PASS',scope:'remote synthetic rollback-only regression; no Auth access',tests};await writeFile(new URL('../../docs/phase2/phase2c-remote-regression-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
} finally {await admin.query('rollback').catch(()=>{});await admin.end();await runtime.end();}
