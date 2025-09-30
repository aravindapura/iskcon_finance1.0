import type { FC, ReactNode } from "react";

type BalanceCardProps = {
  balance: number;
  netBalance: number;
  formatter: Intl.NumberFormat;
  title?: string;
  netLabel?: string;
  netHint?: ReactNode;
};

const BalanceCard: FC<BalanceCardProps> = ({
  balance,
  netBalance,
  formatter,
  title = "Текущий баланс",
  netLabel = "Чистый баланс",
  netHint = "учитывает долги и активы"
}) => {
  const formattedBalance = formatter.format(balance);
  const formattedNetBalance = formatter.format(netBalance);
  const balanceColor = balance >= 0 ? "var(--accent-success)" : "var(--accent-danger)";
  const netBalanceColor =
    netBalance >= 0 ? "var(--accent-success)" : "var(--accent-danger)";

  return (
    <section
      className="rounded-2xl shadow-lg"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "1.5rem",
        backgroundColor: "var(--surface-subtle)"
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap"
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem"
          }}
        >
          <span style={{ fontSize: "1.05rem", fontWeight: 600 }}>{title}</span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>{netHint}</span>
        </div>

        <strong
          style={{
            fontSize: "clamp(2rem, 5vw, 2.75rem)",
            fontWeight: 700,
            color: balanceColor,
            whiteSpace: "nowrap"
          }}
        >
          {formattedBalance}
        </strong>
      </header>

      <details
        style={{
          margin: 0,
          border: "1px solid var(--border-muted)",
          borderRadius: "1rem",
          padding: "0.9rem 1.1rem",
          backgroundColor: "var(--surface)"
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            listStyle: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            fontWeight: 600,
            color: "var(--text-primary)"
          }}
        >
          <span>{netLabel}</span>
          <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 500 }}>
            Подробнее
          </span>
        </summary>
        <div
          style={{
            marginTop: "0.85rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap"
          }}
        >
          <p style={{ color: "var(--text-muted)", margin: 0 }}>{netHint}</p>
          <strong
            style={{
              fontSize: "clamp(1.3rem, 4vw, 1.6rem)",
              color: netBalanceColor,
              whiteSpace: "nowrap"
            }}
          >
            {formattedNetBalance}
          </strong>
        </div>
      </details>
    </section>
  );
};

export default BalanceCard;
