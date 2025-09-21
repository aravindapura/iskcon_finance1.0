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
          background: "linear-gradient(135deg, #c7d2fe, #fef9c3)",
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
            backgroundColor: "#ffffff",
            padding: "2.5rem",
            borderRadius: "20px",
            boxShadow: "0 24px 65px rgba(15, 23, 42, 0.15)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#1e293b" }}>
              Войдите в систему
            </h1>
            <p style={{ color: "#475569", lineHeight: 1.5 }}>
              Укажите логин и пароль бухгалтера или наблюдателя.
            </p>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontWeight: 600, color: "#1f2937" }}>Логин</span>
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
                border: "1px solid #cbd5f5",
                fontSize: "1rem"
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontWeight: 600, color: "#1f2937" }}>Пароль</span>
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
                border: "1px solid #cbd5f5",
                fontSize: "1rem"
              }}
            />
          </label>

          {authError ? (
            <p style={{ color: "#b91c1c", fontWeight: 500 }}>{authError}</p>
          ) : null}

          <button
            type="submit"
            disabled={authenticating}
            style={{
              padding: "0.95rem 1.2rem",
              borderRadius: "0.85rem",
              border: "none",
              background: authenticating ? "#4f46e5" : "#4338ca",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: authenticating ? "not-allowed" : "pointer",
              boxShadow: "0 16px 35px rgba(79, 70, 229, 0.35)"
            }}
          >
            {authenticating ? "Входим..." : "Войти"}
          </button>

          <div style={{ color: "#64748b", fontSize: "0.95rem" }}>
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
          style={{
            padding: "0.55rem 1.15rem",
            borderRadius: "999px",
            border: "1px solid rgba(224, 231, 255, 0.6)",
            background: "rgba(30, 64, 175, 0.35)",
            color: "#f8fafc",
            fontWeight: 600,
            cursor: authenticating ? "not-allowed" : "pointer",
            boxShadow: "0 6px 18px rgba(30, 64, 175, 0.35)"
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
