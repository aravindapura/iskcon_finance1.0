"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { Inter } from "next/font/google";
import styles from "./mobile-dashboard.module.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600"] });

const quickActions = [
  {
    id: "income",
    label: "Приход",
    description: "Пожертвование",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className={styles.actionGlyph}>
        <path
          d="M12 4v12m0 0 4-4m-4 4-4-4M5 20h14"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    )
  },
  {
    id: "expense",
    label: "Расход",
    description: "Платёж",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className={styles.actionGlyph}>
        <path
          d="M12 20V8m0 0-4 4m4-4 4 4M5 4h14"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    )
  },
  {
    id: "scan",
    label: "Скан",
    description: "Чек",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className={styles.actionGlyph}>
        <path
          d="M5 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12l-3-2-3 2-3-2-3 2z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    )
  }
];

const transactions = [
  {
    id: "t1",
    title: "Жертвенный обед",
    category: "Доход",
    amount: "+ 18 500 ₽",
    time: "Сегодня, 10:40",
    tone: "income" as const
  },
  {
    id: "t2",
    title: "Оптовая закупка овощей",
    category: "Расход",
    amount: "− 9 200 ₽",
    time: "Вчера, 18:20",
    tone: "expense" as const
  },
  {
    id: "t3",
    title: "Киртан фестиваль",
    category: "Пожертвование",
    amount: "+ 32 000 ₽",
    time: "2 дня назад",
    tone: "income" as const
  }
];

const goals = [
  {
    id: "g1",
    title: "Фестиваль Джанмаштами",
    amount: "62%",
    description: "Собрано 310 000 ₽ из 500 000 ₽"
  },
  {
    id: "g2",
    title: "Ремонт кухни",
    amount: "38%",
    description: "Собрано 95 000 ₽ из 250 000 ₽"
  }
];

const MobileFinanceScreen = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const currentTheme = resolvedTheme ?? "light";

  const toggleLabel = useMemo(
    () => (currentTheme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"),
    [currentTheme]
  );

  const handleToggleTheme = () => {
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  return (
    <div className={`${styles.preview} ${inter.className}`} data-theme={currentTheme}>
      <div className={styles.device}>
        <section className={`${styles.card} ${styles.balanceCard}`}>
          <header className={styles.cardHeader}>
            <div>
              <p className={styles.caption}>Учёт доходов и расходов</p>
              <h1 className={styles.title}>Баланс общины</h1>
            </div>
            <button
              type="button"
              className={styles.themeToggle}
              onClick={handleToggleTheme}
              aria-label={toggleLabel}
            >
              {currentTheme === "dark" ? (
                <svg viewBox="0 0 24 24" aria-hidden className={styles.themeIcon}>
                  <path
                    d="M12 4a1 1 0 0 1 1 1v1.26a.74.74 0 0 1-1.11.64 5.5 5.5 0 1 0 7.21 7.21.74.74 0 0 1 .64-1.11H21a1 1 0 0 1 1 1 9 9 0 1 1-9-9Z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden className={styles.themeIcon}>
                  <path
                    d="M12 5.5a1 1 0 0 1 1-1h.02a1 1 0 0 1 1 1V7a1 1 0 1 1-2 0zm0 11.5a1 1 0 0 1 2 0v1.5a1 1 0 0 1-2 0zM7 11a1 1 0 1 1 0 2H5.5a1 1 0 1 1 0-2zm12.5 0a1 1 0 0 1 0 2H18a1 1 0 1 1 0-2zM7.76 7.76a1 1 0 1 1-1.41-1.41l1.06-1.06a1 1 0 0 1 1.41 1.41zm9.89 9.89a1 1 0 0 1 1.41 0l1.06 1.06a1 1 0 0 1-1.41 1.41l-1.06-1.06a1 1 0 0 1 0-1.41zM7.76 16.24a1 1 0 0 1 0 1.41l-1.06 1.06a1 1 0 1 1-1.41-1.41l1.06-1.06a1 1 0 0 1 1.41 0zm9.89-9.89a1 1 0 0 1 0-1.41l1.06-1.06a1 1 0 0 1 1.41 1.41l-1.06 1.06a1 1 0 0 1-1.41 0zM12 8.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </button>
          </header>

          <div className={styles.balanceSummary}>
            <div>
              <p className={styles.balanceLabel}>Текущий баланс</p>
              <p className={styles.balanceValue}>428 560 ₽</p>
            </div>
            <div className={styles.trendBadge}>
              <span aria-hidden>▲</span>
              <span>+8,2% за месяц</span>
            </div>
          </div>

          <div className={styles.balanceDetails}>
            <div className={styles.detailCard}>
              <span className={styles.detailLabel}>Доходы</span>
              <span className={styles.detailValuePositive}>+ 286 400 ₽</span>
              <div className={styles.detailProgress}>
                <span className={styles.detailProgressPositive} style={{ width: "72%" }} />
              </div>
            </div>
            <div className={styles.detailCard}>
              <span className={styles.detailLabel}>Расходы</span>
              <span className={styles.detailValueNegative}>− 158 200 ₽</span>
              <div className={styles.detailProgress}>
                <span className={styles.detailProgressNegative} style={{ width: "54%" }} />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.actionsRow}>
          {quickActions.map((action) => (
            <button key={action.id} type="button" className={styles.actionButton}>
              <span className={styles.actionIcon}>{action.icon}</span>
              <span className={styles.actionLabel}>{action.label}</span>
              <span className={styles.actionDescription}>{action.description}</span>
            </button>
          ))}
        </section>

        <section className={`${styles.card} ${styles.activityCard}`}>
          <header className={styles.cardHeader}>
            <div>
              <p className={styles.caption}>Движение средств</p>
              <h2 className={styles.sectionTitle}>Недавние операции</h2>
            </div>
            <button type="button" className={styles.linkButton}>
              Смотреть все
            </button>
          </header>

          <ul className={styles.transactionList}>
            {transactions.map((item) => (
              <li key={item.id} className={styles.transactionItem}>
                <span className={`${styles.transactionIcon} ${styles[item.tone]}`}>•</span>
                <div className={styles.transactionContent}>
                  <span className={styles.transactionTitle}>{item.title}</span>
                  <span className={styles.transactionMeta}>{item.category}</span>
                </div>
                <div className={styles.transactionAmountBlock}>
                  <span className={`${styles.transactionAmount} ${styles[item.tone]}`}>
                    {item.amount}
                  </span>
                  <span className={styles.transactionMeta}>{item.time}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${styles.card} ${styles.goalsCard}`}>
          <header className={styles.cardHeader}>
            <div>
              <p className={styles.caption}>Планы и цели</p>
              <h2 className={styles.sectionTitle}>Целевые сборы</h2>
            </div>
            <button type="button" className={styles.linkButton}>
              Добавить цель
            </button>
          </header>

          <ul className={styles.goalList}>
            {goals.map((goal) => (
              <li key={goal.id} className={styles.goalItem}>
                <div className={styles.goalHeader}>
                  <span className={styles.goalTitle}>{goal.title}</span>
                  <span className={styles.goalValue}>{goal.amount}</span>
                </div>
                <p className={styles.goalDescription}>{goal.description}</p>
                <div className={styles.goalTrack}>
                  <span className={styles.goalProgress} style={{ width: goal.amount }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default MobileFinanceScreen;
