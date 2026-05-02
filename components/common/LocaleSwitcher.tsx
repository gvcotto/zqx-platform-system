"use client";

import type { Locale } from "@/lib/i18n";

type LocaleSwitcherProps = {
  locale: Locale;
  onChange: (value: Locale) => void;
  compact?: boolean;
};

export default function LocaleSwitcher({ locale, onChange, compact = false }: LocaleSwitcherProps) {
  const baseClass = compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs";

  return (
    <div className="inline-flex items-center rounded-md border border-brand-border bg-white p-1">
      <button
        type="button"
        onClick={() => onChange("es")}
        className={`focus-ring rounded ${baseClass} font-semibold ${locale === "es" ? "bg-brand-charcoal text-white" : "text-brand-muted hover:bg-neutral-100"}`}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => onChange("en")}
        className={`focus-ring rounded ${baseClass} font-semibold ${locale === "en" ? "bg-brand-charcoal text-white" : "text-brand-muted hover:bg-neutral-100"}`}
      >
        EN
      </button>
    </div>
  );
}
