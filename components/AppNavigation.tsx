import Link from "next/link";
import {
  BarChart3,
  CircleDollarSign,
  Home,
  Settings as SettingsIcon,
  Target,
  Wallet,
  type LucideIcon
} from "lucide-react";

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
  {
    key: "home",
    href: "/",
    label: "Главная",
    icon: Home
  },
  {
    key: "debts",
    href: "/debts",
    label: "Долги",
    icon: CircleDollarSign
  },
  {
    key: "wallets",
    href: "/wallets",
    label: "Кошельки",
    icon: Wallet
  },
  {
    key: "planning",
    href: "/planning",
    label: "Планирование",
    icon: Target
  },
  {
    key: "reports",
    href: "/reports",
    label: "Отчёты",
    icon: BarChart3
  },
  {
    key: "settings",
    href: "/settings",
    label: "Настройки",
    icon: SettingsIcon
  }
];

type AppNavigationProps = {
  activeTab: AppTabKey;
};

const AppNavigation = ({ activeTab }: AppNavigationProps) => (
  <nav className="nav-tabs">
    {TABS.map((tab) => {
      const isActive = tab.key === activeTab;
      const Icon = tab.icon;

      return (
        <Link
          key={tab.key}
          href={tab.href}
          className="nav-tab"
          data-active={isActive ? "true" : "false"}
          aria-current={isActive ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          {tab.label}
        </Link>
      );
    })}
  </nav>
);

export default AppNavigation;
