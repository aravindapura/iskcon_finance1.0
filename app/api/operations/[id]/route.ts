import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/operationsStore";
import { convertBetweenCurrencies } from "@/lib/rates";

const roundMoney = (value: number) => Number(value.toFixed(2));

export const DELETE = (
  _request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { id } = params;
  const index = db.operations.findIndex((operation) => operation.id === id);

  if (index === -1) {
    return NextResponse.json({ error: "Operation not found" }, { status: 404 });
  }

  const [deleted] = db.operations.splice(index, 1);

  if (deleted.type === "expense") {
    const matchedGoal = db.goals.find(
      (goal) => goal.title.toLowerCase() === deleted.category.toLowerCase()
    );

    if (matchedGoal) {
      const convertedAmount = convertBetweenCurrencies(
        deleted.amount,
        deleted.currency,
        matchedGoal.targetCurrency
      );

      matchedGoal.currentAmount = roundMoney(
        Math.max(matchedGoal.currentAmount - convertedAmount, 0)
      );
      matchedGoal.currentAmountUsd = roundMoney(
        Math.max(matchedGoal.currentAmountUsd - deleted.amountUsd, 0)
      );

      if (matchedGoal.currentAmountUsd < matchedGoal.targetAmountUsd) {
        matchedGoal.status = "active";
      }
    }
  }

  return NextResponse.json(deleted);
};
