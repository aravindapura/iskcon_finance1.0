"use client";

import { type MouseEvent } from "react";

import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";

const ACTIONS = [
  {
    key: "inventory",
    label: "Инвентарь",
    description: "Учёт оборудования и расходных материалов"
  },
  {
    key: "books",
    label: "Книги",
    description: "Каталог печатных изданий и движение тиражей"
  }
] as const;

const WarehouseContent = () => (
  <PageContainer activeTab="warehouse">
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem"
      }}
    >
      <h1 style={{ fontSize: "1.85rem", fontWeight: 700 }}>Склад</h1>
      <p style={{ color: "var(--text-muted)", maxWidth: "640px" }}>
        Выберите раздел, чтобы перейти к управлению складскими запасами. Здесь будут
        размещены инструменты для работы с инвентарём и книгами.
      </p>
    </header>

    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "1.25rem",
        width: "100%"
      }}
    >
      {ACTIONS.map((action) => (
        <button
          key={action.key}
          type="button"
          data-variant="ghost"
          style={{
            backgroundColor: "var(--surface-blue)",
            color: "var(--text-strong)",
            borderRadius: "1rem",
            padding: "1.75rem",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "0.5rem",
            boxShadow: "0 20px 40px rgba(37, 99, 235, 0.18)",
            border: "1px solid var(--border-strong)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease"
          }}
          onMouseEnter={(event: MouseEvent<HTMLButtonElement>) => {
            event.currentTarget.style.transform = "translateY(-2px)";
            event.currentTarget.style.boxShadow = "0 25px 45px rgba(37, 99, 235, 0.24)";
          }}
          onMouseLeave={(event: MouseEvent<HTMLButtonElement>) => {
            event.currentTarget.style.transform = "translateY(0)";
            event.currentTarget.style.boxShadow = "0 20px 40px rgba(37, 99, 235, 0.18)";
          }}
        >
          <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>{action.label}</span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            {action.description}
          </span>
        </button>
      ))}
    </section>
  </PageContainer>
);

const WarehousePage = () => (
  <AuthGate>
    <WarehouseContent />
  </AuthGate>
);

export default WarehousePage;
