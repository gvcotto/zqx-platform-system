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

## MVP Modules

- General Module
- Dentist Module
- Medical Module
- University Module
- Consulting Module
- Custom Module

The General Module provides shared CRUD for clients, appointments, follow-ups, services, payments, FAQs and chatbot logs. Industry modules change labels, workflows and module configuration per company.
