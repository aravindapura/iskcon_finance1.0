"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

export type Theme = "light" | "dark" | "system";

type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (value: Theme) => void;
  toggleTheme: () => void;
};

const noop = () => {
  // noop
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: noop,
  toggleTheme: noop
});

type ThemeProviderProps = {
  attribute?: "class" | "data-theme";
  children: ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  storageKey?: string;
};

const prefersDarkScheme = "(prefers-color-scheme: dark)";

const resolveSystemTheme = () =>
  typeof window !== "undefined" && window.matchMedia(prefersDarkScheme).matches
    ? "dark"
    : "light";

const setHtmlAttribute = (attribute: string, value: ResolvedTheme) => {
  const root = document.documentElement;

  if (attribute === "class") {
    root.classList.remove("light", "dark");
    root.classList.add(value);
    return;
  }

  root.setAttribute(attribute, value);
};

export const ThemeProvider = ({
  attribute = "class",
  children,
  defaultTheme = "system",
  enableSystem = true,
  storageKey = "theme"
}: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    defaultTheme === "dark" ? "dark" : "light"
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(storageKey) as Theme | null;

    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored);
      return;
    }

    setThemeState(defaultTheme);
  }, [defaultTheme, storageKey]);

  const updateTheme = useCallback(
    (value: Theme) => {
      setThemeState(value);

      if (typeof window === "undefined") {
        return;
      }

      if (value === "system") {
        window.localStorage.removeItem(storageKey);
        return;
      }

      window.localStorage.setItem(storageKey, value);
    },
    [storageKey]
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const resolved =
      theme === "system" && enableSystem ? resolveSystemTheme() : theme === "dark" ? "dark" : "light";

    setHtmlAttribute(attribute, resolved);
    setResolvedTheme(resolved);

    if (!enableSystem || theme !== "system") {
      return;
    }

    const media = window.matchMedia(prefersDarkScheme);

    const listener = () => {
      const systemTheme = resolveSystemTheme();
      setHtmlAttribute(attribute, systemTheme);
      setResolvedTheme(systemTheme);
    };

    media.addEventListener("change", listener);

    return () => {
      media.removeEventListener("change", listener);
    };
  }, [attribute, enableSystem, theme]);

  const toggleTheme = useCallback(() => {
    updateTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, updateTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: updateTheme,
      toggleTheme
    }),
    [resolvedTheme, theme, toggleTheme, updateTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeProvider;
