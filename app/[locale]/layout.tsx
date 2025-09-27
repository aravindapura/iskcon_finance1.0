import type { Metadata } from "next";
import type { ReactNode } from "react";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import {
  getAvailableLocales,
  getDefaultLocale,
  getServerTranslation
} from "next-i18next/server";
import { TranslationProvider } from "next-i18next/client";

type LocaleLayoutProps = {
  children: ReactNode;
  params: { locale: string };
};

export const generateStaticParams = () =>
  getAvailableLocales().map((locale) => ({ locale }));

export const generateMetadata = async ({
  params
}: LocaleLayoutProps): Promise<Metadata> => {
  const translation = await getServerTranslation(params.locale);

  return {
    title: translation.t("appTitle"),
    description: translation.t("appDescription")
  };
};

const LocaleLayout = async ({ children, params }: LocaleLayoutProps) => {
  const locale = params.locale ?? getDefaultLocale();
  const translation = await getServerTranslation(locale);

  return (
    <TranslationProvider
      locale={translation.locale}
      namespaces={translation.namespaces}
      resources={translation.resources}
      fallbackResources={translation.fallbackResources}
    >
      <div className="relative min-h-screen">
        <div className="pointer-events-none fixed right-4 top-4 z-50 flex justify-end">
          <LocaleSwitcher className="pointer-events-auto" />
        </div>
        {children}
      </div>
    </TranslationProvider>
  );
};

export default LocaleLayout;
