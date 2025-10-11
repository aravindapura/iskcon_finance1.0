import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

const isMissingTableError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";

let ensurePromise: Promise<void> | null = null;

const ensureTasksTable = async () => {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "tasks" (
          "id" uuid PRIMARY KEY,
          "title" text NOT NULL,
          "description" text,
          "due_date" timestamptz NOT NULL,
          "responsible" text NOT NULL,
          "status" text NOT NULL DEFAULT 'pending',
          "notify_enabled" boolean NOT NULL DEFAULT false,
          "notify_before_minutes" integer,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now()
        )
      `);

      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "tasks_due_date_idx" ON "tasks" ("due_date" ASC)'
      );
    })()
      .catch((error) => {
        ensurePromise = null;
        throw error;
      });
  }

  return ensurePromise;
};

export const withTaskTable = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (isMissingTableError(error)) {
      await ensureTasksTable();

      return operation();
    }

    throw error;
  }
};
