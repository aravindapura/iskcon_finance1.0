import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

import { serializeBookInventoryItem, serializeBookSale, withBookInfrastructure } from "../helpers";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 100;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit"));
  const take = Number.isFinite(limitParam)
    ? Math.min(MAX_LIMIT, Math.max(1, limitParam))
    : DEFAULT_LIMIT;

  try {
    const sales = await withBookInfrastructure(() =>
      prisma.bookSale.findMany({
        orderBy: { soldAt: "desc" },
        take,
      }),
    );

    return NextResponse.json({ sales: sales.map(serializeBookSale) });
  } catch (error) {
    console.error("Failed to load book sales", error);
    return NextResponse.json(
      { message: "Не удалось загрузить продажи" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch (error) {
    console.error("Invalid book sale payload", error);
    return NextResponse.json(
      { message: "Некорректный формат данных" },
      { status: 400 },
    );
  }

  const bookId = String(payload.bookId ?? "").trim();
  const rawQuantity = Number(payload.quantity);
  const quantity = Number.isFinite(rawQuantity) ? Math.floor(rawQuantity) : NaN;
  const salePriceRaw = Number(payload.salePrice);

  if (!bookId) {
    return NextResponse.json(
      { message: "Выберите книгу для продажи" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json(
      { message: "Введите корректное количество" },
      { status: 400 },
    );
  }

  const salePrice = Math.round(salePriceRaw * 100) / 100;
  if (!Number.isFinite(salePrice) || salePrice < 0) {
    return NextResponse.json(
      { message: "Введите корректную цену реализации" },
      { status: 400 },
    );
  }

  try {
    const result = await withBookInfrastructure(() =>
      prisma.$transaction(async (transaction) => {
        const book = await transaction.bookInventoryItem.findUnique({
          where: { id: bookId },
        });

        if (!book) {
          throw new HttpError(404, "Книга не найдена");
        }

        if (quantity > book.quantity) {
          throw new HttpError(
            400,
            `На складе доступно только ${book.quantity} экземпляров`,
          );
        }

        const salePriceDecimal = new Prisma.Decimal(salePrice.toFixed(2));
        const totalValue = Math.round(salePrice * quantity * 100) / 100;
        const totalDecimal = new Prisma.Decimal(totalValue.toFixed(2));

        const sale = await transaction.bookSale.create({
          data: {
            bookId: book.id,
            title: book.title,
            language: book.language,
            quantity,
            salePrice: salePriceDecimal,
            total: totalDecimal,
          },
        });

        const updatedBook = await transaction.bookInventoryItem.update({
          where: { id: book.id },
          data: {
            quantity: book.quantity - quantity,
          },
        });

        return { sale, updatedBook };
      }),
    );

    return NextResponse.json(
      {
        sale: serializeBookSale(result.sale),
        book: serializeBookInventoryItem(result.updatedBook),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma error while saving book sale", error);
    } else {
      console.error("Failed to save book sale", error);
    }

    return NextResponse.json(
      { message: "Не удалось сохранить продажу" },
      { status: 500 },
    );
  }
}
