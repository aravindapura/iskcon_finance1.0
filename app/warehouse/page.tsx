"use client";

import { useState } from "react";

import PageContainer from "@/components/PageContainer";

const categories = [
  { value: "kitchen", label: "Кухня" },
  { value: "music", label: "Музыкальные инструменты" },
  { value: "altar", label: "Алтарь" },
  { value: "other", label: "Прочие" },
];

const responsibleOptions = [
  { value: "", label: "Не выбрано" },
  { value: "ananta", label: "Ананта дас" },
  { value: "radha", label: "Радха дэви даси" },
  { value: "govinda", label: "Говинда дас" },
];

const locationStatuses = [
  { value: "available", label: "На месте" },
  { value: "issued", label: "Выдано" },
  { value: "maintenance", label: "На обслуживании" },
  { value: "repair", label: "В ремонте" },
];

const WarehousePage = () => {
  const [activeTab, setActiveTab] = useState<"inventory" | "warehouse">("inventory");

  return (
    <PageContainer activeTab="warehouse">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`group flex-1 rounded-2xl px-6 py-4 text-center text-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:max-w-[240px] ${
              activeTab === "inventory"
                ? "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-500"
                : "border border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            }`}
          >
            <span
              className={`block text-sm font-medium uppercase tracking-[0.2em] ${
                activeTab === "inventory"
                  ? "text-slate-300"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Вкладка
            </span>
            Инвентарь
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("warehouse")}
            className={`flex-1 rounded-2xl px-6 py-4 text-center text-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:max-w-[240px] ${
              activeTab === "warehouse"
                ? "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-500"
                : "border border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            }`}
          >
            Склад
          </button>
        </div>

        {activeTab === "inventory" ? (
          <form className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Добавление инвентаря</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Заполните карточку, чтобы зафиксировать новый предмет на складе.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Название предмета</span>
                <input
                  type="text"
                  name="itemName"
                  placeholder="Например, кухонный миксер"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Категория</span>
                <select
                  name="category"
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  defaultValue={categories[0]?.value}
                >
                  {categories.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ответственный</span>
                <select
                  name="responsible"
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  defaultValue=""
                >
                  {responsibleOptions.map(({ value, label }) => (
                    <option key={value || "none"} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Где находится</span>
                <select
                  name="location"
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  defaultValue={locationStatuses[0]?.value}
                >
                  {locationStatuses.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Сумма, ₽</span>
                <input
                  type="number"
                  name="amount"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="reset"
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 sm:w-auto dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
              >
                Очистить форму
              </button>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 sm:w-auto"
              >
                Добавить в инвентарь
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-100">Раздел «Склад»</h2>
            <p className="mt-3 text-sm leading-relaxed">
              Здесь появится управление складскими ячейками и движением запасов. Пока вы можете добавить предметы во вкладке «Инвентарь».
            </p>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default WarehousePage;
