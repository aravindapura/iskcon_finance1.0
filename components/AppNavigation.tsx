"use client";

import Link from "next/link";
import { forwardRef } from "react";
import type { IconProps, LucideIcon } from "lucide-react";
import {
  BarChart3,
  HandCoins,
  LayoutDashboard,
  ListChecks,
  Settings,
  Wallet
} from "lucide-react";

export type AppTabKey =
  | "home"
  | "pervaya"
  | "wallets"
  | "debts"
  | "planning"
  | "tasks"
  | "reports"
  | "settings"
  | "warehouse";

type TabConfig = {
  key: AppTabKey;
  href: string;
  label: string;
  icon: LucideIcon;
};

const WarehouseIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth = 2, width = 24, height = 24, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 9 12 3l9 6" />
      <path d="M4 10h16v10H4z" />
      <path d="M9 14h6" />
      <path d="M9 18h6" />
    </svg>
  )
);

WarehouseIcon.displayName = "WarehouseIcon";

const CalendarIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth = 2, width = 24, height = 24, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
);

CalendarIcon.displayName = "CalendarIcon";

const CelebrationIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth = 2, width = 24, height = 24, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m5 15 4-12 6 6Z" />
      <path d="m3 21 8-4" />
      <path d="m12 3 7 7" />
      <path d="M14 11.5 17 21" />
      <path d="m7 13 7-2" />
    </svg>
  )
);

CelebrationIcon.displayName = "CelebrationIcon";

const TABS: TabConfig[] = [
  { key: "home", href: "/", label: "Главная", icon: LayoutDashboard },
  { key: "pervaya", href: "/pervaya", label: "Первая", icon: CelebrationIcon },
  { key: "debts", href: "/debts", label: "Долги", icon: HandCoins },
  { key: "wallets", href: "/wallets", label: "Кошельки", icon: Wallet },
  { key: "planning", href: "/planning", label: "Планирование", icon: ListChecks },
  { key: "tasks", href: "/tasks", label: "Задачи", icon: CalendarIcon },
  { key: "reports", href: "/reports", label: "Отчёты", icon: BarChart3 },
  { key: "warehouse", href: "/warehouse", label: "Склад", icon: WarehouseIcon },
  { key: "settings", href: "/settings", label: "Настройки", icon: Settings }
];

type AppNavigationProps = {
  activeTab: AppTabKey;
};

const AppNavigation = ({ activeTab }: AppNavigationProps) => (
  <nav className="app-navigation flex w-full max-w-full flex-wrap gap-2 md:flex-nowrap md:gap-3">
    {TABS.map((tab) => {
      const isActive = tab.key === activeTab;
      const Icon = tab.icon;

      return (
        <Link
          key={tab.key}
          href={tab.href}
          className="tab-pill flex w-full items-center justify-center gap-2 rounded-lg p-3 md:w-auto"
          data-active={isActive ? "true" : "false"}
        >
          <Icon aria-hidden className="tab-pill__icon" />
          <span className="whitespace-nowrap text-sm md:text-base">{tab.label}</span>
        </Link>
      );
    })}
  </nav>
);

export default AppNavigation;
