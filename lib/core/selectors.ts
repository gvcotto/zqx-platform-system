import { listRecordsAsync } from "@/lib/core/data";
import {
  DEMO_BUSINESS_ID,
  ZQX_BUSINESS_ID,
  type AppointmentRecord,
  type BusinessModuleRecord,
  type BusinessRecord,
  type ClientRecord,
  type FaqRecord,
  type FollowupRecord,
  type ModuleRecord,
  type PaymentRecord,
  type ServiceRecord,
  type UserRecord,
} from "@/lib/core/types";

const ownerEmail = (process.env.ZQX_SYSTEM_OWNER_EMAIL ?? "gvcotto@zqxconsulting.com").trim().toLowerCase();

export type SystemUser = {
  email: string;
  name: string;
  role: UserRecord["role"];
  businessId: string;
  isZqxAdmin: boolean;
};

export type SystemUserAccessState = "active" | "invited" | "disabled" | "not_found";

export type SystemUserAccess = {
  state: SystemUserAccessState;
  user: SystemUser | null;
};

export type DashboardSnapshot = {
  user: SystemUser;
  businesses: BusinessRecord[];
  activeBusiness: BusinessRecord;
  enabledModules: ModuleRecord[];
  modules: ModuleRecord[];
  businessModules: BusinessModuleRecord[];
  allBusinessModules: BusinessModuleRecord[];
  users: UserRecord[];
  allUsers: UserRecord[];
  clients: ClientRecord[];
  appointments: AppointmentRecord[];
  followups: FollowupRecord[];
  services: ServiceRecord[];
  payments: PaymentRecord[];
  faqs: FaqRecord[];
  metrics: {
    clients: number;
    upcomingAppointments: number;
    openFollowups: number;
    pendingBalance: number;
    paidRevenue: number;
  };
};

async function findUserProfile(email?: string | null) {
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  const users = await listRecordsAsync("users");
  return users.find((user) => user.email.toLowerCase() === normalizedEmail);
}

export async function getSystemUserAccess(email?: string | null, name?: string | null): Promise<SystemUserAccess> {
  const profile = await findUserProfile(email);
  const normalizedEmail = (email ?? ownerEmail).trim().toLowerCase();

  if (profile) {
    if (profile.status !== "active") {
      return {
        state: profile.status,
        user: null,
      };
    }

    return {
      state: "active",
      user: {
        email: profile.email,
        name: profile.name,
        role: profile.role,
        businessId: profile.role === "zqx_owner" ? ZQX_BUSINESS_ID : profile.business_id,
        isZqxAdmin: profile.role === "zqx_owner",
      },
    };
  }

  if (normalizedEmail === ownerEmail) {
    return {
      state: "active",
      user: {
        email: normalizedEmail,
        name: name ?? "ZQX Admin",
        role: "zqx_owner",
        businessId: ZQX_BUSINESS_ID,
        isZqxAdmin: true,
      },
    };
  }

  return {
    state: "not_found",
    user: null,
  };
}

export async function getSystemUser(email?: string | null, name?: string | null): Promise<SystemUser | null> {
  return (await getSystemUserAccess(email, name)).user;
}

export async function getDashboardSnapshot(user: SystemUser, requestedBusinessId?: string | null): Promise<DashboardSnapshot> {
  const [businesses, modules] = await Promise.all([listRecordsAsync("businesses"), listRecordsAsync("modules")]);
  const businessId = user.isZqxAdmin && requestedBusinessId ? requestedBusinessId : user.businessId;
  const activeBusiness = businesses.find((business) => business.id === businessId) ?? businesses.find((business) => business.id === DEMO_BUSINESS_ID) ?? businesses[0];
  const [businessModules, allBusinessModules, platformBusinessModules, users, allPlatformUsers, clients, appointments, followups, services, payments, faqs] = await Promise.all([
    listRecordsAsync("business_modules", { business_id: activeBusiness.id, enabled: true }),
    listRecordsAsync("business_modules", { business_id: activeBusiness.id }),
    user.isZqxAdmin ? listRecordsAsync("business_modules") : listRecordsAsync("business_modules", { business_id: activeBusiness.id }),
    listRecordsAsync("users", { business_id: activeBusiness.id }),
    user.isZqxAdmin ? listRecordsAsync("users") : listRecordsAsync("users", { business_id: activeBusiness.id }),
    listRecordsAsync("clients", { business_id: activeBusiness.id }),
    listRecordsAsync("appointments", { business_id: activeBusiness.id }),
    listRecordsAsync("followups", { business_id: activeBusiness.id }),
    listRecordsAsync("services", { business_id: activeBusiness.id }),
    listRecordsAsync("payments", { business_id: activeBusiness.id }),
    listRecordsAsync("faqs", { business_id: activeBusiness.id }),
  ]);
  const enabledModules = modules.filter((module) => businessModules.some((businessModule) => businessModule.module_id === module.id));

  return {
    user,
    businesses,
    activeBusiness,
    enabledModules,
    modules,
    businessModules: allBusinessModules,
    allBusinessModules: platformBusinessModules,
    users,
    allUsers: allPlatformUsers,
    clients,
    appointments,
    followups,
    services,
    payments,
    faqs,
    metrics: {
      clients: clients.length,
      upcomingAppointments: appointments.filter((appointment) => appointment.status === "pending" || appointment.status === "confirmed").length,
      openFollowups: followups.filter((followup) => followup.status === "open" || followup.status === "in_progress").length,
      pendingBalance: payments.reduce((total, payment) => (payment.status === "paid" ? total : total + Math.max(payment.amount - payment.amount_paid, 0)), 0),
      paidRevenue: payments.reduce((total, payment) => total + payment.amount_paid, 0),
    },
  };
}
