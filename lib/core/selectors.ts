import { listRecords } from "@/lib/core/crud";
import { DEMO_BUSINESS_ID, ZQX_BUSINESS_ID, type BusinessRecord, type ModuleRecord, type UserRecord } from "@/lib/core/types";

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
  businessModules: ReturnType<typeof listRecords<"business_modules">>;
  allBusinessModules: ReturnType<typeof listRecords<"business_modules">>;
  users: UserRecord[];
  allUsers: UserRecord[];
  clients: ReturnType<typeof listRecords<"clients">>;
  appointments: ReturnType<typeof listRecords<"appointments">>;
  followups: ReturnType<typeof listRecords<"followups">>;
  services: ReturnType<typeof listRecords<"services">>;
  payments: ReturnType<typeof listRecords<"payments">>;
  faqs: ReturnType<typeof listRecords<"faqs">>;
  metrics: {
    clients: number;
    upcomingAppointments: number;
    openFollowups: number;
    pendingBalance: number;
    paidRevenue: number;
  };
};

function findUserProfile(email?: string | null) {
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  const users = listRecords("users");
  return users.find((user) => user.email.toLowerCase() === normalizedEmail);
}

export function getSystemUserAccess(email?: string | null, name?: string | null): SystemUserAccess {
  const profile = findUserProfile(email);
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

export function getSystemUser(email?: string | null, name?: string | null): SystemUser | null {
  return getSystemUserAccess(email, name).user;
}

export function getDashboardSnapshot(user: SystemUser, requestedBusinessId?: string | null): DashboardSnapshot {
  const businesses = listRecords("businesses");
  const modules = listRecords("modules");
  const businessId = user.isZqxAdmin && requestedBusinessId ? requestedBusinessId : user.businessId;
  const activeBusiness = businesses.find((business) => business.id === businessId) ?? businesses.find((business) => business.id === DEMO_BUSINESS_ID) ?? businesses[0];
  const businessModules = listRecords("business_modules", { business_id: activeBusiness.id, enabled: true });
  const allBusinessModules = listRecords("business_modules", { business_id: activeBusiness.id });
  const platformBusinessModules = user.isZqxAdmin ? listRecords("business_modules") : allBusinessModules;
  const enabledModules = modules.filter((module) => businessModules.some((businessModule) => businessModule.module_id === module.id));
  const users = listRecords("users", { business_id: activeBusiness.id });
  const allUsers = user.isZqxAdmin ? listRecords("users") : users;
  const clients = listRecords("clients", { business_id: activeBusiness.id });
  const appointments = listRecords("appointments", { business_id: activeBusiness.id });
  const followups = listRecords("followups", { business_id: activeBusiness.id });
  const services = listRecords("services", { business_id: activeBusiness.id });
  const payments = listRecords("payments", { business_id: activeBusiness.id });
  const faqs = listRecords("faqs", { business_id: activeBusiness.id });

  return {
    user,
    businesses,
    activeBusiness,
    enabledModules,
    modules,
    businessModules: allBusinessModules,
    allBusinessModules: platformBusinessModules,
    users,
    allUsers,
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
