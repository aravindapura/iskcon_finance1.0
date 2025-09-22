"use client";

import { useCallback, useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import ThemeToggle from "@/components/ThemeToggle";

type ApiRateRow = {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  date: string;
};

type RatesResponse = {
  ok: boolean;
  rows: ApiRateRow[];
  skipped?: boolean;
  count?: number;
  reason?: string;
};

type RateRow = {
  currency: string;
  rate: number;
  updatedAt: string;
};

const RatesTable = () => {
  const [rates, setRates] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRates = useCallback(
    async (force = false) => {
      if (force) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);
      setInfo(null);

      try {
        const response = await fetch(force ? "/api/rates?force=1" : "/api/rates", {
          cache: "no-store",
        });

        const data = (await response.json().catch(() => null)) as RatesResponse | null;

        if (!response.ok || !data || !Array.isArray(data.rows)) {
          const reason = data?.reason ?? "Не удалось загрузить курсы";
          throw new Error(reason);
        }

        const rows = data.rows.map<RateRow>((row) => ({
          currency: `${row.baseCurrency} → ${row.targetCurrency}`,
          rate: row.rate,
          updatedAt: row.date,
        }));

        setRates(rows);

        if (force) {
          setInfo(
            data.skipped
              ? "Курсы уже были актуальны за последние 24 часа."
              : `Обновлено ${data.count ?? rows.length} курсов.`,
          );
        } else if (data.skipped) {
          setInfo("Использованы актуальные данные за последние 24 часа.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить курсы");
      } finally {
        if (force) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void fetchRates();
  }, [fetchRates]);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Курсы валют</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Данные обновляются автоматически раз в день. Можно обновить вручную.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchRates(true)}
          disabled={refreshing}
          className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900"
        >
          {refreshing ? "Обновляем..." : "Обновить курсы"}
        </button>
      </div>

      {info ? (
        <p className="mb-4 text-sm text-emerald-600 dark:text-emerald-400">{info}</p>
      ) : null}

      {error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        {loading ? (
          <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Загрузка...</p>
        ) : rates.length === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
            Курсы ещё не загружены.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left">Валюта</th>
                <th className="px-4 py-2 text-left">Курс</th>
                <th className="px-4 py-2 text-left">Обновлено</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={`${rate.currency}-${rate.updatedAt}`} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2">{rate.currency}</td>
                  <td className="px-4 py-2">{rate.rate.toFixed(6)}</td>
                  <td className="px-4 py-2">{new Date(rate.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const SettingsPage = () => (
  <AuthGate>
    <PageContainer activeTab="settings">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Настройки</h1>
        <ThemeToggle />
      </div>

      <div className="space-y-6">
        <RatesTable />
      </div>
    </PageContainer>
  </AuthGate>
);

export default SettingsPage;
