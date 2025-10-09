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
    <div className="flex flex-col gap-8">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-1 shadow-lg shadow-slate-200/60 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-1">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                role="tab"
                aria-selected={isActive}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {activeTab === "inventory" ? <InventoryPanel /> : null}
        {activeTab === "books" ? <BooksPanel /> : null}
      </div>
    </div>
  );
};

export default WarehouseTabs;
