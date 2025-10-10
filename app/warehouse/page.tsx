"use client";

import PageContainer from "@/components/PageContainer";

const WarehousePage = () => (
  <PageContainer activeTab="warehouse">
    <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:justify-center">
      <button
        type="button"
        className="flex-1 rounded-2xl bg-slate-900 px-6 py-4 text-center text-lg font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 sm:flex-none sm:min-w-[220px]"
      >
        Инвентарь
      </button>
      <button
        type="button"
        className="flex-1 rounded-2xl bg-slate-200 px-6 py-4 text-center text-lg font-semibold text-slate-900 transition hover:bg-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 sm:flex-none sm:min-w-[220px] dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        Склад
      </button>
    </div>
  </PageContainer>
);

export default WarehousePage;
