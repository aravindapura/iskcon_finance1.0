import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BarChart3, HandCoins, LayoutDashboard, ListChecks, Settings, Wallet } from "lucide-react";

export type AppTabKey =
  | "home"
  | "wallets"
  | "debts"
  | "planning"
  | "reports"
  | "settings";

type TabConfig = {
  key: AppTabKey;
  href: string;
  label: string;
  icon: LucideIcon;
};

const TABS: TabConfig[] = [
  { key: "home", href: "/", label: "Главная", icon: LayoutDashboard },
  { key: "debts", href: "/debts", label: "Долги", icon: HandCoins },
  { key: "wallets", href: "/wallets", label: "Кошельки", icon: Wallet },
  { key: "planning", href: "/planning", label: "Планирование", icon: ListChecks },
  { key: "reports", href: "/reports", label: "Отчёты", icon: BarChart3 },
  { key: "settings", href: "/settings", label: "Настройки", icon: Settings }
];

type AppNavigationProps = {
  activeTab: AppTabKey;
};

const AppNavigation = ({ activeTab }: AppNavigationProps) => (
  <nav className="flex w-full flex-wrap gap-2 sm:flex-nowrap sm:gap-3">
    {TABS.map((tab) => {
      const isActive = tab.key === activeTab;
      const Icon = tab.icon;

      return (
        <Link
          key={tab.key}
          href={tab.href}
          className="tab-pill flex-1 justify-center sm:flex-none sm:min-w-0"
          data-active={isActive ? "true" : "false"}
        >
          <Icon aria-hidden className="tab-pill__icon" />
          <span>{tab.label}</span>
        </Link>
      );
    })}
  </nav>
);

export default AppNavigation;
