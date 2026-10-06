import { redirect } from "next/navigation";
import { remoteContext } from "@/lib/infrastructure/adapters/remote-identity";
import { PostgresWorkspace } from "@/lib/infrastructure/adapters/postgres-workspace";
import ModernWorkspace from "./ModernWorkspace";
export default async function RemoteWorkspace(){
 let context;
 try{context=await remoteContext();}catch{redirect("/login?access=not_found");}
 if(!context.organizations.length) return <main><h1>No workspace access</h1><p>Your verified identity requires an active organization assignment.</p></main>;
 const org=context.organizations[0];
 const store=await new PostgresWorkspace().snapshot(context.actor,org.id);
 return <ModernWorkspace persistence="remote" currentDate={new Date().toISOString().slice(0,10)} initialStore={store} remoteOrganizations={context.organizations} remoteUser={context.user} platformOwner={context.platformOwner}/>;
}
