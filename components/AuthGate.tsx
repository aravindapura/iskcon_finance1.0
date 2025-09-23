"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useSession } from "@/components/SessionProvider";

const labelForRole = (role: string) => {
  if (role === "accountant") {
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
          background: "#f8fafc",
          color: "#334155",
          fontSize: "1.1rem"
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
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem"
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            width: "min(420px, 100%)",
            backgroundColor: "var(--surface-primary)",
            color: "var(--text-primary)",
            padding: "2.5rem",
            borderRadius: "20px",
            border: "1px solid var(--border-strong)",
            boxShadow: "var(--shadow-soft)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
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

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontWeight: 600, color: "var(--text-secondary-strong)" }}>
              Логин
            </span>
            <input
              type="text"
              value={loginValue}
              onChange={(event) => {
                setLoginValue(event.target.value);
                clearError();
              }}
              placeholder="например, buh"
              style={{
                padding: "0.85rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid var(--border-strong)",
                fontSize: "1rem",
                backgroundColor: "var(--surface-muted)",
                color: "var(--text-primary)"
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontWeight: 600, color: "var(--text-secondary-strong)" }}>
              Пароль
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError();
              }}
              placeholder="Введите пароль"
              style={{
                padding: "0.85rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid var(--border-strong)",
                fontSize: "1rem",
                backgroundColor: "var(--surface-muted)",
                color: "var(--text-primary)"
              }}
            />
          </label>

          {authError ? (
            <p style={{ color: "var(--accent-danger)", fontWeight: 500 }}>{authError}</p>
          ) : null}

          <button
            type="submit"
            disabled={authenticating}
            className="button-base button-primary button-responsive"
          >
            {authenticating ? "Входим..." : "Войти"}
          </button>

          <div style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            <p>Доступные роли:</p>
            <ul
              style={{
                marginTop: "0.5rem",
                paddingLeft: "1.2rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem"
              }}
            >
              <li>
                <strong>Бухгалтер</strong> — логин <code>buh</code>, пароль <code>buh123</code>
              </li>
              <li>
                <strong>Наблюдатель</strong> — логин <code>viewer</code>, пароль <code>viewer123</code>
              </li>
            </ul>
          </div>
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
          background: "linear-gradient(90deg, #312e81, #4338ca)",
          color: "#e0e7ff",
          padding: "0.75rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
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
          className="button-base button-ghost"
        >
          {authenticating ? "Выходим..." : "Выйти"}
        </button>
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
};

export default AuthGate;
