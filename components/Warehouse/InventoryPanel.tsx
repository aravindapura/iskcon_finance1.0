"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type InventoryItem = {
  id: number;
  name: string;
  category: string;
  location: string;
  price: number | null;
  holder: string | null;
  status: StatusOption | string;
};

type InventoryFormState = {
  name: string;
  category: string;
  location: string;
  price: string;
  holder: string;
  status: StatusOption;
};

type ToastTone = "success" | "error";

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
};

type StatusOption = (typeof STATUS_OPTIONS)[number];

const STATUS_OPTIONS = ["На месте", "Взято", "Передано", "Потеряно"] as const;

const DEFAULT_FORM_STATE: InventoryFormState = {
  name: "",
  category: "",
  location: "",
  price: "",
  holder: "",
  status: "На месте",
};

const BUTTON_BASE =
  "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
const BUTTON_SM_BASE =
  "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const PRIMARY_BUTTON =
  `${BUTTON_BASE} bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 focus-visible:ring-indigo-500`;
const SECONDARY_BUTTON =
  `${BUTTON_BASE} border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:ring-indigo-500`;
const DANGER_BUTTON =
  `${BUTTON_SM_BASE} border border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50 focus-visible:ring-red-500`;
const MUTED_BUTTON =
  `${BUTTON_SM_BASE} border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 focus-visible:ring-indigo-500`;

const INPUT_CLASSES =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60";
const formatCurrency = (value: number | null) => {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const Toast = ({ toast, onClose }: { toast: ToastState; onClose: () => void }) => {
  const toneClasses =
    toast.tone === "success"
      ? "border-emerald-200 bg-white text-emerald-700"
      : "border-red-200 bg-white text-red-700";

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex max-w-sm flex-col gap-3">
      <div
        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ring-1 ring-slate-900/5 ${toneClasses}`}
      >
        <span className="text-base">{toast.tone === "success" ? "✓" : "⚠"}</span>
        <div className="flex-1 text-sm font-medium leading-5">{toast.message}</div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-slate-400 transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          aria-label="Закрыть уведомление"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

const InventoryPanel = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [listMessage, setListMessage] = useState<string>("Нет данных об инвентаре");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<InventoryFormState>(DEFAULT_FORM_STATE);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const isEditMode = useMemo(() => editingItemId !== null, [editingItemId]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message: string, tone: ToastTone = "error") => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/warehouse/inventory");
      if (!response.ok) {
        throw new Error("Не удалось загрузить инвентарь");
      }
      const data = (await response.json()) as InventoryItem[];
      setItems(data);
      setListMessage(data.length === 0 ? "Нет данных об инвентаре" : "");
    } catch (error) {
      console.error(error);
      setItems([]);
      setListMessage("Не удалось загрузить инвентарь");
      showToast(
        error instanceof Error ? error.message : "Произошла непредвиденная ошибка",
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItemId(null);
    setFormState(DEFAULT_FORM_STATE);
  };

  const openCreateModal = () => {
    setEditingItemId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setFormState({
      name: item.name ?? "",
      category: item.category ?? "",
      location: item.location ?? "",
      price: item.price != null ? String(item.price) : "",
      holder: item.holder ?? "",
      status: STATUS_OPTIONS.includes(item.status as StatusOption)
        ? (item.status as StatusOption)
        : "На месте",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = formState.name.trim();
    const category = formState.category.trim();
    const location = formState.location.trim();
    const holder = formState.holder.trim();
    const status = formState.status;

    if (!name || !category || !location) {
      showToast("Заполните обязательные поля");
      return;
    }

    let priceValue: number | null = null;
    if (formState.price.trim()) {
      priceValue = Number.parseFloat(formState.price.replace(",", "."));
      if (Number.isNaN(priceValue) || priceValue < 0) {
        showToast("Стоимость должна быть неотрицательным числом");
        return;
      }
    }

    const payload = {
      name,
      category,
      location,
      price: priceValue,
      holder: holder || null,
      status,
    };

    setIsSubmitting(true);

    try {
      const method = isEditMode ? "PUT" : "POST";
      const response = await fetch("/api/warehouse/inventory", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isEditMode ? { id: editingItemId, ...payload } : payload,
        ),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Не удалось сохранить запись");
      }

      closeModal();
      showToast(
        isEditMode ? "Запись обновлена" : "Запись добавлена",
        "success",
      );
      await fetchInventory();
    } catch (error) {
      console.error(error);
      showToast(
        error instanceof Error ? error.message : "Произошла непредвиденная ошибка",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm("Удалить запись?");
    if (!confirmDelete) return;

    try {
      const response = await fetch("/api/warehouse/inventory", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Не удалось удалить запись");
      }

      showToast("Запись удалена", "success");
      await fetchInventory();
    } catch (error) {
      console.error(error);
      showToast(
        error instanceof Error ? error.message : "Произошла непредвиденная ошибка",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Инвентарь</h2>
          <p className="mt-1 text-sm text-slate-500">
            Следите за расположением оборудования и ответственных лиц.
          </p>
        </div>
        <button type="button" onClick={openCreateModal} className={PRIMARY_BUTTON}>
          Добавить
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-lg shadow-slate-200/60 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="whitespace-nowrap px-4 py-3">Название</th>
                <th className="whitespace-nowrap px-4 py-3">Категория</th>
                <th className="whitespace-nowrap px-4 py-3">Местоположение</th>
                <th className="whitespace-nowrap px-4 py-3">Стоимость</th>
                <th className="whitespace-nowrap px-4 py-3">Кто отвечает</th>
                <th className="whitespace-nowrap px-4 py-3">Статус</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Загрузка...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    {listMessage}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.category}</td>
                    <td className="px-4 py-3 text-slate-600">{item.location}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-3 text-slate-600">{item.holder || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className={MUTED_BUTTON}
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className={DANGER_BUTTON}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {isEditMode ? "Редактировать запись" : "Добавить запись"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Заполните данные об оборудовании и ответственном лице.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                aria-label="Закрыть окно"
              >
                ✕
              </button>
            </div>

            <form className="grid max-h-[70vh] grid-cols-1 gap-5 overflow-y-auto pr-2 md:grid-cols-2" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Название
                </label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className={INPUT_CLASSES}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Категория
                </label>
                <input
                  type="text"
                  value={formState.category}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, category: event.target.value }))
                  }
                  className={INPUT_CLASSES}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Местоположение
                </label>
                <input
                  type="text"
                  value={formState.location}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, location: event.target.value }))
                  }
                  className={INPUT_CLASSES}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Стоимость
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.price}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, price: event.target.value }))
                  }
                  className={INPUT_CLASSES}
                  placeholder="Например, 1500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Кто отвечает
                </label>
                <input
                  type="text"
                  value={formState.holder}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, holder: event.target.value }))
                  }
                  className={INPUT_CLASSES}
                  placeholder="Имя ответственного"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Статус
                </label>
                <select
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      status: event.target.value as StatusOption,
                    }))
                  }
                  className={INPUT_CLASSES}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className={SECONDARY_BUTTON}
                  disabled={isSubmitting}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={PRIMARY_BUTTON}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? <Toast toast={toast} onClose={() => setToast(null)} /> : null}
    </div>
  );
};

export default InventoryPanel;
