import { Pool } from "pg";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { bootstrapAllowed,identityFromVerifiedUser,remotePersistenceAllowed,type VerifiedIdentity } from "./remote-identity-policy";
import { workspacePool } from "./postgres-pool";

export interface WorkspaceContext {
  actor:VerifiedIdentity["actor"];
  user:{id:string;name:string};
  platformOwner:boolean;
  organizations:Array<{id:string;name:string;initials:string;industry:string;status:string;modules:number;users:number;role:string;canWrite:boolean}>;
}
async function bootstrap(identity:VerifiedIdentity) {
  if(!bootstrapAllowed(identity,false)) return;
  // One-time local administrative bootstrap only. NEVER permitted in production.
  const url=process.env.ZQX_MIGRATION_DATABASE_URL;
  if(!url) throw new Error("Bootstrap administrative connection unavailable");
  const admin=new Pool({connectionString:url,max:1,ssl:{rejectUnauthorized:true}});
  const c=await admin.connect();
  try {
    await c.query("begin");
    await c.query("select pg_advisory_xact_lock(705032026,3)");
    const exists=(await c.query("select exists(select 1 from zqx.platform_roles where role='platform_owner') present")).rows[0].present;
    if(!bootstrapAllowed(identity,exists)) throw new Error("Owner bootstrap unavailable");
    await c.query("select set_config('zqx.auth_subject',$1,true),set_config('zqx.request_id',$2,true)",[identity.actor.authSubject,identity.actor.requestId]);
    // No email lookup or automatic relinking. Auth UUID is canonical from here on.
    const user=(await c.query("insert into zqx.users(auth_user_id,email,name) values($1,$2,'ZQX Corporate Owner') returning id",[identity.actor.authSubject,identity.email])).rows[0];
    await c.query("insert into zqx.platform_roles(user_id,role) values($1,'platform_owner')",[user.id]);
    const org=(await c.query("insert into zqx.organizations(slug,name,industry,contact_email) values('zqx-demo-workspace','ZQX Demo Workspace','Professional services','workspace@example.invalid') returning id")).rows[0];
    await c.query("insert into zqx.memberships(user_id,organization_id,role,joined_at) values($1,$2,'org_admin',now())",[user.id,org.id]);
    await c.query("insert into zqx.organization_modules(organization_id,module_key,enabled) select $1,unnest(array['crm','operations','finance']),true",[org.id]);
    await c.query("commit");
    process.env.ZQX_OWNER_BOOTSTRAP_ENABLED="false";
    delete process.env.ZQX_MIGRATION_DATABASE_URL;
  } catch(error) {await c.query("rollback");throw error;}
  finally {c.release();await admin.end();}
}
export async function remoteContext():Promise<WorkspaceContext> {
  if(!remotePersistenceAllowed()) throw new Error("Remote mode disabled");
  const supabase=await createSupabaseServerClient();
  if(!supabase) throw new Error("Identity provider unavailable");
  const result=await supabase.auth.getUser();
  if(result.error) throw new Error("Unauthenticated");
  const identity=identityFromVerifiedUser(result.data.user);
  // Bootstrap explicitly local/server enabled, with verified claims, serialized once.
  if(bootstrapAllowed(identity,false)) {
    const c=await workspacePool().connect();let linked=false;
    try{await c.query("begin");await c.query("select set_config('zqx.auth_subject',$1,true)",[identity.actor.authSubject]);linked=(await c.query("select id from zqx.users where auth_user_id=$1 and status='active'",[identity.actor.authSubject])).rowCount===1;await c.query("rollback");}
    catch(error){await c.query("rollback");throw error;}
    finally{c.release();}
    if(!linked) await bootstrap(identity);
  }
  const c=await workspacePool().connect();
  try {
    await c.query("begin");
    await c.query("select set_config('zqx.auth_subject',$1,true),set_config('zqx.request_id',$2,true)",[identity.actor.authSubject,identity.actor.requestId]);
    const user=(await c.query("select id,name from zqx.users where auth_user_id=$1 and status='active'",[identity.actor.authSubject])).rows[0];
    if(!user) throw new Error("Identity not linked");
    const owner=(await c.query("select zqx.owner_access() allowed")).rows[0].allowed===true;
    const orgs=(await c.query(`select o.id,o.name,upper(left(o.name,2)) initials,o.industry,initcap(o.status) status,zqx.allowed(o.id,'write') as "canWrite",
      (select count(*)::int from zqx.organization_modules om where om.organization_id=o.id and enabled) modules,
      (select count(*)::int from zqx.memberships m where m.organization_id=o.id and m.status='active') users,
      coalesce((select m.role from zqx.memberships m where m.organization_id=o.id and m.user_id=$1 and status='active'),'scoped') role
      from zqx.organizations o where status='active' and zqx.allowed(o.id) order by name,id`,[user.id])).rows;
    await c.query("commit");
    return {actor:identity.actor,user:{id:user.id,name:user.name},platformOwner:owner,organizations:orgs};
  } catch(error){await c.query("rollback");throw error;}finally{c.release();}
}
