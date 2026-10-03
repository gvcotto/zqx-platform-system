begin;
create function zqx.tenant_immutable() returns trigger language plpgsql as $$
begin
 if new.organization_id<>old.organization_id then raise exception 'Tenant identity is immutable' using errcode='23514'; end if;
 return new;
end $$;
create trigger immutable_tenant before update on zqx.customers for each row execute function zqx.tenant_immutable();
create trigger immutable_tenant before update on zqx.leads for each row execute function zqx.tenant_immutable();
create trigger immutable_tenant before update on zqx.appointments for each row execute function zqx.tenant_immutable();
create trigger immutable_tenant before update on zqx.tasks for each row execute function zqx.tenant_immutable();
create trigger immutable_tenant before update on zqx.invoices for each row execute function zqx.tenant_immutable();
create trigger immutable_tenant before update on zqx.memberships for each row execute function zqx.tenant_immutable();
create trigger immutable_tenant before update on zqx.organization_modules for each row execute function zqx.tenant_immutable();
create trigger audit after insert or update or delete on zqx.users for each row execute function zqx.audit_change();
revoke execute on function zqx.tenant_immutable() from public;
commit;
