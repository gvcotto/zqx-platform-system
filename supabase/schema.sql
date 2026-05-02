create extension if not exists pgcrypto;

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  industry text not null check (industry in ('general', 'dentist', 'medical', 'university', 'consulting', 'custom')),
  contact_email text not null,
  status text not null check (status in ('active', 'demo', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null check (role in ('zqx_owner', 'business_admin', 'operator', 'viewer')),
  status text not null check (status in ('invited', 'active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('general', 'dentist', 'medical', 'university', 'consulting', 'custom')),
  name text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_modules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  module_id uuid not null references modules(id) on delete cascade,
  enabled boolean not null default false,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, module_id)
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  type text not null check (type in ('person', 'organization')),
  email text not null default '',
  phone text not null default '',
  status text not null check (status in ('lead', 'prospect', 'active', 'inactive')),
  service_interest text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  category text not null,
  price numeric(12, 2) not null default 0,
  duration_minutes integer not null default 60,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  service_id uuid not null references services(id) on delete restrict,
  title text not null,
  scheduled_at timestamptz not null,
  status text not null check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  location text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists followups (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  title text not null,
  channel text not null check (channel in ('email', 'phone', 'whatsapp', 'meeting')),
  due_at timestamptz not null,
  status text not null check (status in ('open', 'in_progress', 'done', 'blocked')),
  owner text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  service_id uuid not null references services(id) on delete restrict,
  appointment_id uuid references appointments(id) on delete set null,
  amount numeric(12, 2) not null,
  amount_paid numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  status text not null check (status in ('paid', 'pending', 'partial')),
  due_at timestamptz not null,
  paid_at timestamptz,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount >= 0),
  check (amount_paid >= 0),
  check (amount_paid <= amount)
);

create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  question text not null,
  answer text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chatbot_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_email text,
  visitor_name text,
  visitor_phone text,
  visitor_email text,
  service_interest text,
  message text not null,
  response text not null,
  created_client_id uuid references clients(id) on delete set null,
  created_appointment_id uuid references appointments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_business_id_idx on users(business_id);
create index if not exists clients_business_id_idx on clients(business_id);
create index if not exists appointments_business_id_idx on appointments(business_id);
create index if not exists followups_business_id_idx on followups(business_id);
create index if not exists payments_business_id_idx on payments(business_id);
create index if not exists faqs_business_id_idx on faqs(business_id);
create index if not exists chatbot_logs_business_id_idx on chatbot_logs(business_id);
