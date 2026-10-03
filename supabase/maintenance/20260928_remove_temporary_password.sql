-- Phase 1A: remove recoverable application passwords.
-- Review and execute under the corporate ZQX account during an approved maintenance window.
-- This migration is intentionally not executed by the Phase 1A implementation.

begin;

update public.users
set temporary_password = null
where temporary_password is not null;

alter table public.users
drop column if exists temporary_password;

commit;
