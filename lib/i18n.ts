export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";
export const uiLocaleStorageKey = "zqx_ui_locale";

export function isLocale(value?: string | null): value is Locale {
  return Boolean(value && (locales as readonly string[]).includes(value));
}

export function localeLabel(locale: Locale) {
  return locale === "es" ? "Español" : "English";
}
