"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LocaleSwitcher from "@/components/common/LocaleSwitcher";
import { defaultLocale, isLocale, type Locale, uiLocaleStorageKey } from "@/lib/i18n";

const copy = {
  es: {
    title: "Cuenta sin acceso operativo",
    subtitle: "Tu autenticacion fue valida, pero tu usuario aun no tiene permisos para entrar al workspace.",
    invited: "Estado actual: Invitado. Un admin ZQX debe asignarte empresa, rol y estado activo.",
    disabled: "Estado actual: Deshabilitado. Solicita reactivacion a un admin ZQX.",
    notFound: "Estado actual: No registrado. Solicita alta a un admin ZQX.",
    unknown: "No se pudo determinar el estado de acceso. Vuelve a iniciar sesion.",
    signOut: "Cerrar sesion",
    goLogin: "Ir a login",
    signingOut: "Cerrando sesion...",
  },
  en: {
    title: "Account without workspace access",
    subtitle: "Authentication was valid, but this user does not have permissions to enter the workspace yet.",
    invited: "Current status: Invited. A ZQX admin must assign company, role, and active status.",
    disabled: "Current status: Disabled. Ask a ZQX admin to reactivate your access.",
    notFound: "Current status: Not registered. Ask a ZQX admin to grant access.",
    unknown: "Access state could not be determined. Sign in again.",
    signOut: "Sign out",
    goLogin: "Go to login",
    signingOut: "Signing out...",
  },
} as const;

export default function AccessPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [reason, setReason] = useState("unknown");
  const [isBusy, setIsBusy] = useState(false);
  const t = useMemo(() => copy[locale], [locale]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(uiLocaleStorageKey) : null;
    if (isLocale(stored)) setLocale(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(uiLocaleStorageKey, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const queryReason = params.get("reason");
    if (queryReason === "invited" || queryReason === "disabled" || queryReason === "not_found") {
      setReason(queryReason);
      return;
    }
    setReason("unknown");
  }, []);

  async function signOut() {
    setIsBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  const reasonMessage = reason === "invited" ? t.invited : reason === "disabled" ? t.disabled : reason === "not_found" ? t.notFound : t.unknown;

  return (
    <main className="min-h-screen bg-[var(--app-bg)]">
      <section className="container grid min-h-screen items-center py-10">
        <div className="mx-auto w-full max-w-3xl rounded-lg border border-brand-border bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-bold">ZQX Platform System</div>
            <LocaleSwitcher locale={locale} onChange={setLocale} />
          </div>

          <h1 className="mt-4 text-3xl font-semibold">{t.title}</h1>
          <p className="mt-3 text-sm leading-6 text-brand-muted">{t.subtitle}</p>

          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{reasonMessage}</div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={signOut}
              disabled={isBusy}
              className="focus-ring rounded-md bg-brand-charcoal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isBusy ? t.signingOut : t.signOut}
            </button>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="focus-ring rounded-md border border-brand-border bg-white px-4 py-2 text-sm font-semibold hover:border-brand-blue"
            >
              {t.goLogin}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
