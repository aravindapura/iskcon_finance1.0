"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";
import AuthGate from "@/components/AuthGate";
import { useSession } from "@/components/SessionProvider";
import { useTheme, type ThemeName } from "@/components/ThemeProvider";
import { DEFAULT_SETTINGS, SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { Currency, Settings } from "@/lib/types";

const isSettings = (value: unknown): value is Settings => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Settings>;

  return (
    typeof candidate.baseCurrency === "string" &&
    SUPPORTED_CURRENCIES.includes(candidate.baseCurrency as Currency) &&
    !!candidate.rates &&
    typeof candidate.rates === "object"
  );
};

const buildRatesState = (settings: Settings) =>
  SUPPORTED_CURRENCIES.reduce<Record<Currency, string>>((acc, code) => {
    if (code === settings.baseCurrency) {
      acc[code] = "1";
      return acc;
    }

    const rawRate = settings.rates[code];
    const normalized =
      typeof rawRate === "number" && Number.isFinite(rawRate) && rawRate > 0
        ? 1 / rawRate
        : 1;

    acc[code] = Number(normalized.toFixed(6)).toString();
    return acc;
  }, {} as Record<Currency, string>);

type NavItemKey = "home" | "wallets" | "debts" | "planning" | "reports" | "settings";

type NavStyle = {
  background: string;
  color: string;
  shadow: string;
};

type CardStyle = {
  background: string;
  shadow: string;
  title: string;
  highlight: string;
};

type QuickLinkStyle = {
  background: string;
  shadow: string;
  title: string;
};

type ThemeSelectorStyle = {
  background: string;
  shadow: string;
  activeBackground: string;
  inactiveBackground: string;
  border: string;
  text: string;
  accent: string;
};

type SettingsPalette = {
  pageBackground: string;
  mainBackground: string;
  mainShadow: string;
  baseText: string;
  nav: Record<NavItemKey, NavStyle>;
  headingColor: string;
  textSecondary: string;
  loadingColor: string;
  cards: {
    baseCurrency: CardStyle;
    sampleBalance: CardStyle;
  };
  labelColor: string;
  inputBorder: string;
  inputBackground: string;
  inputText: string;
  button: {
    background: string;
    disabledBackground: string;
    text: string;
    shadow: string;
  };
  quickLinks: {
    categories: QuickLinkStyle;
    wallets: QuickLinkStyle;
  };
  themeSelector: ThemeSelectorStyle;
  infoText: string;
  errorText: string;
  successText: string;
};

