import nextI18NextConfig from "@/next-i18next.config.mjs";

const config = nextI18NextConfig?.i18n ?? { locales: ["en", "ru"], defaultLocale: "en" };

export const locales = config.locales as readonly string[];
export const defaultLocale = config.defaultLocale as string;
export const fallbackLocale = defaultLocale;
export const namespaces = ["common"] as const;
export const defaultNamespace = namespaces[0];

export type Locale = (typeof locales)[number];
export type Namespace = (typeof namespaces)[number];

export const isLocale = (value: string): value is Locale =>
  locales.includes(value as Locale);
