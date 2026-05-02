"use client";

import { useEffect, useMemo, useState } from "react";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import PasswordLoginForm from "@/components/auth/PasswordLoginForm";
import LocaleSwitcher from "@/components/common/LocaleSwitcher";
import { defaultLocale, isLocale, type Locale, uiLocaleStorageKey } from "@/lib/i18n";

type CapabilityVisual = "multi" | "ops" | "billing";

type CapabilityItem = {
  label: string;
  detail: string;
  visual: CapabilityVisual;
  image: string;
  imageAlt: string;
};

const copy = {
  es: {
    brand: "ZQX Platform System",
    title: "Portal de acceso para operaciones comerciales",
    subtitle: "Plataforma modular para administrar clientes, citas, cobros, usuarios y flujos operativos por empresa.",
    authTitle: "Autenticacion",
    authSubtitle: "Ingresa con una cuenta autorizada por tu organizacion.",
    accessPending: "Tu cuenta fue registrada, pero aun no tiene acceso activo. Un administrador de ZQX debe asignarte empresa, rol y estado activo.",
    accessDisabled: "Tu acceso esta deshabilitado. Solicita activacion al administrador de ZQX.",
    accessNotFound: "Tu cuenta no esta autorizada en esta plataforma. Solicita alta al administrador de ZQX.",
    oauthExchangeHint: "Verifica Client ID y Client Secret de Google en Supabase y el callback https://<tu-proyecto>.supabase.co/auth/v1/callback en Google Cloud.",
    divider: "o",
    capabilities: [
      {
        label: "Administracion multiempresa",
        detail: "Control de usuarios, modulos y espacios de trabajo por cliente.",
        visual: "multi",
        image: "/logos/zqx.svg",
        imageAlt: "ZQX logo",
      },
      {
        label: "Operacion diaria",
        detail: "Clientes, agenda, tareas, servicios y seguimiento en un solo panel.",
        visual: "ops",
        image: "/logos/dental-smile.svg",
        imageAlt: "Dental module preview",
      },
      {
        label: "Cobros y saldos",
        detail: "Registro de pagos pendientes, parciales y completados por cuenta.",
        visual: "billing",
        image: "/logos/mesa-central-foods.svg",
        imageAlt: "Billing module preview",
      },
    ] as CapabilityItem[],
  },
  en: {
    brand: "ZQX Platform System",
    title: "Access portal for daily operations",
    subtitle: "Modular platform to manage clients, appointments, billing, users, and operational workflows per company.",
    authTitle: "Authentication",
    authSubtitle: "Sign in with an account authorized by your organization.",
    accessPending: "Your account was registered but access is not active yet. A ZQX admin must assign company, role, and active status.",
    accessDisabled: "Your access is disabled. Contact your ZQX administrator.",
    accessNotFound: "Your account is not authorized in this platform. Ask your ZQX administrator to grant access.",
    oauthExchangeHint: "Verify Google Client ID and Client Secret in Supabase and the callback https://<your-project>.supabase.co/auth/v1/callback in Google Cloud.",
    divider: "or",
    capabilities: [
      {
        label: "Multi-company admin",
        detail: "Control users, modules, and workspaces per client account.",
        visual: "multi",
        image: "/logos/zqx.svg",
        imageAlt: "ZQX logo",
      },
      {
        label: "Daily operations",
        detail: "Clients, scheduling, tasks, services, and follow-up in one panel.",
        visual: "ops",
        image: "/logos/dental-smile.svg",
        imageAlt: "Operations module preview",
      },
      {
        label: "Billing and balances",
        detail: "Track pending, partial, and completed payments per account.",
        visual: "billing",
        image: "/logos/mesa-central-foods.svg",
        imageAlt: "Billing module preview",
      },
    ] as CapabilityItem[],
  },
} as const;

function decodeOAuthError(value: string) {
  let decoded = value;
  for (let index = 0; index < 3; index += 1) {
    try {
      const candidate = decodeURIComponent(decoded);
      if (candidate === decoded) break;
      decoded = candidate;
    } catch {
      break;
    }
  }
  return decoded;
}

