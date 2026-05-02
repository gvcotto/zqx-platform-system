"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Locale } from "@/lib/i18n";

type PasswordLoginFormProps = {
  locale: Locale;
};

const copy = {
  es: {
    email: "Email",
    password: "Contraseña",
    submit: "Entrar con email",
    loading: "Ingresando...",
    invalidLogin: "Email o contraseña inválida.",
    supabaseInitError: "No se pudo inicializar Supabase.",
  },
  en: {
    email: "Email",
    password: "Password",
    submit: "Sign in with email",
    loading: "Signing in...",
    invalidLogin: "Invalid email or password.",
    supabaseInitError: "Could not initialize Supabase.",
  },
} as const;

export default function PasswordLoginForm({ locale }: PasswordLoginFormProps) {
  const router = useRouter();
  const config = getSupabaseConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const t = useMemo(() => copy[locale], [locale]);

  function mapServerError(message?: string) {
    if (!message) return t.invalidLogin;
    if (locale === "en") {
      if (message.includes("inválida") || message.includes("invalida")) return t.invalidLogin;
      if (message.includes("no está") || message.includes("no esta")) return t.invalidLogin;
    }
    return message;
  }

  async function signInWithLocalPassword() {
    const response = await fetch("/api/auth/password/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; redirectTo?: string };

    if (!response.ok) {
      throw new Error(mapServerError(data.error));
    }

    router.push(data.redirectTo ?? "/dashboard");
    router.refresh();
  }

  async function signInWithSupabasePassword() {
    if (!config.isConfigured) {
      throw new Error(t.invalidLogin);
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) throw new Error(t.supabaseInitError);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw signInError;

    router.push("/dashboard");
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      try {
        await signInWithLocalPassword();
      } catch (localSignInError) {
        if (!config.isConfigured) {
          throw localSignInError;
        }

        try {
          await signInWithSupabasePassword();
        } catch {
          throw localSignInError;
        }
      }
    } catch (signInError) {
      setError(signInError instanceof Error ? mapServerError(signInError.message) : t.invalidLogin);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-semibold text-brand-charcoal">
          {t.email}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-semibold text-brand-charcoal">
          {t.password}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="focus-ring mt-2 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
          autoComplete="current-password"
          required
        />
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <button
        type="submit"
        disabled={isLoading}
        className="focus-ring pressable inline-flex w-full justify-center rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-[#0043ce] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? t.loading : t.submit}
      </button>
    </form>
  );
}
