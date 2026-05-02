"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import LocaleSwitcher from "@/components/common/LocaleSwitcher";
import { getPrimaryModuleForIndustry } from "@/lib/core/modules";
import type { DashboardSnapshot } from "@/lib/core/selectors";
import { defaultLocale, isLocale, type Locale, uiLocaleStorageKey } from "@/lib/i18n";
import type {
  AppointmentRecord,
  BusinessIndustry,
  BusinessModuleRecord,
  ClientRecord,
  FollowupRecord,
  ModuleRecord,
  PaymentRecord,
  ServiceRecord,
  UserRecord,
} from "@/lib/core/types";

type DashboardProps = {
  snapshot: DashboardSnapshot;
};

type WorkspaceView = "overview" | "records" | "calendar" | "billing" | "admin" | "assistant";

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

type ClientSortOption = "recent" | "oldest" | "az" | "za" | "balance_desc";
type UserAccessDraft = Pick<UserRecord, "business_id" | "role" | "status">;

const clientStatusFilters: Array<"all" | ClientRecord["status"]> = ["all", "lead", "prospect", "active", "inactive"];
const appointmentStatuses: AppointmentRecord["status"][] = ["pending", "confirmed", "completed", "cancelled", "no_show"];
const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const fallbackBusinessLogos: Record<string, string> = {
  "zqx-consulting": "/logos/zqx.svg",
  "clinica-dental-smile": "/logos/dental-smile.svg",
  "universidad-central": "/logos/universidad-central.svg",
  "mesa-central-foods": "/logos/mesa-central-foods.svg",
};

const clientStatusLabelsByLocale: Record<Locale, Record<"all" | ClientRecord["status"], string>> = {
  es: {
    all: "Todos",
    lead: "Lead",
    prospect: "Prospecto",
    active: "Activo",
    inactive: "Inactivo",
  },
  en: {
    all: "All",
    lead: "Lead",
    prospect: "Prospect",
    active: "Active",
    inactive: "Inactive",
  },
};

const clientSortLabelsByLocale: Record<Locale, Record<ClientSortOption, string>> = {
  es: {
    recent: "Últimos agregados",
    oldest: "Más antiguos",
    az: "A-Z",
    za: "Z-A",
    balance_desc: "Mayor saldo",
  },
  en: {
    recent: "Newest",
    oldest: "Oldest",
    az: "A-Z",
    za: "Z-A",
    balance_desc: "Highest balance",
  },
};

const appointmentStatusLabelsByLocale: Record<Locale, Record<AppointmentRecord["status"], string>> = {
  es: {
    pending: "Pendiente",
    confirmed: "Confirmada",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No-show",
  },
  en: {
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No-show",
  },
};

const paymentStatusLabelsByLocale: Record<Locale, Record<PaymentRecord["status"], string>> = {
  es: {
    paid: "Pagado",
    pending: "Pendiente",
    partial: "Parcial",
  },
  en: {
    paid: "Paid",
    pending: "Pending",
    partial: "Partial",
  },
};

const industryLabelsByLocale: Record<Locale, Record<BusinessIndustry, string>> = {
  es: {
    general: "General",
    dentist: "Dental",
    medical: "Médico",
    university: "Universidad",
    consulting: "Consultoría",
    restaurant: "Comida",
    custom: "Personalizado",
  },
  en: {
    general: "General",
    dentist: "Dental",
    medical: "Medical",
    university: "University",
    consulting: "Consulting",
    restaurant: "Food",
    custom: "Custom",
  },
};

const workflowByIndustryByLocale: Record<Locale, Record<BusinessIndustry, string[]>> = {
  es: {
    general: ["Capturar solicitud", "Calificar cliente", "Agendar cita", "Dar seguimiento"],
    dentist: ["Intake digital", "Confirmar disponibilidad", "Recordatorios 48-24-1", "Recall 6 meses y review"],
    medical: ["Intake del paciente", "Agenda clínica", "Seguimiento de resultados", "Recordatorio de pago"],
    university: ["Consulta de admisión", "Entrevista", "Becas y documentos", "Matrícula"],
    consulting: ["Discovery", "Propuesta", "Entrega", "Revisión de cuenta"],
    restaurant: ["Reserva o pedido", "Confirmación", "Preparación", "Seguimiento del evento"],
    custom: ["Entrada", "Clasificación", "Workflow", "Cierre"],
  },
  en: {
    general: ["Capture request", "Qualify client", "Schedule appointment", "Follow up"],
    dentist: ["Digital intake", "Confirm availability", "48-24-1 reminders", "6-month recall and review"],
    medical: ["Patient intake", "Clinical agenda", "Results follow-up", "Payment reminder"],
    university: ["Admissions inquiry", "Interview", "Scholarships and documents", "Enrollment"],
    consulting: ["Discovery", "Proposal", "Delivery", "Account review"],
    restaurant: ["Booking or order", "Confirmation", "Preparation", "Event follow-up"],
    custom: ["Input", "Classification", "Workflow", "Closure"],
  },
};

const dentalCapabilitiesByLocale: Record<Locale, string[]> = {
  es: [
    "Base centralizada de pacientes con estado lead, prospecto, activo o inactivo.",
    "Formulario rápido para recepción: datos, interés, notas y siguiente acción.",
    "Agenda por hora, paciente, servicio, ubicación o sillón.",
    "Recordatorios 48-24-1 y recall preventivo de 6 meses.",
    "Pagos, saldos pendientes y solicitud posterior de review.",
  ],
  en: [
    "Centralized patient database with lead, prospect, active, or inactive status.",
    "Fast front-desk intake form: contact data, interest, notes, and next action.",
    "Calendar by time slot, patient, service, room/chair, and status.",
    "48-24-1 reminders and preventive 6-month recall flow.",
    "Payments, pending balances, and post-visit review requests.",
  ],
};

const dashboardCopyByLocale = {
  es: {
    navOverview: "Operación",
    navCalendar: "Calendario",
    navBilling: "Cobros",
    navAssistant: "Asistente",
    navAdmin: "Admin ZQX",
    activeBusiness: "Empresa activa",
    signOut: "Salir",
    workspace: "Workspace",
    zqxAdmin: "Administración ZQX",
    noModules: "sin módulos activos",
    addCharge: "Cobro",
    metricsToConvert: "por convertir",
    metricsToday: "hoy",
    metricsFollowups: "Seguimientos",
    metricsFollowupsHelper: "abiertos o en progreso",
    metricsPendingBalance: "Saldo pendiente",
    metricsPendingBalanceHelper: "por cobrar",
    metricsPaidRevenue: "Ingresos pagados",
    metricsNoShowsNone: "sin no-shows registrados",
    noClient: "Sin cliente",
    allUsersLabel: "Admin ZQX",
    chatPlaceholder: "Preguntar sobre citas, saldos, módulos o recordatorios",
    chatLeadTitle: "Lead rápido",
    chatDone: "Listo.",
    chatGreeting: (moduleLabel: string) => `Estoy conectado al ${moduleLabel}. Puedo responder FAQs, capturar leads y crear citas.`,
    moduleOff: "Off",
    moduleOn: "On",
  },
  en: {
    navOverview: "Operations",
    navCalendar: "Calendar",
    navBilling: "Billing",
    navAssistant: "Assistant",
    navAdmin: "ZQX Admin",
    activeBusiness: "Active company",
    signOut: "Sign out",
    workspace: "Workspace",
    zqxAdmin: "ZQX Administration",
    noModules: "no active modules",
    addCharge: "Charge",
    metricsToConvert: "to convert",
    metricsToday: "today",
    metricsFollowups: "Follow-ups",
    metricsFollowupsHelper: "open or in progress",
    metricsPendingBalance: "Pending balance",
    metricsPendingBalanceHelper: "to collect",
    metricsPaidRevenue: "Paid revenue",
    metricsNoShowsNone: "no no-shows registered",
    noClient: "No client",
    allUsersLabel: "ZQX Admin",
    chatPlaceholder: "Ask about appointments, balances, modules, or reminders",
    chatLeadTitle: "Quick lead",
    chatDone: "Done.",
    chatGreeting: (moduleLabel: string) => `I am connected to ${moduleLabel}. I can answer FAQs, capture leads, and create appointments.`,
    moduleOff: "Off",
    moduleOn: "On",
  },
} as const;

function money(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "es" ? "es-GT" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateAndTimeFromIso(value: string) {
  const date = new Date(value);
  return {
    date: formatDateInput(date),
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-GT" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDay(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-GT" : "en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function hourSlot(value: string) {
  const date = new Date(value);
  return `${pad(date.getHours())}:00`;
}

function sortAppointments(records: AppointmentRecord[]) {
  return [...records].sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime());
}

function statusClass(status: string) {
  if (status === "paid" || status === "confirmed" || status === "completed" || status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "partial" || status === "pending" || status === "in_progress") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "open" || status === "lead" || status === "prospect") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-neutral-200 bg-neutral-100 text-neutral-600";
}

function userAuthSource(user: UserRecord) {
  if (user.auth_source === "google") return "google";
  if (user.auth_source === "local") return "local";
  return user.temporary_password ? "local" : "google";
}

function defaultLocation(industry: BusinessIndustry, locale: Locale) {
  if (industry === "dentist") return locale === "es" ? "Sillón 1" : "Chair 1";
  if (industry === "restaurant") return locale === "es" ? "Salón principal" : "Main hall";
  if (industry === "university") return locale === "es" ? "Admisiones" : "Admissions";
  return locale === "es" ? "Virtual" : "Remote";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildUniqueSlug(base: string, existing: Set<string>) {
  const normalizedBase = base || "company";
  if (!existing.has(normalizedBase)) return normalizedBase;

  let suffix = 2;
  let next = `${normalizedBase}-${suffix}`;

  while (existing.has(next)) {
    suffix += 1;
    next = `${normalizedBase}-${suffix}`;
  }

  return next;
}

function businessInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "B";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function businessLogoUrl(slug: string, logoUrl?: string) {
  return logoUrl || fallbackBusinessLogos[slug] || undefined;
}

function BusinessLogo({
  name,
  logoUrl,
  className = "h-10 w-16",
  textClassName = "text-sm",
}: {
  name: string;
  logoUrl?: string;
  className?: string;
  textClassName?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (logoUrl && !hasError) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        onError={() => setHasError(true)}
        className={`${className} rounded-md border border-brand-border bg-white p-1 object-contain`}
      />
    );
  }

  return (
    <div className={`${className} grid place-items-center rounded-md border border-brand-border bg-neutral-100 font-semibold text-brand-muted ${textClassName}`}>
      {businessInitials(name)}
    </div>
  );
}

