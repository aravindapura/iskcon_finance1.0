"use client";

import styles from "./TypeTargets.module.css";

export type OperationType = "INCOME" | "EXPENSE";

type TypeTargetsProps = {
  visible: boolean;
  onPick: (type: OperationType) => void;
  disabled?: boolean;
  activeType?: OperationType | null;
};

const TypeTargets = ({
  visible,
  onPick,
  disabled = false,
  activeType = null
}: TypeTargetsProps) => {
  if (!visible) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={`${styles.target} ${styles.income} ${
          activeType === "INCOME" ? styles.targetActive : ""
        }`.trim()}
        onClick={() => onPick("INCOME")}
        disabled={disabled}
      >
        Добавить как доход
      </button>
      <button
        type="button"
        className={`${styles.target} ${styles.expense} ${
          activeType === "EXPENSE" ? styles.targetActive : ""
        }`.trim()}
        onClick={() => onPick("EXPENSE")}
        disabled={disabled}
      >
        Добавить как расход
      </button>
    </div>
  );
};

export default TypeTargets;
