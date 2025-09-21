import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

interface OperationPayload {
  type?: string;
  amount?: number;
  currency?: string;
  category?: string;
  wallet?: string;
  comment?: string | null;
  source?: string | null;
}

const errorResponse = (message: string, status = 500) =>
  NextResponse.json({ status: "error", message }, { status });

export const GET = async () => {
  try {
    const operations = await prisma.operation.findMany({
      orderBy: { occurred_at: "desc" },
    });

    return NextResponse.json(operations);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load operations";
    return errorResponse(message);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const body = (await request.json()) as OperationPayload | null;

    if (!body) {
      return errorResponse("Invalid payload", 400);
    }

    const { type, amount, currency, category, wallet, comment, source } = body;

    if (
      !type ||
      typeof type !== "string" ||
      amount === undefined ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      !currency ||
      typeof currency !== "string" ||
      !category ||
      typeof category !== "string" ||
      !wallet ||
      typeof wallet !== "string"
    ) {
      return errorResponse("Invalid payload", 400);
    }

    const operation = await prisma.operation.create({
      data: {
        id: randomUUID(),
        type,
        amount: Number(amount),
        currency,
        category,
        wallet,
        comment: comment ?? null,
        source: source ?? null,
        occurred_at: new Date(),
      },
    });

    return NextResponse.json(operation, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create operation";
    return errorResponse(message);
  }
};
