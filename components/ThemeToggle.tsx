"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@/components/icons";

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
      aria-pressed={isDark}
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
    >
      <span className="theme-toggle__icon" aria-hidden>
        {isDark ? <MoonIcon width={20} height={20} /> : <SunIcon width={20} height={20} />}
      </span>
      <span className="theme-toggle__label">{isDark ? "Тёмная тема" : "Светлая тема"}</span>
    </button>
  );
};

export default ThemeToggle;
