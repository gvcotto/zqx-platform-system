"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSiteUrl, getSupabaseConfig } from "@/lib/supabase/config";
import type { Locale } from "@/lib/i18n";

type GoogleLoginButtonProps = {
  locale: Locale;
};

const copy = {
  es: {
    notConfigured: "Google no esta habilitado en este entorno. Usa el acceso por email.",
    invalidSupabaseUrl: "La URL publica de Supabase no parece valida. Revisa NEXT_PUBLIC_SUPABASE_URL.",
    supabaseInitError: "No se pudo inicializar Supabase.",
    requestFailed: "No se pudo abrir Google. Revisa que el proyecto de Supabase exista, este activo y resuelva por DNS.",
    opening: "Abriendo Google...",
    cta: "Continuar con Google",
  },
  en: {
    notConfigured: "Google sign-in is not enabled in this environment. Use email access.",
    invalidSupabaseUrl: "The public Supabase URL does not look valid. Check NEXT_PUBLIC_SUPABASE_URL.",
    supabaseInitError: "Could not initialize Supabase.",
    requestFailed: "Could not open Google. Check that the Supabase project exists, is active, and resolves in DNS.",
    opening: "Opening Google...",
    cta: "Continue with Google",
  },
} as const;

function getSupabaseConfigIssue(url?: string, anonKey?: string) {
  if (!url || !anonKey) return "missing";

  try {
    const parsed = new URL(url);
    const hasValidProtocol = parsed.protocol === "https:";
    const hasSupabaseHost = parsed.hostname.endsWith(".supabase.co");
    return hasValidProtocol && hasSupabaseHost ? "" : "invalid-url";
  } catch {
    return "invalid-url";
  }
}

export default function GoogleLoginButton({ locale }: GoogleLoginButtonProps) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const config = getSupabaseConfig();
  const hostedDomain = process.env.NEXT_PUBLIC_GOOGLE_HOSTED_DOMAIN?.trim();
  const t = useMemo(() => copy[locale], [locale]);
  const configIssue = getSupabaseConfigIssue(config.url, config.anonKey);
  const configMessage = configIssue === "missing" ? t.notConfigured : configIssue === "invalid-url" ? t.invalidSupabaseUrl : "";

  async function signIn() {
    setError("");

    if (configMessage) {
      setError(configMessage);
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setError(t.supabaseInitError);
      return;
    }

    setIsLoading(true);

    const redirectOrigin = typeof window !== "undefined" ? window.location.origin : getSiteUrl();
    const queryParams: Record<string, string> = { prompt: "select_account" };
    if (hostedDomain) queryParams.hd = hostedDomain;

    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${redirectOrigin}/auth/callback`,
          queryParams,
        },
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
      }
    } catch {
      setError(t.requestFailed);
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={signIn}
        disabled={isLoading || Boolean(configMessage)}
        className="focus-ring pressable inline-flex w-full items-center justify-center gap-3 rounded-md border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-charcoal shadow-sm hover:border-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9c-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 4 1.5l2.7-2.7C17 2.6 14.7 1.5 12 1.5C6.9 1.5 2.8 5.8 2.8 11s4.1 9.5 9.2 9.5c5.3 0 8.8-3.7 8.8-8.9c0-.6-.1-1-.2-1.4z" />
          <path fill="#34A853" d="M3.9 7.2l3.2 2.4c.9-2.6 2.8-4.1 4.9-4.1c1.9 0 3.2.8 4 1.5l2.7-2.7C17 2.6 14.7 1.5 12 1.5c-3.5 0-6.6 2-8.1 5.7z" />
          <path fill="#FBBC05" d="M12 20.5c2.6 0 4.8-.9 6.5-2.4l-3-2.4c-.8.6-1.9 1.1-3.5 1.1c-3.2 0-5.9-2.1-6.9-5.1l-3.2 2.5c1.5 3.8 5.3 6.3 10.1 6.3z" />
          <path fill="#4285F4" d="M21 11.6c0-.6-.1-1-.2-1.4H12v3.9h5.5c-.2 1.1-1 2.7-2.5 3.7l3 2.4c1.7-1.6 3-4 3-7.6z" />
        </svg>
        {isLoading ? t.opening : configMessage || t.cta}
      </button>

      {configMessage ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{configMessage}</div>
      ) : null}

      {error ? <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div> : null}
    </div>
  );
}
