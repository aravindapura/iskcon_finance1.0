import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodType, z } from 'zod';

import {
  createBook,
  createInventory,
  deleteBook,
  deleteInventory,
  getAllBooks,
  getAllInventory,
  spreadBook,
  updateBook,
  updateInventory,
} from '../services/warehouseService';

type WarehouseMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type InventoryPayload = {
  name: string;
  category: string;
  location: string;
  price?: number;
  holder?: string;
  status?: string;
};

type BookPayload = {
  title: string;
  language: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  paid: number;
  note?: string;
};

const inventorySchema = z.object<InventoryPayload>({
  name: z.string().min(1, 'Название обязательно'),
  category: z.string().min(1, 'Категория обязательна'),
  location: z.string().min(1, 'Локация обязательна'),
  price: z.number().nonnegative('Цена не может быть отрицательной').optional(),
  holder: z.string().min(1, 'Имя ответственного обязательно').optional(),
  status: z.string().min(1, 'Статус обязателен').optional(),
});

const inventoryUpdateSchema = inventorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Нужно указать хотя бы одно поле для обновления');

const bookSchema = z.object<BookPayload>({
  title: z.string().min(1, 'Название обязательно'),
  language: z.string().min(1, 'Язык обязателен'),
  quantity: z
    .number()
    .int('Количество должно быть целым числом')
    .nonnegative('Количество не может быть отрицательным'),
  purchasePrice: z.number().nonnegative('Цена закупки не может быть отрицательной'),
  salePrice: z.number().nonnegative('Цена продажи не может быть отрицательной'),
  paid: z.number().nonnegative('Оплаченная сумма не может быть отрицательной'),
  note: z.string().min(1, 'Комментарий не может быть пустым').optional(),
});

const bookUpdateSchema = bookSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Нужно указать хотя бы одно поле для обновления');

const idSchema = z.object<{ id: number }>({
  id: z
    .coerce
    .number()
    .int('Идентификатор должен быть целым числом')
    .positive('Идентификатор должен быть больше нуля'),
});

const spreadSchema = z.object<{ count: number }>({
  count: z.number().int('Количество должно быть целым числом').positive('Количество должно быть больше нуля'),
});

function jsonResponse(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

async function parseBody<T>(request: NextRequest, schema: ZodType<T>): Promise<T> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    throw new ZodError([{ path: [], message: 'Некорректный JSON' }]);
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    throw result.error;
  }

  return result.data;
}

function parseId(rawId: string | undefined): number {
  const result = idSchema.safeParse({ id: rawId });
  if (!result.success) {
    throw result.error;
  }
  return result.data.id;
}

function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonResponse(400, {
      error: 'Ошибка валидации',
      details: error.issues,
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    return jsonResponse(404, { error: 'Запись не найдена' });
  }

  if (error instanceof Error) {
    if (error.message === 'Книга не найдена') {
      return jsonResponse(404, { error: error.message });
    }
    if (error.message === 'Недостаточно книг') {
      return jsonResponse(400, { error: error.message });
    }
  }

  console.error('Warehouse route error:', error);
  return jsonResponse(500, { error: 'Внутренняя ошибка сервера' });
}

async function handleInventory(method: WarehouseMethod, request: NextRequest, segments: string[]) {
  try {
    if (segments.length === 1) {
      if (method === 'GET') {
        const items = await getAllInventory();
        return jsonResponse(200, items);
      }

      if (method === 'POST') {
        const data = await parseBody(request, inventorySchema);
        const created = await createInventory(data);
        return jsonResponse(201, created);
      }
    }

    if (segments.length === 2) {
      const id = parseId(segments[1]);

      if (method === 'PUT') {
        const data = await parseBody(request, inventoryUpdateSchema);
        const updated = await updateInventory(id, data);
        return jsonResponse(200, updated);
      }

      if (method === 'DELETE') {
        await deleteInventory(id);
        return jsonResponse(200, { success: true });
      }
    }

    return jsonResponse(404, { error: 'Маршрут не найден' });
  } catch (error) {
    return handleError(error);
  }
}

async function handleBooks(method: WarehouseMethod, request: NextRequest, segments: string[]) {
  try {
    if (segments.length === 1) {
      if (method === 'GET') {
        const books = await getAllBooks();
        return jsonResponse(200, books);
      }

      if (method === 'POST') {
        const data = await parseBody(request, bookSchema);
        const created = await createBook(data);
        return jsonResponse(201, created);
      }
    }

    if (segments.length === 2) {
      const id = parseId(segments[1]);

      if (method === 'PUT') {
        const data = await parseBody(request, bookUpdateSchema);
        const updated = await updateBook(id, data);
        return jsonResponse(200, updated);
      }

      if (method === 'DELETE') {
        await deleteBook(id);
        return jsonResponse(200, { success: true });
      }
    }

    if (segments.length === 3 && segments[2] === 'spread' && method === 'POST') {
      const id = parseId(segments[1]);
      const data = await parseBody(request, spreadSchema);
      const updated = await spreadBook(id, data.count);
      return jsonResponse(200, updated);
    }

    return jsonResponse(404, { error: 'Маршрут не найден' });
  } catch (error) {
    return handleError(error);
  }
}

export async function handleWarehouseRequest(
  method: WarehouseMethod,
  request: NextRequest,
  segments: string[]
) {
  const [resource] = segments;

  if (!resource) {
    return jsonResponse(404, { error: 'Маршрут не найден' });
  }

  if (resource === 'inventory') {
    return handleInventory(method, request, segments);
  }

  if (resource === 'books') {
    return handleBooks(method, request, segments);
  }

  return jsonResponse(404, { error: 'Маршрут не найден' });
}
