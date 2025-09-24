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
  <nav className="app-navigation flex w-full gap-3">
    {TABS.map((tab) => {
      const isActive = tab.key === activeTab;
      const Icon = tab.icon;

      return (
        <Link
          key={tab.key}
          href={tab.href}
          className="flex w-full flex-1 items-center justify-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 font-semibold text-[var(--accent-primary)] shadow-[var(--shadow-soft)] transition-all hover:bg-[var(--surface-subtle)] hover:shadow-[var(--shadow-card)] data-[active=true]:border-transparent data-[active=true]:bg-[var(--accent-primary)] data-[active=true]:text-[var(--surface-primary)] data-[active=true]:shadow-[var(--shadow-button)] dark:border-[rgba(148,163,184,0.2)] dark:bg-[rgba(51,65,85,0.55)] dark:data-[active=true]:text-[var(--text-strong)]"
          data-active={isActive ? "true" : "false"}
        >
          <Icon aria-hidden className="h-4 w-4" />
          <span>{tab.label}</span>
        </Link>
      );
    })}
  </nav>
);

export default AppNavigation;
