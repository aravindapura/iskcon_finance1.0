import type { ReactNode } from "react";

import AppNavigation, { type AppTabKey } from "@/components/AppNavigation";

type PageContainerProps = {
  activeTab: AppTabKey;
  children: ReactNode;
};

const PageContainer = ({ activeTab, children }: PageContainerProps) => (
  <main className="page-shell">
    <div className="flex w-full flex-col gap-10">
      <AppNavigation activeTab={activeTab} />
      {children}
    </div>
  </main>
);

export default PageContainer;
