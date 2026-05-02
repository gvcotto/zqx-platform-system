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
    notAvailable: "Google no está habilitado en este entorno. Usa el acceso por email.",
    supabaseInitError: "No se pudo inicializar Supabase.",
    opening: "Abriendo Google...",
    cta: "Continuar con Google",
  },
  en: {
    notAvailable: "Google sign-in is not enabled in this environment. Use email access.",
    supabaseInitError: "Could not initialize Supabase.",
    opening: "Opening Google...",
    cta: "Continue with Google",
  },
} as const;

export default function GoogleLoginButton({ locale }: GoogleLoginButtonProps) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const config = getSupabaseConfig();
  const hostedDomain = process.env.NEXT_PUBLIC_GOOGLE_HOSTED_DOMAIN?.trim();
  const t = useMemo(() => copy[locale], [locale]);

  async function signIn() {
    setError("");

    if (!config.isConfigured) {
      setError(t.notAvailable);
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
  }

  return (
    <div>
      <button
        type="button"
        onClick={signIn}
        disabled={isLoading}
        className="focus-ring pressable inline-flex w-full items-center justify-center gap-3 rounded-md border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-charcoal shadow-sm hover:border-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9c-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 4 1.5l2.7-2.7C17 2.6 14.7 1.5 12 1.5C6.9 1.5 2.8 5.8 2.8 11s4.1 9.5 9.2 9.5c5.3 0 8.8-3.7 8.8-8.9c0-.6-.1-1-.2-1.4z" />
          <path fill="#34A853" d="M3.9 7.2l3.2 2.4c.9-2.6 2.8-4.1 4.9-4.1c1.9 0 3.2.8 4 1.5l2.7-2.7C17 2.6 14.7 1.5 12 1.5c-3.5 0-6.6 2-8.1 5.7z" />
          <path fill="#FBBC05" d="M12 20.5c2.6 0 4.8-.9 6.5-2.4l-3-2.4c-.8.6-1.9 1.1-3.5 1.1c-3.2 0-5.9-2.1-6.9-5.1l-3.2 2.5c1.5 3.8 5.3 6.3 10.1 6.3z" />
          <path fill="#4285F4" d="M21 11.6c0-.6-.1-1-.2-1.4H12v3.9h5.5c-.2 1.1-1 2.7-2.5 3.7l3 2.4c1.7-1.6 3-4 3-7.6z" />
        </svg>
        {isLoading ? t.opening : t.cta}
      </button>

      {error ? <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div> : null}
    </div>
  );
}
