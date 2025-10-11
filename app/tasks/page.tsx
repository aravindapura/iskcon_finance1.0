"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import useSWR from "swr";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import { useSession } from "@/components/SessionProvider";
import { fetcher, type FetcherError } from "@/lib/fetcher";
import type { Task, TaskStatus } from "@/lib/types";

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Запланирована",
  in_progress: "В работе",
  completed: "Завершена"
};

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const toLocalInputValue = (date: Date) => {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return copy.toISOString().slice(0, 16);
};

const defaultDeadlineInput = () => {
  const date = new Date();
  date.setHours(date.getHours() + 2, 0, 0, 0);

  return toLocalInputValue(date);
};

const formatMonthLabel = (date: Date) => {
  const label = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  return label.charAt(0).toUpperCase() + label.slice(1);
};

const TaskSchedulerContent = () => {
  const { user, refresh } = useSession();
  const canManage = (user?.role ?? "") === "admin";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [responsible, setResponsible] = useState("");
  const [deadline, setDeadline] = useState<string>(() => defaultDeadlineInput());
  const [notify, setNotify] = useState(false);
  const [notifyBefore, setNotifyBefore] = useState("60");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const {
    data: tasksData,
    error: tasksError,
    isLoading: tasksLoading,
    mutate: mutateTasks
  } = useSWR<Task[]>(user ? "/api/tasks" : null, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60000
  });

  useEffect(() => {
    if (tasksData) {
      setTasks(tasksData);
    }
  }, [tasksData]);

  useEffect(() => {
    if (!tasksError) {
      setError(null);
      return;
    }

    if ((tasksError as FetcherError).status === 401) {
      setError("Сессия истекла, войдите заново.");
      void refresh();
      return;
    }

    setError("Не удалось загрузить задачи");
  }, [tasksError, refresh]);

  if (!user) {
    return null;
  }

  const initialLoading = tasksLoading;
  const now = Date.now();
  const soonThreshold = 7 * 24 * 60 * 60 * 1000;

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort(
        (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      ),
    [tasks]
  );

  const activeTasks = useMemo(
    () => sortedTasks.filter((task) => task.status !== "completed"),
    [sortedTasks]
  );

  const completedTasks = useMemo(
    () => sortedTasks.filter((task) => task.status === "completed"),
    [sortedTasks]
  );

  const overdueTasks = useMemo(
    () =>
      activeTasks.filter((task) => new Date(task.deadline).getTime() < now),
    [activeTasks, now]
  );

  const upcomingTasks = useMemo(
    () =>
      activeTasks.filter((task) => {
        const due = new Date(task.deadline).getTime();

        return due >= now && due <= now + soonThreshold;
      }),
    [activeTasks, now, soonThreshold]
  );

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};

    sortedTasks.forEach((task) => {
      const key = formatDateKey(new Date(task.deadline));

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(task);
    });

    return map;
  }, [sortedTasks]);

  const calendarDays = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startOffset = (start.getDay() + 6) % 7;
    const endOffset = (end.getDay() + 6) % 7;
    const totalCells = startOffset + end.getDate() + (6 - endOffset);
    const cells = Math.max(totalCells, 42);
    const firstDay = new Date(start);
    firstDay.setDate(firstDay.getDate() - startOffset);
    const todayKey = formatDateKey(new Date());

    return Array.from({ length: cells }, (_, index) => {
      const date = new Date(firstDay);
      date.setDate(firstDay.getDate() + index);
      const key = formatDateKey(date);

      return {
        key,
        date,
        isCurrentMonth: date.getMonth() === currentMonth.getMonth(),
        isToday: key === todayKey
      };
    });
  }, [currentMonth]);

  const monthLabel = useMemo(() => formatMonthLabel(currentMonth), [currentMonth]);

  const dueFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "long",
        hour: "2-digit",
        minute: "2-digit"
      }),
    []
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
      }),
    []
  );

  const summaryCards = [
    {
      label: "Всего задач",
      value: tasks.length.toString()
    },
    {
      label: "Просрочено",
      value: overdueTasks.length.toString(),
      variant: overdueTasks.length > 0 ? "danger" : undefined
    },
    {
      label: "На неделю",
      value: upcomingTasks.length.toString()
    },
    {
      label: "Завершено",
      value: completedTasks.length.toString()
    }
  ];

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setResponsible("");
    setDeadline(defaultDeadlineInput());
    setNotify(false);
    setNotifyBefore("60");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!canManage) {
      setError("Недостаточно прав для добавления задач");
      return;
    }

    const sanitizedTitle = title.trim();
    const sanitizedResponsible = responsible.trim();
    const deadlineDate = new Date(deadline);

    if (!sanitizedTitle) {
      setError("Укажите название задачи");
      return;
    }

    if (Number.isNaN(deadlineDate.getTime())) {
      setError("Укажите корректный дедлайн");
      return;
    }

    if (!sanitizedResponsible) {
      setError("Укажите ответственного");
      return;
    }

    const payload: Record<string, unknown> = {
      title: sanitizedTitle,
      responsible: sanitizedResponsible,
      deadline: deadlineDate.toISOString(),
      notify
    };

    if (description.trim()) {
      payload.description = description.trim();
    }

    if (notify) {
      const notifyValue = Number(notifyBefore);

      if (!Number.isFinite(notifyValue) || notifyValue < 0) {
        setError("Укажите корректное время напоминания");
        return;
      }

      payload.notifyBeforeMinutes = Math.round(notifyValue);
    }

    setLoading(true);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => null)) as Task | { error?: string } | null;

      if (!response.ok || !data || ("error" in data && data.error)) {
        throw new Error((data as { error?: string } | null)?.error ?? "Не удалось создать задачу");
      }

      const created = data as Task;

      setTasks((current) =>
        [...current, created].sort(
          (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        )
      );
      setMessage("Задача добавлена");
      resetForm();
      void mutateTasks();
    } catch (submitError) {
      const message =
        submitError instanceof Error && submitError.message
          ? submitError.message
          : "Не удалось создать задачу";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    if (!canManage) {
      return;
    }

    setError(null);
    setMessage(null);
    setUpdatingId(taskId);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      const data = (await response.json().catch(() => null)) as Task | { error?: string } | null;

      if (!response.ok || !data || ("error" in data && data.error)) {
        throw new Error((data as { error?: string } | null)?.error ?? "Не удалось обновить задачу");
      }

      const updated = data as Task;
      setTasks((current) => current.map((item) => (item.id === taskId ? updated : item)));
      void mutateTasks();
    } catch (updateError) {
      const message =
        updateError instanceof Error && updateError.message
          ? updateError.message
          : "Не удалось обновить задачу";
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!canManage) {
      return;
    }

    setError(null);
    setMessage(null);
    setDeletingId(taskId);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });

      const data = (await response.json().catch(() => null)) as Task | { error?: string } | null;

      if (!response.ok || !data || ("error" in data && data.error)) {
        throw new Error((data as { error?: string } | null)?.error ?? "Не удалось удалить задачу");
      }

      setTasks((current) => current.filter((item) => item.id !== taskId));
      void mutateTasks();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error && deleteError.message
          ? deleteError.message
          : "Не удалось удалить задачу";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1));
  };

  const renderTaskStatusBadge = (task: Task) => (
    <span className="task-status-badge" data-status={task.status}>
      {STATUS_LABELS[task.status]}
    </span>
  );

  const renderDueHint = (task: Task) => {
    if (task.status === "completed") {
      return "Завершена";
    }

    const deadlineDate = new Date(task.deadline);
    const diffMs = deadlineDate.getTime() - now;

    if (diffMs < 0) {
      const overdueDays = Math.ceil(Math.abs(diffMs) / (24 * 60 * 60 * 1000));

      return `Просрочено на ${overdueDays} д.`;
    }

    if (diffMs <= 24 * 60 * 60 * 1000) {
      return "Срок сегодня";
    }

    const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

    return `Через ${daysLeft} д.`;
  };

  return (
    <PageContainer activeTab="tasks">
      <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <header style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Планировщик задач</h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Создавайте задачи, отслеживайте дедлайны и распределяйте ответственность по служениям.
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))"
          }}
        >
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="task-summary"
              data-variant={card.variant ?? "default"}
            >
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>

        {initialLoading ? (
          <p style={{ color: "var(--text-muted)" }}>Загружаем задачи...</p>
        ) : null}

        {error ? <p style={{ color: "var(--accent-danger)" }}>{error}</p> : null}
        {message ? <p style={{ color: "var(--accent-success)" }}>{message}</p> : null}

        {!canManage ? (
          <p style={{ color: "var(--text-muted)" }}>
            Вы вошли как наблюдатель — задачи доступны только для просмотра.
          </p>
        ) : null}

        {canManage ? (
          <form
            onSubmit={handleSubmit}
            className="task-form"
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Новая задача</h2>

            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
              }}
            >
              <label>
                <span>Название</span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Например, подготовить рассылку"
                  disabled={loading}
                />
              </label>

              <label>
                <span>Ответственный</span>
                <input
                  type="text"
                  value={responsible}
                  onChange={(event) => setResponsible(event.target.value)}
                  placeholder="Имя служителя"
                  disabled={loading}
                />
              </label>

              <label>
                <span>Дедлайн</span>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                  disabled={loading}
                  required
                />
              </label>
            </div>

            <label>
              <span>Описание</span>
              <textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Кратко опишите задачу"
                disabled={loading}
              />
            </label>

            <div className="task-notify">
              <label className="task-notify__toggle">
                <input
                  type="checkbox"
                  checked={notify}
                  onChange={(event) => setNotify(event.target.checked)}
                  disabled={loading}
                />
                <span>Включить напоминание</span>
              </label>

              {notify ? (
                <label className="task-notify__input">
                  <span>За сколько минут напомнить</span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={notifyBefore}
                    onChange={(event) => setNotifyBefore(event.target.value)}
                    disabled={loading}
                  />
                </label>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button type="submit" disabled={loading}>
                {loading ? "Добавляем..." : "Добавить задачу"}
              </button>
              <button
                type="button"
                data-variant="outline"
                onClick={resetForm}
                disabled={loading}
              >
                Очистить
              </button>
            </div>
          </form>
        ) : null}

        <div className="task-layout">
          <section className="task-calendar" data-variant="plain">
            <div className="task-calendar__header">
              <button
                type="button"
                data-variant="ghost"
                aria-label="Предыдущий месяц"
                onClick={goToPreviousMonth}
              >
                ←
              </button>
              <h2>{monthLabel}</h2>
              <button
                type="button"
                data-variant="ghost"
                aria-label="Следующий месяц"
                onClick={goToNextMonth}
              >
                →
              </button>
            </div>

            <div className="task-calendar__weekdays">
              {[
                "Пн",
                "Вт",
                "Ср",
                "Чт",
                "Пт",
                "Сб",
                "Вс"
              ].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="task-calendar__grid">
              {calendarDays.map((day) => {
                const dayTasks = tasksByDate[day.key] ?? [];

                return (
                  <div
                    key={day.key}
                    className="task-calendar__cell"
                    data-active={day.isCurrentMonth ? "true" : "false"}
                    data-today={day.isToday ? "true" : "false"}
                  >
                    <div className="task-calendar__cell-header">
                      <span>{day.date.getDate()}</span>
                      {dayTasks.length > 0 ? (
                        <span className="task-calendar__count">{dayTasks.length}</span>
                      ) : null}
                    </div>

                    <ul>
                      {dayTasks.slice(0, 3).map((task) => (
                        <li key={task.id}>
                          <span>{timeFormatter.format(new Date(task.deadline))}</span>
                          <span>{task.title}</span>
                        </li>
                      ))}
                      {dayTasks.length > 3 ? (
                        <li className="task-calendar__more">
                          + ещё {dayTasks.length - 3}
                        </li>
                      ) : null}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="task-list" data-variant="plain">
            <h2>Активные задачи</h2>
            {activeTasks.length === 0 ? (
              <p className="muted">Нет активных задач</p>
            ) : (
              <ul>
                {activeTasks.map((task) => {
                  const deadlineDate = new Date(task.deadline);

                  return (
                    <li key={task.id}>
                      <div className="task-list__main">
                        <div className="task-list__info">
                          <strong>{task.title}</strong>
                          <span>{renderDueHint(task)}</span>
                        </div>
                        {renderTaskStatusBadge(task)}
                      </div>

                      <div className="task-list__meta">
                        <span>Ответственный: {task.responsible}</span>
                        <span>Срок: {dueFormatter.format(deadlineDate)}</span>
                        <span>
                          {task.notify
                            ? `Напоминание за ${task.notifyBeforeMinutes ?? 0} мин.`
                            : "Без уведомления"}
                        </span>
                      </div>

                      <div className="task-list__controls">
                        <label>
                          <span>Статус</span>
                          <select
                            value={task.status}
                            onChange={(event) =>
                              handleStatusChange(task.id, event.target.value as TaskStatus)
                            }
                            disabled={!canManage || updatingId === task.id}
                          >
                            {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => (
                              <option key={status} value={status}>
                                {STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </label>

                        {canManage ? (
                          <button
                            type="button"
                            data-variant="danger"
                            onClick={() => handleDelete(task.id)}
                            disabled={deletingId === task.id}
                          >
                            {deletingId === task.id ? "Удаляем..." : "Удалить"}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {completedTasks.length > 0 ? (
              <div className="task-list__completed">
                <h3>Завершенные</h3>
                <ul>
                  {completedTasks.map((task) => (
                    <li key={task.id}>
                      <div>
                        <strong>{task.title}</strong>
                        <span className="muted">
                          Завершено {dueFormatter.format(new Date(task.deadline))}
                        </span>
                      </div>
                      <span>{task.responsible}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </PageContainer>
  );
};

const TaskSchedulerPage = () => (
  <AuthGate>
    <TaskSchedulerContent />
  </AuthGate>
);

export default TaskSchedulerPage;
