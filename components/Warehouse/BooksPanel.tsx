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
  language: LanguageOption;
  quantity: string;
  purchasePrice: string;
  salePrice: string;
  paid: string;
  note: string;
};

type ToastTone = "success" | "error";

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
};

type LanguageOption = (typeof LANGUAGE_OPTIONS)[number];

const LANGUAGE_OPTIONS = ["Русский", "Английский", "Грузинский"] as const;

const DEFAULT_FORM_STATE: BookFormState = {
  title: "",
  language: "Русский",
  quantity: "",
  purchasePrice: "",
  salePrice: "",
  paid: "",
  note: "",
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
const ACCENT_BUTTON =
  `${BUTTON_SM_BASE} border border-amber-200 bg-white text-amber-600 shadow-sm hover:bg-amber-50 focus-visible:ring-amber-500`;

const INPUT_CLASSES =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60";
const TEXTAREA_CLASSES =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

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

const BooksPanel = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [listMessage, setListMessage] = useState<string>("Нет данных о книгах");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSpreadModalOpen, setIsSpreadModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpreading, setIsSpreading] = useState(false);
  const [formState, setFormState] = useState<BookFormState>(DEFAULT_FORM_STATE);
  const [spreadQuantity, setSpreadQuantity] = useState<string>("");
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [spreadBookId, setSpreadBookId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const isEditMode = useMemo(() => editingBookId !== null, [editingBookId]);

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

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/warehouse/books");
      if (!response.ok) {
        throw new Error("Не удалось загрузить книги");
      }
      const data = (await response.json()) as Book[];
      setBooks(data);
      setListMessage(data.length === 0 ? "Нет данных о книгах" : "");
    } catch (error) {
      console.error(error);
      setBooks([]);
      setListMessage("Не удалось загрузить книги");
      showToast(
        error instanceof Error ? error.message : "Произошла непредвиденная ошибка",
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

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
      language: (LANGUAGE_OPTIONS.includes(book.language as LanguageOption)
        ? (book.language as LanguageOption)
        : "Русский"),
      quantity: String(book.quantity),
      purchasePrice: String(book.purchasePrice ?? ""),
      salePrice: String(book.salePrice ?? ""),
      paid: String(book.paid ?? ""),
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

    const title = formState.title.trim();
    const language = formState.language;
    const quantity = Number.parseInt(formState.quantity, 10);
    const purchasePrice = Number.parseFloat(formState.purchasePrice.replace(",", "."));
    const salePrice = Number.parseFloat(formState.salePrice.replace(",", "."));
    const paid = Number.parseFloat(formState.paid.replace(",", "."));
    const note = formState.note.trim();

    if (!title) {
      showToast("Укажите название книги");
      return;
    }

    if (!language) {
      showToast("Выберите язык книги");
      return;
    }

    if (Number.isNaN(quantity) || quantity < 0) {
      showToast("Количество должно быть неотрицательным числом");
      return;
    }

    if (
      Number.isNaN(purchasePrice) ||
      Number.isNaN(salePrice) ||
      Number.isNaN(paid)
    ) {
      showToast("Проверьте денежные значения");
      return;
    }

    const payload = {
      title,
      language,
      quantity,
      purchasePrice,
      salePrice,
      paid,
      note: note || null,
    };

    setIsSubmitting(true);

    try {
      const method = isEditMode ? "PUT" : "POST";
      const response = await fetch("/api/warehouse/books", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isEditMode ? { id: editingBookId, ...payload } : payload,
        ),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Не удалось сохранить книгу");
      }

      closeModal();
      showToast(
        isEditMode ? "Книга обновлена" : "Книга добавлена",
        "success",
      );
      await fetchBooks();
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
    const confirmDelete = window.confirm("Удалить книгу?");
    if (!confirmDelete) return;

    try {
      const response = await fetch("/api/warehouse/books", {
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
        throw new Error(body?.error ?? "Не удалось удалить книгу");
      }

      showToast("Книга удалена", "success");
      await fetchBooks();
    } catch (error) {
      console.error(error);
      showToast(
        error instanceof Error ? error.message : "Произошла непредвиденная ошибка",
      );
    }
  };

  const handleSpreadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (spreadBookId == null) {
      showToast("Не выбрана книга для распространения");
      return;
    }

    const count = Number.parseInt(spreadQuantity, 10);
    if (Number.isNaN(count) || count <= 0) {
      showToast("Количество должно быть положительным числом");
      return;
    }

    setIsSpreading(true);

    try {
      const response = await fetch("/api/warehouse/books/spread", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: spreadBookId, count }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Не удалось распространить книгу");
      }

      closeSpreadModal();
      showToast("Количество обновлено", "success");
      await fetchBooks();
    } catch (error) {
      console.error(error);
      showToast(
        error instanceof Error ? error.message : "Произошла непредвиденная ошибка",
      );
    } finally {
      setIsSpreading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Книги</h2>
          <p className="mt-1 text-sm text-slate-500">
            Управляйте списком книг, отслеживайте остаток и распространение.
          </p>
        </div>
        <button type="button" onClick={openCreateModal} className={PRIMARY_BUTTON}>
          Добавить книгу
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-lg shadow-slate-200/60 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="whitespace-nowrap px-4 py-3">Название</th>
                <th className="whitespace-nowrap px-4 py-3">Язык</th>
                <th className="whitespace-nowrap px-4 py-3">Кол-во</th>
                <th className="whitespace-nowrap px-4 py-3">Цена закупочная</th>
                <th className="whitespace-nowrap px-4 py-3">Цена реализации</th>
                <th className="whitespace-nowrap px-4 py-3">Оплачено</th>
                <th className="whitespace-nowrap px-4 py-3">Остаток долга</th>
                <th className="whitespace-nowrap px-4 py-3">Примечание</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                    Загрузка...
                  </td>
                </tr>
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                    {listMessage}
                  </td>
                </tr>
              ) : (
                books.map((book) => {
                  const debt = book.quantity * book.purchasePrice - book.paid;
                  return (
                    <tr
                      key={book.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3 font-medium text-slate-700">{book.title}</td>
                      <td className="px-4 py-3 text-slate-600">{book.language}</td>
                      <td className="px-4 py-3 text-slate-600">{book.quantity}</td>
                      <td className="px-4 py-3 text-slate-600">{formatMoney(book.purchasePrice)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatMoney(book.salePrice)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatMoney(book.paid)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatMoney(debt)}</td>
                      <td className="px-4 py-3 text-slate-600">{book.note ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(book)}
                            className={MUTED_BUTTON}
                          >
                            Редактировать
                          </button>
                          <button
                            type="button"
                            onClick={() => openSpreadModal(book)}
                            className={ACCENT_BUTTON}
                          >
                            Распространить
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(book.id)}
                            className={DANGER_BUTTON}
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
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {isEditMode ? "Редактировать книгу" : "Добавить книгу"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Заполните информацию о книге и её стоимости.
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
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Название
                </label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className={INPUT_CLASSES}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Язык
                </label>
                <select
                  value={formState.language}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      language: event.target.value as LanguageOption,
                    }))
                  }
                  className={INPUT_CLASSES}
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Количество
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formState.quantity}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, quantity: event.target.value }))
                  }
                  className={INPUT_CLASSES}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Цена закупочная
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.purchasePrice}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      purchasePrice: event.target.value,
                    }))
                  }
                  className={INPUT_CLASSES}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Цена реализации
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.salePrice}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, salePrice: event.target.value }))
                  }
                  className={INPUT_CLASSES}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Оплачено
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.paid}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, paid: event.target.value }))
                  }
                  className={INPUT_CLASSES}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Примечание
                </label>
                <textarea
                  value={formState.note}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, note: event.target.value }))
                  }
                  rows={3}
                  className={TEXTAREA_CLASSES}
                  placeholder="Дополнительная информация"
                />
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

      {isSpreadModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Распространить книгу
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Укажите количество экземпляров, которые нужно списать со склада.
                </p>
              </div>
              <button
                type="button"
                onClick={closeSpreadModal}
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                aria-label="Закрыть окно"
              >
                ✕
              </button>
            </div>

            <form className="space-y-5" onSubmit={handleSpreadSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Количество
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={spreadQuantity}
                  onChange={(event) => setSpreadQuantity(event.target.value)}
                  className={INPUT_CLASSES}
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeSpreadModal}
                  className={SECONDARY_BUTTON}
                  disabled={isSpreading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={PRIMARY_BUTTON}
                  disabled={isSpreading}
                >
                  {isSpreading ? "Отправка..." : "Подтвердить"}
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

export default BooksPanel;
