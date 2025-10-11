import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { serializeTask } from "@/lib/serializers";
import type { TaskStatus } from "@/lib/types";
import { withTaskTable } from "@/lib/task-table";

const VALID_STATUSES: TaskStatus[] = ["pending", "in_progress", "completed"];

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : undefined;

const parseDeadline = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
};

type TaskUpdateInput = {
  title?: string;
  description?: string;
  deadline?: string;
  responsible?: string;
  status?: TaskStatus;
  notify?: boolean;
  notifyBeforeMinutes?: number | null;
};

export const PATCH = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => null)) as Partial<TaskUpdateInput> | null;

  if (!payload) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  let task;

  try {
    task = await withTaskTable(() => prisma.task.findUnique({ where: { id: params.id } }));
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить задачу" }, { status: 500 });
  }

  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if ("title" in payload) {
    const title = normalizeText(payload.title);

    if (!title) {
      return NextResponse.json({ error: "Укажите название задачи" }, { status: 400 });
    }

    data.title = title;
  }

  if ("description" in payload) {
    const description =
      typeof payload.description === "string" && payload.description.trim().length > 0
        ? payload.description.trim()
        : null;
    data.description = description;
  }

  if ("responsible" in payload) {
    const responsible = normalizeText(payload.responsible);

    if (!responsible) {
      return NextResponse.json({ error: "Укажите ответственного" }, { status: 400 });
    }

    data.responsible = responsible;
  }

  if ("deadline" in payload) {
    const deadline = parseDeadline(payload.deadline);

    if (!deadline) {
      return NextResponse.json({ error: "Укажите корректный дедлайн" }, { status: 400 });
    }

    data.due_date = deadline;
  }

  if ("status" in payload) {
    const status = payload.status;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
    }

    data.status = status;
  }

  let notifyEnabled = task.notify_enabled;

  if ("notify" in payload) {
    notifyEnabled = payload.notify === true;
    data.notify_enabled = notifyEnabled;

    if (!notifyEnabled) {
      data.notify_before_minutes = null;
    }
  }

  if ("notifyBeforeMinutes" in payload) {
    const notifyBefore = payload.notifyBeforeMinutes;

    if (notifyBefore == null) {
      data.notify_before_minutes = null;
    } else {
      const numericValue = Number(notifyBefore);

      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return NextResponse.json({ error: "Укажите корректное время напоминания" }, { status: 400 });
      }

      data.notify_before_minutes = Math.round(numericValue);

      if (!notifyEnabled) {
        data.notify_enabled = true;
        notifyEnabled = true;
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(serializeTask(task));
  }

  try {
    const updated = await withTaskTable(() =>
      prisma.task.update({ where: { id: params.id }, data })
    );

    return NextResponse.json(serializeTask(updated));
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить изменения" }, { status: 500 });
  }
};

export const DELETE = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  let task;

  try {
    task = await withTaskTable(() => prisma.task.findUnique({ where: { id: params.id } }));
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить задачу" }, { status: 500 });
  }

  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  try {
    await withTaskTable(() => prisma.task.delete({ where: { id: params.id } }));
  } catch {
    return NextResponse.json({ error: "Не удалось удалить задачу" }, { status: 500 });
  }

  return NextResponse.json(serializeTask(task));
};
