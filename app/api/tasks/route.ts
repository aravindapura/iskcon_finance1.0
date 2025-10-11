import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { serializeTask } from "@/lib/serializers";
import type { TaskStatus } from "@/lib/types";

const VALID_STATUSES: TaskStatus[] = ["pending", "in_progress", "completed"];

const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ");

const parseDeadline = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

type TaskInput = {
  title: string;
  description?: string;
  deadline: string;
  responsible: string;
  status?: TaskStatus;
  notify?: boolean;
  notifyBeforeMinutes?: number | null;
};

export const GET = async () => {
  const tasks = await prisma.task.findMany({
    orderBy: { due_date: "asc" }
  });

  return NextResponse.json(tasks.map(serializeTask));
};

export const POST = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => null)) as Partial<TaskInput> | null;

  if (!payload || typeof payload.title !== "string" || typeof payload.deadline !== "string") {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const title = normalizeText(payload.title);
  const responsible = typeof payload.responsible === "string" ? normalizeText(payload.responsible) : "";
  const description =
    typeof payload.description === "string" && payload.description.trim().length > 0
      ? payload.description.trim()
      : null;
  const deadline = parseDeadline(payload.deadline);

  if (!title) {
    return NextResponse.json({ error: "Укажите название задачи" }, { status: 400 });
  }

  if (!deadline) {
    return NextResponse.json({ error: "Укажите корректный дедлайн" }, { status: 400 });
  }

  if (!responsible) {
    return NextResponse.json({ error: "Укажите ответственного" }, { status: 400 });
  }

  const status = VALID_STATUSES.includes(payload.status ?? "pending") ? payload.status ?? "pending" : "pending";
  const notify = payload.notify === true;
  const rawNotifyBefore = notify ? payload.notifyBeforeMinutes ?? 0 : null;
  const notifyBefore =
    rawNotifyBefore === null ? null : Number.isFinite(Number(rawNotifyBefore)) ? Number(rawNotifyBefore) : null;

  if (notify && (notifyBefore === null || notifyBefore < 0)) {
    return NextResponse.json({ error: "Укажите корректное время напоминания" }, { status: 400 });
  }

  const created = await prisma.task.create({
    data: {
      id: crypto.randomUUID(),
      title,
      description,
      due_date: deadline,
      responsible,
      status,
      notify_enabled: notify,
      notify_before_minutes: notifyBefore !== null ? Math.round(notifyBefore) : null
    }
  });

  return NextResponse.json(serializeTask(created), { status: 201 });
};
