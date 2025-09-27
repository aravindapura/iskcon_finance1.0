"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCurrentLocale, useTranslation } from "next-i18next/client";

type LocaleSwitcherProps = {
  className?: string;
  buttonClassName?: string;
};

const LocaleSwitcher = ({ className, buttonClassName }: LocaleSwitcherProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const locale = useCurrentLocale();
  const [isSwitchingLocale, startTransition] = useTransition();
  const targetLocale = locale === "en" ? "ru" : "en";
  const label = useMemo(() => {
    if (isSwitchingLocale) {
      return t("settings.switching");
    }

    const labelKey =
      targetLocale === "en"
        ? "settings.switchToEnglish"
        : "settings.switchToRussian";

    return t(labelKey);
  }, [isSwitchingLocale, t, targetLocale]);

  const handleToggle = useCallback(() => {
    const currentPath = pathname ?? "/";
    const segments = currentPath.split("/").filter(Boolean);

    if (segments.length === 0) {
      segments.push(targetLocale);
    } else {
      segments[0] = targetLocale;
    }

    const nextPathname = `/${segments.join("/")}`;
    const search = searchParams?.toString();
    const href = search ? `${nextPathname}?${search}` : nextPathname;

    startTransition(() => {
      router.push(href);
    });
  }, [pathname, router, searchParams, startTransition, targetLocale]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isSwitchingLocale}
        className={`inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800${
          buttonClassName ? ` ${buttonClassName}` : ""
        }`}
      >
        {label}
      </button>
    </div>
  );
};

export default LocaleSwitcher;
