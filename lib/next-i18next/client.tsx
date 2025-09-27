"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode
} from "react";
import {
  defaultLocale,
  defaultNamespace,
  type Locale,
  type Namespace
} from "@/lib/i18n/settings";
import type { LocaleResources } from "@/lib/i18n/resources";

export type TranslationProviderProps = {
  children: ReactNode;
  locale: Locale;
  namespaces: Namespace[];
  resources: LocaleResources;
  fallbackResources: LocaleResources;
};

type TranslationContextValue = {
  locale: Locale;
  namespaces: Namespace[];
  resources: LocaleResources;
  fallbackResources: LocaleResources;
};

const TranslationContext = createContext<TranslationContextValue | null>(null);

export const TranslationProvider = ({
  children,
  locale,
  namespaces,
  resources,
  fallbackResources
}: TranslationProviderProps) => {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo<TranslationContextValue>(
    () => ({ locale, namespaces, resources, fallbackResources }),
    [fallbackResources, locale, namespaces, resources]
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

type TranslationFunction = (key: string, options?: { ns?: Namespace }) => string;

export const useTranslation = (
  namespace: Namespace = defaultNamespace
): {
  t: TranslationFunction;
  i18n: { language: Locale };
  ready: boolean;
} => {
  const context = useContext(TranslationContext);

  if (!context) {
    throw new Error("TranslationProvider is not configured.");
  }

  const { locale, resources, fallbackResources } = context;

  const translate: TranslationFunction = (key, options) => {
    const ns = options?.ns ?? namespace;
    const value = resources[ns]?.[key];

    if (typeof value === "string") {
      return value;
    }

    const fallbackValue = fallbackResources[ns]?.[key];

    if (typeof fallbackValue === "string") {
      return fallbackValue;
    }

    return key;
  };

  return {
    t: translate,
    i18n: { language: locale },
    ready: true
  };
};

export const useCurrentLocale = (): Locale => {
  const context = useContext(TranslationContext);

  if (!context) {
    return defaultLocale;
  }

  return context.locale;
};
