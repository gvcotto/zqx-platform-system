begin;
create function zqx.audit_change() returns trigger language plpgsql security definer set search_path=pg_catalog,zqx as $$
declare rowdata jsonb; org uuid;
begin
 rowdata=case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 org=case when TG_TABLE_NAME='organizations' then (rowdata->>'id')::uuid else (rowdata->>'organization_id')::uuid end;
 -- Allowlist ONLY. Do not copy arbitrary notes, contact data, settings or credentials.
 insert into zqx.audit_events(organization_id,actor_user_id,actor_type,action,resource_type,resource_id,request_id,source,before,after)
 values(org,zqx.actor_id(),'user',lower(TG_OP),TG_TABLE_NAME,coalesce((rowdata->>'id')::uuid,(rowdata->>'user_id')::uuid),
 nullif(current_setting('zqx.request_id',true),''),'database',
 case when TG_OP<>'INSERT' then jsonb_build_object('status',to_jsonb(old)->>'status','role',to_jsonb(old)->>'role') end,
 case when TG_OP<>'DELETE' then jsonb_build_object('status',rowdata->>'status','role',rowdata->>'role') end);
 return coalesce(new,old);
end $$;
create function zqx.record_access(org uuid) returns void language plpgsql security definer set search_path=pg_catalog,zqx as $$
begin
 if not zqx.allowed(org,'read') then raise exception 'Access denied' using errcode='42501'; end if;
 if exists(select 1 from zqx.platform_roles where user_id=zqx.actor_id()) then
 insert into zqx.audit_events(organization_id,actor_user_id,actor_type,action,resource_type,source,request_id)
 values(org,zqx.actor_id(),'platform','read','workspace','application',current_setting('zqx.request_id',true));
 end if;
end $$;
create function zqx.payment_guard() returns trigger language plpgsql set search_path=pg_catalog,zqx as $$
declare inv zqx.invoices; collected bigint;
begin
 select * into inv from zqx.invoices where id=new.invoice_id and organization_id=new.organization_id for update;
 if not found or inv.status in ('draft','void') then raise exception 'Invoice is unavailable for payment' using errcode='23514'; end if;
 select coalesce(sum(amount),0) into collected from zqx.payments where invoice_id=inv.id and organization_id=inv.organization_id;
 if new.amount+collected>inv.total then raise exception 'Payment exceeds outstanding balance' using errcode='23514'; end if;
 return new;
end $$;
create function zqx.payment_apply() returns trigger language plpgsql set search_path=pg_catalog,zqx as $$
begin
 update zqx.invoices set status=case when (select sum(amount) from zqx.payments where invoice_id=new.invoice_id and organization_id=new.organization_id)=total then 'paid' else 'partial' end
 where id=new.invoice_id and organization_id=new.organization_id;
 return new;
end $$;
create function zqx.invoice_guard() returns trigger language plpgsql set search_path=pg_catalog,zqx as $$
declare collected bigint;
begin
 if TG_OP='INSERT' then
  if new.status not in ('draft','pending','overdue') then raise exception 'New invoice must be unpaid' using errcode='23514'; end if;
 else
  select coalesce(sum(amount),0) into collected from zqx.payments where organization_id=old.organization_id and invoice_id=old.id;
  if collected>0 and (new.customer_id<>old.customer_id or new.currency<>old.currency or new.organization_id<>old.organization_id or new.total<>old.total or new.status in ('draft','void')) then
   raise exception 'Paid invoice identity and total are immutable' using errcode='23514';
  end if;
  if (new.status='paid' and collected<>new.total) or (new.status='partial' and (collected=0 or collected>=new.total)) or (collected>0 and new.status not in ('paid','partial')) then
   raise exception 'Invoice status must reflect payments' using errcode='23514';
  end if;
 end if;
 return new;
