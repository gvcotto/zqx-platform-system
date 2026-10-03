import { Pool } from "pg";
import { remotePersistenceAllowed } from "./remote-identity-policy";
let pool:Pool|undefined;
export function workspacePool() {
  if (pool) return pool;
  let url:URL;
  try {url=new URL(process.env.ZQX_DATABASE_URL||"");}
  catch {throw new Error("Runtime database configuration unavailable");}
  if(url.username.split(".")[0]!=="zqx_app") throw new Error("Restricted runtime principal required");
  const remote=remotePersistenceAllowed();
  if(!remote && !(url.hostname==="database"&&url.pathname==="/zqx_local"&&!url.password)) throw new Error("Explicit runtime profile required");
  if(remote && ["sslmode","sslcert","sslkey","sslrootcert"].some(key=>url.searchParams.has(key))) throw new Error("TLS URL override forbidden");
  pool=new Pool({connectionString:url.href,max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:10000,
    ssl:remote?{rejectUnauthorized:true,...(process.env.ZQX_DATABASE_CA_CERT?{ca:process.env.ZQX_DATABASE_CA_CERT}:{} )}:undefined});
  return pool;
}
