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
  const [usernameValue, setUsernameValue] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await login(usernameValue, password);
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
              value={usernameValue}
              onChange={(event) => {
                setUsernameValue(event.target.value);
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

          <div style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            <p>Доступные роли:</p>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
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
          backgroundColor: "var(--surface-subtle)",
          color: "var(--text-secondary)",
          padding: "0.75rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          borderBottom: "1px solid var(--border-strong)"
        }}
      >
        <span style={{ fontWeight: 600 }}>
          Вы вошли как {user.username} ({labelForRole(user.role)})
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
