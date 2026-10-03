// Explicit local integration launcher. Never use for deployments.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
const source=parseEnv(readFileSync('.env.local','utf8'));
const env={...process.env};
for (const key of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','NEXT_PUBLIC_GOOGLE_HOSTED_DOMAIN']) {
  if (!source[key] && key!=='NEXT_PUBLIC_GOOGLE_HOSTED_DOMAIN') throw new Error('Public identity configuration missing');
  env[key]=key==='NEXT_PUBLIC_GOOGLE_HOSTED_DOMAIN'?'zqxconsulting.com':source[key];
}
env.NODE_ENV='development';
env.ZQX_RUNTIME_MODE='development-remote';
env.ZQX_LOCAL_DATA_V2='false';
env.ZQX_OWNER_BOOTSTRAP_ENABLED=process.argv.includes('--bootstrap')?'true':'false';
env.ZQX_SYSTEM_OWNER_EMAIL='gvcotto@zqxconsulting.com';
env.NEXT_PUBLIC_SITE_URL='http://localhost:3007';
env.NEXT_TELEMETRY_DISABLED='1';
if (env.ZQX_OWNER_BOOTSTRAP_ENABLED!=='true') delete env.ZQX_MIGRATION_DATABASE_URL;
if (!env.ZQX_DATABASE_URL || !env.NODE_EXTRA_CA_CERTS) throw new Error('Private runtime configuration missing');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3007'],{env,stdio:['ignore','pipe','pipe']});
const redact=chunk=>String(chunk).replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi,'[PRIVATE_DB_URL]').replace(/\/auth\/callback\?[^\s]+/g,'/auth/callback?[REDACTED]');
child.stdout.on('data',chunk=>process.stdout.write(redact(chunk)));
child.stderr.on('data',chunk=>process.stderr.write(redact(chunk)));
child.on('exit',code=>process.exit(code??1));
process.on('SIGINT',()=>child.kill('SIGINT'));
process.on('SIGTERM',()=>child.kill('SIGTERM'));
