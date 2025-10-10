"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { BarChart3, HandCoins, LayoutDashboard, ListChecks, Settings, Wallet } from "lucide-react";

export type AppTabKey =
  | "home"
  | "wallets"
  | "debts"
  | "planning"
  | "reports"
  | "settings"
  | "warehouse";

type TabConfig = {
  key: AppTabKey;
  href: string;
  label: string;
  icon: ComponentType<LucideProps>;
};

const WarehouseIcon: ComponentType<LucideProps> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9 12 3l9 6" />
    <path d="M4 10h16v10H4z" />
    <path d="M9 14h6" />
    <path d="M9 18h6" />
  </svg>
);

const TABS: TabConfig[] = [
  { key: "home", href: "/", label: "Главная", icon: LayoutDashboard },
  { key: "debts", href: "/debts", label: "Долги", icon: HandCoins },
  { key: "wallets", href: "/wallets", label: "Кошельки", icon: Wallet },
  { key: "planning", href: "/planning", label: "Планирование", icon: ListChecks },
  { key: "reports", href: "/reports", label: "Отчёты", icon: BarChart3 },
  { key: "warehouse", href: "/warehouse", label: "Склад", icon: WarehouseIcon },
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
          className="tab-pill flex-1 justify-center"
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
