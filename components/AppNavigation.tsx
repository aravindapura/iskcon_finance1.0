import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const iconBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
};

const HomeIcon = (props: IconProps) => (
  <svg {...iconBase} {...props}>
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5.25 9.75V20.25c0 .414.336.75.75.75h4.5v-5.25h3v5.25h4.5c.414 0 .75-.336.75-.75V9.75" />
  </svg>
);

const BanknotesIcon = (props: IconProps) => (
  <svg {...iconBase} {...props}>
    <rect x={3} y={7} width={18} height={10} rx={2} />
    <path d="M7 9.5v5M17 9.5v5" />
    <circle cx={12} cy={12} r={2.25} />
  </svg>
);

const WalletIcon = (props: IconProps) => (
  <svg {...iconBase} {...props}>
    <path d="M4 7.5h13.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2" />
    <path d="M17.5 11.5h1.5" />
    <path d="M4 9V6.75a2 2 0 0 1 2-2H16" />
  </svg>
);

const CalendarDaysIcon = (props: IconProps) => (
  <svg {...iconBase} {...props}>
    <rect x={4} y={5} width={16} height={15} rx={2} />
    <path d="M8 3v4M16 3v4M4 9h16" />
    <circle cx={8.5} cy={13.5} r={1.1} />
    <circle cx={12} cy={13.5} r={1.1} />
    <circle cx={15.5} cy={13.5} r={1.1} />
  </svg>
);

const ChartBarIcon = (props: IconProps) => (
  <svg {...iconBase} {...props}>
    <path d="M4 20.5h16" />
    <path d="M7 16.5V11" />
    <path d="M12 16.5V7.5" />
    <path d="M17 16.5V9.5" />
  </svg>
);

const SettingsIcon = (props: IconProps) => (
  <svg {...iconBase} {...props}>
    <path d="M5 8.5h14" />
    <path d="M5 15.5h14" />
    <circle cx={9} cy={8.5} r={1.4} />
    <circle cx={15} cy={15.5} r={1.4} />
  </svg>
);

export type AppTabKey =
  | "home"
  | "wallets"
  | "debts"
  | "planning"
  | "reports"
  | "settings";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type TabConfig = {
  key: AppTabKey;
  href: string;
  label: string;
  icon: IconComponent;
};

const TABS: TabConfig[] = [
  { key: "home", href: "/", label: "Главная", icon: HomeIcon },
  { key: "debts", href: "/debts", label: "Долги", icon: BanknotesIcon },
  { key: "wallets", href: "/wallets", label: "Кошельки", icon: WalletIcon },
  { key: "planning", href: "/planning", label: "Планирование", icon: CalendarDaysIcon },
  { key: "reports", href: "/reports", label: "Отчёты", icon: ChartBarIcon },
  { key: "settings", href: "/settings", label: "Настройки", icon: SettingsIcon }
];

type AppNavigationProps = {
  activeTab: AppTabKey;
};

const AppNavigation = ({ activeTab }: AppNavigationProps) => (
  <nav className="flex flex-wrap items-center gap-3">
    {TABS.map((tab) => {
      const isActive = tab.key === activeTab;
      const Icon = tab.icon;

      return (
        <Link
          key={tab.key}
          href={tab.href}
          className="tab-pill"
          data-active={isActive ? "true" : "false"}
          aria-current={isActive ? "page" : undefined}
        >
          <Icon aria-hidden className="tab-pill__icon" />
          <span>{tab.label}</span>
        </Link>
      );
    })}
  </nav>
);

export default AppNavigation;
