"use client";

import { useMemo, type CSSProperties } from "react";
import { useCurrency } from "@/lib/CurrencyContext";
import type { CurrencyCode } from "@/lib/currency";

const optionStyles: CSSProperties = {
  padding: "0.4rem 0.75rem"
};

const CurrencySelector = () => {
  const {
    currency,
    baseCurrency,
    supportedCurrencies,
    setCurrency,
    loading,
    error,
    isReady,
    reload
  } = useCurrency();

  const canChangeCurrency = isReady || currency === baseCurrency;

  const helperText = useMemo(() => {
    if (loading) {
      return "Обновляем курсы...";
    }

    if (error) {
      return error;
    }

    if (!isReady) {
      return "Доступна только базовая валюта";
    }

    return "Все суммы отображаются в выбранной валюте";
  }, [loading, error, isReady]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
        minWidth: "160px"
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1f2937" }}>
          Валюта
        </span>
        <select
          value={currency}
          onChange={(event) => {
            setCurrency(event.target.value as CurrencyCode);
          }}
          style={{
            padding: "0.55rem 0.85rem",
            borderRadius: "999px",
            border: "1px solid #d1d5db",
            backgroundColor: "#ffffff",
            fontWeight: 600,
            color: "#1f2937",
            cursor: canChangeCurrency ? "pointer" : "not-allowed"
          }}
          disabled={loading && !isReady}
        >
          {supportedCurrencies.map((code) => (
            <option
              key={code}
              value={code}
              disabled={!isReady && code !== baseCurrency}
              style={optionStyles}
            >
              {code}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <span style={{ fontSize: "0.75rem", color: error ? "#b91c1c" : "#475569" }}>
          {helperText}
        </span>
        {error ? (
          <button
            type="button"
            onClick={() => {
              void reload();
            }}
            style={{
              alignSelf: "flex-start",
              padding: "0.35rem 0.75rem",
              borderRadius: "0.6rem",
              border: "1px solid #dc2626",
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Повторить загрузку
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default CurrencySelector;
