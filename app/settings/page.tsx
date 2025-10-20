"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent
} from "react";
import useSWR from "swr";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import ThemeToggle from "@/components/ThemeToggle";
import { useSession } from "@/components/SessionProvider";
import { DEFAULT_SETTINGS, convertToBase } from "@/lib/currency";
import { POPULAR_CURRENCIES } from "@/lib/currencyCatalog";
import type { Currency, Settings, UserRole } from "@/lib/types";
import { fetcher, type FetcherError } from "@/lib/fetcher";

const isSettings = (value: unknown): value is Settings => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Settings>;

  return (
    typeof candidate.baseCurrency === "string" &&
    Array.isArray(candidate.availableCurrencies) &&
    candidate.availableCurrencies.every((item) => typeof item === "string") &&
    !!candidate.rates &&
    typeof candidate.rates === "object"
  );
};

type RateInfo = {
  rate: number;
  updatedAt: string | null;
};

type ManagedUser = {
  id: string;
  login: string;
  role: UserRole;
  createdAt: string | null;
};

type UserActionState = {
  loading: boolean;
  error: string | null;
};

const PASSWORD_MIN_LENGTH = 8;

const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Администратор",
  user: "Пользователь"
};

const USER_ROLES: UserRole[] = ["admin", "user"];

const RATE_PLACEHOLDERS: Partial<Record<Currency, string>> = {
  USD: "1",
  RUB: "0.012",
  GEL: "0.367",
  EUR: "1.18"
};

const buildInitialRates = (): Partial<Record<Currency, RateInfo>> =>
  DEFAULT_SETTINGS.availableCurrencies.reduce<
    Partial<Record<Currency, RateInfo>>
  >((acc, code: Currency) => {
    const rawRate = DEFAULT_SETTINGS.rates[code];

    if (typeof rawRate === "number" && Number.isFinite(rawRate) && rawRate > 0) {
      acc[code] = { rate: rawRate, updatedAt: null };
    }

    return acc;
  }, {});

const parseUpdatedAt = (value: unknown): string | null => {
  if (value instanceof Date) {
    const iso = value.toISOString();
    return iso;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
};

const normalizeRatesResponse = (rows: unknown[]): Partial<Record<Currency, RateInfo>> => {
  const normalized: Partial<Record<Currency, RateInfo>> = {};

  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue;
    }

    const { currency, rate, updated_at } = row as {
      currency?: unknown;
      rate?: unknown;
      updated_at?: unknown;
    };

    if (typeof currency !== "string") {
      continue;
    }

    const numericRate = Number(rate);

    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      continue;
    }

    normalized[currency as Currency] = {
      rate: numericRate,
      updatedAt: parseUpdatedAt(updated_at)
    };
  }

  return normalized;
};

const formatRateValue = (value: number) => {
  const fixed = value.toFixed(6);

  return fixed.replace(/0+$/, "").replace(/\.$/, "");
};

const formatUpdatedAt = (value: string | null) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("ru-RU");
};

