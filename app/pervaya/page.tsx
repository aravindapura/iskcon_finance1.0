"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import { useSession } from "@/components/SessionProvider";
import { fetcher, type FetcherError } from "@/lib/fetcher";

type HolidayInfo = {
  title: string;
  description: string | null;
};

type TodayHolidayResponse = {
  date: string;
  holiday: HolidayInfo | null;
};

const formatDisplayDate = (date: Date) => {
  const label = date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  return label.charAt(0).toUpperCase() + label.slice(1);
};

const HolidayView = () => {
  const { user, refresh } = useSession();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, error, isLoading } = useSWR<TodayHolidayResponse>(
    user ? "/api/holidays/today" : null,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 1000 * 60 * 60
    }
  );

  useEffect(() => {
    if (!error) {
      setErrorMessage(null);
      return;
    }

    const fetchError = error as FetcherError;

    if (fetchError.status === 401) {
      setErrorMessage("Сессия истекла, войдите заново.");
      void refresh();
      return;
    }

    setErrorMessage("Не удалось загрузить данные о празднике.");
  }, [error, refresh]);

  const todayLabel = formatDisplayDate(new Date());

  useEffect(() => {
    if (errorMessage) {
      setStatusMessage(errorMessage);
      return;
    }

    if (isLoading || !data) {
      setStatusMessage("Загружаем данные...");
      return;
    }

    if (data.holiday) {
      setStatusMessage("Сегодня праздник");
      return;
    }

    setStatusMessage("Сегодня праздников нет");
  }, [data, errorMessage, isLoading]);

  if (!user) {
    return null;
  }

  const holidayTitle =
    data?.holiday?.title ??
    (errorMessage ? "Нет данных" : isLoading ? "Загружаем..." : "Нет праздника");
  const holidayDescription = data?.holiday?.description ?? null;

  return (
    <PageContainer activeTab="pervaya">
      <section className="holiday-layout">
        <div className="holiday-card">
          <span className="holiday-card__label">Сегодня</span>
          <p className="holiday-card__date">{todayLabel}</p>
          {statusMessage ? (
            <p className="holiday-card__status">{statusMessage}</p>
          ) : null}
          <p className="holiday-card__holiday">{holidayTitle}</p>
          {holidayDescription ? (
            <p className="holiday-card__note">{holidayDescription}</p>
          ) : null}
        </div>
      </section>
    </PageContainer>
  );
};

const PervayaPage = () => (
  <AuthGate>
    <HolidayView />
  </AuthGate>
);

export default PervayaPage;
