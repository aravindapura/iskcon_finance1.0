import type { Locale, Namespace } from "@/lib/i18n/settings";
import enCommon from "@/public/locales/en/common.json";
import ruCommon from "@/public/locales/ru/common.json";

export type TranslationDictionary = Record<string, string>;
export type LocaleResources = Record<Namespace, TranslationDictionary>;

const resources: Record<Locale, LocaleResources> = {
  en: {
    common: enCommon
  },
  ru: {
    common: ruCommon
  }
} as const;

export const getLocaleResources = (locale: Locale): LocaleResources => {
  if (locale in resources) {
    return resources[locale as keyof typeof resources];
  }

  return resources.en;
};

export default resources;
