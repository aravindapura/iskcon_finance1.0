"use client";

import { useState, type CSSProperties } from "react";

import type { Wallet } from "@/lib/types";

type WalletCard = {
  id: string;
  name: Wallet;
  icon: string;
  baseAmountFormatted: string;
  walletCurrencyAmountFormatted?: string | null;
  rubAmountFormatted?: string | null;
  isActive: boolean;
};

type WalletListProps = {
  wallets: WalletCard[];
  canManage: boolean;
  draggingWallet: Wallet | null;
  dragTargetWallet: Wallet | null;
  dragOriginPosition: { x: number; y: number } | null;
  dragPointerPosition: { x: number; y: number } | null;
  dragVisualOffset: { x: number; y: number } | null;
  activeIncomeSource: string | null;
  incomeDropTarget: string | null;
  onWalletPointerDown: (
    wallet: Wallet,
    origin: { x: number; y: number },
    pointer: { x: number; y: number }
  ) => void;
  onWalletPointerEnter: (wallet: Wallet) => void;
  onWalletPointerLeave: (wallet: Wallet) => void;
  onWalletPointerUp: () => void;
  onIncomeDrop: (walletId: string) => void;
  onIncomeDragEnter: (walletId: string) => void;
  onIncomeDragLeave: (walletId: string) => void;
  onAddIncomeClick: (walletId: string) => void;
  isMobile: boolean;
};