const SETTINGS_THEME_STYLES: Record<ThemeName, SettingsPalette> = {
  light: {
    pageBackground: "#ede9fe",
    mainBackground: "#ffffff",
    mainShadow: "0 20px 45px rgba(109, 40, 217, 0.15)",
    baseText: "#1f2937",
    nav: {
      home: {
        background: "#e0e7ff",
        color: "#1d4ed8",
        shadow: "0 4px 12px rgba(59, 130, 246, 0.25)"
      },
      wallets: {
        background: "#ccfbf1",
        color: "#0f766e",
        shadow: "0 4px 12px rgba(45, 212, 191, 0.25)"
      },
      debts: {
        background: "#eef2ff",
        color: "#4338ca",
        shadow: "0 4px 12px rgba(99, 102, 241, 0.2)"
      },
      planning: {
        background: "#dcfce7",
        color: "#15803d",
        shadow: "0 4px 12px rgba(34, 197, 94, 0.2)"
      },
      reports: {
        background: "#fef3c7",
        color: "#b45309",
        shadow: "0 4px 12px rgba(217, 119, 6, 0.2)"
      },
      settings: {
        background: "#f5f3ff",
        color: "#6d28d9",
        shadow: "0 4px 12px rgba(109, 40, 217, 0.2)"
      }
    },
    headingColor: "#312e81",
    textSecondary: "#475569",
    loadingColor: "#64748b",
    cards: {
      baseCurrency: {
        background: "#eef2ff",
        shadow: "0 12px 28px rgba(99, 102, 241, 0.15)",
        title: "#312e81",
        highlight: "#3730a3"
      },
      sampleBalance: {
        background: "#dcfce7",
        shadow: "0 12px 28px rgba(34, 197, 94, 0.12)",
        title: "#166534",
        highlight: "#15803d"
      }
    },
    labelColor: "#1f2937",
    inputBorder: "#d1d5db",
    inputBackground: "#ffffff",
    inputText: "#1f2937",
    button: {
      background: "#6d28d9",
      disabledBackground: "#94a3b8",
      text: "#ffffff",
      shadow: "0 12px 24px rgba(109, 40, 217, 0.25)"
    },
    quickLinks: {
      categories: {
        background: "#eef2ff",
        shadow: "0 12px 24px rgba(79, 70, 229, 0.15)",
        title: "#3730a3"
      },
      wallets: {
        background: "#ecfeff",
        shadow: "0 12px 24px rgba(13, 148, 136, 0.15)",
        title: "#0f766e"
      }
    },
    themeSelector: {
      background: "#f5f3ff",
      shadow: "0 12px 24px rgba(109, 40, 217, 0.12)",
      activeBackground: "#ddd6fe",
      inactiveBackground: "#ede9fe",
      border: "#c4b5fd",
      text: "#312e81",
      accent: "#6d28d9"
    },
    infoText: "#64748b",
    errorText: "#b91c1c",
    successText: "#15803d"
  },
  dark: {
    pageBackground: "#111827",
    mainBackground: "#1f2937",
    mainShadow: "0 20px 45px rgba(15, 23, 42, 0.6)",
    baseText: "#e2e8f0",
    nav: {
      home: {
        background: "#1e3a8a",
        color: "#c7d2fe",
        shadow: "0 4px 12px rgba(30, 64, 175, 0.5)"
      },
      wallets: {
        background: "#115e59",
        color: "#5eead4",
        shadow: "0 4px 12px rgba(17, 94, 89, 0.5)"
      },
      debts: {
        background: "#312e81",
        color: "#c4b5fd",
        shadow: "0 4px 12px rgba(49, 46, 129, 0.5)"
      },
      planning: {
        background: "#14532d",
        color: "#bbf7d0",
        shadow: "0 4px 12px rgba(20, 83, 45, 0.5)"
      },
      reports: {
        background: "#78350f",
        color: "#fcd34d",
        shadow: "0 4px 12px rgba(120, 53, 15, 0.45)"
      },
      settings: {
        background: "#4c1d95",
        color: "#ede9fe",
        shadow: "0 4px 12px rgba(76, 29, 149, 0.5)"
      }
    },
    headingColor: "#c7d2fe",
    textSecondary: "#cbd5f5",
    loadingColor: "#94a3b8",
    cards: {
      baseCurrency: {
        background: "#312e81",
        shadow: "0 12px 28px rgba(79, 70, 229, 0.35)",
        title: "#ede9fe",
        highlight: "#c4b5fd"
      },
      sampleBalance: {
        background: "#14532d",
        shadow: "0 12px 28px rgba(34, 197, 94, 0.35)",
        title: "#bbf7d0",
        highlight: "#86efac"
      }
    },
    labelColor: "#e2e8f0",
    inputBorder: "#475569",
    inputBackground: "#0f172a",
    inputText: "#f1f5f9",
    button: {
      background: "#7c3aed",
      disabledBackground: "#4b5563",
      text: "#f8fafc",
      shadow: "0 12px 24px rgba(124, 58, 237, 0.45)"
    },
    quickLinks: {
      categories: {
        background: "#312e81",
        shadow: "0 12px 24px rgba(79, 70, 229, 0.35)",
        title: "#ede9fe"
      },
      wallets: {
        background: "#0f766e",
        shadow: "0 12px 24px rgba(15, 118, 110, 0.45)",
        title: "#ccfbf1"
      }
    },
    themeSelector: {
      background: "#1e1b4b",
      shadow: "0 12px 24px rgba(109, 40, 217, 0.4)",
      activeBackground: "#4338ca",
      inactiveBackground: "#312e81",
      border: "#4c1d95",
      text: "#ede9fe",
      accent: "#c4b5fd"
    },
    infoText: "#94a3b8",
    errorText: "#f87171",
    successText: "#4ade80"
  }
};

const THEME_OPTIONS: { label: string; value: ThemeName }[] = [
  { label: "Светлая", value: "light" },
  { label: "Тёмная", value: "dark" }
];

