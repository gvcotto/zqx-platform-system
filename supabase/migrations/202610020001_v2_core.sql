-- Phase 2B clean PostgreSQL track; never apply remotely in this phase.
begin;
create schema zqx;
revoke all on schema zqx from public;
create table zqx.users (
 id uuid primary key default gen_random_uuid(), auth_user_id uuid unique,
 email text not null unique check(email = lower(trim(email))), name text not null,
 status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table zqx.organizations (
 id uuid primary key default gen_random_uuid(), slug text not null unique check(slug=lower(slug)),
 name text not null, industry text not null default '', status text not null default 'active' check(status in ('active','inactive')),
 contact_email text not null, logo_url text, settings jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table zqx.memberships (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references zqx.users,
 organization_id uuid not null references zqx.organizations,
 role text not null check(role in ('org_admin','operator','viewer')),
 status text not null default 'active' check(status in ('active','invited','inactive')),
 invited_by uuid references zqx.users, joined_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,organization_id), unique(organization_id,user_id)
);
create table zqx.platform_roles (
 user_id uuid primary key references zqx.users, role text not null check(role in ('platform_owner','zqx_admin','support'))
);
create table zqx.platform_scopes (
 user_id uuid not null references zqx.platform_roles(user_id), organization_id uuid not null references zqx.organizations,
 expires_at timestamptz, approved_by uuid not null references zqx.users, reason text not null check(length(reason)>0),
 primary key(user_id,organization_id)
);
create table zqx.organization_modules (
 organization_id uuid not null references zqx.organizations, module_key text not null,
 enabled boolean not null default false, configuration jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(organization_id,module_key)
);
create table zqx.customers (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references zqx.organizations,
 name text not null, email text not null, company text not null default '', phone text not null default '',
 status text not null default 'active' check(status in ('active','inactive')), notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,id)
);
create table zqx.leads (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references zqx.organizations,
 name text not null, email text, phone text, company text not null default '',
 stage text not null check(stage in ('new','contacted','qualified','won','lost')),
 next_action text not null default '', owner_user_id uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,id),
 foreign key(organization_id,owner_user_id) references zqx.memberships(organization_id,user_id)
);
create table zqx.appointments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references zqx.organizations,
 customer_id uuid, title text not null, starts_at timestamptz not null, ends_at timestamptz not null check(ends_at>starts_at),
 status text not null check(status in ('scheduled','completed','cancelled')), notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,id),
 foreign key(organization_id,customer_id) references zqx.customers(organization_id,id)
);
create table zqx.tasks (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references zqx.organizations,
 customer_id uuid, title text not null, description text not null default '', due_at timestamptz,
 priority text not null check(priority in ('low','medium','high')), status text not null check(status in ('open','completed')),
 assigned_user_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,id), foreign key(organization_id,customer_id) references zqx.customers(organization_id,id),
 foreign key(organization_id,assigned_user_id) references zqx.memberships(organization_id,user_id)
);
-- Monetary values are integer minor units, explicitly USD (2 decimals) in the local UI.
create table zqx.invoices (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references zqx.organizations,
 customer_id uuid not null, currency text not null default 'USD' check(currency ~ '^[A-Z]{3}$'),
 subtotal bigint not null check(subtotal>0), total bigint not null check(total>=subtotal),
 status text not null check(status in ('draft','pending','partial','paid','overdue','void')),
 issued_at timestamptz, due_at timestamptz not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,id), unique(organization_id,id,customer_id,currency),
 foreign key(organization_id,customer_id) references zqx.customers(organization_id,id)
);
create table zqx.payments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references zqx.organizations,
 invoice_id uuid not null, customer_id uuid not null, amount bigint not null check(amount>0),
 currency text not null, method text not null check(method in ('bank_transfer','card','cash')), reference text,
 paid_at timestamptz not null, created_at timestamptz not null default now(),
 foreign key(organization_id,invoice_id,customer_id,currency) references zqx.invoices(organization_id,id,customer_id,currency),
 foreign key(organization_id,customer_id) references zqx.customers(organization_id,id)
);
create table zqx.audit_events (
 id uuid primary key default gen_random_uuid(), occurred_at timestamptz not null default now(),
 organization_id uuid references zqx.organizations, actor_user_id uuid references zqx.users,
 actor_type text not null, action text not null, resource_type text not null, resource_id uuid,
 request_id text, source text not null, before jsonb, after jsonb, metadata jsonb not null default '{}'
);
create function zqx.actor_id() returns uuid language sql stable security definer set search_path=pg_catalog,zqx as $$
 select id from zqx.users where auth_user_id=nullif(current_setting('zqx.auth_subject',true),'')::uuid and status='active'
$$;
create function zqx.allowed(org uuid, permission text default 'read') returns boolean language sql stable security definer set search_path=pg_catalog,zqx as $$
 select coalesce(
 exists(select 1 from zqx.platform_roles where user_id=zqx.actor_id() and role='platform_owner')
 or exists(select 1 from zqx.memberships where user_id=zqx.actor_id() and organization_id=org and status='active'
 and exists(select 1 from zqx.organizations where id=org and status='active')
 and (permission='read' or (permission='write' and role in ('operator','org_admin')) or (permission='admin' and role='org_admin')))
 or exists(select 1 from zqx.platform_roles r join zqx.platform_scopes s using(user_id)
 where r.user_id=zqx.actor_id() and s.organization_id=org
 and exists(select 1 from zqx.organizations where id=org and status='active')
 and (s.expires_at is null or s.expires_at>now())
 and (r.role='zqx_admin' or (r.role='support' and s.expires_at is not null and permission='read'))),false)
$$;
-- Security definer helpers are owned by the migration role; app has NO BYPASSRLS.
create function zqx.owner_access() returns boolean language sql stable security definer set search_path=pg_catalog,zqx as $$
 select exists(select 1 from zqx.platform_roles where user_id=zqx.actor_id() and role='platform_owner')
$$;
create function zqx.touch() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger updated before update on zqx.users for each row execute function zqx.touch();
create trigger updated before update on zqx.organizations for each row execute function zqx.touch();
create trigger updated before update on zqx.memberships for each row execute function zqx.touch();
create trigger updated before update on zqx.organization_modules for each row execute function zqx.touch();
create trigger updated before update on zqx.customers for each row execute function zqx.touch();
create trigger updated before update on zqx.leads for each row execute function zqx.touch();
create trigger updated before update on zqx.appointments for each row execute function zqx.touch();
create trigger updated before update on zqx.tasks for each row execute function zqx.touch();
create trigger updated before update on zqx.invoices for each row execute function zqx.touch();
create index customers_tenant on zqx.customers(organization_id);
create index leads_tenant on zqx.leads(organization_id);
create index appointments_tenant on zqx.appointments(organization_id);
create index tasks_tenant on zqx.tasks(organization_id);
create index invoices_tenant on zqx.invoices(organization_id);
commit;
