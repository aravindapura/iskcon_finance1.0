export const locales = ["en", "ru"] as const;
export const defaultLocale = "en" as const;
export const fallbackLocale = defaultLocale;
export const namespaces = ["common"] as const;
export const defaultNamespace = namespaces[0];

export type Locale = (typeof locales)[number];
export type Namespace = (typeof namespaces)[number];

export const isLocale = (value: string): value is Locale =>
  locales.includes(value as Locale);
