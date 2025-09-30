"use client";

type IncomeSourcesProps = {
  sources: string[];
  activeSource: string | null;
  onDragStart: (source: string) => void;
  onDragEnd: () => void;
  isMobile?: boolean;
};

const IncomeSources = ({ sources, activeSource, onDragStart, onDragEnd, isMobile = false }: IncomeSourcesProps) => (
  <div className="flex h-full flex-col gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-600/40 dark:bg-emerald-950/30">
    <div className="space-y-1">
      <h3 className="text-base font-semibold text-emerald-700 dark:text-emerald-200">Источники дохода</h3>
      <p className="text-sm text-emerald-700/70 dark:text-emerald-200/70">
        {isMobile
          ? "Выберите источник в модальном окне после выбора кошелька."
          : "Перетащите источник на кошелёк, чтобы добавить приход."}
      </p>
    </div>

    <ul className="flex flex-col gap-2">
      {sources.map((source) => {
        const isActive = activeSource === source;

        return (
          <li key={source}>
            <button
              type="button"
              draggable={!isMobile}
              onDragStart={(event) => {
                if (isMobile) {
                  return;
                }

                event.dataTransfer.effectAllowed = "copy";
                event.dataTransfer.setData("text/income-source", source);
                onDragStart(source);
              }}
              onDragEnd={onDragEnd}
              className="flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-white px-4 py-2 text-left text-sm font-medium text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-emerald-600/50 dark:bg-emerald-900/40 dark:text-emerald-100 dark:hover:bg-emerald-800/40"
              data-active={isActive ? "true" : "false"}
            >
              <span>{source}</span>
              {!isMobile ? (
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-500">D&D</span>
              ) : (
                <span className="text-xs font-medium text-emerald-500">Справка</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  </div>
);

export default IncomeSources;
