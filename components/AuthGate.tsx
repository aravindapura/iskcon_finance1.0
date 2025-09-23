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
          background: "var(--page-background)",
          color: "var(--text-secondary)",
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
          background:
            "radial-gradient(circle at top left, rgba(59, 130, 246, 0.35), transparent 55%), linear-gradient(135deg, var(--surface-deep), var(--surface-primary))",
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
            backgroundColor: "var(--surface-elevated)",
            padding: "2.5rem",
            borderRadius: "1.25rem",
            border: "1px solid var(--border-muted)",
            boxShadow: "var(--shadow-strong)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-strong)" }}>
              Войдите в систему
            </h1>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>
              Укажите логин и пароль бухгалтера или наблюдателя.
            </p>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Логин</span>
            <input
              type="text"
              value={loginValue}
              onChange={(event) => {
                setLoginValue(event.target.value);
                clearError();
              }}
              placeholder="например, buh"
              style={{
                padding: "1rem",
                borderRadius: "1rem",
                border: "1px solid var(--border-muted)",
                backgroundColor: "var(--surface-contrast)",
                color: "var(--text-primary)",
                fontSize: "1rem",
                boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)"
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError();
              }}
              placeholder="Введите пароль"
              style={{
                padding: "1rem",
                borderRadius: "1rem",
                border: "1px solid var(--border-muted)",
                backgroundColor: "var(--surface-contrast)",
                color: "var(--text-primary)",
                fontSize: "1rem",
                boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)"
              }}
            />
          </label>

          {authError ? (
            <p style={{ color: "var(--accent-danger)", fontWeight: 500 }}>{authError}</p>
          ) : null}

          <button
            type="submit"
            disabled={authenticating}
            style={{
              padding: "1rem",
              borderRadius: "1rem",
              border: "1px solid transparent",
              background: authenticating
                ? "linear-gradient(135deg, var(--accent-primary-strong), var(--accent-primary))"
                : "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-strong))",
              color: "var(--surface-elevated)",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: authenticating ? "not-allowed" : "pointer",
              boxShadow: "var(--shadow-accent)",
              transition: "background 0.2s ease, transform 0.2s ease",
              width: "100%"
            }}
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
          background:
            "linear-gradient(135deg, rgba(59, 130, 246, 0.25), transparent), var(--surface-contrast)",
          color: "var(--text-secondary-strong)",
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          borderBottom: "1px solid var(--border-muted)",
          boxShadow: "var(--shadow-soft)"
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
          style={{
            padding: "1rem",
            borderRadius: "1rem",
            border: "1px solid rgba(96, 165, 250, 0.35)",
            background: "rgba(59, 130, 246, 0.2)",
            color: "var(--text-strong)",
            fontWeight: 600,
            cursor: authenticating ? "not-allowed" : "pointer",
            boxShadow: "var(--shadow-soft)"
          }}
        >
          {authenticating ? "Выходим..." : "Выйти"}
        </button>
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
};

export default AuthGate;
