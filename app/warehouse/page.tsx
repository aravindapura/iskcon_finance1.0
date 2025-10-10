"use client";

import type { ComponentType, SVGProps } from "react";

import PageContainer from "@/components/PageContainer";

const InventoryIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 8 12 3 3 8" />
    <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
    <path d="M9 12h6" />
    <path d="M9 16h6" />
  </svg>
);

const BooksIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5Z" />
    <path d="M8 2v20" />
  </svg>
);

const ArrowIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

type Shortcut = {
  key: string;
  title: string;
  description: string;
  stats: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: string;
};

const shortcuts: Shortcut[] = [
  {
    key: "inventory",
    title: "Инвентарь",
    description: "Учёт оборудования, мебели, посуды и техники общины.",
    stats: "38 позиций требуют инвентаризации",
    icon: InventoryIcon,
    accent: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-200"
  },
  {
    key: "books",
    title: "Книги",
    description: "Контроль остатков и поставок книг для распространения.",
    stats: "12 новых поставок за месяц",
    icon: BooksIcon,
    accent: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-200"
  }
];

const WarehousePage = () => (
  <PageContainer activeTab="warehouse">
    <div className="flex flex-col gap-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-10 text-white shadow-xl sm:px-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium ring-1 ring-white/20">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Обновление склада в реальном времени
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Склад общины
              </h1>
              <p className="max-w-xl text-base text-white/80 sm:text-lg">
                Отслеживайте остатки, распределяйте ресурсы и планируйте закупки — всё в одном месте с мгновенной синхронизацией между командами.
              </p>
            </div>
            <dl className="grid gap-4 text-sm text-white/70 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/5 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-white/60">Инвентарь</dt>
                <dd className="mt-1 text-lg font-semibold text-white">542 единицы на хранении</dd>
              </div>
              <div className="rounded-2xl bg-white/5 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-white/60">Книги</dt>
                <dd className="mt-1 text-lg font-semibold text-white">7 320 экземпляров</dd>
              </div>
            </dl>
          </div>
          <div className="hidden min-h-[220px] rounded-3xl border border-white/10 bg-white/5 backdrop-blur lg:flex lg:w-[260px] lg:flex-col lg:justify-center lg:p-6">
            <p className="text-sm text-white/70">Новые заявки</p>
            <p className="mt-3 text-4xl font-semibold">+18</p>
            <p className="mt-2 text-sm text-white/60">Ожидают распределения со склада</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Быстрые действия
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Выберите направление, чтобы обновить остатки или добавить поставку.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:text-white"
          >
            Настроить потоки
          </button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map(({ key, title, description, stats, icon: Icon, accent }) => (
            <button
              key={key}
              type="button"
              className="group flex h-full flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-semibold ${accent}`}>
                  <Icon aria-hidden className="h-6 w-6" />
                </span>
                <ArrowIcon
                  aria-hidden
                  className="h-6 w-6 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{description}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 transition group-hover:bg-slate-900 group-hover:text-white dark:bg-slate-800/80 dark:text-slate-200 dark:group-hover:bg-slate-700">
                  {stats}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300 sm:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Советы по ведению склада</h3>
          <p>
            Настройте напоминания о пересчёте остатков и добавьте ответственных за каждую категорию — это поможет избежать пересортицы и потерь.
          </p>
        </div>
        <ul className="grid gap-2 sm:text-sm">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Подключите ежедневный отчёт об изменениях по e-mail или в Telegram.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
            Планируйте отгрузки заранее с помощью календаря доступности ресурсов.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-violet-500" />
            Разделите склад на зоны и используйте QR-коды для быстрой идентификации.
          </li>
        </ul>
      </section>
    </div>
  </PageContainer>
);

export default WarehousePage;
