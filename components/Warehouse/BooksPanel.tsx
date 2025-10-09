"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Book = {
  id: number;
  title: string;
  language: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  paid: number;
  note: string | null;
};

type BookFormState = {
  title: string;
  language: string;
  quantity: string;
  purchasePrice: string;
  salePrice: string;
  paid: string;
  note: string;
};

const DEFAULT_FORM_STATE: BookFormState = {
  title: "",
  language: "",
  quantity: "",
  purchasePrice: "",
  salePrice: "",
  paid: "",
  note: "",
};

const formatMoney = (value: number) =>
  Number.isFinite(value) ? value.toFixed(2) : "0.00";

const BooksPanel = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSpreadModalOpen, setIsSpreadModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpreading, setIsSpreading] = useState(false);
  const [formState, setFormState] = useState<BookFormState>(DEFAULT_FORM_STATE);
  const [spreadQuantity, setSpreadQuantity] = useState<string>("");
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [spreadBookId, setSpreadBookId] = useState<number | null>(null);

  const isEditMode = useMemo(() => editingBookId !== null, [editingBookId]);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/warehouse/books");
      if (!response.ok) {
        throw new Error("Не удалось загрузить книги");
      }
      const data = (await response.json()) as Book[];
      setBooks(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBooks();
  }, [fetchBooks]);

  const closeModal = () => {
    setIsModalOpen(false);
    setFormState(DEFAULT_FORM_STATE);
    setEditingBookId(null);
  };

  const openCreateModal = () => {
    setEditingBookId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsModalOpen(true);
  };

  const openEditModal = (book: Book) => {
    setEditingBookId(book.id);
    setFormState({
      title: book.title,
      language: book.language,
      quantity: String(book.quantity),
      purchasePrice: book.purchasePrice != null ? String(book.purchasePrice) : "",
      salePrice: book.salePrice != null ? String(book.salePrice) : "",
      paid: book.paid != null ? String(book.paid) : "",
      note: book.note ?? "",
    });
    setIsModalOpen(true);
  };

  const openSpreadModal = (book: Book) => {
    setSpreadBookId(book.id);
    setSpreadQuantity("");
    setIsSpreadModalOpen(true);
  };

  const closeSpreadModal = () => {
    setIsSpreadModalOpen(false);
    setSpreadBookId(null);
    setSpreadQuantity("");
    setIsSpreading(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      title: formState.title.trim(),
      language: formState.language.trim(),
      quantity: Number.parseInt(formState.quantity, 10),
      purchasePrice: Number.parseFloat(formState.purchasePrice),
      salePrice: Number.parseFloat(formState.salePrice),
      paid: Number.parseFloat(formState.paid),
      note: formState.note.trim() || null,
    };

    if (!payload.title || !payload.language || Number.isNaN(payload.quantity)) {
      setError("Пожалуйста, заполните обязательные поля и корректное количество");
      return;
    }

    if (payload.quantity < 0) {
      setError("Количество не может быть отрицательным");
      return;
    }

    if (
      Number.isNaN(payload.purchasePrice) ||
      Number.isNaN(payload.salePrice) ||
      Number.isNaN(payload.paid)
    ) {
      setError("Пожалуйста, введите корректные суммы");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = isEditMode ? `/api/warehouse/books/${editingBookId}` : "/api/warehouse/books";
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
        const message = errorBody?.error ?? "Не удалось сохранить книгу";
        throw new Error(message);
      }

      closeModal();
      await fetchBooks();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm("Удалить книгу?");
    if (!confirmDelete) return;

    setError(null);
    try {
      const response = await fetch(`/api/warehouse/books/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.error ?? "Не удалось удалить книгу";
        throw new Error(message);
      }
      await fetchBooks();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    }
  };

  const handleSpreadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const count = Number.parseInt(spreadQuantity, 10);

    if (spreadBookId == null) {
      setError("Не выбрана книга для распространения");
      return;
    }

    if (Number.isNaN(count) || count <= 0) {
      setError("Введите корректное количество для распространения");
      return;
    }

    setIsSpreading(true);
    setError(null);

    try {
      const response = await fetch(`/api/warehouse/books/${spreadBookId}/spread`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ count }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.error ?? "Не удалось распространить книгу";
        throw new Error(message);
      }

      closeSpreadModal();
      await fetchBooks();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsSpreading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Книги</h2>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          Добавить книгу
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
                Язык
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Кол-во
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Цена закупочная
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Цена реализации
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Оплачено
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Остаток долга
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Примечание
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-300">
                  Загрузка...
                </td>
              </tr>
            ) : books.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-300">
                  Нет данных о книгах
                </td>
              </tr>
            ) : (
              books.map((book) => {
                const debt = book.quantity * book.purchasePrice - book.paid;
                return (
                  <tr key={book.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-100">{book.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{book.language}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{book.quantity}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{formatMoney(book.purchasePrice)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{formatMoney(book.salePrice)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{formatMoney(book.paid)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{formatMoney(debt)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{book.note ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(book)}
                          className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          onClick={() => openSpreadModal(book)}
                          className="rounded-md border border-amber-200 px-3 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
                        >
                          Распространить
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(book.id)}
                          className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40"
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {isEditMode ? "Редактировать книгу" : "Добавить книгу"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                ✕
              </button>
            </div>

            <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Название</label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Язык</label>
                <input
                  type="text"
                  value={formState.language}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, language: event.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Количество</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formState.quantity}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, quantity: event.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Цена закупочная</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.purchasePrice}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, purchasePrice: event.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Цена реализации</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.salePrice}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, salePrice: event.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Оплачено</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.paid}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, paid: event.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Примечание</label>
                <textarea
                  value={formState.note}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, note: event.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Дополнительная информация"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
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

      {isSpreadModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Распространить книгу</h3>
              <button
                type="button"
                onClick={closeSpreadModal}
                className="text-slate-400 transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSpreadSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Количество</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={spreadQuantity}
                  onChange={(event) => setSpreadQuantity(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeSpreadModal}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  disabled={isSpreading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                  disabled={isSpreading}
                >
                  {isSpreading ? "Отправка..." : "Подтвердить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BooksPanel;
