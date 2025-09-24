"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonStar, Sun } from "lucide-react";

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
      aria-pressed={isDark}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
    >
      <span className="theme-toggle__track">
        <Sun aria-hidden className="theme-toggle__icon" />
        <span className="theme-toggle__thumb" />
        <MoonStar aria-hidden className="theme-toggle__icon" />
      </span>
      <span className="theme-toggle__label">{isDark ? "Тёмная тема" : "Светлая тема"}</span>
    </button>
  );
};

export default ThemeToggle;
