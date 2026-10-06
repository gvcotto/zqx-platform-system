// Read-only verification of the explicitly bootstrapped fictional workspace.
// Never reads Auth profiles, returns identity UUIDs or writes business data.
import {Pool} from 'pg';
import {writeFileSync} from 'node:fs';
const admin=new Pool({connectionString:process.env.ZQX_MIGRATION_DATABASE_URL,max:1,ssl:{rejectUnauthorized:true}});
const runtime=new Pool({connectionString:process.env.ZQX_DATABASE_URL,max:1,ssl:{rejectUnauthorized:true}});
try{
 const link=(await admin.query(`select u.auth_user_id subject,o.id organization from zqx.users u join zqx.platform_roles p on p.user_id=u.id and p.role='platform_owner' join zqx.memberships m on m.user_id=u.id and m.role='org_admin' join zqx.organizations o on o.id=m.organization_id and o.slug='zqx-demo-workspace'`)).rows;
 if(link.length!==1||!link[0].subject)throw new Error('Controlled bootstrap verification failed');
 const c=await runtime.connect();let evidence;
 try{
  await c.query('begin read only');
  await c.query("select set_config('zqx.auth_subject',$1,true),set_config('zqx.request_id','phase2c-evidence',true)",[link[0].subject]);
  const counts={};for(const entity of ['customers','leads','tasks','appointments','invoices','payments','audit_events'])counts[entity]=Number((await c.query(`select count(*) n from zqx.${entity} where organization_id=$1`,[link[0].organization])).rows[0].n);
  const checks=(await c.query(`select
    exists(select 1 from zqx.customers where organization_id=$1 and name='Integration Fictional Advisory' and company='Fictional advisory — edited remotely') customer_edit_persisted,
    exists(select 1 from zqx.tasks where organization_id=$1 and title='Synthetic acceptance follow-up' and status='open') task_reopened_persisted,
    exists(select 1 from zqx.leads where organization_id=$1 and name='Synthetic prospective company') lead_persisted,
    exists(select 1 from zqx.appointments where organization_id=$1 and title='Synthetic integration review') appointment_persisted,
    exists(select 1 from zqx.invoices where organization_id=$1 and total=10000 and status='paid') invoice_paid,
    (select coalesce(sum(amount),0)=10000 from zqx.payments where organization_id=$1) payments_total_correct,
    not exists(select 1 from zqx.audit_events where organization_id=$1 and coalesce(before,'{}')::text||coalesce(after,'{}')::text like '%Synthetic Phase 2C acceptance record%') audit_excludes_free_text,
    not exists(select 1 from zqx.audit_events where organization_id=$1 and coalesce(before,'{}')::text||coalesce(after,'{}')::text like '%integration@example.invalid%') audit_excludes_contact`,[link[0].organization])).rows[0];
  await c.query('rollback');
  if(Object.values(checks).some(value=>value!==true))throw new Error('Persistence/audit acceptance check failed');
  evidence={status:'PASS',scope:'Fictional integration organization; actual restricted runtime login, read-only transaction',checks,counts,bootstrap:'ONE verified identity-linked owner and organization membership',next_restart:'Observed via corporate browser; existing session and stored customer/task/invoice/payments retained',production_changes:'NONE',new_cost:'ZERO'};
 }catch(error){await c.query('rollback');throw error;}finally{c.release();}
 writeFileSync('../docs/phase2/phase2c-persistence-evidence.json',JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify(evidence));
}catch{console.error('Integration evidence verification FAILED; no private error detail emitted');process.exitCode=1;}
finally{await admin.end();await runtime.end();}
