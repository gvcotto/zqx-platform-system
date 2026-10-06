import SystemDashboard from "@/components/dashboard/SystemDashboard";
import { requireSystemUser } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/core/selectors";
import { stripSensitiveFields } from "@/lib/security/sanitize";
import ModernWorkspace from "@/components/product/ModernWorkspace";
import { demoAllowed } from "@/lib/demo/model";
import "../demo/product.css";
import { remotePersistenceAllowed } from "@/lib/infrastructure/adapters/remote-identity-policy";
import RemoteWorkspace from "@/components/product/RemoteWorkspace";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  if(remotePersistenceAllowed()) return <RemoteWorkspace/>;
  const user = await requireSystemUser();
  // Preserve the identity guard; modern demo context is never production access.
  if (demoAllowed(process.env)) return <ModernWorkspace authenticatedDemo />;
  const query = searchParams ? await searchParams : {};
  const businessParam = Array.isArray(query.businessId)
    ? query.businessId[0]
    : query.businessId;
  const snapshot = stripSensitiveFields(
    await getDashboardSnapshot(user, businessParam),
  );

  return <SystemDashboard snapshot={snapshot} />;
}
