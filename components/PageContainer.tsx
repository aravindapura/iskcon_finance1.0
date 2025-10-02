import type { ReactNode } from "react";

import AppNavigation, { type AppTabKey } from "@/components/AppNavigation";
import HomeNavigation from "@/components/HomeNavigation";

type PageContainerProps = {
  activeTab: AppTabKey;
  children: ReactNode;
};

const PageContainer = ({ activeTab, children }: PageContainerProps) => (
  <main className="page-shell">
    <div className="flex w-full flex-col gap-10">
      {activeTab === "home" ? (
        <HomeNavigation activeTab={activeTab} />
      ) : (
        <AppNavigation activeTab={activeTab} />
      )}
      {children}
    </div>
  </main>
);

export default PageContainer;