const formatUserDate = (value: string | null) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const SettingsContent = () => {
  const { user, refresh } = useSession();
  const canManage = (user?.role ?? "") === "admin";

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [rates, setRates] = useState<Partial<Record<Currency, RateInfo>>>(
    () => buildInitialRates()
  );
  const [loading, setLoading] = useState(true);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState<
    { login: string; password: string; mode: "created" | "updated" } | null
  >(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [showUserManager, setShowUserManager] = useState(false);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [userActionStates, setUserActionStates] = useState<
    Record<string, UserActionState>
  >({});
  const [baseCurrencyDraft, setBaseCurrencyDraft] = useState<Currency>(
    DEFAULT_SETTINGS.baseCurrency
  );
  const [baseCurrencySaving, setBaseCurrencySaving] = useState(false);
  const [baseCurrencyError, setBaseCurrencyError] = useState<string | null>(
    null
  );
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const [addCurrencyError, setAddCurrencyError] = useState<string | null>(null);
  const [addCurrencyLoading, setAddCurrencyLoading] = useState<Currency | null>(
    null
  );
  const [removalCandidate, setRemovalCandidate] = useState<Currency | null>(
    null
  );
  const [removalPassword, setRemovalPassword] = useState("");
  const [removalLoading, setRemovalLoading] = useState(false);
  const [removalError, setRemovalError] = useState<string | null>(null);

  const {
    data: settingsData,
    error: settingsFetchError,
    isLoading: settingsLoading,
    mutate: mutateSettings
  } = useSWR<Settings>(user ? "/api/settings" : null, fetcher, {
    revalidateOnFocus: true
  });

  const {
    data: usersData,
    error: usersFetchError,
    isLoading: usersLoading,
    mutate: mutateUsers
  } = useSWR<{ users: ManagedUser[] }>(
    canManage && showUserManager ? "/api/users" : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  useEffect(() => {
    if (typeof settingsLoading === "boolean") {
      setLoading(settingsLoading);
    }
  }, [settingsLoading]);

  useEffect(() => {
    if (!settingsData) {
      return;
    }

    setSettings(settingsData);
    setBaseCurrencyDraft(settingsData.baseCurrency);
    setBaseCurrencyError(null);
    setShowAddCurrency(false);
    setAddCurrencyLoading(null);
    setAddCurrencyError(null);
    setRemovalCandidate(null);
    setRemovalPassword("");
    setRemovalLoading(false);
    setRemovalError(null);
  }, [settingsData]);

  useEffect(() => {
    if (!settingsFetchError) {
      setSettingsError(null);
      return;
    }

    if ((settingsFetchError as FetcherError).status === 401) {
      setSettingsError("Сессия истекла, войдите заново.");
      void refresh();
      return;
    }

    setSettingsError("Не удалось загрузить настройки");
  }, [settingsFetchError, refresh]);

  useEffect(() => {
    if (!usersFetchError) {
      return;
    }

    if ((usersFetchError as FetcherError).status === 401) {
      setUserError("Сессия истекла, войдите заново.");
      void refresh();
      return;
    }

    setUserError("Не удалось загрузить пользователей");
  }, [usersFetchError, refresh]);

  useEffect(() => {
    if (!usersData) {
      return;
    }

    setUserError(null);
  }, [usersData]);

  const loadRates = useCallback(
    async (force = false) => {
      setRatesLoading(true);
      setRatesError(null);
      setMessage(null);

      try {
        const response = await fetch(force ? "/api/rates?force=1" : "/api/rates", {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("Не удалось загрузить курсы");
        }

        const data = await response.json().catch(() => null);

        if (
          !data ||
          typeof data !== "object" ||
          !Array.isArray((data as { rows?: unknown }).rows)
        ) {
          throw new Error("Не удалось загрузить курсы");
        }

        const normalized = normalizeRatesResponse((data as { rows: unknown[] }).rows);

        setRates((prev) => ({
          ...prev,
          ...normalized
        }));

        if (force) {
          setMessage("Курсы успешно обновлены");
        }
      } catch (err) {
        setRatesError(err instanceof Error ? err.message : "Произошла ошибка");
      } finally {
        setRatesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  const baseCurrency = settings.baseCurrency;
  const baseFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: baseCurrency
      });
    } catch {
      return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "USD"
      });
    }
  }, [baseCurrency]);

  const availableCurrencyOptions = useMemo(
    () => Array.from(new Set(settings.availableCurrencies)),
    [settings.availableCurrencies]
  );

  const displayCurrencies = useMemo(
    () =>
      availableCurrencyOptions.filter(
        (code) => typeof code === "string" && code !== baseCurrency
      ),
    [availableCurrencyOptions, baseCurrency]
  );

  const addableCurrencies = useMemo(
    () =>
      POPULAR_CURRENCIES.filter(
        ({ code }) => !availableCurrencyOptions.includes(code)
      ),
    [availableCurrencyOptions]
  );

  const managedUsers = useMemo(
    () => usersData?.users ?? [],
    [usersData]
  );

  const handleBaseCurrencyChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setBaseCurrencyDraft(event.target.value as Currency);
      setBaseCurrencyError(null);
    },
    []
  );

  const handleAddCurrency = useCallback(
    async (code: Currency) => {
      if (!canManage || addCurrencyLoading) {
        return;
      }

      setAddCurrencyLoading(code);
      setAddCurrencyError(null);
      setMessage(null);

      try {
        const response = await fetch("/api/currencies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code })
        });

        const data = (await response.json().catch(() => null)) as
          | Settings
          | { error?: string }
          | null;

        if (response.status === 401) {
          setAddCurrencyError("Сессия истекла, войдите заново.");
          await refresh();
          return;
        }

        if (response.status === 403) {
          setAddCurrencyError("Недостаточно прав для добавления валюты.");
          return;
        }

        if (!response.ok || !data || !isSettings(data)) {
          const message = (data as { error?: string } | null)?.error;
          throw new Error(message ?? "Не удалось добавить валюту");
        }

        setSettings(data);
        setBaseCurrencyDraft(data.baseCurrency);
        void mutateSettings(data, { revalidate: false });
        setShowAddCurrency(false);
        setMessage(`Валюта ${code} добавлена`);
      } catch (err) {
        setAddCurrencyError(
          err instanceof Error ? err.message : "Не удалось добавить валюту"
        );
      } finally {
        setAddCurrencyLoading(null);
      }
    },
    [addCurrencyLoading, canManage, mutateSettings, refresh]
  );

  const startRemoval = useCallback(
    (code: Currency) => {
      if (!canManage) {
        return;
      }

      setRemovalCandidate(code);
      setRemovalPassword("");
      setRemovalError(null);
      setMessage(null);
    },
    [canManage]
  );

  const cancelRemoval = useCallback(() => {
    setRemovalCandidate(null);
    setRemovalPassword("");
    setRemovalError(null);
  }, []);

  const handleRemovalPasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setRemovalPassword(event.target.value);
    },
    []
  );

  const confirmRemoval = useCallback(async () => {
    if (!canManage || !removalCandidate || removalLoading) {
      return;
    }

    setRemovalLoading(true);
    setRemovalError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/currencies/${removalCandidate}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: removalPassword })
      });

      const data = (await response.json().catch(() => null)) as
        | Settings
        | { error?: string }
        | null;

      if (response.status === 401) {
        setRemovalError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setRemovalError("Неверный пароль или недостаточно прав.");
        return;
      }

      if (!response.ok || !data || !isSettings(data)) {
        const message = (data as { error?: string } | null)?.error;
        throw new Error(message ?? "Не удалось удалить валюту");
      }

      const removedCurrency = removalCandidate;

      setSettings(data);
      setBaseCurrencyDraft(data.baseCurrency);
      void mutateSettings(data, { revalidate: false });
      setRemovalCandidate(null);
      setRemovalPassword("");
      setMessage(`Валюта ${removedCurrency} удалена`);
    } catch (err) {
      setRemovalError(
        err instanceof Error ? err.message : "Не удалось удалить валюту"
      );
    } finally {
      setRemovalLoading(false);
    }
  }, [
    canManage,
    mutateSettings,
    refresh,
    removalCandidate,
    removalLoading,
    removalPassword
  ]);

  const handleSaveBaseCurrency = useCallback(async () => {
    if (!canManage || baseCurrencySaving || baseCurrencyDraft === baseCurrency) {
      return;
    }

    setBaseCurrencySaving(true);
    setBaseCurrencyError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseCurrency: baseCurrencyDraft })
      });

      const data = (await response.json().catch(() => null)) as
        | Settings
        | { error?: string }
        | null;

      if (response.status === 401) {
        setBaseCurrencyError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setBaseCurrencyError("Недостаточно прав для обновления настроек.");
        return;
      }

      if (!response.ok || !data || !isSettings(data)) {
        const message = (data as { error?: string } | null)?.error;
        throw new Error(message ?? "Не удалось обновить базовую валюту");
      }

      setSettings(data);
      setBaseCurrencyDraft(data.baseCurrency);
      void mutateSettings(data, { revalidate: false });
      setMessage("Базовая валюта обновлена");
    } catch (err) {
      setBaseCurrencyError(
        err instanceof Error ? err.message : "Не удалось обновить базовую валюту"
      );
    } finally {
      setBaseCurrencySaving(false);
    }
  }, [
    baseCurrency,
    baseCurrencyDraft,
    baseCurrencySaving,
    canManage,
    mutateSettings,
    refresh
  ]);

  const handleForceUpdate = () => {
    if (!canManage) {
      return;
    }

    void loadRates(true);
  };

  const handleToggleUserManager = () => {
    setShowUserManager((prev) => {
      const next = !prev;

      if (!next) {
        setPasswordDrafts({});
        setUserActionStates({});
      }

      return next;
    });
    setUserError(null);
    setMessage(null);
  };

  const handlePasswordDraftChange = (userId: string, value: string) => {
    setPasswordDrafts((prev) => ({ ...prev, [userId]: value }));
    setUserActionStates((prev) => {
      const current = prev[userId];

      if (!current || !current.error) {
        return prev;
      }

      return {
        ...prev,
        [userId]: { ...current, error: null }
      };
    });
  };

  const handleRoleChange = async (
    userId: string,
    login: string,
    role: UserRole
  ) => {
    if (!canManage) {
      return;
    }

    setUserActionStates((prev) => ({
      ...prev,
      [userId]: { loading: true, error: null }
    }));
    setUserError(null);
    setMessage(null);

    let actionError: string | null = null;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });

      if (response.status === 401) {
        actionError = "Сессия истекла, войдите заново.";
        setUserError(actionError);
        await refresh();
        return;
      }

      if (response.status === 403) {
        actionError = "Недостаточно прав для обновления пользователя.";
        setUserError(actionError);
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | { user?: ManagedUser; password?: string; error?: string }
        | null;

      if (!response.ok || !data?.user) {
        throw new Error(data?.error ?? "Не удалось обновить пользователя");
      }

      setMessage(`Права доступа для ${login} обновлены`);

      if (showUserManager) {
        void mutateUsers();
      }
    } catch (error) {
      actionError =
        error instanceof Error
          ? error.message
          : "Не удалось обновить пользователя";
    } finally {
      setUserActionStates((prev) => ({
        ...prev,
        [userId]: { loading: false, error: actionError }
      }));
    }
  };

  const handleManualPasswordSubmit = async (userId: string, login: string) => {
    if (!canManage) {
      return;
    }

    const draft = (passwordDrafts[userId] ?? "").trim();

    if (!draft) {
      setUserActionStates((prev) => ({
        ...prev,
        [userId]: { loading: false, error: "Введите новый пароль" }
      }));
      return;
    }

    if (draft.length < PASSWORD_MIN_LENGTH) {
      setUserActionStates((prev) => ({
        ...prev,
        [userId]: {
          loading: false,
          error: `Пароль должен содержать не менее ${PASSWORD_MIN_LENGTH} символов`
        }
      }));
      return;
    }

    setUserActionStates((prev) => ({
      ...prev,
      [userId]: { loading: true, error: null }
    }));
    setUserError(null);
    setMessage(null);

    let actionError: string | null = null;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: draft })
      });

      if (response.status === 401) {
        actionError = "Сессия истекла, войдите заново.";
        setUserError(actionError);
        await refresh();
        return;
      }

      if (response.status === 403) {
        actionError = "Недостаточно прав для обновления пользователя.";
        setUserError(actionError);
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | { user?: ManagedUser; password?: string; error?: string }
        | null;

      if (!response.ok || !data?.user) {
        throw new Error(data?.error ?? "Не удалось обновить пароль");
      }

      setCredentialsModal({ login, password: draft, mode: "updated" });
      setPasswordDrafts((prev) => ({ ...prev, [userId]: "" }));
      setMessage(`Пароль для ${login} обновлён`);

      if (showUserManager) {
        void mutateUsers();
      }
    } catch (error) {
      actionError =
        error instanceof Error
          ? error.message
          : "Не удалось обновить пароль";
    } finally {
      setUserActionStates((prev) => ({
        ...prev,
        [userId]: { loading: false, error: actionError }
      }));
    }
  };

  const handleGeneratePassword = async (userId: string, login: string) => {
    if (!canManage) {
      return;
    }

    setUserActionStates((prev) => ({
      ...prev,
      [userId]: { loading: true, error: null }
    }));
    setUserError(null);
    setMessage(null);

    let actionError: string | null = null;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generatePassword: true })
      });

      if (response.status === 401) {
        actionError = "Сессия истекла, войдите заново.";
        setUserError(actionError);
        await refresh();
        return;
      }

      if (response.status === 403) {
        actionError = "Недостаточно прав для обновления пользователя.";
        setUserError(actionError);
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | { user?: ManagedUser; password?: string; error?: string }
        | null;

      if (!response.ok || !data?.user) {
        throw new Error(data?.error ?? "Не удалось обновить пароль");
      }

      if (!data.password) {
        throw new Error("Сервер не вернул новый пароль");
      }

      setCredentialsModal({ login, password: data.password, mode: "updated" });
      setPasswordDrafts((prev) => ({ ...prev, [userId]: "" }));
      setMessage(`Пароль для ${login} обновлён`);

      if (showUserManager) {
        void mutateUsers();
      }
    } catch (error) {
      actionError =
        error instanceof Error
          ? error.message
          : "Не удалось обновить пароль";
    } finally {
      setUserActionStates((prev) => ({
        ...prev,
        [userId]: { loading: false, error: actionError }
      }));
    }
  };

  const handleCreateUser = async () => {
    if (!canManage || creatingUser) {
      return;
    }

    setCreatingUser(true);
    setUserError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/users", { method: "POST" });

      if (response.status === 401) {
        setUserError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setUserError("Недостаточно прав для создания пользователя.");
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | { login?: string; password?: string; error?: string }
        | null;

      if (!response.ok || !data?.login || !data?.password) {
        throw new Error(data?.error ?? "Не удалось создать пользователя");
      }

      setCredentialsModal({
        login: data.login,
        password: data.password,
        mode: "created"
      });
      setMessage("Новый пользователь создан");

      if (showUserManager) {
        void mutateUsers();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось создать пользователя";
      setUserError(message);
    } finally {
      setCreatingUser(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <PageContainer activeTab="settings">
      {credentialsModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-3 shadow dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {credentialsModal.mode === "created"
                    ? "Новый пользователь создан"
                    : "Пароль обновлён"}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Скопируйте эти данные — после закрытия окна они будут недоступны.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCredentialsModal(null)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg bg-slate-100 p-3 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                <dt className="font-semibold">Имя пользователя</dt>
                <dd className="mt-1 break-all font-mono">
                  {credentialsModal.login}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-100 p-3 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                <dt className="font-semibold">Пароль</dt>
                <dd className="mt-1 break-all font-mono">
                  {credentialsModal.password}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setCredentialsModal(null)}
              className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700"
            >
              Понятно
            </button>
          </div>
        </div>
      ) : null}

      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem"
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>
          Финансовые настройки общины
        </h1>
      </header>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end"
          }}
        >
          <ThemeToggle />
        </div>

        {loading ? <p style={{ color: "var(--text-muted)" }}>Загружаем настройки...</p> : null}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}
        >
          <section
            data-layout="stat-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.5rem"
            }}
          >
            <article
              style={{
                backgroundColor: "var(--surface-indigo)",
                borderRadius: "1rem",
                padding: "1.5rem",
                boxShadow: "0 12px 28px rgba(99, 102, 241, 0.15)"
              }}
            >
              <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                Базовая валюта
              </h2>
              <strong style={{ fontSize: "1.5rem", color: "var(--accent-indigo-strong)" }}>{baseCurrency}</strong>
              <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                Все суммы приводятся к этой валюте для расчётов.
              </p>
              {canManage ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    marginTop: "1.25rem"
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem"
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>
                      Выберите новую базовую валюту
                    </span>
                    <select
                      value={baseCurrencyDraft}
                      onChange={handleBaseCurrencyChange}
                      disabled={baseCurrencySaving}
                      style={{
                        padding: "0.85rem 1rem",
                        borderRadius: "0.75rem",
                        border: "1px solid var(--surface-muted)",
                        backgroundColor: "var(--surface-base)",
                        fontWeight: 600,
                        color: "var(--text-strong)",
                        cursor: baseCurrencySaving ? "not-allowed" : "pointer"
                      }}
                    >
                      {availableCurrencyOptions.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={handleSaveBaseCurrency}
                    disabled={
                      baseCurrencySaving || baseCurrencyDraft === baseCurrency
                    }
                    className="inline-flex w-fit items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
                  >
                    {baseCurrencySaving ? "Сохраняем..." : "Сохранить"}
                  </button>
                </div>
              ) : null}
              {baseCurrencyError ? (
                <p style={{ color: "var(--accent-danger)", marginTop: "0.5rem" }}>
                  {baseCurrencyError}
                </p>
              ) : null}
            </article>
          </section>

          {canManage ? (
            <article
              style={{
                backgroundColor: "var(--surface-base)",
                borderRadius: "1rem",
                padding: "1.5rem",
                border: "1px solid var(--border-muted)",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem"
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem"
                }}
              >
                <h3 style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                  Кабинет управления пользователями
                </h3>
                <p style={{ color: "var(--text-secondary)" }}>
                  Создавайте учётные записи, обновляйте пароли и права доступа
                  участников.
                </p>
                <button
                  type="button"
                  onClick={handleToggleUserManager}
                  className="inline-flex w-fit items-center justify-center rounded-xl border border-indigo-300 px-4 py-2 font-semibold text-indigo-700 transition hover:bg-indigo-50"
                >
                  {showUserManager ? "Скрыть кабинет" : "Открыть кабинет"}
                </button>
              </div>
              {showUserManager ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                      alignItems: "center"
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleCreateUser}
                      disabled={creatingUser}
                      className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
                    >
                      {creatingUser ? "Создаём..." : "Создать пользователя"}
                    </button>
                  </div>
                  {usersLoading ? (
                    <p style={{ color: "var(--text-muted)" }}>
                      Загружаем пользователей...
                    </p>
                  ) : null}
                  {userError ? (
                    <p style={{ color: "var(--accent-danger)" }}>{userError}</p>
                  ) : null}
                  {managedUsers.length > 0 ? (
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          minWidth: "640px"
                        }}
                      >
                        <thead>
                          <tr>
                            <th
                              style={{
                                textAlign: "left",
                                padding: "0.75rem",
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                                borderBottom: "1px solid var(--border-muted)"
                              }}
                            >
                              Пользователь
                            </th>
                            <th
                              style={{
                                textAlign: "left",
                                padding: "0.75rem",
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                                borderBottom: "1px solid var(--border-muted)"
                              }}
                            >
                              Доступ
                            </th>
                            <th
                              style={{
                                textAlign: "left",
                                padding: "0.75rem",
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                                borderBottom: "1px solid var(--border-muted)"
                              }}
                            >
                              Создан
                            </th>
                            <th
                              style={{
                                textAlign: "left",
                                padding: "0.75rem",
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                                borderBottom: "1px solid var(--border-muted)"
                              }}
                            >
                              Пароль
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {managedUsers.map((item) => {
                            const actionState = userActionStates[item.id] ?? {
                              loading: false,
                              error: null
                            };
                            const draft = passwordDrafts[item.id] ?? "";
                            const trimmed = draft.trim();
                            const disableManual =
                              actionState.loading ||
                              trimmed.length < PASSWORD_MIN_LENGTH;
                            const isCurrentUser = item.id === user.id;

                            return (
                              <tr
                                key={item.id}
                                style={{
                                  borderBottom: "1px solid var(--border-muted)"
                                }}
                              >
                                <td style={{ padding: "0.75rem", verticalAlign: "top" }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "0.25rem"
                                    }}
                                  >
                                    <span style={{ fontWeight: 600 }}>{item.login}</span>
                                    {isCurrentUser ? (
                                      <span
                                        style={{
                                          color: "var(--text-muted)",
                                          fontSize: "0.875rem"
                                        }}
                                      >
                                        Это вы
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                                <td style={{ padding: "0.75rem", verticalAlign: "top" }}>
                                  <select
                                    value={item.role}
                                    onChange={(event) =>
                                      void handleRoleChange(
                                        item.id,
                                        item.login,
                                        event.target.value as UserRole
                                      )
                                    }
                                    disabled={actionState.loading}
                                    style={{
                                      padding: "0.5rem 0.75rem",
                                      borderRadius: "0.5rem",
                                      border: "1px solid var(--border-muted)",
                                      backgroundColor: "var(--surface-base)",
                                      fontWeight: 600
                                    }}
                                  >
                                    {USER_ROLES.map((roleValue) => (
                                      <option key={roleValue} value={roleValue}>
                                        {USER_ROLE_LABELS[roleValue]}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td style={{ padding: "0.75rem", verticalAlign: "top" }}>
                                  <span style={{ color: "var(--text-secondary)" }}>
                                    {formatUserDate(item.createdAt)}
                                  </span>
                                </td>
                                <td style={{ padding: "0.75rem" }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "0.5rem"
                                    }}
                                  >
                                    <input
                                      type="text"
                                      value={draft}
                                      onChange={(event) =>
                                        handlePasswordDraftChange(
                                          item.id,
                                          event.target.value
                                        )
                                      }
                                      placeholder={`Минимум ${PASSWORD_MIN_LENGTH} символов`}
                                      disabled={actionState.loading}
                                      style={{
                                        padding: "0.6rem 0.75rem",
                                        borderRadius: "0.5rem",
                                        border: "1px solid var(--border-muted)",
                                        fontFamily: "var(--font-mono)"
                                      }}
                                    />
                                    <div
                                      style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "0.5rem"
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleManualPasswordSubmit(
                                            item.id,
                                            item.login
                                          )
                                        }
                                        disabled={disableManual}
                                        className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
                                      >
                                        Сохранить пароль
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleGeneratePassword(
                                            item.id,
                                            item.login
                                          )
                                        }
                                        disabled={actionState.loading}
                                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                                      >
                                        Сгенерировать
                                      </button>
                                    </div>
                                    {actionState.loading ? (
                                      <span
                                        style={{
                                          color: "var(--text-muted)",
                                          fontSize: "0.875rem"
                                        }}
                                      >
                                        Обновляем...
                                      </span>
                                    ) : null}
                                    {actionState.error ? (
                                      <p style={{ color: "var(--accent-danger)" }}>
                                        {actionState.error}
                                      </p>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : usersLoading ? null : (
                    <p style={{ color: "var(--text-muted)" }}>
                      Пользователи ещё не созданы.
                    </p>
                  )}
                </div>
              ) : null}
            </article>
          ) : null}

          {canManage ? (
            <article
              style={{
                backgroundColor: "var(--surface-base)",
                borderRadius: "1rem",
                padding: "1.5rem",
                border: "1px solid var(--border-muted)",
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem"
                }}
              >
                <h3 style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                  Новые популярные валюты
                </h3>
                <p style={{ color: "var(--text-secondary)" }}>
                  Выберите код, чтобы добавить валюту в список доступных. Курсы
                  указаны относительно доллара США.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddCurrency((prev) => !prev)}
                  className="inline-flex w-fit items-center justify-center rounded-xl border border-indigo-300 px-4 py-2 font-semibold text-indigo-700 transition hover:bg-indigo-50"
                >
                  {showAddCurrency ? "Скрыть список" : "Добавить валюту"}
                </button>
              </div>

              {showAddCurrency ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "1rem"
                  }}
                >
                  {addableCurrencies.length === 0 ? (
                    <p style={{ color: "var(--text-muted)" }}>
                      Все популярные валюты уже добавлены.
                    </p>
                  ) : (
                    addableCurrencies.map(({ code, title, rateToUSD }) => {
                      const formattedRate = formatRateValue(rateToUSD);

                      return (
                        <div
                          key={code}
                          style={{
                            border: "1px solid var(--border-muted)",
                            borderRadius: "0.75rem",
                            padding: "1rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                            backgroundColor: "var(--surface-muted)"
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.25rem"
                            }}
                          >
                            <strong style={{ fontSize: "1.1rem" }}>{code}</strong>
                            <span style={{ color: "var(--text-secondary)" }}>
                              {title}
                            </span>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                              1 {code} = {formattedRate} USD
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleAddCurrency(code)}
                            disabled={addCurrencyLoading === code}
                            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
                          >
                            {addCurrencyLoading === code ? "Добавляем..." : "Добавить"}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}

              {addCurrencyError ? (
                <p style={{ color: "var(--accent-danger)" }}>{addCurrencyError}</p>
              ) : null}
            </article>
          ) : null}

          <div
            data-layout="toolbar"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap"
            }}
          >
            {ratesLoading ? (
              <span style={{ color: "var(--text-muted)" }}>Обновляем курсы...</span>
            ) : null}
            <button
              type="button"
              onClick={handleForceUpdate}
              disabled={!canManage || ratesLoading}
              data-variant="primary"
            >
              {ratesLoading ? "Обновляем..." : "Обновить сейчас"}
            </button>
          </div>

          <section
            data-layout="stat-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.25rem"
            }}
          >
            {displayCurrencies.map((code) => {
              const info = rates[code];
              const converted = convertToBase(1, code, settings);
              const value = formatRateValue(converted);
              const placeholder = RATE_PLACEHOLDERS[code] ?? "1";
              const updatedLabel = formatUpdatedAt(info?.updatedAt ?? null);

              return (
                <label
                  key={code}
                  style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
                >
                  <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>
                    {baseCurrency} за 1 {code}
                  </span>
                  <input
                    type="number"
                    value={value}
                    placeholder={placeholder}
                    readOnly
                    style={{
                      padding: "0.85rem 1rem",
                      borderRadius: "0.75rem",
                      border: "1px solid var(--border-muted)"
                    }}
                  />
                  <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    Обновлено: {updatedLabel}
                  </span>
                </label>
              );
            })}
          </section>

          <section
            style={{
              marginTop: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              border: "1px solid var(--border-muted)",
              borderRadius: "1rem",
              padding: "1.5rem",
              backgroundColor: "var(--surface-base)"
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem"
              }}
            >
              <h3 style={{ fontWeight: 600, fontSize: "1.1rem" }}>Доступные валюты</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Удаление валюты потребует пароль 108. При удалении базовой валюты
                система автоматически выберет другую доступную валюту.
              </p>
            </div>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
              }}
            >
              {availableCurrencyOptions.length === 0 ? (
                <li style={{ color: "var(--text-muted)" }}>
                  Пока нет доступных валют.
                </li>
              ) : (
                availableCurrencyOptions.map((code) => {
                  const isRemoving = removalCandidate === code;

                  return (
                    <li
                      key={code}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                        border: "1px solid var(--border-muted)",
                        borderRadius: "0.75rem",
                        padding: "1rem"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "1rem",
                          flexWrap: "wrap"
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                          }}
                        >
                          <strong style={{ fontSize: "1.05rem" }}>{code}</strong>
                          {code === baseCurrency ? (
                            <span
                              style={{
                                color: "var(--text-secondary)",
                                fontSize: "0.85rem"
                              }}
                            >
                              базовая
                            </span>
                          ) : null}
                        </div>
                        {canManage ? (
                          isRemoving ? null : (
                            <button
                              type="button"
                              onClick={() => startRemoval(code)}
                              className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                            >
                              Удалить
                            </button>
                          )
                        ) : null}
                      </div>
                      {isRemoving ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem"
                          }}
                        >
                          <input
                            type="password"
                            value={removalPassword}
                            onChange={handleRemovalPasswordChange}
                            placeholder="Введите пароль 108"
                            style={{
                              padding: "0.75rem 1rem",
                              borderRadius: "0.75rem",
                              border: "1px solid var(--border-muted)"
                            }}
                          />
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              flexWrap: "wrap"
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => void confirmRemoval()}
                              disabled={removalLoading}
                              className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-400"
                            >
                              {removalLoading ? "Удаляем..." : "Подтвердить"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelRemoval}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                            >
                              Отмена
                            </button>
                          </div>
                          {removalError ? (
                            <p style={{ color: "var(--accent-danger)" }}>
                              {removalError}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </div>

        <section
          data-layout="stat-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.25rem"
          }}
        >
          <Link
            href="/settings/categories"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              padding: "1.5rem",
              borderRadius: "1rem",
              backgroundColor: "var(--surface-indigo)",
              textDecoration: "none",
              boxShadow: "0 12px 24px rgba(79, 70, 229, 0.15)"
            }}
          >
            <strong style={{ color: "var(--accent-indigo-strong)", fontSize: "1.1rem" }}>
              Категории
            </strong>
            <span style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Добавляйте и удаляйте категории прихода и расхода в отдельном разделе.
            </span>
          </Link>

          <Link
            href="/settings/wallets"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              padding: "1.5rem",
              borderRadius: "1rem",
              backgroundColor: "var(--surface-cyan)",
              textDecoration: "none",
              boxShadow: "0 12px 24px rgba(13, 148, 136, 0.15)"
            }}
          >
            <strong style={{ color: "var(--accent-teal)", fontSize: "1.1rem" }}>
              Кошельки
            </strong>
            <span style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Управляйте списком кошельков, не затрагивая связанные операции.
            </span>
          </Link>
        </section>

        {!canManage ? (
          <p style={{ color: "var(--text-muted)" }}>
            Вы вошли как наблюдатель — обновление курсов недоступно.
          </p>
        ) : null}

        {settingsError ? (
          <p style={{ color: "var(--accent-danger)" }}>{settingsError}</p>
        ) : null}
        {ratesError ? (
          <p style={{ color: "var(--accent-danger)" }}>{ratesError}</p>
        ) : null}
        {userError ? <p style={{ color: "var(--accent-danger)" }}>{userError}</p> : null}
        {message ? <p style={{ color: "var(--accent-success)" }}>{message}</p> : null}
    </PageContainer>
  );
};

const SettingsPage = () => (
  <AuthGate>
    <SettingsContent />
  </AuthGate>
);

export default SettingsPage;
