"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BarChart3, HandCoins, LayoutDashboard, ListChecks, Settings, Wallet } from "lucide-react";
import { useCurrentLocale, useTranslation } from "next-i18next/client";

export type AppTabKey =
  | "home"
  | "wallets"
  | "debts"
  | "planning"
  | "reports"
  | "settings";

type TabConfig = {
  key: AppTabKey;
  path: string;
  labelKey: string;
  icon: LucideIcon;
};

const TABS: TabConfig[] = [
  { key: "home", path: "", labelKey: "nav.home", icon: LayoutDashboard },
  { key: "debts", path: "debts", labelKey: "nav.debts", icon: HandCoins },
  { key: "wallets", path: "wallets", labelKey: "nav.wallets", icon: Wallet },
  { key: "planning", path: "planning", labelKey: "nav.planning", icon: ListChecks },
  { key: "reports", path: "reports", labelKey: "nav.reports", icon: BarChart3 },
  { key: "settings", path: "settings", labelKey: "nav.settings", icon: Settings }
];

type AppNavigationProps = {
  activeTab: AppTabKey;
};

const AppNavigation = ({ activeTab }: AppNavigationProps) => {
  const { t } = useTranslation();
  const locale = useCurrentLocale();

  return (
    <nav className="app-navigation flex w-full gap-3">
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        const Icon = tab.icon;
        const href = `/${locale}${tab.path ? `/${tab.path}` : ""}`;

        return (
          <Link
            key={tab.key}
            href={href}
            className="tab-pill flex-1 justify-center"
            data-active={isActive ? "true" : "false"}
          >
            <Icon aria-hidden className="tab-pill__icon" />
            <span>{t(tab.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default AppNavigation;
