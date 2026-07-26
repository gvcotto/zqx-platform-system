create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.businesses (
  id text primary key default ('biz-' || gen_random_uuid()::text),
  name text not null,
  slug text not null unique,
  industry text not null check (industry in ('general', 'dentist', 'medical', 'university', 'consulting', 'restaurant', 'custom')),
  contact_email text not null,
  logo_url text,
  status text not null check (status in ('active', 'demo', 'paused')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id text primary key default ('usr-' || gen_random_uuid()::text),
  business_id text not null references public.businesses(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null check (role in ('zqx_owner', 'business_admin', 'operator', 'viewer')),
  status text not null check (status in ('invited', 'active', 'disabled')),
  temporary_password text,
  auth_source text check (auth_source in ('local', 'google')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modules (
  id text primary key default ('mod-' || gen_random_uuid()::text),
  key text not null unique check (key in ('general', 'dentist', 'medical', 'university', 'consulting', 'restaurant', 'custom')),
  name text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_modules (
  id text primary key default ('bmod-' || gen_random_uuid()::text),
  business_id text not null references public.businesses(id) on delete cascade,
  module_id text not null references public.modules(id) on delete cascade,
  enabled boolean not null default false,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, module_id)
);

create table if not exists public.clients (
  id text primary key default ('cli-' || gen_random_uuid()::text),
  business_id text not null references public.businesses(id) on delete cascade,
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

create table if not exists public.services (
  id text primary key default ('svc-' || gen_random_uuid()::text),
  business_id text not null references public.businesses(id) on delete cascade,
  name text not null,
  category text not null,
  price numeric(12, 2) not null default 0,
  duration_minutes integer not null default 60,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id text primary key default ('apt-' || gen_random_uuid()::text),
  business_id text not null references public.businesses(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  service_id text not null references public.services(id) on delete restrict,
  title text not null,
  scheduled_at timestamptz not null,
  status text not null check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  location text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.followups (
  id text primary key default ('flw-' || gen_random_uuid()::text),
  business_id text not null references public.businesses(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  appointment_id text references public.appointments(id) on delete set null,
  title text not null,
  channel text not null check (channel in ('email', 'phone', 'whatsapp', 'meeting')),
  due_at timestamptz not null,
  status text not null check (status in ('open', 'in_progress', 'done', 'blocked')),
  owner text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id text primary key default ('pay-' || gen_random_uuid()::text),
  business_id text not null references public.businesses(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  service_id text not null references public.services(id) on delete restrict,
  appointment_id text references public.appointments(id) on delete set null,
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

create table if not exists public.faqs (
  id text primary key default ('faq-' || gen_random_uuid()::text),
  business_id text not null references public.businesses(id) on delete cascade,
  question text not null,
  answer text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chatbot_logs (
  id text primary key default ('chat-' || gen_random_uuid()::text),
  business_id text not null references public.businesses(id) on delete cascade,
  user_email text,
  visitor_name text,
  visitor_phone text,
  visitor_email text,
  service_interest text,
  message text not null,
  response text not null,
  created_client_id text references public.clients(id) on delete set null,
  created_appointment_id text references public.appointments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_business_id_idx on public.users(business_id);
create index if not exists clients_business_id_idx on public.clients(business_id);
create index if not exists appointments_business_id_idx on public.appointments(business_id);
create index if not exists followups_business_id_idx on public.followups(business_id);
create index if not exists payments_business_id_idx on public.payments(business_id);
create index if not exists faqs_business_id_idx on public.faqs(business_id);
create index if not exists chatbot_logs_business_id_idx on public.chatbot_logs(business_id);

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at before update on public.businesses for each row execute function public.set_updated_at();
drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
drop trigger if exists modules_set_updated_at on public.modules;
create trigger modules_set_updated_at before update on public.modules for each row execute function public.set_updated_at();
drop trigger if exists business_modules_set_updated_at on public.business_modules;
create trigger business_modules_set_updated_at before update on public.business_modules for each row execute function public.set_updated_at();
drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at before update on public.services for each row execute function public.set_updated_at();
drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at before update on public.appointments for each row execute function public.set_updated_at();
drop trigger if exists followups_set_updated_at on public.followups;
create trigger followups_set_updated_at before update on public.followups for each row execute function public.set_updated_at();
drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
drop trigger if exists faqs_set_updated_at on public.faqs;
create trigger faqs_set_updated_at before update on public.faqs for each row execute function public.set_updated_at();
drop trigger if exists chatbot_logs_set_updated_at on public.chatbot_logs;
create trigger chatbot_logs_set_updated_at before update on public.chatbot_logs for each row execute function public.set_updated_at();

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where lower(email) = public.current_user_email() and status = 'active' limit 1;
$$;

create or replace function public.current_business_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.users where lower(email) = public.current_user_email() and status = 'active' limit 1;
$$;

create or replace function public.is_zqx_owner()
returns boolean
language sql
stable
as $$
  select public.current_user_role() = 'zqx_owner';
$$;

alter table public.businesses enable row level security;
alter table public.users enable row level security;
alter table public.modules enable row level security;
alter table public.business_modules enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.followups enable row level security;
alter table public.payments enable row level security;
alter table public.faqs enable row level security;
alter table public.chatbot_logs enable row level security;

drop policy if exists businesses_select_policy on public.businesses;
create policy businesses_select_policy on public.businesses for select to authenticated
using (public.is_zqx_owner() or id = public.current_business_id());
drop policy if exists businesses_owner_write_policy on public.businesses;
create policy businesses_owner_write_policy on public.businesses for all to authenticated
using (public.is_zqx_owner())
with check (public.is_zqx_owner());

drop policy if exists modules_select_policy on public.modules;
create policy modules_select_policy on public.modules for select to authenticated using (true);
drop policy if exists modules_owner_write_policy on public.modules;
create policy modules_owner_write_policy on public.modules for all to authenticated
using (public.is_zqx_owner())
with check (public.is_zqx_owner());

drop policy if exists users_select_policy on public.users;
create policy users_select_policy on public.users for select to authenticated
using (
  public.is_zqx_owner()
  or lower(email) = public.current_user_email()
  or (business_id = public.current_business_id() and public.current_user_role() = 'business_admin')
);
drop policy if exists users_write_policy on public.users;
create policy users_write_policy on public.users for all to authenticated
using (
  public.is_zqx_owner()
  or (business_id = public.current_business_id() and public.current_user_role() = 'business_admin' and role <> 'zqx_owner')
)
with check (
  public.is_zqx_owner()
  or (business_id = public.current_business_id() and public.current_user_role() = 'business_admin' and role <> 'zqx_owner')
);

drop policy if exists business_modules_select_policy on public.business_modules;
create policy business_modules_select_policy on public.business_modules for select to authenticated
using (public.is_zqx_owner() or business_id = public.current_business_id());
drop policy if exists business_modules_write_policy on public.business_modules;
create policy business_modules_write_policy on public.business_modules for all to authenticated
using (public.is_zqx_owner())
with check (public.is_zqx_owner());

drop policy if exists clients_business_policy on public.clients;
create policy clients_business_policy on public.clients for all to authenticated
using (public.is_zqx_owner() or business_id = public.current_business_id())
with check (public.is_zqx_owner() or business_id = public.current_business_id());
drop policy if exists services_business_policy on public.services;
create policy services_business_policy on public.services for all to authenticated
using (public.is_zqx_owner() or business_id = public.current_business_id())
with check (public.is_zqx_owner() or business_id = public.current_business_id());
drop policy if exists appointments_business_policy on public.appointments;
create policy appointments_business_policy on public.appointments for all to authenticated
using (public.is_zqx_owner() or business_id = public.current_business_id())
with check (public.is_zqx_owner() or business_id = public.current_business_id());
drop policy if exists followups_business_policy on public.followups;
create policy followups_business_policy on public.followups for all to authenticated
using (public.is_zqx_owner() or business_id = public.current_business_id())
with check (public.is_zqx_owner() or business_id = public.current_business_id());
drop policy if exists payments_business_policy on public.payments;
create policy payments_business_policy on public.payments for all to authenticated
using (public.is_zqx_owner() or business_id = public.current_business_id())
with check (public.is_zqx_owner() or business_id = public.current_business_id());
drop policy if exists faqs_business_policy on public.faqs;
create policy faqs_business_policy on public.faqs for all to authenticated
using (public.is_zqx_owner() or business_id = public.current_business_id())
with check (public.is_zqx_owner() or business_id = public.current_business_id());
drop policy if exists chatbot_logs_business_policy on public.chatbot_logs;
create policy chatbot_logs_business_policy on public.chatbot_logs for all to authenticated
using (public.is_zqx_owner() or business_id = public.current_business_id())
with check (public.is_zqx_owner() or business_id = public.current_business_id());