end $$;
create trigger balance_check before insert on zqx.payments for each row execute function zqx.payment_guard();
create trigger payment_status after insert on zqx.payments for each row execute function zqx.payment_apply();
create trigger invoice_consistency before insert or update on zqx.invoices for each row execute function zqx.invoice_guard();
create function zqx.immutable() returns trigger language plpgsql as $$ begin raise exception 'Append-only record' using errcode='42501'; end $$;
create trigger audit_immutable before update or delete on zqx.audit_events for each row execute function zqx.immutable();
create trigger payment_immutable before update or delete on zqx.payments for each row execute function zqx.immutable();
alter table zqx.users enable row level security;
alter table zqx.organizations enable row level security;
alter table zqx.memberships enable row level security;
alter table zqx.organization_modules enable row level security;
alter table zqx.platform_roles enable row level security;
alter table zqx.platform_scopes enable row level security;
alter table zqx.customers enable row level security;
alter table zqx.leads enable row level security;
alter table zqx.appointments enable row level security;
alter table zqx.tasks enable row level security;
alter table zqx.invoices enable row level security;
alter table zqx.payments enable row level security;
alter table zqx.audit_events enable row level security;
create policy read on zqx.customers for select using(zqx.allowed(organization_id));
create policy insert on zqx.customers for insert with check(zqx.allowed(organization_id,'write'));
create policy update on zqx.customers for update using(zqx.allowed(organization_id,'write')) with check(zqx.allowed(organization_id,'write'));
create policy delete on zqx.customers for delete using(zqx.allowed(organization_id,'write'));
create policy read on zqx.leads for select using(zqx.allowed(organization_id));
create policy insert on zqx.leads for insert with check(zqx.allowed(organization_id,'write'));
create policy update on zqx.leads for update using(zqx.allowed(organization_id,'write')) with check(zqx.allowed(organization_id,'write'));
create policy delete on zqx.leads for delete using(zqx.allowed(organization_id,'write'));
create policy read on zqx.appointments for select using(zqx.allowed(organization_id));
create policy insert on zqx.appointments for insert with check(zqx.allowed(organization_id,'write'));
create policy update on zqx.appointments for update using(zqx.allowed(organization_id,'write')) with check(zqx.allowed(organization_id,'write'));
create policy delete on zqx.appointments for delete using(zqx.allowed(organization_id,'write'));
create policy read on zqx.tasks for select using(zqx.allowed(organization_id));
create policy insert on zqx.tasks for insert with check(zqx.allowed(organization_id,'write'));
create policy update on zqx.tasks for update using(zqx.allowed(organization_id,'write')) with check(zqx.allowed(organization_id,'write'));
create policy delete on zqx.tasks for delete using(zqx.allowed(organization_id,'write'));
create policy read on zqx.invoices for select using(zqx.allowed(organization_id));
create policy insert on zqx.invoices for insert with check(zqx.allowed(organization_id,'write'));
create policy update on zqx.invoices for update using(zqx.allowed(organization_id,'write')) with check(zqx.allowed(organization_id,'write'));
create policy delete on zqx.invoices for delete using(zqx.allowed(organization_id,'write'));
create policy read on zqx.memberships for select using(zqx.allowed(organization_id));
create policy manage on zqx.memberships for all using(zqx.allowed(organization_id,'admin')) with check(zqx.allowed(organization_id,'admin'));
create policy read on zqx.organization_modules for select using(zqx.allowed(organization_id));
create policy manage on zqx.organization_modules for all using(zqx.allowed(organization_id,'admin')) with check(zqx.allowed(organization_id,'admin'));
create policy read on zqx.organizations for select using(zqx.allowed(id));
create policy manage on zqx.organizations for all using(zqx.allowed(id,'admin')) with check(zqx.allowed(id,'admin'));
create policy profile_read on zqx.users for select using(id=zqx.actor_id() or zqx.owner_access() or exists(select 1 from zqx.memberships m where m.user_id=users.id and zqx.allowed(m.organization_id)));
create policy profile_admin on zqx.users for all using(zqx.owner_access()) with check(zqx.owner_access());
create policy platform_manage on zqx.platform_roles for all using(zqx.owner_access()) with check(zqx.owner_access());
create policy scopes_manage on zqx.platform_scopes for all using(zqx.owner_access()) with check(zqx.owner_access());
create policy payment_read on zqx.payments for select using(zqx.allowed(organization_id));
create policy payment_insert on zqx.payments for insert with check(zqx.allowed(organization_id,'write'));
create policy audit_read on zqx.audit_events for select using(zqx.owner_access() or (organization_id is not null and zqx.allowed(organization_id,'admin')));
create trigger audit after insert or update or delete on zqx.organizations for each row execute function zqx.audit_change();
create trigger audit after insert or update or delete on zqx.memberships for each row execute function zqx.audit_change();
create trigger audit after insert or update or delete on zqx.organization_modules for each row execute function zqx.audit_change();
create trigger audit after insert or update or delete on zqx.platform_roles for each row execute function zqx.audit_change();
create trigger audit after insert or update or delete on zqx.platform_scopes for each row execute function zqx.audit_change();
create trigger audit after insert or update or delete on zqx.customers for each row execute function zqx.audit_change();
create trigger audit after insert or update or delete on zqx.leads for each row execute function zqx.audit_change();
create trigger audit after insert or update or delete on zqx.appointments for each row execute function zqx.audit_change();
create trigger audit after insert or update or delete on zqx.tasks for each row execute function zqx.audit_change();
create trigger audit after insert or update or delete on zqx.invoices for each row execute function zqx.audit_change();
create trigger audit after insert or update or delete on zqx.payments for each row execute function zqx.audit_change();
revoke execute on all functions in schema zqx from public;
grant usage on schema zqx to zqx_app;
grant select,insert,update,delete on all tables in schema zqx to zqx_app;
revoke insert,update,delete on zqx.audit_events from zqx_app;
revoke update,delete on zqx.payments from zqx_app;
grant execute on function zqx.actor_id(),zqx.allowed(uuid,text),zqx.owner_access(),zqx.record_access(uuid) to zqx_app;
commit;