export default function SystemDashboard({ snapshot }: DashboardProps) {
  const router = useRouter();
  const primaryModule = getPrimaryModuleForIndustry(snapshot.activeBusiness.industry);
  const isDentist = snapshot.activeBusiness.industry === "dentist";
  const initialService = snapshot.services[0];
  const initialClient = snapshot.clients[0];
  const todayInput = formatDateInput(new Date());
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const t = dashboardCopyByLocale[locale];
  const clientStatusLabels = clientStatusLabelsByLocale[locale];
  const clientSortLabels = clientSortLabelsByLocale[locale];
  const appointmentStatusLabels = appointmentStatusLabelsByLocale[locale];
  const paymentStatusLabels = paymentStatusLabelsByLocale[locale];
  const industryLabels = industryLabelsByLocale[locale];
  const workflowByIndustry = workflowByIndustryByLocale[locale];
  const dentalCapabilities = dentalCapabilitiesByLocale[locale];

  const [businesses, setBusinesses] = useState(snapshot.businesses);
  const [view, setView] = useState<WorkspaceView>(snapshot.user.isZqxAdmin ? "admin" : "overview");
  const [clients, setClients] = useState(snapshot.clients);
  const [appointments, setAppointments] = useState(sortAppointments(snapshot.appointments));
  const [payments, setPayments] = useState(snapshot.payments);
  const [followups, setFollowups] = useState(snapshot.followups);
  const [users, setUsers] = useState(snapshot.user.isZqxAdmin ? snapshot.allUsers : snapshot.users);
  const [businessModules, setBusinessModules] = useState(snapshot.businessModules);
  const [allBusinessModules, setAllBusinessModules] = useState(snapshot.allBusinessModules);
  const [selectedBusinessId, setSelectedBusinessId] = useState(snapshot.activeBusiness.id);
  const [showCompanyProfile, setShowCompanyProfile] = useState(false);
  const [companyClients, setCompanyClients] = useState(snapshot.clients);
  const [companyAppointments, setCompanyAppointments] = useState(snapshot.appointments);
  const [companyPayments, setCompanyPayments] = useState(snapshot.payments);
  const [companyFollowups, setCompanyFollowups] = useState(snapshot.followups);
  const [companyUsers, setCompanyUsers] = useState(snapshot.users);
  const [companyNoteDraft, setCompanyNoteDraft] = useState(snapshot.activeBusiness.notes);
  const [companyActionMessage, setCompanyActionMessage] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: dashboardCopyByLocale[defaultLocale].chatGreeting(primaryModule.label),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [lead, setLead] = useState({ name: "", phone: "", email: "", serviceInterest: initialService?.name ?? "" });
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    role: "operator" as UserRecord["role"],
    businessId: snapshot.activeBusiness.id,
    temporaryPassword: "",
  });
  const [userAccessDrafts, setUserAccessDrafts] = useState<Record<string, UserAccessDraft>>({});
  const [userAccessMessage, setUserAccessMessage] = useState("");
  const [isBusinessFormOpen, setIsBusinessFormOpen] = useState(false);
  const [businessAdminMessage, setBusinessAdminMessage] = useState("");
  const [newBusiness, setNewBusiness] = useState({
    name: "",
    contactEmail: "",
    logoUrl: "",
    industry: "general" as BusinessIndustry,
    status: "active" as "active" | "demo" | "paused",
    notes: "",
    slug: "",
  });
  const [newBusinessModuleIds, setNewBusinessModuleIds] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState<"all" | ClientRecord["status"]>("all");
  const [clientSort, setClientSort] = useState<ClientSortOption>("recent");
  const [selectedClientId, setSelectedClientId] = useState(initialClient?.id ?? "");
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    status: "lead" as ClientRecord["status"],
    serviceInterest: initialService?.name ?? "",
    notes: "",
  });
  const [appointmentForm, setAppointmentForm] = useState({
    clientId: initialClient?.id ?? "",
    serviceId: initialService?.id ?? "",
    date: todayInput,
    time: "09:00",
    location: defaultLocation(snapshot.activeBusiness.industry, defaultLocale),
    status: "pending" as AppointmentRecord["status"],
    notes: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    clientId: initialClient?.id ?? "",
    serviceId: initialService?.id ?? "",
    amount: String(initialService?.price ?? 0),
    amountPaid: "0",
    status: "pending" as PaymentRecord["status"],
    dueDate: todayInput,
    description: initialService?.name ?? "",
  });
  const [clientActionMessage, setClientActionMessage] = useState("");
  const [clientNotesDraft, setClientNotesDraft] = useState(initialClient?.notes ?? "");
  const [clientProfileMessage, setClientProfileMessage] = useState("");
  const [schedulerMessage, setSchedulerMessage] = useState("");
  const [paymentActionMessage, setPaymentActionMessage] = useState("");
  const [editingAppointmentId, setEditingAppointmentId] = useState<string>("");
  const [appointmentEditForm, setAppointmentEditForm] = useState({
    date: todayInput,
    time: "09:00",
    status: "pending" as AppointmentRecord["status"],
    location: defaultLocation(snapshot.activeBusiness.industry, defaultLocale),
    notes: "",
  });
  const [isBusy, setIsBusy] = useState(false);
  const companyProfileRef = useRef<HTMLDivElement | null>(null);

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const businessById = useMemo(() => new Map(businesses.map((business) => [business.id, business])), [businesses]);
  const selectedBusiness = useMemo(() => businesses.find((business) => business.id === selectedBusinessId) ?? snapshot.activeBusiness, [businesses, selectedBusinessId, snapshot.activeBusiness]);
  const serviceById = useMemo(() => new Map(snapshot.services.map((service) => [service.id, service])), [snapshot.services]);
  const moduleByKey = useMemo(() => new Map(snapshot.modules.map((module) => [module.key, module])), [snapshot.modules]);
  const generalModuleId = moduleByKey.get("general")?.id ?? "";
  const selectedBusinessModulesMap = useMemo(
    () => new Map(allBusinessModules.filter((module) => module.business_id === selectedBusiness.id).map((module) => [module.module_id, module])),
    [allBusinessModules, selectedBusiness.id],
  );
  const enabledModuleIds = useMemo(() => new Set(businessModules.filter((businessModule) => businessModule.enabled).map((businessModule) => businessModule.module_id)), [businessModules]);
  const enabledModules = useMemo(() => snapshot.modules.filter((module) => enabledModuleIds.has(module.id)), [enabledModuleIds, snapshot.modules]);
  const openFollowups = useMemo(() => followups.filter((followup) => followup.status === "open" || followup.status === "in_progress"), [followups]);
  const clientBalanceById = useMemo(() => {
    const balances = new Map<string, number>();

    for (const payment of payments) {
      const pending = payment.status === "paid" ? 0 : Math.max(payment.amount - payment.amount_paid, 0);
      balances.set(payment.client_id, (balances.get(payment.client_id) ?? 0) + pending);
    }

    return balances;
  }, [payments]);
  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesStatus = clientStatusFilter === "all" || client.status === clientStatusFilter;
      const text = `${client.name} ${client.email} ${client.phone} ${client.service_interest} ${client.notes}`.toLowerCase();
      const matchesSearch = !query || text.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [clientSearch, clientStatusFilter, clients]);
  const sortedClients = useMemo(() => {
    const sorted = [...filteredClients];

    if (clientSort === "recent") {
      sorted.sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
      return sorted;
    }

    if (clientSort === "oldest") {
      sorted.sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
      return sorted;
    }

    if (clientSort === "az") {
      sorted.sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" }));
      return sorted;
    }

    if (clientSort === "za") {
      sorted.sort((left, right) => right.name.localeCompare(left.name, "es", { sensitivity: "base" }));
      return sorted;
    }

    sorted.sort((left, right) => (clientBalanceById.get(right.id) ?? 0) - (clientBalanceById.get(left.id) ?? 0));
    return sorted;
  }, [filteredClients, clientSort, clientBalanceById]);

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? sortedClients[0] ?? clients[0];
  const editingAppointment = appointments.find((appointment) => appointment.id === editingAppointmentId);
  const selectedClientAppointments = selectedClient ? appointments.filter((appointment) => appointment.client_id === selectedClient.id) : [];
  const selectedClientPayments = selectedClient ? payments.filter((payment) => payment.client_id === selectedClient.id) : [];
  const selectedClientFollowups = selectedClient ? followups.filter((followup) => followup.client_id === selectedClient.id) : [];
  const selectedClientAppointmentsSorted = useMemo(
    () => [...selectedClientAppointments].sort((left, right) => new Date(right.scheduled_at).getTime() - new Date(left.scheduled_at).getTime()),
    [selectedClientAppointments],
  );
  const selectedClientPaymentsSorted = useMemo(
    () => [...selectedClientPayments].sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()),
    [selectedClientPayments],
  );
  const selectedClientFollowupsSorted = useMemo(
    () => [...selectedClientFollowups].sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()),
    [selectedClientFollowups],
  );
  const selectedClientActivity = useMemo(() => {
    if (!selectedClient) return [];

    const activity = [
      ...selectedClientAppointments.map((item) => ({
        id: `appt-${item.id}`,
        timestamp: item.updated_at,
        label: `${locale === "es" ? "Cita" : "Appointment"} ${item.title}`,
        detail: `${appointmentStatusLabels[item.status]} | ${formatDateTime(item.scheduled_at, locale)}`,
      })),
      ...selectedClientPayments.map((item) => ({
        id: `pay-${item.id}`,
        timestamp: item.updated_at,
        label: `${locale === "es" ? "Cobro" : "Charge"} ${item.description}`,
        detail: `${paymentStatusLabels[item.status]} | ${money(item.amount, locale)}`,
      })),
      ...selectedClientFollowups.map((item) => ({
        id: `follow-${item.id}`,
        timestamp: item.updated_at,
        label: `${locale === "es" ? "Seguimiento" : "Follow-up"} ${item.title}`,
        detail: `${item.channel} | ${formatDateTime(item.due_at, locale)}`,
      })),
    ];

    return activity.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
  }, [appointmentStatusLabels, locale, paymentStatusLabels, selectedClient, selectedClientAppointments, selectedClientFollowups, selectedClientPayments]);
  const selectedClientPendingBalance = selectedClientPayments.reduce((total, payment) => (payment.status === "paid" ? total : total + Math.max(payment.amount - payment.amount_paid, 0)), 0);
  const pendingBalance = payments.reduce((total, payment) => (payment.status === "paid" ? total : total + Math.max(payment.amount - payment.amount_paid, 0)), 0);
  const paidRevenue = payments.reduce((total, payment) => total + payment.amount_paid, 0);
  const upcomingAppointments = appointments.filter((appointment) => appointment.status === "pending" || appointment.status === "confirmed");
  const noShowCount = appointments.filter((appointment) => appointment.status === "no_show").length;
  const referenceDay = startOfDay(new Date());
  const calendarDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = startOfDay(new Date());
        date.setDate(date.getDate() + index);
        return date;
      }),
    [],
  );
  const todayAppointments = appointments.filter((appointment) => sameDay(new Date(appointment.scheduled_at), referenceDay));
  const workflow = workflowByIndustry[snapshot.activeBusiness.industry] ?? workflowByIndustry.general;
  const activeBusinessUsers = users.filter((user) => user.business_id === snapshot.activeBusiness.id);
  const selectedBusinessUsers = useMemo(
    () => (snapshot.user.isZqxAdmin ? users : users.filter((user) => user.business_id === selectedBusiness.id)),
    [selectedBusiness.id, snapshot.user.isZqxAdmin, users],
  );
  const showAdminOverview = !isBusinessFormOpen && !showCompanyProfile;
  const selectedBusinessModuleIds = useMemo(
    () => new Set(allBusinessModules.filter((module) => module.business_id === selectedBusiness.id && module.enabled).map((module) => module.module_id)),
    [allBusinessModules, selectedBusiness.id],
  );
  const selectedBusinessModules = useMemo(() => snapshot.modules.filter((module) => selectedBusinessModuleIds.has(module.id)), [snapshot.modules, selectedBusinessModuleIds]);
  const companyPendingBalance = useMemo(
    () => companyPayments.reduce((total, payment) => (payment.status === "paid" ? total : total + Math.max(payment.amount - payment.amount_paid, 0)), 0),
    [companyPayments],
  );
  const companyUpcomingAppointments = useMemo(
    () => companyAppointments.filter((appointment) => appointment.status === "pending" || appointment.status === "confirmed").length,
    [companyAppointments],
  );
  const companyRecentActivity = useMemo(() => {
    const activity = [
      ...companyClients.map((item) => ({
        id: `client-${item.id}`,
        timestamp: item.updated_at,
        label: `${locale === "es" ? "Cliente" : "Client"}: ${item.name}`,
        detail: `${locale === "es" ? "Estado" : "Status"} ${item.status}`,
      })),
      ...companyAppointments.map((item) => ({
        id: `appt-${item.id}`,
        timestamp: item.updated_at,
        label: `${locale === "es" ? "Cita" : "Appointment"}: ${item.title}`,
        detail: `${appointmentStatusLabels[item.status]} | ${formatDateTime(item.scheduled_at, locale)}`,
      })),
      ...companyPayments.map((item) => ({
        id: `pay-${item.id}`,
        timestamp: item.updated_at,
        label: `${locale === "es" ? "Cobro" : "Charge"}: ${item.description}`,
        detail: `${paymentStatusLabels[item.status]} | ${money(item.amount, locale)}`,
      })),
      ...companyFollowups.map((item) => ({
        id: `follow-${item.id}`,
        timestamp: item.updated_at,
        label: `${locale === "es" ? "Seguimiento" : "Follow-up"}: ${item.title}`,
        detail: `${item.channel} | ${formatDateTime(item.due_at, locale)}`,
      })),
    ];

    return activity.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()).slice(0, 10);
  }, [appointmentStatusLabels, companyAppointments, companyClients, companyFollowups, companyPayments, locale, paymentStatusLabels]);

  const metricCards = [
    { label: primaryModule.entityLabel, value: String(clients.length), helper: `${clients.filter((client) => client.status === "lead" || client.status === "prospect").length} ${t.metricsToConvert}` },
    { label: primaryModule.appointmentLabel, value: String(upcomingAppointments.length), helper: `${todayAppointments.length} ${t.metricsToday}` },
    { label: t.metricsFollowups, value: String(openFollowups.length), helper: t.metricsFollowupsHelper },
    { label: t.metricsPendingBalance, value: money(pendingBalance, locale), helper: t.metricsPendingBalanceHelper },
    { label: t.metricsPaidRevenue, value: money(paidRevenue, locale), helper: noShowCount ? `${noShowCount} no-shows` : t.metricsNoShowsNone },
  ];

  const navigation: Array<{ id: WorkspaceView; label: string }> = [
    { id: "overview", label: t.navOverview },
    { id: "records", label: primaryModule.entityLabel },
    { id: "calendar", label: t.navCalendar },
    { id: "billing", label: t.navBilling },
    ...(snapshot.user.isZqxAdmin ? [{ id: "admin" as const, label: t.navAdmin }] : []),
    { id: "assistant", label: t.navAssistant },
  ];

  useEffect(() => {
    const stored = window.localStorage.getItem(uiLocaleStorageKey);
    if (isLocale(stored)) setLocale(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(uiLocaleStorageKey, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    setChatMessages((current) => {
      if (current.length !== 1 || current[0]?.role !== "assistant") return current;
      return [{ role: "assistant", text: t.chatGreeting(primaryModule.label) }];
    });
  }, [primaryModule.label, t]);

  useEffect(() => {
    const next = new Set(newBusinessModuleIds);
    if (generalModuleId) next.add(generalModuleId);
    const industryModuleId = moduleByKey.get(newBusiness.industry)?.id;
    if (industryModuleId) next.add(industryModuleId);

    const normalized = Array.from(next);
    const changed = normalized.length !== newBusinessModuleIds.length || normalized.some((id) => !newBusinessModuleIds.includes(id));
    if (changed) setNewBusinessModuleIds(normalized);
  }, [generalModuleId, moduleByKey, newBusiness.industry, newBusinessModuleIds]);

  useEffect(() => {
    setBusinesses(snapshot.businesses);
    setAllBusinessModules(snapshot.allBusinessModules);
    setUsers(snapshot.user.isZqxAdmin ? snapshot.allUsers : snapshot.users);
    setSelectedBusinessId(snapshot.activeBusiness.id);
  }, [snapshot.activeBusiness.id, snapshot.allBusinessModules, snapshot.allUsers, snapshot.businesses, snapshot.user.isZqxAdmin, snapshot.users]);

  useEffect(() => {
    const drafts = Object.fromEntries(
      users.map((user) => [
        user.id,
        {
          business_id: user.business_id,
          role: user.role,
          status: user.status,
        } as UserAccessDraft,
      ]),
    );

    setUserAccessDrafts(drafts);
  }, [users]);

  useEffect(() => {
    setCompanyNoteDraft(selectedBusiness.notes || "");
    setCompanyActionMessage("");
  }, [selectedBusiness.id, selectedBusiness.notes]);

  useEffect(() => {
    setClientNotesDraft(selectedClient?.notes ?? "");
    setClientProfileMessage("");
  }, [selectedClient?.id, selectedClient?.notes]);

  useEffect(() => {
    if (selectedBusinessId === snapshot.activeBusiness.id) {
      setCompanyClients(snapshot.clients);
      setCompanyAppointments(snapshot.appointments);
      setCompanyPayments(snapshot.payments);
      setCompanyFollowups(snapshot.followups);
      setCompanyUsers(snapshot.users);
      return;
    }

    let cancelled = false;

    async function loadCompanyWorkspace() {
      setCompanyLoading(true);

      try {
        const [clientsRes, appointmentsRes, paymentsRes, followupsRes, usersRes] = await Promise.all([
          fetch(`/api/records/clients?business_id=${selectedBusinessId}`),
          fetch(`/api/records/appointments?business_id=${selectedBusinessId}`),
          fetch(`/api/records/payments?business_id=${selectedBusinessId}`),
          fetch(`/api/records/followups?business_id=${selectedBusinessId}`),
          fetch(`/api/records/users?business_id=${selectedBusinessId}`),
        ]);

        if (!clientsRes.ok || !appointmentsRes.ok || !paymentsRes.ok || !followupsRes.ok || !usersRes.ok) return;

        const [clientsPayload, appointmentsPayload, paymentsPayload, followupsPayload, usersPayload] = (await Promise.all([
          clientsRes.json(),
          appointmentsRes.json(),
          paymentsRes.json(),
          followupsRes.json(),
          usersRes.json(),
        ])) as Array<{ records?: unknown[] }>;

        if (cancelled) return;

        setCompanyClients((clientsPayload.records as DashboardSnapshot["clients"]) ?? []);
        setCompanyAppointments((appointmentsPayload.records as DashboardSnapshot["appointments"]) ?? []);
        setCompanyPayments((paymentsPayload.records as DashboardSnapshot["payments"]) ?? []);
        setCompanyFollowups((followupsPayload.records as DashboardSnapshot["followups"]) ?? []);
        setCompanyUsers((usersPayload.records as DashboardSnapshot["users"]) ?? []);
      } finally {
        if (!cancelled) setCompanyLoading(false);
      }
    }

    void loadCompanyWorkspace();

    return () => {
      cancelled = true;
    };
  }, [selectedBusinessId, snapshot.activeBusiness.id, snapshot.appointments, snapshot.clients, snapshot.followups, snapshot.payments, snapshot.users]);

  async function toggleSelectedBusinessModule(module: ModuleRecord) {
    setIsBusy(true);
    setBusinessAdminMessage("");

    try {
      const existing = allBusinessModules.find((businessModule) => businessModule.business_id === selectedBusiness.id && businessModule.module_id === module.id);
      const nextEnabled = !existing?.enabled;
      if (module.key === "general" && !nextEnabled) return;

      const payload = {
        business_id: selectedBusiness.id,
        module_id: module.id,
        enabled: nextEnabled,
        configuration: existing?.configuration ?? {},
      };
      const response = await fetch(existing ? `/api/records/business_modules/${existing.id}` : "/api/records/business_modules", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { record?: BusinessModuleRecord };

      if (response.ok && data.record) {
        setAllBusinessModules((current) => {
          const currentIndex = current.findIndex((item) => item.id === data.record?.id);
          if (currentIndex === -1) return [...current, data.record as BusinessModuleRecord];

          return current.map((item) => (item.id === data.record?.id ? (data.record as BusinessModuleRecord) : item));
        });

        if (selectedBusiness.id === snapshot.activeBusiness.id) {
          setBusinessModules((current) => {
            const currentIndex = current.findIndex((item) => item.id === data.record?.id);
            if (currentIndex === -1) return [...current, data.record as BusinessModuleRecord];

            return current.map((item) => (item.id === data.record?.id ? (data.record as BusinessModuleRecord) : item));
          });
        }

        setBusinessAdminMessage(
          locale === "es"
            ? `Módulo ${nextEnabled ? "activado" : "desactivado"} para ${selectedBusiness.name}.`
            : `Module ${nextEnabled ? "enabled" : "disabled"} for ${selectedBusiness.name}.`,
        );
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function createBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot.user.isZqxAdmin) return;
    if (!newBusiness.name.trim()) return;
    setIsBusy(true);
    setBusinessAdminMessage("");

    try {
      const requestedSlug = slugify(newBusiness.slug || newBusiness.name);
      const slug = buildUniqueSlug(requestedSlug, new Set(businesses.map((business) => business.slug)));
      const response = await fetch("/api/records/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBusiness.name.trim(),
          slug,
          industry: newBusiness.industry,
          contact_email: newBusiness.contactEmail.trim().toLowerCase(),
          logo_url: newBusiness.logoUrl.trim() || undefined,
          status: newBusiness.status,
          notes: newBusiness.notes.trim() || (locale === "es" ? "Empresa creada desde administración ZQX." : "Company created from ZQX administration."),
        }),
      });
      const data = (await response.json()) as { record?: (typeof businesses)[number] };
      if (!response.ok || !data.record) {
        setBusinessAdminMessage(locale === "es" ? "No se pudo crear la empresa." : "Could not create company.");
        return;
      }

      const selectedModuleIds = new Set(newBusinessModuleIds);
      if (generalModuleId) selectedModuleIds.add(generalModuleId);
      const createdBusinessModules: BusinessModuleRecord[] = [];

      for (const module of snapshot.modules) {
        if (!selectedModuleIds.has(module.id)) continue;
        const moduleResponse = await fetch("/api/records/business_modules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_id: data.record.id,
            module_id: module.id,
            enabled: true,
            configuration: {},
          }),
        });
        const moduleData = (await moduleResponse.json()) as { record?: BusinessModuleRecord };
        if (moduleResponse.ok && moduleData.record) createdBusinessModules.push(moduleData.record);
      }

      setBusinesses((current) => [...current, data.record as (typeof businesses)[number]]);
      if (createdBusinessModules.length > 0) {
        setAllBusinessModules((current) => [...current, ...createdBusinessModules]);
      }
      setSelectedBusinessId(data.record.id);
      setShowCompanyProfile(true);
      setNewUser((current) => ({ ...current, businessId: data.record?.id ?? current.businessId }));
      setNewBusiness({
        name: "",
        contactEmail: "",
        logoUrl: "",
        industry: "general",
        status: "active",
        notes: "",
        slug: "",
      });
      setNewBusinessModuleIds(generalModuleId ? [generalModuleId] : []);
      setIsBusinessFormOpen(false);
      setBusinessAdminMessage(locale === "es" ? "Empresa creada y módulos asignados." : "Company created and modules assigned.");
    } finally {
      setIsBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function inviteUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newUser.email.trim()) return;
    setUserAccessMessage("");
    setIsBusy(true);

    try {
      const businessId = snapshot.user.isZqxAdmin ? newUser.businessId : snapshot.activeBusiness.id;
      const response = await fetch("/api/records/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          email: newUser.email.trim().toLowerCase(),
          name: newUser.name.trim() || newUser.email.trim(),
          role: newUser.role,
          status: newUser.temporaryPassword.trim() ? "active" : "invited",
          temporary_password: newUser.temporaryPassword.trim() || undefined,
          auth_source: "local",
        }),
      });
      const data = (await response.json()) as { record?: UserRecord };

      if (response.ok && data.record) {
        setUsers((current) => [...current, data.record as UserRecord]);
        setNewUser({ email: "", name: "", role: "operator", businessId: snapshot.activeBusiness.id, temporaryPassword: "" });
        setUserAccessMessage(locale === "es" ? "Usuario creado." : "User created.");
      }
    } finally {
      setIsBusy(false);
    }
  }

  function updateUserAccessDraft(user: UserRecord, patch: Partial<UserAccessDraft>) {
    setUserAccessDrafts((current) => ({
      ...current,
      [user.id]: {
        ...(current[user.id] ?? {
          business_id: user.business_id,
          role: user.role,
          status: user.status,
        }),
        ...patch,
      },
    }));
  }

  async function saveUserAccess(user: UserRecord) {
    const draft = userAccessDrafts[user.id];
    if (!draft) return;

    const changed = draft.business_id !== user.business_id || draft.role !== user.role || draft.status !== user.status;
    if (!changed) {
      setUserAccessMessage(locale === "es" ? "No hay cambios por guardar." : "No changes to save.");
      return;
    }

    setIsBusy(true);
    setUserAccessMessage("");

    try {
      const response = await fetch(`/api/records/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: draft.business_id,
          role: draft.role,
          status: draft.status,
        }),
      });
      const data = (await response.json()) as { record?: UserRecord };

      if (response.ok && data.record) {
        setUsers((current) => current.map((item) => (item.id === data.record?.id ? (data.record as UserRecord) : item)));
        setCompanyUsers((current) => current.map((item) => (item.id === data.record?.id ? (data.record as UserRecord) : item)));
        setUserAccessMessage(
          locale === "es" ? `Acceso actualizado para ${data.record.name}.` : `Access updated for ${data.record.name}.`,
        );
      } else {
        setUserAccessMessage(locale === "es" ? "No se pudo actualizar el usuario." : "Could not update user.");
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteUser(user: UserRecord) {
    if (user.role === "zqx_owner") {
      setUserAccessMessage(locale === "es" ? "El usuario propietario no puede eliminarse." : "Owner account cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(
      locale === "es" ? `Eliminar usuario ${user.email}? Esta accion no se puede deshacer.` : `Delete user ${user.email}? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setIsBusy(true);
    setUserAccessMessage("");

    try {
      const response = await fetch(`/api/records/users/${user.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setUsers((current) => current.filter((item) => item.id !== user.id));
        setCompanyUsers((current) => current.filter((item) => item.id !== user.id));
        setUserAccessDrafts((current) => {
          const next = { ...current };
          delete next[user.id];
          return next;
        });
        setUserAccessMessage(locale === "es" ? `Usuario ${user.email} eliminado.` : `User ${user.email} deleted.`);
      } else {
        setUserAccessMessage(locale === "es" ? "No se pudo eliminar el usuario." : "Could not delete user.");
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function saveCompanyNotes() {
    if (!selectedBusiness) return;
    setIsBusy(true);
    setCompanyActionMessage("");

    try {
      const response = await fetch(`/api/records/businesses/${selectedBusiness.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: companyNoteDraft.trim() }),
      });
      const data = (await response.json()) as { record?: (typeof businesses)[number] };

      if (response.ok && data.record) {
        setBusinesses((current) => current.map((item) => (item.id === data.record?.id ? (data.record as (typeof businesses)[number]) : item)));
        setCompanyActionMessage(locale === "es" ? "Notas de empresa guardadas." : "Company notes saved.");
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newClient.name.trim()) return;
    setIsBusy(true);
    setClientActionMessage("");

    try {
      const response = await fetch("/api/records/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: snapshot.activeBusiness.id,
          name: newClient.name.trim(),
          type: "person",
          email: newClient.email.trim(),
          phone: newClient.phone.trim(),
          status: newClient.status,
          service_interest: newClient.serviceInterest,
          notes: newClient.notes.trim() || (locale === "es" ? "Registro ingresado por recepción." : "Record captured by front desk."),
        }),
      });
      const data = (await response.json()) as { record?: ClientRecord };
      const record = data.record;

      if (response.ok && record) {
        setClients((current) => [record, ...current]);
        setSelectedClientId(record.id);
        setAppointmentForm((current) => ({ ...current, clientId: current.clientId || record.id }));
        setClientStatusFilter("all");
        setClientSearch("");
        setIsClientFormOpen(false);
        setNewClient({
          name: "",
          email: "",
          phone: "",
          status: "lead",
          serviceInterest: initialService?.name ?? "",
          notes: "",
        });
        setClientActionMessage(
          locale === "es" ? `${primaryModule.entitySingular} creado y listo para calendarizar.` : `${primaryModule.entitySingular} created and ready to schedule.`,
        );
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function saveClientNotes() {
    if (!selectedClient) return;
    setIsBusy(true);
    setClientProfileMessage("");

    try {
      const response = await fetch(`/api/records/clients/${selectedClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: clientNotesDraft.trim() }),
      });
      const data = (await response.json()) as { record?: ClientRecord };

      if (response.ok && data.record) {
        setClients((current) => current.map((item) => (item.id === selectedClient.id ? (data.record as ClientRecord) : item)));
        setClientProfileMessage(locale === "es" ? "Notas de cliente guardadas." : "Client notes saved.");
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = clientById.get(appointmentForm.clientId);
    const service = serviceById.get(appointmentForm.serviceId);

    if (!client || !service) {
      setSchedulerMessage(
        locale === "es"
          ? `Selecciona ${primaryModule.entitySingular.toLowerCase()} y servicio antes de guardar.`
          : `Select ${primaryModule.entitySingular.toLowerCase()} and a service before saving.`,
      );
      return;
    }

    setIsBusy(true);
    setSchedulerMessage("");

    try {
      const scheduledAt = new Date(`${appointmentForm.date}T${appointmentForm.time}:00`);
      const response = await fetch("/api/records/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: snapshot.activeBusiness.id,
          client_id: client.id,
          service_id: service.id,
          title: service.name,
          scheduled_at: scheduledAt.toISOString(),
          status: appointmentForm.status,
          location: appointmentForm.location.trim() || defaultLocation(snapshot.activeBusiness.industry, locale),
          notes: appointmentForm.notes.trim() || (locale === "es" ? "Cita registrada en agenda." : "Appointment logged in calendar."),
        }),
      });
      const data = (await response.json()) as { record?: AppointmentRecord };
      const record = data.record;

      if (response.ok && record) {
        setAppointments((current) => sortAppointments([...current, record]));
        setSelectedClientId(client.id);
        setSchedulerMessage(
          locale === "es" ? `${primaryModule.appointmentSingular} guardada para ${client.name}.` : `${primaryModule.appointmentSingular} saved for ${client.name}.`,
        );
        setAppointmentForm((current) => ({ ...current, notes: "" }));
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function createPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = clientById.get(paymentForm.clientId);
    const service = serviceById.get(paymentForm.serviceId);
    const amount = Number(paymentForm.amount);
    const enteredPaid = Number(paymentForm.amountPaid);

    if (!client || !service || !Number.isFinite(amount) || amount <= 0) {
      setPaymentActionMessage(locale === "es" ? "Selecciona cliente, servicio y monto válido." : "Select client, service, and a valid amount.");
      return;
    }

    const amountPaid = paymentForm.status === "paid" ? amount : paymentForm.status === "pending" ? 0 : Math.max(0, Math.min(enteredPaid, amount));
    setIsBusy(true);
    setPaymentActionMessage("");

    try {
      const dueAt = new Date(`${paymentForm.dueDate}T17:00:00`);
      const response = await fetch("/api/records/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: snapshot.activeBusiness.id,
          client_id: client.id,
          service_id: service.id,
          amount,
          amount_paid: amountPaid,
          currency: "USD",
          status: paymentForm.status,
          due_at: dueAt.toISOString(),
          paid_at: paymentForm.status === "paid" ? new Date().toISOString() : undefined,
          description: paymentForm.description.trim() || service.name,
        }),
      });
      const data = (await response.json()) as { record?: PaymentRecord };
      const record = data.record;

      if (response.ok && record) {
        setPayments((current) => [record, ...current]);
        setSelectedClientId(client.id);
        setPaymentActionMessage(locale === "es" ? `Cobro registrado para ${client.name}.` : `Charge registered for ${client.name}.`);
        setPaymentForm((current) => ({ ...current, amountPaid: "0", status: "pending", description: service.name }));
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function markPaymentPaid(payment: PaymentRecord) {
    setIsBusy(true);
    setPaymentActionMessage("");

    try {
      const response = await fetch(`/api/records/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "paid",
          amount_paid: payment.amount,
          paid_at: new Date().toISOString(),
        }),
      });
      const data = (await response.json()) as { record?: PaymentRecord };

      if (response.ok && data.record) {
        setPayments((current) => current.map((item) => (item.id === payment.id ? (data.record as PaymentRecord) : item)));
        setPaymentActionMessage(locale === "es" ? "Pago marcado como completado." : "Payment marked as completed.");
      }
    } finally {
      setIsBusy(false);
    }
  }

  function startEditingAppointment(appointment: AppointmentRecord) {
    const values = dateAndTimeFromIso(appointment.scheduled_at);
    setEditingAppointmentId(appointment.id);
    setAppointmentEditForm({
      date: values.date,
      time: values.time,
      status: appointment.status,
      location: appointment.location,
      notes: appointment.notes,
    });
    setSchedulerMessage("");
  }

  async function saveAppointmentEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAppointment) return;
    setIsBusy(true);
    setSchedulerMessage("");

    try {
      const scheduledAt = new Date(`${appointmentEditForm.date}T${appointmentEditForm.time}:00`);
      const response = await fetch(`/api/records/appointments/${editingAppointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_at: scheduledAt.toISOString(),
          status: appointmentEditForm.status,
          location: appointmentEditForm.location.trim() || defaultLocation(snapshot.activeBusiness.industry, locale),
          notes: appointmentEditForm.notes.trim(),
        }),
      });
      const data = (await response.json()) as { record?: AppointmentRecord };

      if (response.ok && data.record) {
        setAppointments((current) => sortAppointments(current.map((item) => (item.id === editingAppointment.id ? (data.record as AppointmentRecord) : item))));
        setSchedulerMessage(locale === "es" ? "Cita actualizada." : "Appointment updated.");
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function createFollowupForSelectedClient(title: string, channel: FollowupRecord["channel"]) {
    if (!selectedClient) return;
    setIsBusy(true);
    setClientActionMessage("");

    try {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 1);
      dueAt.setHours(15, 0, 0, 0);
      const response = await fetch("/api/records/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: snapshot.activeBusiness.id,
          client_id: selectedClient.id,
          title,
          channel,
          due_at: dueAt.toISOString(),
          status: "open",
          owner: snapshot.user.email,
          notes: locale === "es" ? `Seguimiento para ${selectedClient.name}.` : `Follow-up for ${selectedClient.name}.`,
        }),
      });
      const data = (await response.json()) as { record?: FollowupRecord };

      if (response.ok && data.record) {
        setFollowups((current) => [data.record as FollowupRecord, ...current]);
        setClientActionMessage(locale === "es" ? `${title} creado para mañana.` : `${title} created for tomorrow.`);
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function sendChat(createRecords = false) {
    const message = chatInput.trim() || (createRecords ? (locale === "es" ? "Crear lead y cita." : "Create lead and appointment.") : "");
    if (!message) return;
    setChatInput("");
    setChatMessages((current) => [...current, { role: "user", text: message }]);
    setIsBusy(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: snapshot.activeBusiness.id, message, lead, createRecords, locale }),
      });
      const data = (await response.json()) as { reply?: string; createdClient?: ClientRecord; createdAppointment?: AppointmentRecord; error?: string };

      if (data.createdClient) {
        setClients((current) => [data.createdClient as ClientRecord, ...current]);
        setSelectedClientId(data.createdClient.id);
      }

      if (data.createdAppointment) {
        setAppointments((current) => sortAppointments([...current, data.createdAppointment as AppointmentRecord]));
      }

      setChatMessages((current) => [...current, { role: "assistant", text: data.reply ?? data.error ?? t.chatDone }]);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-brand-charcoal">
      <div className="min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="sticky top-0 z-30 border-b border-brand-border bg-white lg:h-screen lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col gap-5 p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold">ZQX</div>
                <LocaleSwitcher locale={locale} onChange={setLocale} compact />
              </div>
              <div className="mt-1 text-xs text-brand-muted">Platform System</div>
            </div>

            {snapshot.user.isZqxAdmin ? (
              <label className="block text-xs font-semibold text-brand-muted">
                {t.activeBusiness}
                <select
                  value={snapshot.activeBusiness.id}
                  onChange={(event) => router.push(`/dashboard?businessId=${event.target.value}`)}
                  className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-medium text-brand-charcoal"
                >
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <nav className="grid gap-1">
              {navigation.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`focus-ring rounded-md px-3 py-2 text-left text-sm font-semibold ${
                    view === item.id ? "bg-brand-charcoal text-white" : "text-brand-muted hover:bg-neutral-100 hover:text-brand-charcoal"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="mt-auto rounded-lg border border-brand-border bg-neutral-50 p-3 text-sm">
              <div className="font-semibold">{snapshot.user.name}</div>
              <div className="mt-1 break-all text-xs text-brand-muted">{snapshot.user.email}</div>
              <div className="mt-3 inline-flex rounded-full border border-brand-border bg-white px-2 py-1 text-xs font-semibold text-brand-muted">
                {snapshot.user.isZqxAdmin ? t.allUsersLabel : snapshot.user.role}
              </div>
              <button type="button" onClick={signOut} className="focus-ring mt-3 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold hover:border-brand-blue">
                {t.signOut}
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="border-b border-brand-border bg-white">
            <div className="flex flex-col gap-4 px-4 py-4 md:px-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-brand-muted">
                  <span>{snapshot.user.isZqxAdmin ? t.zqxAdmin : t.workspace}</span>
                  <span className="h-1 w-1 rounded-full bg-neutral-400" />
                  <span>{industryLabels[snapshot.activeBusiness.industry]}</span>
                  <span className={`rounded-full border px-2 py-1 ${statusClass(snapshot.activeBusiness.status)}`}>{snapshot.activeBusiness.status}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <BusinessLogo
                    name={snapshot.activeBusiness.name}
                    logoUrl={businessLogoUrl(snapshot.activeBusiness.slug, snapshot.activeBusiness.logo_url)}
                    className="h-12 w-24 shrink-0"
                    textClassName="text-base"
                  />
                  <h1 className="text-2xl font-semibold">{snapshot.activeBusiness.name}</h1>
                </div>
                <p className="mt-1 text-sm text-brand-muted">{primaryModule.label} con {enabledModules.map((module) => module.name).join(", ") || t.noModules}.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setView("records");
                    setIsClientFormOpen(true);
                  }}
                  className="focus-ring rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-[#0043ce]"
                >
                  + {primaryModule.entitySingular}
                </button>
                <button
                  type="button"
                  onClick={() => setView("calendar")}
                  className="focus-ring rounded-md border border-brand-border bg-white px-4 py-2 text-sm font-semibold hover:border-brand-blue"
                >
                  + {primaryModule.appointmentSingular}
                </button>
                <button
                  type="button"
                  onClick={() => setView("billing")}
                  className="focus-ring rounded-md border border-brand-border bg-white px-4 py-2 text-sm font-semibold hover:border-brand-blue"
                >
                  + {t.addCharge}
                </button>
              </div>
            </div>
          </header>

          <div className="px-4 py-5 md:px-6">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {metricCards.map((metric) => (
                <article key={metric.label} className="surface-card rounded-lg border border-brand-border p-4">
                  <div className="text-xs font-semibold text-brand-muted">{metric.label}</div>
                  <div className="mt-2 text-2xl font-semibold">{metric.value}</div>
                  <div className="mt-1 text-xs text-brand-muted">{metric.helper}</div>
                </article>
              ))}
            </section>

            {view === "overview" ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
                <section className="surface-panel rounded-lg border border-brand-border p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{locale === "es" ? "Flujo operativo" : "Operational flow"}</h2>
                      <p className="mt-1 text-sm leading-6 text-brand-muted">
                        {locale === "es"
                          ? "El sistema coordina captura, clasificación, agenda, cobros y seguimiento en una operación diaria."
                          : "The system coordinates capture, qualification, scheduling, billing, and follow-up in daily operations."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {enabledModules.map((module) => (
                        <span key={module.id} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-brand-muted">
                          {module.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    {workflow.map((step, index) => (
                      <div key={step} className="rounded-lg border border-brand-border bg-white p-4">
                        <div className="grid h-8 w-8 place-items-center rounded-md bg-brand-charcoal text-sm font-semibold text-white">{index + 1}</div>
                        <div className="mt-3 text-sm font-semibold">{step}</div>
                      </div>
                    ))}
                  </div>

                  {isDentist ? (
                    <div className="mt-5 rounded-lg border border-brand-border bg-neutral-50 p-4">
                      <h3 className="font-semibold">{locale === "es" ? "Flujo dental enfocado en recepción y retención" : "Dental flow focused on front desk and retention"}</h3>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {dentalCapabilities.map((item) => (
                          <div key={item} className="rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-muted">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="surface-panel rounded-lg border border-brand-border p-5">
                  <h2 className="text-xl font-semibold">{locale === "es" ? "Prioridades" : "Priorities"}</h2>
                  <div className="mt-4 space-y-3">
                    {upcomingAppointments.slice(0, 4).map((appointment) => (
                      <button
                        key={appointment.id}
                        type="button"
                        onClick={() => {
                          setSelectedClientId(appointment.client_id);
                          setView("calendar");
                        }}
                        className="focus-ring w-full rounded-lg border border-brand-border bg-white p-3 text-left hover:border-brand-blue"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{appointment.title}</div>
                            <div className="mt-1 text-xs text-brand-muted">{clientById.get(appointment.client_id)?.name ?? t.noClient} | {formatDateTime(appointment.scheduled_at, locale)}</div>
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(appointment.status)}`}>{appointmentStatusLabels[appointment.status]}</span>
                        </div>
                      </button>
                    ))}

                    {openFollowups.slice(0, 4).map((followup) => (
                      <button
                        key={followup.id}
                        type="button"
                        onClick={() => {
                          setSelectedClientId(followup.client_id);
                          setView("records");
                        }}
                        className="focus-ring w-full rounded-lg border border-brand-border bg-white p-3 text-left hover:border-brand-blue"
                      >
                        <div className="font-semibold">{followup.title}</div>
                        <div className="mt-1 text-xs text-brand-muted">{clientById.get(followup.client_id)?.name ?? t.noClient} | {followup.channel} | {formatDateTime(followup.due_at, locale)}</div>
                      </button>
                    ))}
                  </div>

                </section>
              </div>
            ) : null}

            {view === "records" ? (
              <div className="mt-5 space-y-4">
                <section className="surface-panel rounded-lg border border-brand-border p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{primaryModule.entityLabel}</h2>
                      <p className="mt-1 text-sm text-brand-muted">
                        {locale === "es" ? "Buscar, crear y convertir solicitudes en citas o seguimientos." : "Search, create, and convert requests into appointments or follow-ups."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsClientFormOpen((current) => !current)}
                      className="focus-ring rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-[#0043ce]"
                    >
                      {isClientFormOpen
                        ? locale === "es"
                          ? "Cerrar formulario"
                          : "Close form"
                        : locale === "es"
                          ? `Agregar ${primaryModule.entitySingular.toLowerCase()}`
                          : `Add ${primaryModule.entitySingular.toLowerCase()}`}
                    </button>
                  </div>

                  {isClientFormOpen ? (
                    <form onSubmit={createClient} className="mt-4 rounded-lg border border-brand-border bg-neutral-50 p-4">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <label className="text-sm font-semibold">
                          {locale === "es" ? "Nombre" : "Name"}
                          <input
                            value={newClient.name}
                            onChange={(event) => setNewClient((current) => ({ ...current, name: event.target.value }))}
                            className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                            placeholder={locale === "es" ? "Nombre completo" : "Full name"}
                            required
                          />
                        </label>
                        <label className="text-sm font-semibold">
                          Email
                          <input
                            value={newClient.email}
                            onChange={(event) => setNewClient((current) => ({ ...current, email: event.target.value }))}
                            className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                            placeholder={locale === "es" ? "nombre@empresa.com" : "name@company.com"}
                            type="email"
                          />
                        </label>
                        <label className="text-sm font-semibold">
                          {locale === "es" ? "Teléfono" : "Phone"}
                          <input
                            value={newClient.phone}
                            onChange={(event) => setNewClient((current) => ({ ...current, phone: event.target.value }))}
                            className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                            placeholder="+502 ..."
                          />
                        </label>
                        <label className="text-sm font-semibold">
                          {locale === "es" ? "Estado" : "Status"}
                          <select
                            value={newClient.status}
                            onChange={(event) => setNewClient((current) => ({ ...current, status: event.target.value as ClientRecord["status"] }))}
                            className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          >
                            <option value="lead">Lead</option>
                            <option value="prospect">{clientStatusLabels.prospect}</option>
                            <option value="active">{clientStatusLabels.active}</option>
                            <option value="inactive">{clientStatusLabels.inactive}</option>
                          </select>
                        </label>
                      </div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_auto] lg:items-end">
                        <label className="text-sm font-semibold">
                          {locale === "es" ? "Interés" : "Interest"}
                          <select
                            value={newClient.serviceInterest}
                            onChange={(event) => setNewClient((current) => ({ ...current, serviceInterest: event.target.value }))}
                            className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          >
                            {snapshot.services.map((service) => (
                              <option key={service.id} value={service.name}>
                                {service.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm font-semibold">
                          {locale === "es" ? "Notas" : "Notes"}
                          <input
                            value={newClient.notes}
                            onChange={(event) => setNewClient((current) => ({ ...current, notes: event.target.value }))}
                            className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                            placeholder={locale === "es" ? "Motivo, contexto o próxima acción" : "Reason, context, or next action"}
                          />
                        </label>
                        <button type="submit" disabled={isBusy} className="focus-ring rounded-md bg-brand-charcoal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                          {locale === "es" ? "Guardar" : "Save"}
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {!isClientFormOpen ? (
                    <>
                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <input
                      value={clientSearch}
                      onChange={(event) => setClientSearch(event.target.value)}
                      className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                      placeholder={
                        locale === "es"
                          ? `Buscar ${primaryModule.entityLabel.toLowerCase()}, email, teléfono o servicio`
                          : `Search ${primaryModule.entityLabel.toLowerCase()}, email, phone, or service`
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      {clientStatusFilters.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setClientStatusFilter(status)}
                          className={`focus-ring rounded-md border px-3 py-2 text-xs font-semibold ${
                            clientStatusFilter === status ? "border-brand-charcoal bg-brand-charcoal text-white" : "border-brand-border bg-white text-brand-muted hover:border-brand-blue"
                          }`}
                        >
                          {clientStatusLabels[status]}
                        </button>
                      ))}
                    </div>
                    <select
                      value={clientSort}
                      onChange={(event) => setClientSort(event.target.value as ClientSortOption)}
                      className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                    >
                      {(Object.keys(clientSortLabels) as ClientSortOption[]).map((option) => (
                        <option key={option} value={option}>
                          {clientSortLabels[option]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-2 text-xs text-brand-muted">
                    {sortedClients.length} {locale === "es" ? "resultados" : "results"} | {locale === "es" ? "orden" : "sort"}: {clientSortLabels[clientSort]}
                  </p>

                  <div className="mt-4 overflow-hidden rounded-lg border border-brand-border">
                    {sortedClients.map((client) => {
                      const isSelected = selectedClient?.id === client.id;
                      const clientOpenAppointments = appointments.filter((appointment) => appointment.client_id === client.id && (appointment.status === "pending" || appointment.status === "confirmed")).length;
                      const clientBalance = clientBalanceById.get(client.id) ?? 0;

                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setSelectedClientId(client.id);
                            setAppointmentForm((current) => ({ ...current, clientId: client.id }));
                            setPaymentForm((current) => ({ ...current, clientId: client.id }));
                            setClientActionMessage("");
                          }}
                          className={`focus-ring grid w-full gap-3 border-b border-brand-border px-4 py-3 text-left last:border-b-0 md:grid-cols-[minmax(0,1fr)_8rem_8rem_8rem] md:items-center ${
                            isSelected ? "bg-blue-50" : "bg-white hover:bg-neutral-50"
                          }`}
                        >
                          <div>
                            <div className="font-semibold">{client.name}</div>
                            <div className="mt-1 text-xs text-brand-muted">{client.email || (locale === "es" ? "Sin email" : "No email")} | {client.phone || (locale === "es" ? "Sin teléfono" : "No phone")}</div>
                          </div>
                          <span className={`w-fit rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(client.status)}`}>{clientStatusLabels[client.status]}</span>
                          <span className="text-sm text-brand-muted">{clientOpenAppointments} {locale === "es" ? "citas" : "appointments"}</span>
                          <span className="text-sm font-semibold">{money(clientBalance, locale)}</span>
                        </button>
                      );
                    })}

                    {sortedClients.length === 0 ? (
                      <div className="bg-white px-4 py-10 text-center text-sm text-brand-muted">{locale === "es" ? "No hay registros con ese filtro." : "No records for this filter."}</div>
                    ) : null}
                  </div>
                    </>
                  ) : null}
                </section>

                {!isClientFormOpen ? (
                <aside className="surface-panel rounded-lg border border-brand-border p-5">
                  {selectedClient ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-brand-muted">{locale === "es" ? "Expediente" : "Record"}</div>
                          <h3 className="mt-1 text-xl font-semibold">{selectedClient.name}</h3>
                          <p className="mt-1 text-sm text-brand-muted">{selectedClient.service_interest}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(selectedClient.status)}`}>{clientStatusLabels[selectedClient.status]}</span>
                      </div>

                      <dl className="mt-5 grid gap-3 text-sm">
                        <div className="border-b border-brand-border pb-3">
                          <dt className="font-semibold">{locale === "es" ? "Contacto" : "Contact"}</dt>
                          <dd className="mt-1 leading-6 text-brand-muted">{selectedClient.email || (locale === "es" ? "Sin email" : "No email")}<br />{selectedClient.phone || (locale === "es" ? "Sin teléfono" : "No phone")}</dd>
                        </div>
                        <div className="grid grid-cols-2 gap-3 border-b border-brand-border pb-3">
                          <div>
                            <dt className="font-semibold">{locale === "es" ? "Citas" : "Appointments"}</dt>
                            <dd className="mt-1 text-2xl font-semibold">{selectedClientAppointments.length}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">{locale === "es" ? "Saldo" : "Balance"}</dt>
                            <dd className="mt-1 text-2xl font-semibold">{money(selectedClientPendingBalance, locale)}</dd>
                          </div>
                        </div>
                        <div className="border-b border-brand-border pb-3">
                          <dt className="font-semibold">{locale === "es" ? "Notas" : "Notes"}</dt>
                          <dd className="mt-1 leading-6 text-brand-muted">{selectedClient.notes || (locale === "es" ? "Sin notas." : "No notes.")}</dd>
                        </div>
                      </dl>

                      <div className="mt-4">
                        <h4 className="text-sm font-semibold">{locale === "es" ? "Expediente de notas" : "Notes record"}</h4>
                        <textarea
                          value={clientNotesDraft}
                          onChange={(event) => setClientNotesDraft(event.target.value)}
                          className="focus-ring mt-2 min-h-24 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          placeholder="Antecedentes, observaciones, alertas, contexto..."
                        />
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button type="button" onClick={saveClientNotes} disabled={isBusy} className="focus-ring rounded-md bg-brand-charcoal px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                            {locale === "es" ? "Guardar notas" : "Save notes"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setClientNotesDraft(selectedClient.notes || "")}
                            className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-xs font-semibold hover:border-brand-blue"
                          >
                            {locale === "es" ? "Restaurar" : "Reset"}
                          </button>
                        </div>
                        {clientProfileMessage ? <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{clientProfileMessage}</div> : null}
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-semibold">{locale === "es" ? "Historial de citas" : "Appointment history"} ({selectedClientAppointmentsSorted.length})</h4>
                        <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border border-brand-border bg-white p-2">
                          {selectedClientAppointmentsSorted.length ? (
                            selectedClientAppointmentsSorted.map((appointment) => (
                              <div key={appointment.id} className="rounded-md border border-brand-border bg-neutral-50 px-2 py-2 text-sm">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-semibold">{appointment.title}</div>
                                    <div className="mt-1 text-xs text-brand-muted">{formatDateTime(appointment.scheduled_at, locale)} | {appointment.location}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      startEditingAppointment(appointment);
                                      setView("calendar");
                                    }}
                                    className="focus-ring rounded-md border border-brand-border bg-white px-2 py-1 text-xs font-semibold hover:border-brand-blue"
                                  >
                                    {locale === "es" ? "Editar" : "Edit"}
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-2 py-3 text-xs text-brand-muted">{locale === "es" ? "Sin citas registradas." : "No appointments registered."}</div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-semibold">{locale === "es" ? "Historial de pagos" : "Payment history"} ({selectedClientPaymentsSorted.length})</h4>
                        <div className="mt-2 max-h-36 space-y-2 overflow-y-auto rounded-md border border-brand-border bg-white p-2">
                          {selectedClientPaymentsSorted.length ? (
                            selectedClientPaymentsSorted.map((payment) => (
                              <div key={payment.id} className="rounded-md border border-brand-border bg-neutral-50 px-2 py-2 text-sm">
                                <div className="font-semibold">{payment.description}</div>
                                <div className="mt-1 text-xs text-brand-muted">
                                  {paymentStatusLabels[payment.status]} | {money(payment.amount_paid, locale)} {locale === "es" ? "de" : "of"} {money(payment.amount, locale)} | {formatDateTime(payment.updated_at, locale)}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-2 py-3 text-xs text-brand-muted">{locale === "es" ? "Sin cobros registrados." : "No charges registered."}</div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-semibold">{locale === "es" ? "Seguimientos" : "Follow-ups"} ({selectedClientFollowupsSorted.length})</h4>
                        <div className="mt-2 max-h-32 space-y-2 overflow-y-auto rounded-md border border-brand-border bg-white p-2">
                          {selectedClientFollowupsSorted.length ? (
                            selectedClientFollowupsSorted.map((followup) => (
                              <div key={followup.id} className="rounded-md border border-brand-border bg-neutral-50 px-2 py-2 text-sm">
                                <div className="font-semibold">{followup.title}</div>
                                <div className="mt-1 text-xs text-brand-muted">{followup.channel} | {formatDateTime(followup.due_at, locale)}</div>
                              </div>
                            ))
                          ) : (
                            <div className="px-2 py-3 text-xs text-brand-muted">{locale === "es" ? "Sin seguimientos." : "No follow-ups."}</div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-semibold">{locale === "es" ? "Últimas actualizaciones" : "Latest updates"}</h4>
                        <div className="mt-2 max-h-32 space-y-2 overflow-y-auto rounded-md border border-brand-border bg-white p-2">
                          {selectedClientActivity.length ? (
                            selectedClientActivity.slice(0, 8).map((item) => (
                              <div key={item.id} className="rounded-md border border-brand-border bg-neutral-50 px-2 py-2">
                                <div className="text-xs font-semibold">{item.label}</div>
                                <div className="mt-1 text-xs text-brand-muted">{item.detail}</div>
                                <div className="mt-1 text-[11px] text-brand-muted">{formatDateTime(item.timestamp, locale)}</div>
                              </div>
                            ))
                          ) : (
                            <div className="px-2 py-3 text-xs text-brand-muted">{locale === "es" ? "Sin actividad." : "No activity."}</div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 space-y-2">
                        {clientActionMessage ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{clientActionMessage}</div> : null}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setAppointmentForm((current) => ({ ...current, clientId: selectedClient.id }));
                            setView("calendar");
                          }}
                          className="focus-ring w-full rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {locale === "es" ? "Calendarizar cita" : "Schedule appointment"}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            createFollowupForSelectedClient(
                              isDentist ? (locale === "es" ? "Confirmación 24h" : "24h confirmation") : locale === "es" ? "Seguimiento operativo" : "Operational follow-up",
                              isDentist ? "whatsapp" : "email",
                            )
                          }
                          className="focus-ring w-full rounded-md border border-brand-border bg-white px-4 py-2 text-sm font-semibold hover:border-brand-blue disabled:opacity-60"
                        >
                          {locale === "es" ? "Crear seguimiento" : "Create follow-up"}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            const service = snapshot.services.find((item) => item.name === selectedClient.service_interest) ?? initialService;
                            setPaymentForm((current) => ({
                              ...current,
                              clientId: selectedClient.id,
                              serviceId: service?.id ?? current.serviceId,
                              amount: String(service?.price ?? current.amount),
                              description: service?.name ?? selectedClient.service_interest,
                            }));
                            setView("billing");
                          }}
                          className="focus-ring w-full rounded-md border border-brand-border bg-white px-4 py-2 text-sm font-semibold hover:border-brand-blue disabled:opacity-60"
                        >
                          {locale === "es" ? "Registrar cobro" : "Register charge"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center text-sm text-brand-muted">{locale === "es" ? "Selecciona un registro." : "Select a record."}</div>
                  )}
                </aside>
                ) : null}
              </div>
            ) : null}

            {view === "calendar" ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.36fr)]">
                <section className="surface-panel rounded-lg border border-brand-border p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{primaryModule.appointmentLabel}</h2>
                      <p className="mt-1 text-sm text-brand-muted">
                        {isDentist
                          ? locale === "es"
                            ? "Agenda dental con paciente, servicio, horario y sillón."
                            : "Dental agenda with patient, service, schedule, and chair."
                          : locale === "es"
                            ? "Agenda operativa para convertir solicitudes en trabajo programado."
                            : "Operational agenda to convert requests into scheduled work."}
                      </p>
                    </div>
                    <span className="rounded-full border border-brand-border bg-neutral-50 px-3 py-1 text-xs font-semibold text-brand-muted">
                      {upcomingAppointments.length} {locale === "es" ? "activas" : "active"}
                    </span>
                  </div>

                  <form onSubmit={createAppointment} className="mt-4 rounded-lg border border-brand-border bg-neutral-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                      <label className="text-sm font-semibold xl:col-span-2">
                        {primaryModule.entitySingular}
                        <select
                          value={appointmentForm.clientId}
                          onChange={(event) => setAppointmentForm((current) => ({ ...current, clientId: event.target.value }))}
                          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          required
                        >
                          <option value="">{locale === "es" ? "Seleccionar" : "Select"}</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-semibold xl:col-span-2">
                        {locale === "es" ? "Servicio" : "Service"}
                        <select
                          value={appointmentForm.serviceId}
                          onChange={(event) => setAppointmentForm((current) => ({ ...current, serviceId: event.target.value }))}
                          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          required
                        >
                          <option value="">{locale === "es" ? "Seleccionar" : "Select"}</option>
                          {snapshot.services.map((service: ServiceRecord) => (
                            <option key={service.id} value={service.id}>
                              {service.name} ({service.duration_minutes}m)
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-semibold">
                        {locale === "es" ? "Fecha" : "Date"}
                        <input
                          type="date"
                          value={appointmentForm.date}
                          onChange={(event) => setAppointmentForm((current) => ({ ...current, date: event.target.value }))}
                          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          required
                        />
                      </label>
                      <label className="text-sm font-semibold">
                        {locale === "es" ? "Hora" : "Time"}
                        <input
                          type="time"
                          value={appointmentForm.time}
                          onChange={(event) => setAppointmentForm((current) => ({ ...current, time: event.target.value }))}
                          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          required
                        />
                      </label>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,1fr)_auto] xl:items-end">
                      <label className="text-sm font-semibold">
                        {locale === "es" ? "Ubicación" : "Location"}
                        <input
                          value={appointmentForm.location}
                          onChange={(event) => setAppointmentForm((current) => ({ ...current, location: event.target.value }))}
                          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          placeholder={defaultLocation(snapshot.activeBusiness.industry, locale)}
                        />
                      </label>
                      <label className="text-sm font-semibold">
                        {locale === "es" ? "Estado" : "Status"}
                        <select
                          value={appointmentForm.status}
                          onChange={(event) => setAppointmentForm((current) => ({ ...current, status: event.target.value as AppointmentRecord["status"] }))}
                          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                        >
                          {appointmentStatuses.map((status) => (
                            <option key={status} value={status}>
                              {appointmentStatusLabels[status]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-semibold">
                        {locale === "es" ? "Notas" : "Notes"}
                        <input
                          value={appointmentForm.notes}
                          onChange={(event) => setAppointmentForm((current) => ({ ...current, notes: event.target.value }))}
                          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          placeholder={
                            isDentist
                              ? locale === "es"
                                ? "Ej. enviar intake o confirmar seguro"
                                : "E.g. send intake or confirm insurance"
                              : locale === "es"
                                ? "Contexto de la cita"
                                : "Appointment context"
                          }
                        />
                      </label>
                      <button type="submit" disabled={isBusy} className="focus-ring rounded-md bg-brand-charcoal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        {locale === "es" ? "Guardar cita" : "Save appointment"}
                      </button>
                    </div>
                    {schedulerMessage ? <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{schedulerMessage}</div> : null}
                  </form>

                  <div className="mt-5 overflow-x-auto rounded-lg border border-brand-border">
                    <table className="w-full min-w-[58rem] border-collapse text-left text-sm">
                      <thead className="bg-neutral-50 text-xs font-semibold text-brand-muted">
                        <tr>
                          <th className="w-20 border-b border-brand-border px-3 py-3">{locale === "es" ? "Hora" : "Time"}</th>
                          {calendarDays.map((day) => (
                            <th key={day.toISOString()} className="border-b border-brand-border px-3 py-3">
                              {formatDay(day, locale)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map((slot) => (
                          <tr key={slot} className="border-b border-brand-border last:border-b-0">
                            <td className="bg-neutral-50 px-3 py-3 text-xs font-semibold text-brand-muted">{slot}</td>
                            {calendarDays.map((day) => {
                              const items = appointments.filter((appointment) => sameDay(new Date(appointment.scheduled_at), day) && hourSlot(appointment.scheduled_at) === slot);
                              return (
                                <td key={`${day.toISOString()}-${slot}`} className="h-20 border-l border-brand-border bg-white px-2 py-2 align-top">
                                  {items.map((appointment) => (
                                    <button
                                      key={appointment.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedClientId(appointment.client_id);
                                        startEditingAppointment(appointment);
                                      }}
                                      className="focus-ring mb-2 w-full rounded-md border border-blue-200 bg-blue-50 px-2 py-2 text-left text-xs text-blue-800"
                                    >
                                      <div className="font-semibold">{appointment.title}</div>
                                      <div className="mt-1">{clientById.get(appointment.client_id)?.name ?? t.noClient}</div>
                                      <div className="mt-1">{appointment.location}</div>
                                    </button>
                                  ))}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <aside className="surface-panel rounded-lg border border-brand-border p-5">
                  <h3 className="text-lg font-semibold">Agenda</h3>
                  <div className="mt-4 space-y-3">
                    {appointments.map((appointment) => (
                      <article key={appointment.id} className="rounded-lg border border-brand-border bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{appointment.title}</div>
                            <div className="mt-1 text-xs text-brand-muted">{clientById.get(appointment.client_id)?.name ?? t.noClient}</div>
                            <div className="mt-1 text-xs text-brand-muted">{formatDateTime(appointment.scheduled_at, locale)} | {appointment.location}</div>
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(appointment.status)}`}>{appointmentStatusLabels[appointment.status]}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClientId(appointment.client_id);
                              startEditingAppointment(appointment);
                            }}
                            className="focus-ring rounded-md border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-brand-blue"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClientId(appointment.client_id);
                              setView("records");
                            }}
                            className="focus-ring rounded-md border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-brand-blue"
                          >
                            {locale === "es" ? "Expediente" : "Record"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>

                  <form onSubmit={saveAppointmentEdits} className="mt-5 rounded-lg border border-brand-border bg-neutral-50 p-4">
                    <h4 className="text-sm font-semibold">{locale === "es" ? "Editar cita" : "Edit appointment"}</h4>
                    {editingAppointment ? (
                      <div className="mt-3 space-y-3">
                        <div className="text-xs text-brand-muted">
                          {clientById.get(editingAppointment.client_id)?.name ?? t.noClient} | {editingAppointment.title}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="text-xs font-semibold">
                            {locale === "es" ? "Fecha" : "Date"}
                            <input
                              type="date"
                              value={appointmentEditForm.date}
                              onChange={(event) => setAppointmentEditForm((current) => ({ ...current, date: event.target.value }))}
                              className="focus-ring mt-1 w-full rounded-md border border-brand-border bg-white px-2 py-1.5 text-sm"
                              required
                            />
                          </label>
                          <label className="text-xs font-semibold">
                            {locale === "es" ? "Hora" : "Time"}
                            <input
                              type="time"
                              value={appointmentEditForm.time}
                              onChange={(event) => setAppointmentEditForm((current) => ({ ...current, time: event.target.value }))}
                              className="focus-ring mt-1 w-full rounded-md border border-brand-border bg-white px-2 py-1.5 text-sm"
                              required
                            />
                          </label>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="text-xs font-semibold">
                            {locale === "es" ? "Estado" : "Status"}
                            <select
                              value={appointmentEditForm.status}
                              onChange={(event) => setAppointmentEditForm((current) => ({ ...current, status: event.target.value as AppointmentRecord["status"] }))}
                              className="focus-ring mt-1 w-full rounded-md border border-brand-border bg-white px-2 py-1.5 text-sm"
                            >
                              {appointmentStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {appointmentStatusLabels[status]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs font-semibold">
                            {locale === "es" ? "Ubicación" : "Location"}
                            <input
                              value={appointmentEditForm.location}
                              onChange={(event) => setAppointmentEditForm((current) => ({ ...current, location: event.target.value }))}
                              className="focus-ring mt-1 w-full rounded-md border border-brand-border bg-white px-2 py-1.5 text-sm"
                            />
                          </label>
                        </div>
                        <label className="text-xs font-semibold">
                          {locale === "es" ? "Notas" : "Notes"}
                          <input
                            value={appointmentEditForm.notes}
                            onChange={(event) => setAppointmentEditForm((current) => ({ ...current, notes: event.target.value }))}
                            className="focus-ring mt-1 w-full rounded-md border border-brand-border bg-white px-2 py-1.5 text-sm"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="submit" disabled={isBusy} className="focus-ring rounded-md bg-brand-charcoal px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                            {locale === "es" ? "Guardar cambios" : "Save changes"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAppointmentId("")}
                            className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-xs font-semibold hover:border-brand-blue"
                          >
                            {locale === "es" ? "Limpiar" : "Clear"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-brand-muted">
                        {locale === "es" ? "Selecciona una cita de la lista o del calendario para editarla." : "Select an appointment from the list or calendar to edit it."}
                      </p>
                    )}
                  </form>
                </aside>
              </div>
            ) : null}

            {view === "billing" ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.36fr)]">
                <section className="surface-panel rounded-lg border border-brand-border p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{locale === "es" ? "Cobros y pagos" : "Charges and payments"}</h2>
                      <p className="mt-1 text-sm text-brand-muted">
                        {locale === "es" ? "Registra lo que un cliente debe pagar, pagos parciales y pagos completados." : "Track what each client owes, partial payments, and completed payments."}
                      </p>
                    </div>
                    <span className="rounded-full border border-brand-border bg-neutral-50 px-3 py-1 text-xs font-semibold text-brand-muted">
                      {money(pendingBalance, locale)} {locale === "es" ? "pendiente" : "pending"}
                    </span>
                  </div>

                  <form onSubmit={createPayment} className="mt-4 rounded-lg border border-brand-border bg-neutral-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                      <label className="text-sm font-semibold xl:col-span-2">
                        {locale === "es" ? "Cliente" : "Client"}
                        <select
                          value={paymentForm.clientId}
                          onChange={(event) => setPaymentForm((current) => ({ ...current, clientId: event.target.value }))}
                          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          required
                        >
                          <option value="">{locale === "es" ? "Seleccionar" : "Select"}</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-semibold xl:col-span-2">
                        {locale === "es" ? "Servicio" : "Service"}
                        <select
                          value={paymentForm.serviceId}
                          onChange={(event) => {
                            const service = serviceById.get(event.target.value);
                            setPaymentForm((current) => ({
                              ...current,
                              serviceId: event.target.value,
                              amount: String(service?.price ?? current.amount),
                              description: service?.name ?? current.description,
                            }));
                          }}
                          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          required
                        >
                          <option value="">{locale === "es" ? "Seleccionar" : "Select"}</option>
                          {snapshot.services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-semibold">
                        {locale === "es" ? "Monto" : "Amount"}
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={paymentForm.amount}
                          onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
                          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          required
                        />
                      </label>
                      <label className="text-sm font-semibold">
                        {locale === "es" ? "Pagado" : "Paid"}
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={paymentForm.amountPaid}
                          onChange={(event) => setPaymentForm((current) => ({ ...current, amountPaid: event.target.value }))}
                          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          disabled={paymentForm.status !== "partial"}
                        />
                      </label>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,1fr)_auto] xl:items-end">
                      <label className="text-sm font-semibold">
                        {locale === "es" ? "Estado" : "Status"}
                        <select
                          value={paymentForm.status}
                          onChange={(event) =>
                            setPaymentForm((current) => ({
                              ...current,
                              status: event.target.value as PaymentRecord["status"],
                              amountPaid: event.target.value === "partial" ? current.amountPaid : event.target.value === "paid" ? current.amount : "0",
                            }))
                          }
                          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                        >
                          <option value="pending">{paymentStatusLabels.pending}</option>
                          <option value="partial">{paymentStatusLabels.partial}</option>
                          <option value="paid">{paymentStatusLabels.paid}</option>
                        </select>
                      </label>
                      <label className="text-sm font-semibold">
                        {locale === "es" ? "Fecha límite" : "Due date"}
                        <input
                          type="date"
                          value={paymentForm.dueDate}
                          onChange={(event) => setPaymentForm((current) => ({ ...current, dueDate: event.target.value }))}
                          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-sm font-semibold">
                        {locale === "es" ? "Descripción" : "Description"}
                        <input
                          value={paymentForm.description}
                          onChange={(event) => setPaymentForm((current) => ({ ...current, description: event.target.value }))}
                          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          placeholder={locale === "es" ? "Tratamiento, servicio o concepto" : "Treatment, service, or concept"}
                        />
                      </label>
                      <button type="submit" disabled={isBusy} className="focus-ring rounded-md bg-brand-charcoal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        {locale === "es" ? "Registrar cobro" : "Register charge"}
                      </button>
                    </div>
                    {paymentActionMessage ? <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{paymentActionMessage}</div> : null}
                  </form>

                  <div className="mt-5 overflow-x-auto rounded-lg border border-brand-border">
                    <table className="w-full min-w-[50rem] border-collapse text-left text-sm">
                      <thead className="bg-neutral-50 text-xs font-semibold text-brand-muted">
                        <tr>
                          <th className="border-b border-brand-border px-3 py-3">{locale === "es" ? "Cliente" : "Client"}</th>
                          <th className="border-b border-brand-border px-3 py-3">{locale === "es" ? "Concepto" : "Concept"}</th>
                          <th className="border-b border-brand-border px-3 py-3">{locale === "es" ? "Estado" : "Status"}</th>
                          <th className="border-b border-brand-border px-3 py-3">{locale === "es" ? "Monto" : "Amount"}</th>
                          <th className="border-b border-brand-border px-3 py-3">{locale === "es" ? "Pagado" : "Paid"}</th>
                          <th className="border-b border-brand-border px-3 py-3">{locale === "es" ? "Pendiente" : "Pending"}</th>
                          <th className="border-b border-brand-border px-3 py-3">{locale === "es" ? "Acción" : "Action"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment) => {
                          const pending = Math.max(payment.amount - payment.amount_paid, 0);
                          return (
                            <tr key={payment.id} className="border-b border-brand-border bg-white last:border-b-0">
                              <td className="px-3 py-3 font-medium">{clientById.get(payment.client_id)?.name ?? t.noClient}</td>
                              <td className="px-3 py-3 text-brand-muted">{payment.description}</td>
                              <td className="px-3 py-3">
                                <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(payment.status)}`}>{paymentStatusLabels[payment.status]}</span>
                              </td>
                              <td className="px-3 py-3">{money(payment.amount, locale)}</td>
                              <td className="px-3 py-3">{money(payment.amount_paid, locale)}</td>
                              <td className="px-3 py-3 font-semibold">{money(pending, locale)}</td>
                              <td className="px-3 py-3">
                                {payment.status !== "paid" ? (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => markPaymentPaid(payment)}
                                    className="focus-ring rounded-md border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-brand-blue disabled:opacity-60"
                                  >
                                    {locale === "es" ? "Marcar pagado" : "Mark as paid"}
                                  </button>
                                ) : (
                                  <span className="text-xs text-brand-muted">{locale === "es" ? "Completado" : "Completed"}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <aside className="surface-panel rounded-lg border border-brand-border p-5">
                  <h3 className="text-lg font-semibold">{locale === "es" ? "Resumen" : "Summary"}</h3>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-lg border border-brand-border bg-white p-4">
                      <div className="text-xs font-semibold text-brand-muted">{locale === "es" ? "Pendiente" : "Pending"}</div>
                      <div className="mt-2 text-2xl font-semibold">{money(pendingBalance, locale)}</div>
                    </div>
                    <div className="rounded-lg border border-brand-border bg-white p-4">
                      <div className="text-xs font-semibold text-brand-muted">{locale === "es" ? "Pagado" : "Paid"}</div>
                      <div className="mt-2 text-2xl font-semibold">{money(paidRevenue, locale)}</div>
                    </div>
                    <div className="rounded-lg border border-brand-border bg-white p-4">
                      <div className="text-xs font-semibold text-brand-muted">{locale === "es" ? "Cobros abiertos" : "Open charges"}</div>
                      <div className="mt-2 text-2xl font-semibold">{payments.filter((payment) => payment.status !== "paid").length}</div>
                    </div>
                  </div>
                </aside>
              </div>
            ) : null}

            {view === "admin" ? (
              <div className="mt-5 space-y-4">
                <section className="surface-panel rounded-lg border border-brand-border p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{locale === "es" ? "Administración de empresas" : "Company administration"}</h2>
                      <p className="mt-1 text-sm text-brand-muted">
                        {locale === "es"
                          ? "Vista separada para ZQX: empresas, verticales, usuarios y módulos habilitados."
                          : "Dedicated ZQX view: companies, verticals, users, and enabled modules."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (isBusinessFormOpen) {
                          setIsBusinessFormOpen(false);
                          return;
                        }
                        setShowCompanyProfile(false);
                        setIsBusinessFormOpen(true);
                      }}
                      className="focus-ring rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-[#0043ce]"
                    >
                      {isBusinessFormOpen ? (locale === "es" ? "Cerrar formulario" : "Close form") : locale === "es" ? "Nueva empresa" : "New company"}
                    </button>
                  </div>

                  {isBusinessFormOpen ? (
                    <form onSubmit={createBusiness} className="mt-4 rounded-lg border border-brand-border bg-neutral-50 p-4">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <label className="text-sm font-semibold">
                          {locale === "es" ? "Nombre" : "Name"}
                          <input
                            value={newBusiness.name}
                            onChange={(event) => setNewBusiness((current) => ({ ...current, name: event.target.value }))}
                            className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                            placeholder={locale === "es" ? "Nombre comercial" : "Business name"}
                            required
                          />
                        </label>
                        <label className="text-sm font-semibold">
                          Email
                          <input
                            type="email"
                            value={newBusiness.contactEmail}
                            onChange={(event) => setNewBusiness((current) => ({ ...current, contactEmail: event.target.value }))}
                            className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                            placeholder={locale === "es" ? "contacto@empresa.com" : "contact@company.com"}
                            required
                          />
                        </label>
                        <label className="text-sm font-semibold">
                          {locale === "es" ? "URL de logo" : "Logo URL"}
                          <input
                            value={newBusiness.logoUrl}
                            onChange={(event) => setNewBusiness((current) => ({ ...current, logoUrl: event.target.value }))}
                            className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                            placeholder="/logos/empresa.svg"
                          />
                        </label>
                        <label className="text-sm font-semibold">
                          Slug
                          <input
                            value={newBusiness.slug}
                            onChange={(event) => setNewBusiness((current) => ({ ...current, slug: event.target.value }))}
                            className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                            placeholder="empresa-demo"
                          />
                        </label>
                        <label className="text-sm font-semibold">
                          {locale === "es" ? "Industria" : "Industry"}
                          <select
                            value={newBusiness.industry}
                            onChange={(event) => setNewBusiness((current) => ({ ...current, industry: event.target.value as BusinessIndustry }))}
                            className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          >
                            {(Object.keys(industryLabels) as BusinessIndustry[]).map((industry) => (
                              <option key={industry} value={industry}>
                                {industryLabels[industry]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)_auto] lg:items-end">
                        <label className="text-sm font-semibold">
                          {locale === "es" ? "Estado" : "Status"}
                          <select
                            value={newBusiness.status}
                            onChange={(event) => setNewBusiness((current) => ({ ...current, status: event.target.value as "active" | "demo" | "paused" }))}
                            className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                          >
                            <option value="active">active</option>
                            <option value="demo">demo</option>
                            <option value="paused">paused</option>
                          </select>
                        </label>
                        <label className="text-sm font-semibold">
                          {locale === "es" ? "Notas" : "Notes"}
                          <input
                            value={newBusiness.notes}
                            onChange={(event) => setNewBusiness((current) => ({ ...current, notes: event.target.value }))}
                            className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                            placeholder={locale === "es" ? "Contexto inicial de la cuenta..." : "Initial account context..."}
                          />
                        </label>
                        <button type="submit" disabled={isBusy} className="focus-ring rounded-md bg-brand-charcoal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                          {locale === "es" ? "Crear empresa" : "Create company"}
                        </button>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-semibold text-brand-muted">{locale === "es" ? "Módulos iniciales" : "Initial modules"}</div>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          {snapshot.modules.map((module) => {
                            const checked = newBusinessModuleIds.includes(module.id);
                            const isGeneral = module.key === "general";
                            return (
                              <label key={module.id} className="flex items-start gap-2 rounded-md border border-brand-border bg-white px-3 py-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={isGeneral}
                                  onChange={(event) =>
                                    setNewBusinessModuleIds((current) => {
                                      if (event.target.checked) return Array.from(new Set([...current, module.id]));
                                      return current.filter((id) => id !== module.id);
                                    })
                                  }
                                  className="mt-0.5"
                                />
                                <span>
                                  <span className="font-semibold">{module.name}</span>
                                  <span className="mt-1 block text-xs text-brand-muted">{module.description}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </form>
                  ) : null}

                  {businessAdminMessage ? <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{businessAdminMessage}</div> : null}

                  {showAdminOverview ? (
                    <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-brand-border bg-white p-3">
                      <div className="text-xs font-semibold text-brand-muted">{locale === "es" ? "Empresa activa" : "Active company"}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <BusinessLogo
                          name={snapshot.activeBusiness.name}
                          logoUrl={businessLogoUrl(snapshot.activeBusiness.slug, snapshot.activeBusiness.logo_url)}
                          className="h-8 w-16 shrink-0"
                          textClassName="text-xs"
                        />
                        <div className="text-sm font-semibold">{snapshot.activeBusiness.name}</div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-brand-border bg-white p-3">
                      <div className="text-xs font-semibold text-brand-muted">{locale === "es" ? "Usuarios" : "Users"}</div>
                      <div className="mt-2 text-2xl font-semibold">{activeBusinessUsers.length}</div>
                    </div>
                    <div className="rounded-lg border border-brand-border bg-white p-3">
                      <div className="text-xs font-semibold text-brand-muted">{primaryModule.entityLabel}</div>
                      <div className="mt-2 text-2xl font-semibold">{clients.length}</div>
                    </div>
                    <div className="rounded-lg border border-brand-border bg-white p-3">
                      <div className="text-xs font-semibold text-brand-muted">{locale === "es" ? "Saldo pendiente" : "Pending balance"}</div>
                      <div className="mt-2 text-2xl font-semibold">{money(pendingBalance, locale)}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <button type="button" onClick={() => setView("records")} className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold hover:border-brand-blue">
                      {locale === "es" ? "Ver clientes" : "View clients"}
                    </button>
                    <button type="button" onClick={() => setView("calendar")} className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold hover:border-brand-blue">
                      {locale === "es" ? "Ver calendario" : "View calendar"}
                    </button>
                    <button type="button" onClick={() => setView("billing")} className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold hover:border-brand-blue">
                      {locale === "es" ? "Ver cobros" : "View billing"}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {businesses.map((business) => {
                      const isActive = business.id === snapshot.activeBusiness.id;
                      const isSelected = business.id === selectedBusinessId;
                      const tenantModules = allBusinessModules.filter((module) => module.business_id === business.id && module.enabled).length;
                      return (
                        <article key={business.id} className={`rounded-lg border p-4 ${isSelected ? "border-brand-blue bg-blue-50/40" : "border-brand-border bg-white"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <BusinessLogo name={business.name} logoUrl={businessLogoUrl(business.slug, business.logo_url)} className="h-10 w-20 shrink-0" textClassName="text-sm" />
                              <div className="min-w-0">
                                <div className="truncate font-semibold">{business.name}</div>
                                <div className="mt-1 truncate text-xs text-brand-muted">{business.contact_email}</div>
                              </div>
                            </div>
                            <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(business.status)}`}>{business.status}</span>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-brand-muted">
                            <span>{industryLabels[business.industry]}</span>
                            <span>
                              {tenantModules} {locale === "es" ? "módulos" : "modules"}
                            </span>
                            <span>{isActive ? (locale === "es" ? "Activo" : "Active") : locale === "es" ? "Cambiar" : "Switch"}</span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBusinessId(business.id);
                                setNewUser((current) => ({ ...current, businessId: business.id }));
                                setIsBusinessFormOpen(false);
                                setShowCompanyProfile(true);
                                requestAnimationFrame(() => companyProfileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
                              }}
                              className="focus-ring rounded-md border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-brand-blue"
                            >
                              {locale === "es" ? "Ver ficha" : "View profile"}
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard?businessId=${business.id}`)}
                              className="focus-ring rounded-md border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-brand-blue"
                            >
                              {locale === "es" ? "Abrir workspace" : "Open workspace"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <section className="mt-4 rounded-lg border border-brand-border bg-white p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <h3 className="text-base font-semibold">{locale === "es" ? "Usuarios de plataforma" : "Platform users"}</h3>
                      <span className="text-xs font-semibold text-brand-muted">
                        {selectedBusinessUsers.length} {locale === "es" ? "usuarios registrados" : "registered users"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-brand-muted">
                      {locale === "es"
                        ? "Vista global de usuarios con empresa, estado y origen de autenticacion."
                        : "Global user list with company, status, and authentication source."}
                    </p>
                    <div className="mt-3 overflow-hidden rounded-lg border border-brand-border">
                      <table className="min-w-full divide-y divide-brand-border text-sm">
                        <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                          <tr>
                            <th className="px-3 py-2">{locale === "es" ? "Usuario" : "User"}</th>
                            <th className="px-3 py-2">{locale === "es" ? "Empresa" : "Company"}</th>
                            <th className="px-3 py-2">{locale === "es" ? "Acceso" : "Access"}</th>
                            <th className="px-3 py-2">{locale === "es" ? "Origen" : "Source"}</th>
                            <th className="px-3 py-2">{locale === "es" ? "Accion" : "Action"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border bg-white">
                          {selectedBusinessUsers.map((user) => {
                            const source = userAuthSource(user);
                            const sourceLabel = source === "google" ? "Google OAuth" : locale === "es" ? "Local / password" : "Local / password";
                            return (
                              <tr key={`platform-${user.id}`}>
                                <td className="px-3 py-2">
                                  <div className="font-semibold">{user.name}</div>
                                  <div className="text-xs text-brand-muted">{user.email}</div>
                                </td>
                                <td className="px-3 py-2 text-xs text-brand-muted">{businessById.get(user.business_id)?.name ?? (locale === "es" ? "Sin asignar" : "Unassigned")}</td>
                                <td className="px-3 py-2">
                                  <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(user.status)}`}>{user.status}</span>
                                </td>
                                <td className="px-3 py-2 text-xs text-brand-muted">{sourceLabel}</td>
                                <td className="px-3 py-2">
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextBusinessId = user.business_id || selectedBusinessId || snapshot.activeBusiness.id;
                                        setSelectedBusinessId(nextBusinessId);
                                        setNewUser((current) => ({ ...current, businessId: nextBusinessId }));
                                        setIsBusinessFormOpen(false);
                                        setShowCompanyProfile(true);
                                        requestAnimationFrame(() => companyProfileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
                                      }}
                                      className="focus-ring rounded-md border border-brand-border bg-white px-2 py-1 text-xs font-semibold hover:border-brand-blue"
                                    >
                                      {locale === "es" ? "Gestionar" : "Manage"}
                                    </button>
                                    {user.role !== "zqx_owner" ? (
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => deleteUser(user)}
                                        className="focus-ring rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:border-red-300 disabled:opacity-60"
                                      >
                                        {locale === "es" ? "Eliminar" : "Delete"}
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                    </>
                  ) : null}
                </section>

                {showCompanyProfile && !isBusinessFormOpen ? (
                  <div ref={companyProfileRef} className="space-y-4">
                  <section className="surface-panel rounded-lg border border-brand-border p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold">{locale === "es" ? "Ficha de empresa" : "Company profile"}</h2>
                      <button
                        type="button"
                        onClick={() => setShowCompanyProfile(false)}
                        className="focus-ring rounded-md border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-brand-blue"
                      >
                        {locale === "es" ? "Volver a empresas" : "Back to companies"}
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-brand-muted">
                      {locale === "es" ? "Resumen operativo, módulos, deuda y actualizaciones recientes." : "Operational summary, modules, debt, and recent updates."}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-brand-border bg-white p-3">
                        <div className="text-xs font-semibold text-brand-muted">{locale === "es" ? "Empresa" : "Company"}</div>
                        <div className="mt-2 flex items-center gap-3">
                          <BusinessLogo
                            name={selectedBusiness.name}
                            logoUrl={businessLogoUrl(selectedBusiness.slug, selectedBusiness.logo_url)}
                            className="h-12 w-24 shrink-0"
                            textClassName="text-base"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">{selectedBusiness.name}</div>
                            <div className="mt-1 truncate text-xs text-brand-muted">{selectedBusiness.contact_email}</div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-brand-border bg-white p-3">
                        <div className="text-xs font-semibold text-brand-muted">{locale === "es" ? "Industria" : "Industry"}</div>
                        <div className="mt-2 text-sm font-semibold">{industryLabels[selectedBusiness.industry]}</div>
                        <div className="mt-1 text-xs text-brand-muted">
                          {companyUsers.length} {locale === "es" ? "usuarios" : "users"}
                        </div>
                      </div>
                      <div className="rounded-lg border border-brand-border bg-white p-3">
                        <div className="text-xs font-semibold text-brand-muted">{locale === "es" ? "Citas activas" : "Active appointments"}</div>
                        <div className="mt-2 text-2xl font-semibold">{companyUpcomingAppointments}</div>
                      </div>
                      <div className="rounded-lg border border-brand-border bg-white p-3">
                        <div className="text-xs font-semibold text-brand-muted">{locale === "es" ? "Saldo pendiente" : "Pending balance"}</div>
                        <div className="mt-2 text-2xl font-semibold">{money(companyPendingBalance, locale)}</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-semibold text-brand-muted">{locale === "es" ? "Módulos activos" : "Active modules"}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedBusinessModules.length ? (
                          selectedBusinessModules.map((module) => (
                            <span key={module.id} className="rounded-full border border-brand-border bg-white px-2 py-1 text-xs font-semibold text-brand-muted">
                              {module.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-brand-muted">{locale === "es" ? "Sin módulos activos." : "No active modules."}</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-semibold text-brand-muted">{locale === "es" ? "Notas internas" : "Internal notes"}</div>
                      <textarea
                        value={companyNoteDraft}
                        onChange={(event) => setCompanyNoteDraft(event.target.value)}
                        className="focus-ring mt-2 min-h-24 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                        placeholder={locale === "es" ? "Contexto comercial, acuerdos, riesgos, pendientes..." : "Commercial context, agreements, risks, pending items..."}
                      />
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button type="button" onClick={saveCompanyNotes} disabled={isBusy} className="focus-ring rounded-md bg-brand-charcoal px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                          {locale === "es" ? "Guardar notas" : "Save notes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompanyNoteDraft(selectedBusiness.notes || "")}
                          className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-xs font-semibold hover:border-brand-blue"
                        >
                          {locale === "es" ? "Restaurar" : "Reset"}
                        </button>
                      </div>
                      {companyActionMessage ? <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{companyActionMessage}</div> : null}
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-semibold text-brand-muted">{locale === "es" ? "Últimas actualizaciones" : "Latest updates"}</div>
                      <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-brand-border bg-white p-2">
                        {companyLoading ? (
                          <div className="px-2 py-3 text-xs text-brand-muted">{locale === "es" ? "Cargando actividad..." : "Loading activity..."}</div>
                        ) : companyRecentActivity.length ? (
                          companyRecentActivity.map((item) => (
                            <div key={item.id} className="rounded-md border border-brand-border bg-neutral-50 px-2 py-2">
                              <div className="text-xs font-semibold">{item.label}</div>
                              <div className="mt-1 text-xs text-brand-muted">{item.detail}</div>
                              <div className="mt-1 text-[11px] text-brand-muted">{formatDateTime(item.timestamp, locale)}</div>
                            </div>
                          ))
                        ) : (
                          <div className="px-2 py-3 text-xs text-brand-muted">{locale === "es" ? "Sin actividad registrada." : "No activity recorded."}</div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="surface-panel rounded-lg border border-brand-border p-5">
                    <h2 className="text-lg font-semibold">
                      {locale === "es" ? `Módulos de ${selectedBusiness.name}` : `${selectedBusiness.name} modules`}
                    </h2>
                    <p className="mt-1 text-xs text-brand-muted">
                      {locale === "es" ? "Activa o desactiva módulos para esta empresa." : "Enable or disable modules for this company."}
                    </p>
                    <div className="mt-4 space-y-2">
                      {snapshot.modules.map((module) => {
                        const moduleRecord = selectedBusinessModulesMap.get(module.id);
                        const enabled = moduleRecord?.enabled ?? false;
                        return (
                          <button
                            key={module.id}
                            type="button"
                            disabled={isBusy || module.key === "general"}
                            onClick={() => toggleSelectedBusinessModule(module)}
                            className={`focus-ring w-full rounded-md border px-3 py-3 text-left disabled:cursor-not-allowed disabled:opacity-70 ${
                              enabled ? "border-brand-blue bg-blue-50" : "border-brand-border bg-white hover:border-brand-blue"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold">{module.name}</div>
                                <div className="mt-1 text-xs leading-5 text-brand-muted">{module.description}</div>
                              </div>
                              <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${enabled ? "bg-brand-blue text-white" : "bg-neutral-100 text-brand-muted"}`}>
                                {enabled ? t.moduleOn : t.moduleOff}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="surface-panel rounded-lg border border-brand-border p-5">
                    <h2 className="text-lg font-semibold">
                      {snapshot.user.isZqxAdmin ? (locale === "es" ? "Usuarios y accesos" : "Users and access") : locale === "es" ? `Usuarios de ${selectedBusiness.name}` : `${selectedBusiness.name} users`}
                    </h2>
                    <form onSubmit={inviteUser} className="mt-4 grid gap-2">
                      {snapshot.user.isZqxAdmin ? (
                        <select
                          value={newUser.businessId}
                          onChange={(event) => setNewUser((current) => ({ ...current, businessId: event.target.value }))}
                          className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                        >
                          {businesses.map((business) => (
                            <option key={business.id} value={business.id}>
                              {business.name}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      <input
                        value={newUser.email}
                        onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
                        placeholder={locale === "es" ? "usuario@empresa.com" : "user@company.com"}
                        type="email"
                        className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                      />
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <input
                          value={newUser.name}
                          onChange={(event) => setNewUser((current) => ({ ...current, name: event.target.value }))}
                          placeholder={locale === "es" ? "Nombre" : "Name"}
                          className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                        />
                        <select
                          value={newUser.role}
                          onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value as UserRecord["role"] }))}
                          className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                        >
                          <option value="business_admin">Admin</option>
                          <option value="operator">{locale === "es" ? "Operador" : "Operator"}</option>
                          <option value="viewer">{locale === "es" ? "Lectura" : "Viewer"}</option>
                        </select>
                      </div>
                      <input
                        value={newUser.temporaryPassword}
                        onChange={(event) => setNewUser((current) => ({ ...current, temporaryPassword: event.target.value }))}
                        placeholder={locale === "es" ? "Contraseña inicial" : "Initial password"}
                        type="password"
                        className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
                      />
                      <button type="submit" disabled={isBusy} className="focus-ring rounded-md bg-brand-charcoal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        {locale === "es" ? "Crear usuario" : "Create user"}
                      </button>
                    </form>
                    {userAccessMessage ? <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{userAccessMessage}</div> : null}
                    <div className="mt-4 space-y-2">
                      {selectedBusinessUsers.length ? (
                        selectedBusinessUsers.map((user) => {
                          const draft = userAccessDrafts[user.id] ?? {
                            business_id: user.business_id,
                            role: user.role,
                            status: user.status,
                          };
                          const source = userAuthSource(user);
                          const sourceLabel = source === "google" ? "Google OAuth" : locale === "es" ? "Local / password" : "Local / password";
                          const isOwner = user.role === "zqx_owner";
                          const isChanged = draft.business_id !== user.business_id || draft.role !== user.role || draft.status !== user.status;

                          return (
                            <div key={user.id} className="rounded-md border border-brand-border bg-white px-3 py-3">
                              <div className="text-sm font-semibold">{user.name}</div>
                              <div className="mt-1 break-all text-xs text-brand-muted">{user.email}</div>
                              <div className="mt-1 text-[11px] text-brand-muted">
                                {locale === "es" ? "Origen:" : "Source:"} {sourceLabel}
                              </div>
                              <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto_auto]">
                                {snapshot.user.isZqxAdmin ? (
                                  <select
                                    value={draft.business_id}
                                    onChange={(event) => updateUserAccessDraft(user, { business_id: event.target.value })}
                                    disabled={isOwner}
                                    className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <option value="">{locale === "es" ? "Sin asignar" : "Unassigned"}</option>
                                    {businesses.map((business) => (
                                      <option key={business.id} value={business.id}>
                                        {business.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="rounded-md border border-brand-border bg-neutral-50 px-3 py-2 text-xs text-brand-muted">
                                    {businessById.get(user.business_id)?.name ?? (locale === "es" ? "Sin asignar" : "Unassigned")}
                                  </div>
                                )}
                                <select
                                  value={draft.role}
                                  onChange={(event) => updateUserAccessDraft(user, { role: event.target.value as UserRecord["role"] })}
                                  disabled={isOwner}
                                  className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {snapshot.user.isZqxAdmin ? <option value="zqx_owner">Owner</option> : null}
                                  <option value="business_admin">Admin</option>
                                  <option value="operator">{locale === "es" ? "Operador" : "Operator"}</option>
                                  <option value="viewer">{locale === "es" ? "Lectura" : "Viewer"}</option>
                                </select>
                                <select
                                  value={draft.status}
                                  onChange={(event) => updateUserAccessDraft(user, { status: event.target.value as UserRecord["status"] })}
                                  disabled={isOwner}
                                  className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <option value="invited">{locale === "es" ? "Invitado" : "Invited"}</option>
                                  <option value="active">{locale === "es" ? "Activo" : "Active"}</option>
                                  <option value="disabled">{locale === "es" ? "Deshabilitado" : "Disabled"}</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => saveUserAccess(user)}
                                  disabled={isBusy || !isChanged || isOwner}
                                  className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-xs font-semibold hover:border-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {locale === "es" ? "Guardar" : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteUser(user)}
                                  disabled={isBusy || isOwner}
                                  className="focus-ring rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {locale === "es" ? "Eliminar" : "Delete"}
                                </button>
                              </div>
                              <div className="mt-2 text-[11px] text-brand-muted">
                                {isOwner
                                  ? locale === "es"
                                    ? "Usuario propietario protegido."
                                    : "Owner account is protected."
                                  : `${businessById.get(draft.business_id)?.name ?? (locale === "es" ? "Sin asignar" : "Unassigned")} | ${draft.role} | ${draft.status}`}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-md border border-brand-border bg-white px-3 py-3 text-xs text-brand-muted">
                          {locale === "es" ? "No hay usuarios creados todavia." : "There are no users yet."}
                        </div>
                      )}
                    </div>
                  </section>
                  </div>
                ) : null}
              </div>
            ) : null}

            {view === "assistant" ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.38fr)]">
                <section className="surface-panel rounded-lg border border-brand-border p-5">
                  <h2 className="text-xl font-semibold">{locale === "es" ? "Asistente de intake" : "Intake assistant"}</h2>
                  <p className="mt-1 text-sm text-brand-muted">
                    {locale === "es" ? "FAQ, captura de lead y creación de cita desde el mismo flujo." : "FAQ, lead capture, and appointment creation in one flow."}
                  </p>

                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {snapshot.faqs.map((faq) => (
                      <button key={faq.id} type="button" onClick={() => setChatInput(faq.question)} className="focus-ring rounded-md border border-brand-border bg-white px-3 py-3 text-left text-sm font-medium hover:border-brand-blue">
                        {faq.question}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-lg border border-brand-border bg-neutral-50 p-3">
                    <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                      {chatMessages.map((message, index) => (
                        <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[88%] rounded-lg px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-brand-blue text-white" : "border border-brand-border bg-white text-brand-charcoal"}`}>{message.text}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]">
                      <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={t.chatPlaceholder} className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-sm" />
                      <button type="button" disabled={isBusy} onClick={() => sendChat(false)} className="focus-ring rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        {locale === "es" ? "Enviar" : "Send"}
                      </button>
                    </div>
                  </div>
                </section>

                <aside className="surface-panel rounded-lg border border-brand-border p-5">
                  <h3 className="text-lg font-semibold">{t.chatLeadTitle}</h3>
                  <div className="mt-4 grid gap-2">
                    <input value={lead.name} onChange={(event) => setLead((current) => ({ ...current, name: event.target.value }))} placeholder={locale === "es" ? "Nombre" : "Name"} className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-sm" />
                    <input value={lead.phone} onChange={(event) => setLead((current) => ({ ...current, phone: event.target.value }))} placeholder={locale === "es" ? "Teléfono" : "Phone"} className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-sm" />
                    <input value={lead.email} onChange={(event) => setLead((current) => ({ ...current, email: event.target.value }))} placeholder="Email" type="email" className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-sm" />
                    <select value={lead.serviceInterest} onChange={(event) => setLead((current) => ({ ...current, serviceInterest: event.target.value }))} className="focus-ring rounded-md border border-brand-border bg-white px-3 py-2 text-sm">
                      {snapshot.services.map((service) => (
                        <option key={service.id} value={service.name}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" disabled={isBusy} onClick={() => sendChat(true)} className="focus-ring rounded-md border border-brand-blue bg-white px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-blue-50 disabled:opacity-60">
                      {locale === "es" ? "Crear lead + cita" : "Create lead + appointment"}
                    </button>
                  </div>
                </aside>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
