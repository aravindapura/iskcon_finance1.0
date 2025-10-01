"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useSession } from "@/components/SessionProvider";

const labelForRole = (role: string) => {
  if (role === "admin") {
    return "Бухгалтер";
  }

  return "Наблюдатель";
};

const AuthGate = ({ children }: { children: ReactNode }) => {
  const { user, initializing, authenticating, authError, login, clearError, logout } =
    useSession();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await login(loginValue, password);
      setPassword("");
    } catch (error) {
      console.error(error);
    }
  };

  if (initializing) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--page-background)",
          color: "var(--text-secondary)",
          fontSize: "1.1rem",
          transition: "background-color 0.3s ease, color 0.3s ease"
        }}
      >
        Загружаем данные...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--page-background)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "2rem",
          transition: "background-color 0.3s ease, color 0.3s ease"
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            width: "min(420px, 100%)",
            backgroundColor: "var(--surface-subtle)",
            padding: "1.5rem",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
            border: "1px solid var(--border-strong)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            color: "var(--text-primary)",
            transition: "background-color 0.3s ease, border-color 0.3s ease"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-strong)" }}>
              Войдите в систему
            </h1>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Укажите логин и пароль бухгалтера или наблюдателя.
            </p>
          </div>

          <label>
            <span style={{ fontWeight: 600, color: "var(--text-secondary-strong)" }}>
              Имя пользователя
            </span>
            <input
              type="text"
              value={loginValue}
              onChange={(event) => {
                setLoginValue(event.target.value);
                clearError();
              }}
              placeholder="например, buh"
              style={{ fontSize: "1rem" }}
            />
          </label>

          <label>
            <span style={{ fontWeight: 600, color: "var(--text-secondary-strong)" }}>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError();
              }}
              placeholder="Введите пароль"
              style={{ fontSize: "1rem" }}
            />
          </label>

          {authError ? (
            <p style={{ color: "var(--accent-danger)", fontWeight: 500 }}>{authError}</p>
          ) : null}

          <button
            type="submit"
            disabled={authenticating}
            data-variant="primary"
            className="w-full"
          >
            {authenticating ? "Входим..." : "Войти"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh"
      }}
    >
      <div
        style={{
          alignItems: "center",
          alignSelf: "center",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          backgroundColor: "transparent",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          borderRadius: "1.25rem",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.12)",
          color: "var(--text-secondary)",
          display: "flex",
          gap: "1.25rem",
          justifyContent: "space-between",
          margin: "1.5rem 0 1rem",
          padding: "1rem 1.75rem",
          width: "min(100%, 980px)",
          flexWrap: "wrap"
        }}
      >
        <span style={{ fontWeight: 600 }}>
          Вы вошли как {user.login} ({labelForRole(user.role)})
        </span>
        <button
          type="button"
          onClick={() => {
            void logout();
          }}
          disabled={authenticating}
          data-variant="outline"
        >
          {authenticating ? "Выходим..." : "Выйти"}
        </button>
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
};

export default AuthGate;
