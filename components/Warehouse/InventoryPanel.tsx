"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const STATUS_OPTIONS = ["На месте", "Взято", "Передано", "Потеряно"] as const;

type StatusOption = (typeof STATUS_OPTIONS)[number];

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

const DEFAULT_FORM_STATE: InventoryFormState = {
  name: "",
  category: "",
  location: "",
  price: "",
  holder: "",
  status: "На месте",
};

const InventoryPanel = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<InventoryFormState>(DEFAULT_FORM_STATE);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  const isEditMode = useMemo(() => editingItemId !== null, [editingItemId]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/warehouse/inventory");
      if (!response.ok) {
        throw new Error("Не удалось загрузить инвентарь");
      }
      const data = (await response.json()) as InventoryItem[];
      setItems(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const payload = {
      name: formState.name.trim(),
      category: formState.category.trim(),
      location: formState.location.trim(),
      price: formState.price ? Number(formState.price) : null,
      holder: formState.holder.trim() || null,
      status: formState.status,
    };

    if (!payload.name || !payload.category || !payload.location) {
      setError("Пожалуйста, заполните обязательные поля");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = isEditMode
        ? `/api/warehouse/inventory/${editingItemId}`
        : "/api/warehouse/inventory";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.error ?? "Не удалось сохранить запись";
        throw new Error(message);
      }

      closeModal();
      await fetchInventory();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm("Удалить запись из инвентаря?");
    if (!confirmDelete) return;

    setError(null);
    try {
      const response = await fetch(`/api/warehouse/inventory/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.error ?? "Не удалось удалить запись";
        throw new Error(message);
      }
      await fetchInventory();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Инвентарь</h2>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          Добавить
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm dark:border-slate-700">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Название
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Категория
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Местоположение
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Стоимость
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Кто отвечает
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Статус
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-300">
                  Загрузка...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-300">
                  Нет данных об инвентаре
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-100">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{item.category}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{item.location}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {item.price != null ? item.price.toLocaleString("ru-RU", { style: "currency", currency: "RUB" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{item.holder ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{item.status}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Редактировать
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40"
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

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {isEditMode ? "Редактировать запись" : "Добавить запись"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Название</label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Категория</label>
                <input
                  type="text"
                  value={formState.category}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, category: event.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Местоположение</label>
                <input
                  type="text"
                  value={formState.location}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, location: event.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Стоимость</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.price}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, price: event.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Кто отвечает</label>
                <input
                  type="text"
                  value={formState.holder}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, holder: event.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Статус</label>
                <select
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, status: event.target.value as StatusOption }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  disabled={isSubmitting}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default InventoryPanel;
