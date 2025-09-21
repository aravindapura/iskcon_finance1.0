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
import type { SessionUser } from "@/lib/types";

type SessionContextValue = {
  user: SessionUser | null;
  initializing: boolean;
  authenticating: boolean;
  authError: string | null;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const readSession = async () => {
  const response = await fetch("/api/auth/session", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Не удалось получить данные сессии");
  }

  const data = (await response.json()) as { user: SessionUser | null };

  return data.user ?? null;
};

const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const currentUser = await readSession();
      setUser(currentUser);
      setAuthError(null);
    } catch (error) {
      console.error(error);
      setUser(null);
      setAuthError("Не удалось проверить авторизацию");
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  const login = useCallback(async (loginValue: string, password: string) => {
    setAuthenticating(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginValue, password })
      });

      const data = (await response.json().catch(() => null)) as
        | { user?: SessionUser; error?: string }
        | null;

      if (!response.ok || !data?.user) {
        throw new Error(data?.error ?? "Не удалось выполнить вход");
      }

      setUser(data.user);
      setAuthError(null);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Не удалось выполнить вход";
      setUser(null);
      setAuthError(message);
      throw error;
    } finally {
      setAuthenticating(false);
      setInitializing(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthenticating(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error(error);
    } finally {
      setUser(null);
      setAuthenticating(false);
      setInitializing(false);
      setAuthError(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    setInitializing(true);
    await fetchSession();
  }, [fetchSession]);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      authenticating,
      authError,
      login,
      logout,
      refresh,
      clearError
    }),
    [user, initializing, authenticating, authError, login, logout, refresh, clearError]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
};

export default SessionProvider;
