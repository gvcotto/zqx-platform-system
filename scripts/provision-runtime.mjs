// Explicit Phase 2C provisioning only. Never import from application runtime.
import {randomBytes,createHash,createHmac,pbkdf2Sync} from 'node:crypto';
import {existsSync,writeFileSync,chmodSync,statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {Client} from 'pg';
import {loadMigrations,migrationPlan} from './migrate.mjs';

async function main(){
 if(process.env.ZQX_ROLE_PROVISION_APPROVAL!=='CREATE RESTRICTED ZQX_APP') throw new Error('Approval absent');
 const output=path.resolve('.env.phase2c-runtime.local');
 if(existsSync(output)&&statSync(output).size!==0) throw new Error('Private output already exists; no overwrite');
 const admin=new URL(process.env.ZQX_MIGRATION_DATABASE_URL||'');
 if(!admin.hostname.endsWith('.pooler.supabase.com')||admin.pathname!=='/postgres') throw new Error('Unexpected target');
 const client=new Client({connectionString:admin.href,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:10000});
 await client.connect();
 try{
  const plan=await migrationPlan(client,await loadMigrations(path.resolve('supabase/migrations')));
  if(plan.length!==3||plan.some(m=>m.status!=='PENDING')) throw new Error('Unexpected migration state');
  if((await client.query("select 1 from pg_roles where rolname='zqx_app'")).rowCount) throw new Error('Role already exists');
  const password=randomBytes(36).toString('base64url');
  const salt=randomBytes(16); const salted=pbkdf2Sync(password,salt,4096,32,'sha256');
  const stored=createHash('sha256').update(createHmac('sha256',salted).update('Client Key').digest()).digest('base64');
  const server=createHmac('sha256',salted).update('Server Key').digest('base64');
  const verifier=`SCRAM-SHA-256$4096:${salt.toString('base64')}$${stored}:${server}`;
  const runtime=new URL(admin.href); runtime.username=admin.username.replace(/^postgres(?=\.)/,'zqx_app');runtime.password=password;runtime.port='6543';
  const session=new URL(runtime.href);session.port='5432';
  // Create empty private artifact first; restrict access before writing credentials.
  if(!existsSync(output)) writeFileSync(output,'',{flag:'wx',mode:0o600});
  if(process.platform==='win32'){
   const command="$ErrorActionPreference='Stop';$p='"+output.replace(/'/g,"''")+"';$i=[Security.Principal.WindowsIdentity]::GetCurrent().User;$a=Get-Acl -LiteralPath $p;$a.SetAccessRuleProtection($true,$false);$a.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($i,'FullControl','Allow'));Set-Acl -LiteralPath $p -AclObject $a";
   const result=spawnSync('powershell.exe',['-NoProfile','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')],{stdio:'ignore'});
   if(result.status!==0) throw new Error('Private ACL failed');
  }else chmodSync(output,0o600);
  writeFileSync(output,`ZQX_DATABASE_URL="${runtime.href}"\nZQX_RUNTIME_SESSION_DATABASE_URL="${session.href}"\n`);
  await client.query('begin');
  try{await client.query(`create role zqx_app login nosuperuser nobypassrls nocreatedb nocreaterole noreplication noinherit password '${verifier}'`);await client.query('commit');}
  catch(e){await client.query('rollback');throw e;}
  const r=(await client.query("select rolcanlogin,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication,rolinherit from pg_roles where rolname='zqx_app'")).rows[0];
  console.log(JSON.stringify({runtimeRole:'zqx_app',privateCredentialSaved:true,attributes:r}));
 }finally{await client.end();}
}
main().catch(()=>{console.error('Provisioning stopped; inspect role/private artifact safely. No credential output or automatic deletion.');process.exitCode=1;});
