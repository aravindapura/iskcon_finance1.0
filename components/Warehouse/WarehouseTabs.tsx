"use client";

import { useState } from "react";

import BooksPanel from "./BooksPanel";
import InventoryPanel from "./InventoryPanel";

type WarehouseTabKey = "inventory" | "books";

type WarehouseTabConfig = {
  key: WarehouseTabKey;
  label: string;
};

const TABS: WarehouseTabConfig[] = [
  { key: "inventory", label: "Инвентарь" },
  { key: "books", label: "Книги" },
];

const WarehouseTabs = () => {
  const [activeTab, setActiveTab] = useState<WarehouseTabKey>("inventory");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                isActive
                  ? "bg-indigo-500 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === "inventory" ? <InventoryPanel /> : null}
        {activeTab === "books" ? <BooksPanel /> : null}
      </div>
    </div>
  );
};

export default WarehouseTabs;
