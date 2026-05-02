export const DEMO_BUSINESS_ID = "biz-dental-smile";
export const ZQX_BUSINESS_ID = "biz-zqx";

export const entities = [
  "businesses",
  "users",
  "modules",
  "business_modules",
  "clients",
  "appointments",
  "followups",
  "services",
  "payments",
  "faqs",
  "chatbot_logs",
] as const;

export type Entity = (typeof entities)[number];

export type UserRole = "zqx_owner" | "business_admin" | "operator" | "viewer";
export type BusinessIndustry = "general" | "dentist" | "medical" | "university" | "consulting" | "restaurant" | "custom";
export type ModuleKey = "general" | "dentist" | "medical" | "university" | "consulting" | "restaurant" | "custom";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type PaymentStatus = "paid" | "pending" | "partial";
export type FollowupStatus = "open" | "in_progress" | "done" | "blocked";

export type BaseRecord = {
  id: string;
  created_at: string;
  updated_at: string;
};

export type BusinessRecord = BaseRecord & {
  name: string;
  slug: string;
  industry: BusinessIndustry;
  contact_email: string;
  logo_url?: string;
  status: "active" | "demo" | "paused";
  notes: string;
};

export type UserRecord = BaseRecord & {
  business_id: string;
  email: string;
  name: string;
  role: UserRole;
  status: "invited" | "active" | "disabled";
  temporary_password?: string;
  auth_source?: "local" | "google";
};

export type ModuleRecord = BaseRecord & {
  key: ModuleKey;
  name: string;
  description: string;
};

export type BusinessModuleRecord = BaseRecord & {
  business_id: string;
  module_id: string;
  enabled: boolean;
  configuration: Record<string, string | number | boolean>;
};

export type ClientRecord = BaseRecord & {
  business_id: string;
  name: string;
  type: "person" | "organization";
  email: string;
  phone: string;
  status: "lead" | "prospect" | "active" | "inactive";
  service_interest: string;
  notes: string;
};

export type ServiceRecord = BaseRecord & {
  business_id: string;
  name: string;
  category: string;
  price: number;
  duration_minutes: number;
  active: boolean;
};

export type AppointmentRecord = BaseRecord & {
  business_id: string;
  client_id: string;
  service_id: string;
  title: string;
  scheduled_at: string;
  status: AppointmentStatus;
  location: string;
  notes: string;
};

export type FollowupRecord = BaseRecord & {
  business_id: string;
  client_id: string;
  appointment_id?: string;
  title: string;
  channel: "email" | "phone" | "whatsapp" | "meeting";
  due_at: string;
  status: FollowupStatus;
  owner: string;
  notes: string;
};

export type PaymentRecord = BaseRecord & {
  business_id: string;
  client_id: string;
  service_id: string;
  appointment_id?: string;
  amount: number;
  amount_paid: number;
  currency: "USD";
  status: PaymentStatus;
  due_at: string;
  paid_at?: string;
  description: string;
};

export type FaqRecord = BaseRecord & {
  business_id: string;
  question: string;
  answer: string;
  tags: string[];
};

export type ChatbotLogRecord = BaseRecord & {
  business_id: string;
  user_email?: string;
  visitor_name?: string;
  visitor_phone?: string;
  visitor_email?: string;
  service_interest?: string;
  message: string;
  response: string;
  created_client_id?: string;
  created_appointment_id?: string;
};

export type Records = {
  businesses: BusinessRecord[];
  users: UserRecord[];
  modules: ModuleRecord[];
  business_modules: BusinessModuleRecord[];
  clients: ClientRecord[];
  appointments: AppointmentRecord[];
  followups: FollowupRecord[];
  services: ServiceRecord[];
  payments: PaymentRecord[];
  faqs: FaqRecord[];
  chatbot_logs: ChatbotLogRecord[];
};

export type RecordFor<E extends Entity = Entity> = Records[E][number];
export type RecordInput<E extends Entity> = Omit<RecordFor<E>, "id" | "created_at" | "updated_at"> & Partial<Pick<BaseRecord, "id" | "created_at" | "updated_at">>;
export type RecordUpdate<E extends Entity> = Partial<Omit<RecordFor<E>, "id" | "created_at">>;
export type RecordFilters<E extends Entity> = Partial<Record<keyof RecordFor<E>, string | number | boolean | string[] | undefined>>;

export type ModuleBlueprint = {
  key: ModuleKey;
  label: string;
  entitySingular: string;
  entityLabel: string;
  appointmentSingular: string;
  appointmentLabel: string;
  serviceExamples: string[];
};
