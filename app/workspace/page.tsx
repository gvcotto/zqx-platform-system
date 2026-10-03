import { notFound } from "next/navigation";
import { headers } from "next/headers";
import ModernWorkspace from "@/components/product/ModernWorkspace";
import { localActor, localPersistenceAllowed } from "@/lib/infrastructure/adapters/local-identity";
import { PostgresWorkspace } from "@/lib/infrastructure/adapters/postgres-workspace";
import "../demo/product.css";
import { remotePersistenceAllowed } from "@/lib/infrastructure/adapters/remote-identity-policy";
import RemoteWorkspace from "@/components/product/RemoteWorkspace";
export const dynamic="force-dynamic";
export default async function LocalWorkspace() {
  if(remotePersistenceAllowed()) return <RemoteWorkspace/>;
  if(!localPersistenceAllowed()) notFound();
  if(!["localhost:3012","127.0.0.1:3012"].includes((await headers()).get("host") || "")) notFound();
  const initialStore=await new PostgresWorkspace().snapshot(localActor(),"30000000-0000-0000-0000-000000000001");
  return <ModernWorkspace initialStore={initialStore} persistence="postgres" />;
}
