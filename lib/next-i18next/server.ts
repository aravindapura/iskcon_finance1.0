import type { Namespace } from "@/lib/i18n/settings";
import {
  defaultLocale,
  defaultNamespace,
  fallbackLocale,
  isLocale,
  locales,
  type Locale
} from "@/lib/i18n/settings";
import resources, { type LocaleResources } from "@/lib/i18n/resources";

export type TranslationNamespaces = Namespace | Namespace[];

export type ServerTranslationResult = {
  locale: Locale;
  namespaces: Namespace[];
  resources: LocaleResources;
  fallbackResources: LocaleResources;
  t: (key: string, options?: { ns?: Namespace }) => string;
};

const uniqueNamespaces = (value: TranslationNamespaces): Namespace[] => {
  const list = Array.isArray(value) ? value : [value];

  if (list.length === 0) {
    return [defaultNamespace];
  }

  return Array.from(new Set(list));
};

const resolveLocale = (candidate: string): Locale => {
  if (isLocale(candidate)) {
    return candidate;
  }

  return defaultLocale;
};

const getNamespaceValue = (
  localeResources: LocaleResources,
  namespace: Namespace
) => localeResources[namespace] ?? {};

const createTranslator = (
  localeResources: LocaleResources,
  fallbackResources: LocaleResources,
  namespace: Namespace
) =>
  (key: string, options?: { ns?: Namespace }) => {
    const ns = options?.ns ?? namespace;
    const value = getNamespaceValue(localeResources, ns)[key];

    if (typeof value === "string") {
      return value;
    }

    const fallbackValue = getNamespaceValue(fallbackResources, ns)[key];

    if (typeof fallbackValue === "string") {
      return fallbackValue;
    }

    return key;
  };

export const getServerTranslation = async (
  locale: string,
  namespaces: TranslationNamespaces = defaultNamespace
): Promise<ServerTranslationResult> => {
  const resolvedLocale = resolveLocale(locale);
  const nsList = uniqueNamespaces(namespaces);
  const localeResources = resources[resolvedLocale] ?? resources[defaultLocale];
  const fallbackResources =
    resources[fallbackLocale] ?? resources[defaultLocale];

  return {
    locale: resolvedLocale,
    namespaces: nsList,
    resources: localeResources,
    fallbackResources,
    t: createTranslator(localeResources, fallbackResources, nsList[0] ?? defaultNamespace)
  };
};

export const getAvailableLocales = () => locales;
export const getDefaultLocale = () => defaultLocale;
