# Supabase CRUD + RLS - Fase 1

> Documento historico. Desde Phase 1A (2026-09-28), produccion y desarrollo fallan de forma explicita si Supabase no esta disponible. Memoria existe solamente en modos `demo` y `test`.

Fecha: 2026-07-25

## Objetivo

Pasar el MVP de datos en memoria hacia CRUD real en Supabase Postgres con una activacion controlada.

## Implementado

- `lib/core/data.ts`: capa async para `list/get/create/update/delete`.
- `lib/core/access.ts`: alcance por `business_id` y rol.
- Rutas CRUD, chatbot, callback Google y login local conectados a la capa async.
- `supabase/schema.sql` con IDs `text`, columnas actuales del MVP, modulo `restaurant`, triggers `updated_at` y politicas RLS.
- `.env.example` exige un `ZQX_RUNTIME_MODE` explicito fuera de desarrollo/test.

## Activacion

1. Aplicar `supabase/schema.sql` en Supabase.
2. Cargar datos base equivalentes a `lib/core/seed.ts`.
3. Confirmar que `gvcotto@zqxconsulting.com` exista en `public.users` como `zqx_owner`, `active`, `biz-zqx`.
4. En Vercel configurar `ZQX_RUNTIME_MODE=production` y las variables Supabase requeridas.
5. Validar login Google, dashboard, crear cliente, editar cita y registrar cobro.

## Notas de rollback

- Produccion nunca debe volver a memoria. El rollback debe restaurar una version compatible de aplicacion/base de datos.
- No ejecutar este schema encima de una base existente con IDs `uuid` sin una migracion previa.
- Con RLS activo, un usuario autenticado por Google debe existir en `public.users` para operar.
