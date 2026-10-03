// Private file for the existing Vercel System project only; never print values.
import {readFileSync,writeFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
const directory='D:/ZQX/zqx-platform-system';
const runtime=parseEnv(readFileSync(directory+'/.env.phase2c-runtime.local','utf8'));
const publicConfig=parseEnv(readFileSync(directory+'/.env.local','utf8'));
const url=new URL(runtime.ZQX_DATABASE_URL||'');
if(url.username.split('.')[0]!=='zqx_app'||url.port!=='6543')throw new Error('Restricted runtime transaction pool required');
// Public build configuration already exists in Vercel; avoid overlapping scope updates.
// Compare current public bundle configuration before reusing it (values never emitted).
const response=await fetch('https://system.zqxconsulting.com/login');if(!response.ok)throw new Error('Current production unavailable');
const html=await response.text();let bundles='';
for(const match of html.matchAll(/<script[^>]*src="([^"]+)"/g)){
 const asset=new URL(match[1],'https://system.zqxconsulting.com');
 if(asset.origin!=='https://system.zqxconsulting.com'||!asset.pathname.startsWith('/_next/static/'))continue;
 const fetched=await fetch(asset);if(fetched.ok)bundles+=await fetched.text();
}
for(const key of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY'])if(!publicConfig[key]||!bundles.includes(publicConfig[key]))throw new Error('Public identity configuration differs; review privately before release');
const entries={ZQX_RUNTIME_MODE:'production',ZQX_DATABASE_URL:runtime.ZQX_DATABASE_URL,
 ZQX_DATABASE_CA_CERT:readFileSync(directory+'/.phase2c-supabase-ca.crt','utf8')};
if(Object.values(entries).some(value=>!value))throw new Error('Required private/public release configuration absent');
const target=directory+'/.env.phase2d-preview.local';
writeFileSync(target,Object.entries(entries).map(([key,value])=>key+'='+JSON.stringify(value)).join('\n')+'\n',{mode:0o600});
console.log('CURRENT_PRODUCTION_PUBLIC_IDENTITY_MATCH=PASS; PRIVATE_RELEASE_CONFIG_PREPARED; keys only: '+Object.keys(entries).join(', '));