function CapabilityMotionGraphic({ visual }: { visual: CapabilityVisual }) {
  if (visual === "multi") {
    return (
      <svg viewBox="0 0 220 64" className="mt-3 h-14 w-full" aria-hidden="true">
        <path d="M20 32H200" stroke="rgba(15,98,254,0.22)" strokeWidth="2" strokeDasharray="4 6">
          <animate attributeName="stroke-dashoffset" from="0" to="-26" dur="2.4s" repeatCount="indefinite" />
        </path>
        <circle cx="40" cy="32" r="8" fill="#0f62fe">
          <animate attributeName="r" values="8;10;8" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="110" cy="32" r="6" fill="#525252">
          <animate attributeName="r" values="6;8;6" dur="2.8s" repeatCount="indefinite" />
        </circle>
        <circle cx="180" cy="32" r="8" fill="#22c55e">
          <animate attributeName="r" values="8;10;8" dur="2.2s" repeatCount="indefinite" />
        </circle>
      </svg>
    );
  }

  if (visual === "ops") {
    return (
      <svg viewBox="0 0 220 64" className="mt-3 h-14 w-full" aria-hidden="true">
        <rect x="18" y="12" width="184" height="40" rx="8" fill="#ffffff" stroke="rgba(22,22,22,0.14)" />
        <path d="M34 40L72 22L110 35L150 20L186 30" fill="none" stroke="#0f62fe" strokeWidth="3" strokeLinecap="round">
          <animate attributeName="stroke-dasharray" values="1 160;160 1;1 160" dur="3.1s" repeatCount="indefinite" />
        </path>
        <circle cx="150" cy="20" r="4" fill="#0f62fe">
          <animate attributeName="cx" values="150;152;150" dur="1.8s" repeatCount="indefinite" />
        </circle>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 220 64" className="mt-3 h-14 w-full" aria-hidden="true">
      <rect x="20" y="14" width="180" height="36" rx="8" fill="#ffffff" stroke="rgba(22,22,22,0.14)" />
      <rect x="34" y="26" width="58" height="12" rx="6" fill="#f3f4f6" />
      <rect x="104" y="26" width="32" height="12" rx="6" fill="#dbeafe">
        <animate attributeName="width" values="32;48;32" dur="2.6s" repeatCount="indefinite" />
      </rect>
      <rect x="148" y="26" width="40" height="12" rx="6" fill="#dcfce7">
        <animate attributeName="x" values="148;142;148" dur="2.2s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

export default function LoginPage() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [oauthError, setOauthError] = useState("");
  const [accessCode, setAccessCode] = useState("");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(uiLocaleStorageKey) : null;
    if (isLocale(stored)) setLocale(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(uiLocaleStorageKey, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const error = params.get("error");
    const errorCode = params.get("error_code");
    const description = params.get("error_description");

    if (!error) return;
    const decodedDescription = description ? decodeOAuthError(description) : "";
    const decodedError = decodeOAuthError(error);
    const decodedCode = errorCode ? decodeOAuthError(errorCode) : "";
    const message = [decodedCode, decodedDescription || decodedError].filter(Boolean).join(": ");

    setOauthError(message || decodedError);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const access = params.get("access");
    if (access === "invited" || access === "disabled" || access === "not_found") {
      setAccessCode(access);
      return;
    }
    setAccessCode("");
  }, []);

  const t = useMemo(() => copy[locale], [locale]);
  const accessMessage =
    accessCode === "invited" ? t.accessPending : accessCode === "disabled" ? t.accessDisabled : accessCode === "not_found" ? t.accessNotFound : "";
  const showOAuthExchangeHint = oauthError.toLowerCase().includes("unable to exchange external code");

  return (
    <main className="min-h-screen bg-[var(--app-bg)]">
      <section className="container grid min-h-screen items-center py-10">
        <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-lg border border-brand-border bg-white shadow-sm lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="border-b border-brand-border p-6 md:p-8 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src="/logos/zqx.svg" alt="ZQX logo" className="h-9 w-24 rounded-md border border-brand-border bg-white p-1 object-contain" />
                <div className="text-sm font-bold">{t.brand}</div>
              </div>
              <LocaleSwitcher locale={locale} onChange={setLocale} />
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">{t.subtitle}</p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {t.capabilities.map((item) => (
                <div key={item.label} className="rounded-lg border border-brand-border bg-neutral-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold">{item.label}</div>
                    <img
                      src={item.image}
                      alt={item.imageAlt}
                      className="login-card-float h-8 w-14 rounded-md border border-brand-border bg-white p-1 object-contain"
                    />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-brand-muted">{item.detail}</div>
                  <div className="login-card-pulse">
                    <CapabilityMotionGraphic visual={item.visual} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="mb-5">
              <h2 className="text-xl font-semibold">{t.authTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-brand-muted">{t.authSubtitle}</p>
            </div>

            {accessMessage ? (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{accessMessage}</div>
            ) : null}

            {oauthError ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {locale === "es" ? "Error de acceso con Google:" : "Google sign-in error:"} {oauthError}
                {showOAuthExchangeHint ? <div className="mt-2 text-xs text-red-700/90">{t.oauthExchangeHint}</div> : null}
              </div>
            ) : null}

            <GoogleLoginButton locale={locale} />

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-brand-border" />
              <span className="text-xs font-semibold text-brand-muted">{t.divider}</span>
              <div className="h-px flex-1 bg-brand-border" />
            </div>

            <PasswordLoginForm locale={locale} />
          </div>
        </div>
      </section>
    </main>
  );
}
