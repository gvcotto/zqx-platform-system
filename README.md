# ZQX Platform System

Standalone MVP SaaS for `system.zqxconsulting.com`.

This app is intentionally separate from the corporate site:

- `zqxconsulting.com` remains the marketing/corporate website.
- `zqxconsulting.com/platform` keeps the existing platform showcase and links to this system.
- `system.zqxconsulting.com` runs the operational MVP with Google/Supabase Auth, tenant setup, module assignment and dashboard workflows.

## Local Development

```bash
npm install
npm run dev -- -p 3007
```

Open `http://localhost:3007`.

When Supabase variables are not configured, local development uses password-based demo login.

Demo credentials:

- ZQX admin: `gvcotto@zqxconsulting.com` / `ZQXdemo2026!`
- Client admin: `admin@dentalsmile.example` / `DemoDental2026!`

## Environment

```bash
NEXT_PUBLIC_SITE_URL="https://system.zqxconsulting.com"
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
NEXT_PUBLIC_GOOGLE_HOSTED_DOMAIN=""
ZQX_DATA_BACKEND="memory"
ZQX_SYSTEM_OWNER_EMAIL="gvcotto@zqxconsulting.com"
```

Supabase Auth should enable Google as a provider and include these redirect URLs:

- `http://localhost:3007/auth/callback`
- `https://system.zqxconsulting.com/auth/callback`

Google OAuth should be treated as identity only. Access is controlled by system user records and roles:

Email/password can also be enabled through Supabase Auth. In local development without Supabase, the app falls back to signed demo sessions through `/api/auth/password/login`.

- `zqx_owner`: ZQX admin, can switch companies and assign modules.
- `business_admin`: client admin for one company.
- `operator`: day-to-day user.
- `viewer`: read-only user.

## Vercel setup (system.zqxconsulting.com)

Set these Environment Variables in Vercel (`Production`, `Preview`, and `Development` as needed):

```bash
NEXT_PUBLIC_SITE_URL=https://system.zqxconsulting.com
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>
NEXT_PUBLIC_GOOGLE_HOSTED_DOMAIN=
ZQX_SYSTEM_AUTH_SECRET=<LONG_RANDOM_SECRET>
ZQX_SYSTEM_OWNER_EMAIL=gvcotto@zqxconsulting.com
ZQX_SYSTEM_ADMIN_EMAIL=gvcotto@zqxconsulting.com
ZQX_SYSTEM_ADMIN_PASSWORD=ZQXdemo2026!
ZQX_SYSTEM_COOKIE_SECURE=true
ZQX_DATA_BACKEND=memory
```

Auth providers configuration:

1. Supabase > Authentication > URL Configuration:
   - Site URL: `https://system.zqxconsulting.com`
   - Redirect URLs:
     - `http://localhost:3007/auth/callback`
     - `https://system.zqxconsulting.com/auth/callback`
2. Supabase > Authentication > Providers > Google:
   - Enable Google provider.
   - Set Google Client ID and Client Secret from Google Cloud.
3. Google Cloud (OAuth client):
   - Authorized JavaScript origins:
     - `http://localhost:3007`
     - `https://system.zqxconsulting.com`
   - Authorized redirect URI:
     - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`

## MVP Modules

- General Module
- Dentist Module
- Medical Module
- University Module
- Consulting Module
- Restaurant Module
- Custom Module

The General Module provides shared CRUD for clients, appointments, follow-ups, services, payments, FAQs and chatbot logs. Industry modules change labels, workflows and module configuration per company.

## Docs

- `docs/architecture-map.es-en.md`
- `docs/supabase-crud-rls-phase1.md`
- `docs/tutorial-zqx-admins.md`
- `docs/tutorial-client-companies.md`

## Change log

### 2026-07-25

- Removed the automatic browser reachability `fetch` from the Google login button to avoid noisy DNS errors on page load.
- Added clearer Google/Supabase configuration messages for missing or malformed public Supabase settings.
- Confirmed the active configured Supabase host `jgvvmtiexnpwllzutizf.supabase.co` does not resolve locally; update `NEXT_PUBLIC_SUPABASE_URL` to the real active Supabase project URL and redeploy.
- Added root-level analysis documentation under `../zqx_analysis`.
- Supabase was later reactivated and Google login was confirmed working in production.
- Added the `Structure` dashboard view to separate ZQX administration, client companies, and company operations before users jump into daily workflows.
- Grouped the sidebar navigation into Governance, Company operations, and Automation.
- Added portable local tooling documentation under `../zqx_analysis`; system build was validated from a clean non-OneDrive copy because OneDrive caused local webpack read errors.
- Added the first Supabase CRUD/RLS phase behind `ZQX_DATA_BACKEND=supabase`, with fallback to memory while migration is validated.
- Added docs for Supabase activation and tutorials for ZQX admins and client-company users.

### 2026-06-02

- Added a production-side check in the Google login button so the UI does not send users into a dead Supabase OAuth flow when the configured host is unreachable.
- Documented the current production issue: the Supabase host configured for OAuth does not resolve, so the environment variable must be corrected and the app redeployed.
- Kept the auth callback target aligned with `https://system.zqxconsulting.com/auth/callback`.
