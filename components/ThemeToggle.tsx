"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const ThemeToggle = () => {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mode = theme === "system" ? resolvedTheme : theme;
  const isDark = mode === "dark";

  if (!mounted) {
    return null;
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      data-mode={isDark ? "dark" : "light"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
    >
      <span className="theme-toggle__pill">
        <span className="theme-toggle__thumb">
          {isDark ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
        </span>
      </span>
      <span className="theme-toggle__label">{isDark ? "Тёмная тема" : "Светлая тема"}</span>
    </button>
  );
};

export default ThemeToggle;
