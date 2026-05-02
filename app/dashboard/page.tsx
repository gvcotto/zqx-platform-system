import SystemDashboard from "@/components/dashboard/SystemDashboard";
import { requireSystemUser } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/core/selectors";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireSystemUser();
  const query = searchParams ? await searchParams : {};
  const businessParam = Array.isArray(query.businessId) ? query.businessId[0] : query.businessId;
  const snapshot = getDashboardSnapshot(user, businessParam);

  return <SystemDashboard snapshot={snapshot} />;
}
