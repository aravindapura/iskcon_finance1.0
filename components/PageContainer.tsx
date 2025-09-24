import type { ReactNode } from "react";

import AppNavigation, { type AppTabKey } from "@/components/AppNavigation";
import ThemeToggle from "@/components/ThemeToggle";

type PageContainerProps = {
  activeTab: AppTabKey;
  children: ReactNode;
};

const PageContainer = ({ activeTab, children }: PageContainerProps) => (
  <main className="page-shell">
    <div className="flex w-full flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AppNavigation activeTab={activeTab} />
        <ThemeToggle />
      </div>
      {children}
    </div>
  </main>
);

export default PageContainer;