const WalletList = ({
  wallets,
  canManage,
  draggingWallet,
  dragTargetWallet,
  dragOriginPosition,
  dragPointerPosition,
  dragVisualOffset,
  activeIncomeSource,
  incomeDropTarget,
  onWalletPointerDown,
  onWalletPointerEnter,
  onWalletPointerLeave,
  onWalletPointerUp,
  onIncomeDrop,
  onIncomeDragEnter,
  onIncomeDragLeave,
  onAddIncomeClick,
  isMobile
}: WalletListProps) => {
  const [localIncomeDropTarget, setLocalIncomeDropTarget] = useState<string | null>(null);

  const handleIncomeDragEnter = (walletId: string) => {
    setLocalIncomeDropTarget(walletId);
    onIncomeDragEnter(walletId);
  };

  const handleIncomeDragLeave = (walletId: string) => {
    setLocalIncomeDropTarget((current) => (current === walletId ? null : current));
    onIncomeDragLeave(walletId);
  };

  return (
    <div
      style={{
        display: "grid",
        gap: "0.75rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
      }}
    >
      {wallets.map((wallet) => {
        const isInteractive = canManage && wallet.isActive;
        const isDragSource = draggingWallet === wallet.name;
        const isDropTarget = dragTargetWallet === wallet.name && draggingWallet !== wallet.name;
        const isIncomeTarget =
          !!activeIncomeSource && (incomeDropTarget === wallet.id || localIncomeDropTarget === wallet.id);

        const cardStyle: CSSProperties = {
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          padding: "0.85rem",
          borderRadius: "0.85rem",
          border: "1px solid var(--surface-muted)",
          backgroundColor: wallet.isActive ? "var(--surface-base)" : "var(--surface-subtle)",
          transition: "transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease",
          cursor: isInteractive ? "grab" : "default",
          position: "relative",
          minHeight: "160px"
        };

        if (!wallet.isActive) {
          cardStyle.opacity = 0.85;
        }

        if (isIncomeTarget) {
          cardStyle.border = "1px solid rgba(16, 185, 129, 0.65)";
          cardStyle.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.2)";
        }

        if (isDropTarget) {
          cardStyle.transform = "translateY(-3px) scale(1.04)";
          cardStyle.boxShadow = "0 0 0 2px rgba(13, 148, 136, 0.2)";
        }

        const dragOffset =
          isDragSource && dragOriginPosition && dragPointerPosition
            ? dragVisualOffset ?? {
                x: dragPointerPosition.x - dragOriginPosition.x,
                y: dragPointerPosition.y - dragOriginPosition.y
              }
            : null;

        if (dragOffset) {
          const transforms: string[] = [];
          transforms.push(`translate(${dragOffset.x}px, ${dragOffset.y}px) scale(1.05)`);
          cardStyle.transform = transforms.join(" ");
          cardStyle.boxShadow = "0 14px 28px rgba(12, 181, 154, 0.3)";
          cardStyle.transformOrigin = "center";
          cardStyle.zIndex = 10;
          cardStyle.opacity = 1;
          cardStyle.willChange = "transform";
        }

        return (
          <article
            key={wallet.id}
            style={cardStyle}
            data-wallet-card={wallet.name}
            data-wallet-id={wallet.id}
            data-wallet-interactive={isInteractive ? "true" : "false"}
            onPointerDown={(event) => {
              if (!isInteractive) {
                return;
              }

              if (event.pointerType !== "touch" && event.button !== 0) {
                return;
              }

              event.preventDefault();
              const element = event.currentTarget as HTMLElement;
              element.setPointerCapture?.(event.pointerId);
              const rect = element.getBoundingClientRect();
              onWalletPointerDown(
                wallet.name,
                {
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2
                },
                {
                  x: event.clientX,
                  y: event.clientY
                }
              );
            }}
            onPointerEnter={() => {
              if (!isInteractive) {
                return;
              }

              onWalletPointerEnter(wallet.name);
            }}
            onPointerLeave={() => {
              if (!isInteractive) {
                return;
              }

              onWalletPointerLeave(wallet.name);
            }}
            onPointerUp={(event) => {
              if (!isInteractive) {
                return;
              }

              if (event.pointerType !== "touch" && event.button !== 0) {
                return;
              }

              event.preventDefault();
              (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
              onWalletPointerUp();
            }}
            onDragOver={(event) => {
              if (!activeIncomeSource) {
                return;
              }

              event.preventDefault();
              handleIncomeDragEnter(wallet.id);
            }}
            onDragEnter={(event) => {
              if (!activeIncomeSource) {
                return;
              }

              event.preventDefault();
              handleIncomeDragEnter(wallet.id);
            }}
            onDragLeave={() => {
              if (!activeIncomeSource) {
                return;
              }

              handleIncomeDragLeave(wallet.id);
            }}
            onDrop={(event) => {
              if (!activeIncomeSource) {
                return;
              }

              event.preventDefault();
              handleIncomeDragLeave(wallet.id);
              onIncomeDrop(wallet.id);
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "1.75rem",
                height: "1.75rem",
                borderRadius: "999px",
                backgroundColor: "var(--surface-subtle)",
                fontSize: "0.95rem"
              }}
            >
              {wallet.icon}
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                lineHeight: 1.2,
                color: wallet.isActive ? "var(--text-primary)" : "var(--text-secondary)",
                wordBreak: "break-word"
              }}
            >
              {wallet.name}
            </span>
            <strong
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: wallet.baseAmountFormatted.startsWith("-")
                  ? "var(--accent-danger)"
                  : "var(--accent-teal-strong)"
              }}
            >
              {wallet.baseAmountFormatted}
            </strong>
            {wallet.walletCurrencyAmountFormatted ? (
              <span style={{ fontSize: "0.64rem", color: "var(--text-secondary)" }}>
                {wallet.walletCurrencyAmountFormatted}
              </span>
            ) : null}
            {wallet.rubAmountFormatted ? (
              <span style={{ fontSize: "0.64rem", color: "var(--text-secondary)" }}>
                {wallet.rubAmountFormatted}
              </span>
            ) : null}
            {!wallet.isActive ? (
              <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>Архивный кошелёк</span>
            ) : null}
            {isMobile ? (
              <button
                type="button"
                onClick={() => onAddIncomeClick(wallet.id)}
                className="mt-auto inline-flex items-center justify-center rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-emerald-700/50 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
              >
                Добавить доход
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
};

export type { WalletCard };
export default WalletList;