const SettingsContent = () => {
  const { user, refresh } = useSession();
  const { theme, setTheme } = useTheme();

  if (!user) {
    return null;
  }

  const palette = useMemo(() => SETTINGS_THEME_STYLES[theme], [theme]);
  const canManage = user.role === "accountant";

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [rates, setRates] = useState<Record<Currency, string>>(() =>
    buildRatesState(DEFAULT_SETTINGS)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/settings");

        if (response.status === 401) {
          setError("Сессия истекла, войдите заново.");
          await refresh();
          return;
        }

        if (!response.ok) {
          throw new Error("Не удалось загрузить настройки");
        }

        const data = await response.json().catch(() => null);

        if (!isSettings(data)) {
          throw new Error("Не удалось загрузить настройки");
        }

        setSettings(data);
        setRates(buildRatesState(data));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, [refresh]);

  const baseCurrency = settings.baseCurrency;
  const baseFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: baseCurrency
      }),
    [baseCurrency]
  );

  const handleThemeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextTheme: ThemeName = event.target.value === "dark" ? "dark" : "light";
    setTheme(nextTheme);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!canManage) {
      setError("Недостаточно прав для изменения курсов");
      return;
    }

    setSaving(true);

    const payloadRates: Partial<Record<Currency, number>> = {};

    for (const currency of SUPPORTED_CURRENCIES) {
      if (currency === baseCurrency) {
        continue;
      }

      const value = rates[currency];
      const numeric = Number(value);

      if (!Number.isFinite(numeric) || numeric <= 0) {
        setError(
          `Введите положительный курс (количество ${currency} за 1 ${baseCurrency})`
        );
        setSaving(false);
        return;
      }

      payloadRates[currency] = 1 / numeric;
    }

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rates: payloadRates })
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setError("Недостаточно прав для изменения курсов");
        return;
      }

      if (
        !response.ok ||
        !isSettings(data)
      ) {
        const errorMessage =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error?: string }).error
            : undefined;

        throw new Error(errorMessage ?? "Не удалось сохранить настройки");
      }

      setSettings(data);
      setRates(buildRatesState(data));
      setMessage("Курсы успешно обновлены");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: palette.pageBackground,
        padding: "3rem 1.5rem",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start"
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: "820px",
          backgroundColor: palette.mainBackground,
          borderRadius: "20px",
          padding: "2.5rem 2.75rem",
          boxShadow: palette.mainShadow,
          display: "flex",
          flexDirection: "column",
          gap: "2.25rem",
          color: palette.baseText
        }}
      >
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "1rem",
            flexWrap: "wrap"
          }}
        >
          <Link
            href="/"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              backgroundColor: palette.nav.home.background,
              color: palette.nav.home.color,
              fontWeight: 600,
              boxShadow: palette.nav.home.shadow
            }}
          >
            Главная
          </Link>
          <Link
            href="/wallets"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              backgroundColor: palette.nav.wallets.background,
              color: palette.nav.wallets.color,
              fontWeight: 600,
              boxShadow: palette.nav.wallets.shadow
            }}
          >
            Кошельки
          </Link>
          <Link
            href="/debts"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              backgroundColor: palette.nav.debts.background,
              color: palette.nav.debts.color,
              fontWeight: 600,
              boxShadow: palette.nav.debts.shadow
            }}
          >
            Долги
          </Link>
          <Link
            href="/planning"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              backgroundColor: palette.nav.planning.background,
              color: palette.nav.planning.color,
              fontWeight: 600,
              boxShadow: palette.nav.planning.shadow
            }}
          >
            Планирование
          </Link>
          <Link
            href="/reports"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              backgroundColor: palette.nav.reports.background,
              color: palette.nav.reports.color,
              fontWeight: 600,
              boxShadow: palette.nav.reports.shadow
            }}
          >
            Отчёты
          </Link>
          <Link
            href="/settings"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              backgroundColor: palette.nav.settings.background,
              color: palette.nav.settings.color,
              fontWeight: 600,
              boxShadow: palette.nav.settings.shadow
            }}
          >
            Настройки
          </Link>
        </nav>

        <header
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: palette.headingColor }}>
            Финансовые настройки общины
          </h1>
          <p style={{ color: palette.textSecondary, lineHeight: 1.6 }}>
            Обновляйте базовую валюту и курсы конвертации, чтобы отчёты оставались точными.
          </p>
        </header>

        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            backgroundColor: palette.themeSelector.background,
            borderRadius: "1rem",
            padding: "1.5rem",
            boxShadow: palette.themeSelector.shadow
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <strong style={{ color: palette.headingColor, fontSize: "1.1rem" }}>
              Оформление
            </strong>
            <span style={{ color: palette.textSecondary }}>
              Выберите тему интерфейса, которая подходит вам больше.
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {THEME_OPTIONS.map((option) => (
              <label
                key={option.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "999px",
                  border: `1px solid ${palette.themeSelector.border}`,
                  backgroundColor:
                    theme === option.value
                      ? palette.themeSelector.activeBackground
                      : palette.themeSelector.inactiveBackground,
                  color: palette.themeSelector.text,
                  fontWeight: 600
                }}
              >
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={handleThemeChange}
                  style={{ accentColor: palette.themeSelector.accent }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </section>

        {loading ? <p style={{ color: palette.loadingColor }}>Загружаем настройки...</p> : null}

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}
        >
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.5rem"
            }}
          >
            <article
              style={{
                backgroundColor: palette.cards.baseCurrency.background,
                borderRadius: "1rem",
                padding: "1.5rem",
                boxShadow: palette.cards.baseCurrency.shadow
              }}
            >
              <h2 style={{ color: palette.cards.baseCurrency.title, fontWeight: 600, marginBottom: "0.5rem" }}>
                Базовая валюта
              </h2>
              <strong style={{ fontSize: "1.5rem", color: palette.cards.baseCurrency.highlight }}>
                {baseCurrency}
              </strong>
              <p style={{ color: palette.textSecondary, marginTop: "0.5rem" }}>
                Все суммы приводятся к этой валюте для расчётов.
              </p>
            </article>
            <article
              style={{
                backgroundColor: palette.cards.sampleBalance.background,
                borderRadius: "1rem",
                padding: "1.5rem",
                boxShadow: palette.cards.sampleBalance.shadow
              }}
            >
              <h2 style={{ color: palette.cards.sampleBalance.title, fontWeight: 600, marginBottom: "0.5rem" }}>
                Текущий баланс (пример)
              </h2>
              <strong style={{ fontSize: "1.5rem", color: palette.cards.sampleBalance.highlight }}>
                {baseFormatter.format(1_000_000)}
              </strong>
              <p style={{ color: palette.textSecondary, marginTop: "0.5rem" }}>
                Для проверки отображения формата валюты.
              </p>
            </article>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.25rem"
            }}
          >
            {SUPPORTED_CURRENCIES.filter((code) => code !== baseCurrency).map((code) => (
              <label
                key={code}
                style={{ display: "flex", flexDirection: "column", gap: "0.5rem", color: palette.baseText }}
              >
                <span style={{ fontWeight: 600, color: palette.labelColor }}>
                  {code} за 1 {baseCurrency}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={rates[code] ?? "1"}
                  onChange={(event) =>
                    setRates((prev) => ({
                      ...prev,
                      [code]: event.target.value
                    }))
                  }
                  disabled={!canManage || saving}
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "0.75rem",
                    border: `1px solid ${palette.inputBorder}`,
                    backgroundColor: palette.inputBackground,
                    color: palette.inputText
                  }}
                />
              </label>
            ))}
          </section>

          <button
            type="submit"
            disabled={!canManage || saving}
            style={{
              padding: "0.95rem 1.5rem",
              borderRadius: "0.85rem",
              border: "none",
              backgroundColor:
                saving || !canManage
                  ? palette.button.disabledBackground
                  : palette.button.background,
              color: palette.button.text,
              fontWeight: 600,
              boxShadow: palette.button.shadow,
              cursor: !canManage || saving ? "not-allowed" : "pointer"
            }}
          >
            {saving ? "Сохраняем..." : "Сохранить курсы"}
          </button>
        </form>

        <section
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
              backgroundColor: palette.quickLinks.categories.background,
              textDecoration: "none",
              boxShadow: palette.quickLinks.categories.shadow,
              color: palette.baseText
            }}
          >
            <strong style={{ color: palette.quickLinks.categories.title, fontSize: "1.1rem" }}>
              Категории
            </strong>
            <span style={{ color: palette.textSecondary, lineHeight: 1.5 }}>
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
              backgroundColor: palette.quickLinks.wallets.background,
              textDecoration: "none",
              boxShadow: palette.quickLinks.wallets.shadow,
              color: palette.baseText
            }}
          >
            <strong style={{ color: palette.quickLinks.wallets.title, fontSize: "1.1rem" }}>
              Кошельки
            </strong>
            <span style={{ color: palette.textSecondary, lineHeight: 1.5 }}>
              Управляйте списком кошельков, не затрагивая связанные операции.
            </span>
          </Link>
        </section>

        {!canManage ? (
          <p style={{ color: palette.infoText }}>
            Вы вошли как наблюдатель — редактирование курсов недоступно.
          </p>
        ) : null}

        {error ? <p style={{ color: palette.errorText }}>{error}</p> : null}
        {message ? <p style={{ color: palette.successText }}>{message}</p> : null}
      </main>
    </div>
  );
};

const SettingsPage = () => (
  <AuthGate>
    <SettingsContent />
  </AuthGate>
);

export default SettingsPage;
