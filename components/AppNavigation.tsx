import Link from "next/link";

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
  palette: {
    bg: string;
    text: string;
    activeBg: string;
    activeText: string;
    shadow: string;
  };
};

const TABS: TabConfig[] = [
  {
    key: "home",
    href: "/",
    label: "Главная",
    palette: {
      bg: "var(--surface-blue)",
      text: "var(--accent-blue)",
      activeBg: "var(--accent-blue)",
      activeText: "var(--surface-primary)",
      shadow: "0 4px 12px rgba(59, 130, 246, 0.25)"
    }
  },
  {
    key: "debts",
    href: "/debts",
    label: "Долги",
    palette: {
      bg: "var(--surface-indigo)",
      text: "var(--accent-indigo)",
      activeBg: "var(--accent-indigo)",
      activeText: "var(--surface-primary)",
      shadow: "0 4px 12px rgba(99, 102, 241, 0.2)"
    }
  },
  {
    key: "wallets",
    href: "/wallets",
    label: "Кошельки",
    palette: {
      bg: "var(--surface-teal)",
      text: "var(--accent-teal)",
      activeBg: "var(--accent-teal)",
      activeText: "var(--surface-primary)",
      shadow: "0 4px 12px rgba(45, 212, 191, 0.25)"
    }
  },
  {
    key: "planning",
    href: "/planning",
    label: "Планирование",
    palette: {
      bg: "var(--surface-success)",
      text: "var(--accent-success)",
      activeBg: "var(--accent-success)",
      activeText: "var(--surface-primary)",
      shadow: "0 4px 12px rgba(34, 197, 94, 0.2)"
    }
  },
  {
    key: "reports",
    href: "/reports",
    label: "Отчёты",
    palette: {
      bg: "var(--surface-amber)",
      text: "var(--accent-amber)",
      activeBg: "var(--accent-amber)",
      activeText: "var(--surface-primary)",
      shadow: "0 4px 12px rgba(217, 119, 6, 0.2)"
    }
  },
  {
    key: "settings",
    href: "/settings",
    label: "Настройки",
    palette: {
      bg: "var(--surface-purple)",
      text: "var(--accent-purple)",
      activeBg: "var(--accent-purple)",
      activeText: "var(--surface-primary)",
      shadow: "0 4px 12px rgba(109, 40, 217, 0.2)"
    }
  }
];

type AppNavigationProps = {
  activeTab: AppTabKey;
};

const AppNavigation = ({ activeTab }: AppNavigationProps) => (
  <nav className="flex flex-wrap items-center gap-3">
    {TABS.map((tab) => {
      const isActive = tab.key === activeTab;

      return (
        <Link
          key={tab.key}
          href={tab.href}
          className="tab-pill inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: isActive ? tab.palette.activeBg : tab.palette.bg,
            color: isActive ? tab.palette.activeText : tab.palette.text,
            boxShadow: tab.palette.shadow
          }}
        >
          {tab.label}
        </Link>
      );
    })}
  </nav>
);

export default AppNavigation;
