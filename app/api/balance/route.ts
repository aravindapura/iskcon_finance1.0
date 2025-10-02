// app/api/balance/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { convertToBase } from "@/lib/currency";
import { extractDebtPaymentAmount } from "@/lib/debtPayments";
import { loadSettings } from "@/lib/settingsService";

export async function GET() {
  try {
    // Настройки (базовая валюта и курсы)
    const settings = await loadSettings();

    // Данные из БД
    const operations = await prisma.operation.findMany({
      orderBy: { occurred_at: "desc" },
      take: 50
    });
    const debts = await prisma.debt.findMany();
    const goals = await prisma.goal.findMany();

    // Множество названий целей (в нижнем регистре), без map/filter
    const goalCategorySet = new Set<string>();
    for (const goal of goals) {
      const rawTitle =
        typeof goal.title === "string" ? goal.title.trim() : "";
      if (rawTitle) {
        goalCategorySet.add(rawTitle.toLowerCase());
      }
    }

    // --- Долги: borrowed, lent и их влияние на баланс ---
    let borrowed = 0;
    let lent = 0;
    let balanceEffect = 0;

    for (const debt of debts) {
      if (debt.status === "closed") {
        continue;
      }

      const debtAmount = Number(debt.amount);
      // Приведение к типу валюты, ожидаемому convertToBase
      const currency = debt.currency as "USD" | "RUB" | "GEL" | "EUR";
      const amountInBase = convertToBase(debtAmount, currency, settings);

      // Свойства existing нет, считаем что все долги влияют на баланс
      if (debt.type === "borrowed") {
        borrowed += amountInBase;
        balanceEffect += amountInBase;
      } else {
        // lent
        lent += amountInBase;
        balanceEffect += amountInBase;
      }
    }

    // --- Баланс из операций с учётом целей и выплат по долгам ---
    let operationsBalance = 0;

    for (const operation of operations) {
      const amount = Number(operation.amount);
      const currency = operation.currency as "USD" | "RUB" | "GEL" | "EUR";
      const amountInBase = convertToBase(amount, currency, settings);

      const categoryName =
        typeof operation.category === "string"
          ? operation.category.toLowerCase()
          : "";

      // Расходы по целям не уменьшают баланс
      if (
        operation.type === "expense" &&
        goalCategorySet.has(categoryName)
      ) {
        continue;
      }

      if (operation.type === "income") {
        operationsBalance += amountInBase;
      } else {
        // expense
        let nextValue = operationsBalance - amountInBase;

        // Корректировка: если это платёж по долгу — возвращаем эффект
        const sourceStr =
          typeof operation.source === "string" ? operation.source : "";
        const debtPaymentAmount = extractDebtPaymentAmount(sourceStr);

        if (debtPaymentAmount > 0) {
          const paymentInBase = convertToBase(
            debtPaymentAmount,
            currency,
            settings
          );
          nextValue += paymentInBase;
        }

        operationsBalance = nextValue;
      }
    }

    // Итоги: как на вебе
    const balance = operationsBalance + balanceEffect;
    const netBalance = balance - borrowed + lent;

    // Собираем последние 10 операций без .slice()
    const lastOperations: typeof operations = [];
    const limit = Math.min(10, operations.length);
    for (let i = 0; i < limit; i += 1) {
      lastOperations.push(operations[i]);
    }

    return NextResponse.json({
      ok: true,
      balance,
      netBalance,
      operationsCount: operations.length,
      lastOperations
    });
  } catch (error: any) {
    console.error("Ошибка в /api/balance:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to calculate balance",
        details: String(error?.message ?? error)
      },
      { status: 500 }
    );
  }
}
