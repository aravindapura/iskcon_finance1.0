"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import PageContainer from "@/components/PageContainer";

const categories = [
  { value: "kitchen", label: "Кухня" },
  { value: "music", label: "Музыкальные инструменты" },
  { value: "altar", label: "Алтарь" },
  { value: "other", label: "Прочие" },
];

const locationStatuses = [
  { value: "available", label: "На месте" },
  { value: "issued", label: "Выдано" },
  { value: "maintenance", label: "На обслуживании" },
  { value: "repair", label: "В ремонте" },
];

const bookLanguages = [
  { value: "russian", label: "Русский" },
  { value: "georgian", label: "Грузинский" },
  { value: "english", label: "Английский" },
];

type BookLanguageValue = (typeof bookLanguages)[number]["value"];

type InventoryRecord = {
  id: string;
  name: string;
  category: string;
  responsible: string;
  location: string;
  amount: number;
  createdAt: string;
};

type BookRecord = {
  id: string;
  title: string;
  language: BookLanguageValue | string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  debt: number;
  createdAt: string;
};

type SoldBookRecord = {
  id: string;
  bookId: string;
  title: string;
  language: BookLanguageValue | string;
  quantity: number;
  salePrice: number;
  total: number;
  soldAt: string;
};

type InventoryResponse = {
  items: InventoryRecord[];
};

type BookInventoryResponse = {
  items: BookRecord[];
};

type BookSalesResponse = {
  sales: SoldBookRecord[];
};

const cardClass =
  "rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70";
const listCardClass =
  "rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60";
const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-800/80";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white";
const badgeClass =
  "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300";

const WarehousePage = () => {
  const [activeTab, setActiveTab] = useState<"inventory" | "books" | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryRecord[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<InventoryRecord[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [shouldShowSuggestions, setShouldShowSuggestions] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [itemActionError, setItemActionError] = useState<string | null>(null);
  const [editResponsible, setEditResponsible] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const [bookItems, setBookItems] = useState<BookRecord[]>([]);
  const [isBookSubmitting, setIsBookSubmitting] = useState(false);
  const [bookFormError, setBookFormError] = useState<string | null>(null);
  const [bookFormSuccess, setBookFormSuccess] = useState<string | null>(null);
  const [soldBookItems, setSoldBookItems] = useState<SoldBookRecord[]>([]);
  const [isBookSaleSubmitting, setIsBookSaleSubmitting] = useState(false);
  const [bookSaleFormError, setBookSaleFormError] = useState<string | null>(null);
  const [bookSaleFormSuccess, setBookSaleFormSuccess] = useState<string | null>(null);
  const [saleBookId, setSaleBookId] = useState("");
  const [isBookCatalogLoading, setIsBookCatalogLoading] = useState(true);
  const [bookCatalogError, setBookCatalogError] = useState<string | null>(null);
  const [isBookSalesLoading, setIsBookSalesLoading] = useState(true);
  const [bookSalesError, setBookSalesError] = useState<string | null>(null);

  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const blurTimeoutRef = useRef<number | null>(null);

  const normalizeMoney = useCallback((value: number) => {
    if (!Number.isFinite(value) || value < 0) {
      return NaN;
    }

    return Math.round(value * 100) / 100;
  }, []);

  const trimmedQuery = searchQuery.trim();

  const categoryLabels = useMemo(
    () =>
      Object.fromEntries(
        categories.map(({ value, label }) => [value, label] as const),
      ),
    [],
  );

  const statusLabels = useMemo(
    () =>
      Object.fromEntries(
        locationStatuses.map(({ value, label }) => [value, label] as const),
      ),
    [],
  );

  const bookLanguageLabels = useMemo(
    () =>
      Object.fromEntries(
        bookLanguages.map(({ value, label }) => [value, label] as const),
      ),
    [],
  );

  const createdAtFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  const bookCurrencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const bookQuantityFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    [],
  );

  const totalBooksCount = useMemo(
    () => bookItems.reduce((sum, item) => sum + item.quantity, 0),
    [bookItems],
  );

  const totalSoldBooksCount = useMemo(
    () => soldBookItems.reduce((sum, item) => sum + item.quantity, 0),
    [soldBookItems],
  );

  const totalSoldRevenue = useMemo(
    () => soldBookItems.reduce((sum, item) => sum + item.total, 0),
    [soldBookItems],
  );

  const availableBooksForSale = useMemo(
    () => bookItems.filter((item) => item.quantity > 0),
    [bookItems],
  );

  const selectedBookForSale = useMemo(
    () =>
      saleBookId
        ? bookItems.find((item) => item.id === saleBookId) ?? null
        : null,
    [bookItems, saleBookId],
  );

  const selectedItem = useMemo(
    () => inventoryItems.find((item) => item.id === selectedItemId) ?? null,
    [inventoryItems, selectedItemId],
  );

  const clearBlurTimeout = useCallback(() => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }, []);

  const registerItemRef = useCallback((id: string, node: HTMLLIElement | null) => {
    if (node) {
      itemRefs.current.set(id, node);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  const upsertInventoryItem = useCallback((item: InventoryRecord) => {
    setInventoryItems((previous) => {
      const next = previous.filter((existing) => existing.id !== item.id);
      next.unshift(item);
      return next.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });
  }, []);

  const mergeInventoryItems = useCallback((items: InventoryRecord[]) => {
    setInventoryItems((previous) => {
      const merged = new Map<string, InventoryRecord>();
      items.forEach((item) => {
        merged.set(item.id, item);
      });
      previous.forEach((item) => {
        if (!merged.has(item.id)) {
          merged.set(item.id, item);
        }
      });

      return Array.from(merged.values()).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });
  }, []);

  const sortBookRecords = useCallback((items: BookRecord[]) => {
    return [...items].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, []);

  const sortSoldBookRecords = useCallback((items: SoldBookRecord[]) => {
    return [...items].sort(
      (a, b) =>
        new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime(),
    );
  }, []);

  const replaceBookItems = useCallback(
    (items: BookRecord[]) => {
      setBookItems(sortBookRecords(items));
    },
    [sortBookRecords],
  );

  const upsertBookItem = useCallback(
    (item: BookRecord) => {
      setBookItems((previous) => {
        const next = previous.filter((existing) => existing.id !== item.id);
        if (item.quantity > 0) {
          next.push(item);
        }
        return sortBookRecords(next);
      });
    },
    [sortBookRecords],
  );

  const replaceSoldBookItems = useCallback(
    (items: SoldBookRecord[]) => {
      setSoldBookItems(sortSoldBookRecords(items));
    },
    [sortSoldBookRecords],
  );

  const upsertSoldBookRecord = useCallback(
    (record: SoldBookRecord) => {
      setSoldBookItems((previous) => {
        const next = previous.filter((existing) => existing.id !== record.id);
        next.push(record);
        return sortSoldBookRecords(next);
      });
    },
    [sortSoldBookRecords],
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadInventory = async () => {
      try {
        setIsInventoryLoading(true);
        setInventoryError(null);
        const response = await fetch("/api/inventory?limit=50", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Не удалось загрузить инвентарь");
        }

        const data = (await response.json()) as InventoryResponse;
        mergeInventoryItems(data.items);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Inventory fetch failed", error);
        setInventoryError("Не удалось загрузить инвентарь");
      } finally {
        if (!controller.signal.aborted) {
          setIsInventoryLoading(false);
        }
      }
    };

    void loadInventory();

    return () => {
      controller.abort();
    };
  }, [mergeInventoryItems]);

  useEffect(() => {
    const controller = new AbortController();

    const loadBookCatalog = async () => {
      try {
        setIsBookCatalogLoading(true);
        setBookCatalogError(null);
        const response = await fetch("/api/books/inventory?limit=100", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Не удалось загрузить каталог книг");
        }

        const data = (await response.json()) as BookInventoryResponse;
        replaceBookItems(data.items);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Book catalog fetch failed", error);
        setBookCatalogError("Не удалось загрузить каталог книг");
      } finally {
        if (!controller.signal.aborted) {
          setIsBookCatalogLoading(false);
        }
      }
    };

    void loadBookCatalog();

    return () => {
      controller.abort();
    };
  }, [replaceBookItems]);

  useEffect(() => {
    const controller = new AbortController();

    const loadBookSales = async () => {
      try {
        setIsBookSalesLoading(true);
        setBookSalesError(null);
        const response = await fetch("/api/books/sales?limit=100", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Не удалось загрузить продажи книг");
        }

        const data = (await response.json()) as BookSalesResponse;
        replaceSoldBookItems(data.sales);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Book sales fetch failed", error);
        setBookSalesError("Не удалось загрузить продажи книг");
      } finally {
        if (!controller.signal.aborted) {
          setIsBookSalesLoading(false);
        }
      }
    };

    void loadBookSales();

    return () => {
      controller.abort();
    };
  }, [replaceSoldBookItems]);

  useEffect(() => {
    if (!trimmedQuery) {
      setDebouncedQuery("");
      setIsSearchLoading(false);
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [trimmedQuery]);

  useEffect(() => {
    if (!debouncedQuery) {
      return;
    }

    const controller = new AbortController();

    const search = async () => {
      try {
        setIsSearchLoading(true);
        setSearchError(null);
        const response = await fetch(
          `/api/inventory?q=${encodeURIComponent(debouncedQuery)}&limit=10`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Ошибка загрузки данных");
        }

        const data = (await response.json()) as InventoryResponse;
        setSearchResults(data.items);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Inventory search failed", error);
        setSearchError("Ошибка загрузки данных");
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchLoading(false);
        }
      }
    };

    void search();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  useEffect(() => {
    return () => {
      clearBlurTimeout();
    };
  }, [clearBlurTimeout]);

  useEffect(() => {
    if (activeTab !== "inventory") {
      setShouldShowSuggestions(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedItem) {
      setEditResponsible(selectedItem.responsible ?? "");
      setEditLocation(selectedItem.location ?? "");
      setEditAmount(selectedItem.amount.toFixed(2));
      setItemActionError(null);
    } else {
      setEditResponsible("");
      setEditLocation("");
      setEditAmount("");
      setItemActionError(null);
    }
  }, [selectedItem]);

  useEffect(() => {
    if (!bookFormSuccess) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setBookFormSuccess(null);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [bookFormSuccess]);

  useEffect(() => {
    if (!bookSaleFormSuccess) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setBookSaleFormSuccess(null);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [bookSaleFormSuccess]);

  useEffect(() => {
    if (!saleBookId) {
      return;
    }

    const isStillAvailable = availableBooksForSale.some(
      (item) => item.id === saleBookId,
    );

    if (!isStillAvailable) {
      setSaleBookId("");
    }
  }, [availableBooksForSale, saleBookId]);

  useEffect(() => {
    setBookSaleFormError(null);
  }, [saleBookId]);

  const handleSearchFocus = useCallback(() => {
    clearBlurTimeout();
    if (trimmedQuery) {
      setShouldShowSuggestions(true);
    }
  }, [clearBlurTimeout, trimmedQuery]);

  const handleSearchBlur = useCallback(() => {
    clearBlurTimeout();
    blurTimeoutRef.current = window.setTimeout(() => {
      setShouldShowSuggestions(false);
    }, 150);
  }, [clearBlurTimeout]);

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setSearchQuery(value);
      if (!value.trim()) {
        setSearchResults([]);
        setSearchError(null);
        setShouldShowSuggestions(false);
      } else {
        setShouldShowSuggestions(true);
      }
    },
    [],
  );

  const handleSelectSuggestion = useCallback(
    (item: InventoryRecord) => {
      clearBlurTimeout();
      setActiveTab("inventory");
      setSelectedItemId(item.id);
      setSearchQuery(item.name);
      setShouldShowSuggestions(false);
      setSearchResults([]);
      setSearchError(null);
      setItemActionError(null);

      upsertInventoryItem(item);

      window.requestAnimationFrame(() => {
        const node = itemRefs.current.get(item.id);
        node?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },
    [clearBlurTimeout, upsertInventoryItem],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("itemName") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const responsible = String(formData.get("responsible") ?? "").trim();
    const location = String(formData.get("location") ?? "").trim();
    const rawAmount = Number(formData.get("amount"));
    const amount = Number.isFinite(rawAmount) ? rawAmount : 0;

    if (!name) {
      setFormError("Укажите название предмета");
      return;
    }

    if (!category) {
      setFormError("Выберите категорию");
      return;
    }

    if (!location) {
      setFormError("Укажите статус");
      return;
    }

    if (!Number.isFinite(rawAmount) || amount < 0) {
      setFormError("Введите корректную сумму");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          responsible,
          location,
          amount,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "Не удалось сохранить запись");
      }

      const data = (await response.json()) as { item: InventoryRecord };
      const item = data.item;
      upsertInventoryItem(item);
      setSearchResults((previous) => [item, ...previous]);
      setSearchQuery("");
      setDebouncedQuery("");
      setShouldShowSuggestions(false);
      setSelectedItemId(item.id);
    } catch (error) {
      console.error("Inventory submit failed", error);
      setFormError(
        error instanceof Error ? error.message : "Не удалось сохранить запись",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isBookSubmitting) {
        return;
      }

      const form = event.currentTarget;
      const formData = new FormData(form);

      const title = String(formData.get("bookTitle") ?? "").trim();
      const languageValue = String(formData.get("bookLanguage") ?? "").trim();
      const quantityValue = Number(formData.get("bookQuantity"));
      const purchasePriceRaw = Number(formData.get("bookPurchasePrice"));
      const salePriceRaw = Number(formData.get("bookSalePrice"));
      const debtRaw = Number(formData.get("bookDebt"));

      if (!title) {
        setBookFormError("Укажите название книги");
        return;
      }

      const selectedLanguage = bookLanguages.find(
        (language) => language.value === languageValue,
      );

      if (!selectedLanguage) {
        setBookFormError("Выберите язык книги");
        return;
      }

      if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
        setBookFormError("Введите корректное количество");
        return;
      }

      const purchasePrice = normalizeMoney(purchasePriceRaw);

      if (Number.isNaN(purchasePrice)) {
        setBookFormError("Введите корректную цену закупки");
        return;
      }

      const salePrice = normalizeMoney(salePriceRaw);

      if (Number.isNaN(salePrice)) {
        setBookFormError("Введите корректную цену реализации");
        return;
      }

      const debt = normalizeMoney(debtRaw);

      if (Number.isNaN(debt)) {
        setBookFormError("Введите корректную сумму долга");
        return;
      }

      setIsBookSubmitting(true);
      setBookFormError(null);
      setBookFormSuccess(null);

      try {
        const response = await fetch("/api/books/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            language: selectedLanguage.value,
            quantity: Math.floor(quantityValue),
            purchasePrice,
            salePrice,
            debt,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message ?? "Не удалось сохранить книгу");
        }

        const data = (await response.json()) as { item: BookRecord };
        upsertBookItem(data.item);
        setBookFormSuccess("Книга добавлена в список");
        form.reset();
      } catch (error) {
        console.error("Book submit failed", error);
        setBookFormError(
          error instanceof Error ? error.message : "Не удалось сохранить книгу",
        );
      } finally {
        setIsBookSubmitting(false);
      }
    },
    [isBookSubmitting, normalizeMoney, upsertBookItem],
  );

  const handleBookSaleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isBookSaleSubmitting) {
        return;
      }

      const form = event.currentTarget;
      const formData = new FormData(form);

      const bookId = String(formData.get("saleBookId") ?? "").trim();
      const quantityString = String(formData.get("saleQuantity") ?? "").trim();
      const salePriceString = String(formData.get("salePrice") ?? "").trim();

      if (!bookId) {
        setBookSaleFormError("Выберите книгу для продажи");
        return;
      }

      const targetBook = bookItems.find((item) => item.id === bookId);

      if (!targetBook) {
        setBookSaleFormError("Не удалось найти книгу в списке");
        return;
      }

      const quantityValue = Number(quantityString);

      if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
        setBookSaleFormError("Введите корректное количество");
        return;
      }

      if (quantityValue > targetBook.quantity) {
        setBookSaleFormError(
          `На складе доступно только ${bookQuantityFormatter.format(targetBook.quantity)} экз.`,
        );
        return;
      }

      const salePriceCandidate = salePriceString
        ? Number(salePriceString)
        : targetBook.salePrice;
      const salePrice = normalizeMoney(salePriceCandidate);

      if (Number.isNaN(salePrice)) {
        setBookSaleFormError("Введите корректную цену реализации");
        return;
      }

      setIsBookSaleSubmitting(true);
      setBookSaleFormError(null);
      setBookSaleFormSuccess(null);

      try {
        const response = await fetch("/api/books/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId,
            quantity: Math.floor(quantityValue),
            salePrice,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message ?? "Не удалось сохранить продажу");
        }

        const data = (await response.json()) as {
          sale: SoldBookRecord;
          book: BookRecord;
        };

        upsertSoldBookRecord(data.sale);
        upsertBookItem(data.book);
        setBookSaleFormSuccess("Продажа зафиксирована");
        form.reset();
        setSaleBookId(data.book.quantity > 0 ? data.book.id : "");
      } catch (error) {
        console.error("Book sale submit failed", error);
        setBookSaleFormError(
          error instanceof Error
            ? error.message
            : "Не удалось сохранить продажу",
        );
      } finally {
        setIsBookSaleSubmitting(false);
      }
    },
    [
      bookItems,
      bookQuantityFormatter,
      isBookSaleSubmitting,
      normalizeMoney,
      upsertBookItem,
      upsertSoldBookRecord,
    ],
  );

  const handleUpdateSelectedItem = useCallback(async () => {
    if (!selectedItemId || !selectedItem) {
      setItemActionError("Выберите запись для изменения");
      return;
    }

    const normalizedResponsible = editResponsible.trim();
    const normalizedLocation = editLocation.trim();
    const normalizedAmountString = String(editAmount ?? "")
      .replace(/\s+/g, "")
      .replace(",", ".");
    const parsedAmount = Number(normalizedAmountString);

    if (!normalizedLocation) {
      setItemActionError("Укажите статус");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setItemActionError("Введите корректную сумму");
      return;
    }

    const roundedAmount = Math.round(parsedAmount * 100) / 100;
    const currentAmount = Math.round(selectedItem.amount * 100) / 100;

    if (
      normalizedResponsible === (selectedItem.responsible ?? "") &&
      normalizedLocation === selectedItem.location &&
      roundedAmount === currentAmount
    ) {
      setItemActionError("Изменений не обнаружено");
      return;
    }

    setIsUpdatingItem(true);
    setItemActionError(null);

    try {
      const response = await fetch(`/api/inventory/${selectedItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responsible: normalizedResponsible,
          location: normalizedLocation,
          amount: roundedAmount,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "Не удалось обновить запись");
      }

      const data = (await response.json()) as { item: InventoryRecord };
      const item = data.item;
      upsertInventoryItem(item);
      setSearchResults((previous) =>
        previous.map((existing) =>
          existing.id === item.id ? item : existing,
        ),
      );
      setEditResponsible(item.responsible ?? "");
      setEditLocation(item.location ?? "");
      setEditAmount(item.amount.toFixed(2));
      setSelectedItemId(item.id);
      setItemActionError(null);
    } catch (error) {
      console.error("Inventory update failed", error);
      setItemActionError(
        error instanceof Error
          ? error.message
          : "Не удалось обновить запись",
      );
    } finally {
      setIsUpdatingItem(false);
    }
  }, [
    editAmount,
    editLocation,
    editResponsible,
    selectedItem,
    selectedItemId,
    setSearchResults,
    upsertInventoryItem,
  ]);

  const handleDeleteSelectedItem = useCallback(async () => {
    if (!selectedItemId) {
      setItemActionError("Выберите запись для удаления");
      return;
    }

    setIsDeletingItem(true);
    setItemActionError(null);

    try {
      const response = await fetch(`/api/inventory/${selectedItemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "Не удалось удалить запись");
      }

      setInventoryItems((previous) =>
        previous.filter((item) => item.id !== selectedItemId),
      );
      setSearchResults((previous) =>
        previous.filter((item) => item.id !== selectedItemId),
      );
      setSelectedItemId((current) =>
        current === selectedItemId ? null : current,
      );
      setSearchQuery("");
      setDebouncedQuery("");
      setShouldShowSuggestions(false);
      setSearchError(null);
      setItemActionError(null);
    } catch (error) {
      console.error("Inventory delete failed", error);
      setItemActionError(
        error instanceof Error
          ? error.message
          : "Не удалось удалить запись",
      );
    } finally {
      setIsDeletingItem(false);
    }
  }, [
    selectedItemId,
    setSearchResults,
  ]);

  const showSuggestionsDropdown = shouldShowSuggestions && Boolean(trimmedQuery);
  const hasSearchResults = searchResults.length > 0;

  const handleExportPdf = () => {
    if (!inventoryItems.length) {
      return;
    }

    try {
      const pageWidth = 595;
      const pageHeight = 842;
      const margin = {
        top: 72,
        right: 40,
        bottom: 72,
        left: 40,
      };
      const contentWidth = pageWidth - margin.left - margin.right;
      const columns = [
        { key: "index" as const, label: "№", ratio: 0.06, align: "center" as CanvasTextAlign },
        { key: "name" as const, label: "Название", ratio: 0.26, align: "left" as CanvasTextAlign },
        { key: "category" as const, label: "Категория", ratio: 0.16, align: "left" as CanvasTextAlign },
        { key: "responsible" as const, label: "Ответственный", ratio: 0.18, align: "left" as CanvasTextAlign },
        { key: "location" as const, label: "Статус", ratio: 0.18, align: "left" as CanvasTextAlign },
        { key: "amount" as const, label: "Сумма", ratio: 0.16, align: "right" as CanvasTextAlign },
      ];
      const columnWidths = columns.map((column) => contentWidth * column.ratio);
      const scale = Math.min(3, Math.max(2, Math.round(window.devicePixelRatio || 1)));
      const fontFamily = '\"Inter\", \"Segoe UI\", \"Arial\", \"Helvetica\", sans-serif';
      const titleFontSize = 24;
      const metaFontSize = 12;
      const headerFontSize = 11;
      const bodyFontSize = 11;
      const lineHeight = 16;
      const cellPaddingX = 8;
      const cellPaddingY = 8;
      const zebraColor = "#F8FAFC";
      const borderColor = "#E2E8F0";
      const headerBackground = "#E2E8F0";
      const exportDate = new Intl.DateTimeFormat("ru-RU", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date());
      const currencyFormatter = new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const totalAmount = inventoryItems.reduce((sum, item) => sum + item.amount, 0);

      type PageImage = {
        data: Uint8Array;
        pdfWidth: number;
        pdfHeight: number;
        pixelWidth: number;
        pixelHeight: number;
      };

      const decodeBase64 = (base64: string) => {
        const binary = atob(base64);
        const length = binary.length;
        const bytes = new Uint8Array(length);

        for (let i = 0; i < length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
      };

      const pages: PageImage[] = [];
      let canvas: HTMLCanvasElement;
      let ctx: CanvasRenderingContext2D;
      let cursorY = margin.top;

      const createCanvas = () => {
        const nextCanvas = document.createElement("canvas");
        nextCanvas.width = pageWidth * scale;
        nextCanvas.height = pageHeight * scale;

        const context = nextCanvas.getContext("2d");
        if (!context) {
          throw new Error("Canvas API недоступна в этом браузере");
        }

        context.scale(scale, scale);
        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, pageWidth, pageHeight);
        context.lineJoin = "round";

        return { canvas: nextCanvas, context };
      };

      const finalizePage = () => {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        const base64 = dataUrl.split(",")[1];

        if (!base64) {
          return;
        }

        pages.push({
          data: decodeBase64(base64),
          pdfWidth: pageWidth,
          pdfHeight: pageHeight,
          pixelWidth: canvas.width,
          pixelHeight: canvas.height,
        });
      };

      const drawHeader = () => {
        ctx.fillStyle = "#0F172A";
        ctx.font = `600 ${titleFontSize}px ${fontFamily}`;
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillText("Инвентарь", margin.left, cursorY);
        cursorY += titleFontSize + 10;

        ctx.fillStyle = "#475569";
        ctx.font = `400 ${metaFontSize}px ${fontFamily}`;
        const metaSpacing = metaFontSize + 6;
        ctx.fillText(`Дата экспорта: ${exportDate}`, margin.left, cursorY);
        cursorY += metaSpacing;
        ctx.fillText(`Всего позиций: ${inventoryItems.length}`, margin.left, cursorY);
        cursorY += metaSpacing;
        ctx.fillText(`Итоговая сумма: ${currencyFormatter.format(totalAmount)}`, margin.left, cursorY);
        cursorY += metaSpacing + 12;
      };

      const drawTableHeader = () => {
        const headerHeight = 28;
        ctx.fillStyle = headerBackground;
        ctx.fillRect(margin.left, cursorY, contentWidth, headerHeight);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(margin.left, cursorY, contentWidth, headerHeight);

        ctx.font = `600 ${headerFontSize}px ${fontFamily}`;
        ctx.fillStyle = "#0F172A";
        ctx.textBaseline = "middle";

        let cellX = margin.left;

        columns.forEach((column, columnIndex) => {
          const columnWidth = columnWidths[columnIndex];
          const textX =
            column.align === "right"
              ? cellX + columnWidth - cellPaddingX
              : column.align === "center"
                ? cellX + columnWidth / 2
                : cellX + cellPaddingX;

          ctx.textAlign = column.align;
          ctx.fillText(column.label, textX, cursorY + headerHeight / 2);

          cellX += columnWidth;

          if (columnIndex < columns.length - 1) {
            ctx.beginPath();
            ctx.moveTo(cellX, cursorY);
            ctx.lineTo(cellX, cursorY + headerHeight);
            ctx.stroke();
          }
        });

        cursorY += headerHeight;
      };

      const startPage = () => {
        const { canvas: nextCanvas, context } = createCanvas();
        canvas = nextCanvas;
        ctx = context;
        cursorY = margin.top;

        drawHeader();
        drawTableHeader();
      };

      const wrapText = (text: string, maxWidth: number) => {
        if (!text) {
          return [""];
        }

        const words = text.trim().split(/\s+/);
        if (!words.length) {
          return [""];
        }

        const lines: string[] = [];
        let currentLine = "";

        const pushCurrentLine = () => {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = "";
          }
        };

        const splitWord = (word: string) => {
          let segment = "";
          for (const char of word) {
            const tentative = segment + char;
            if (ctx.measureText(tentative).width > maxWidth && segment) {
              lines.push(segment);
              segment = char;
            } else {
              segment = tentative;
            }
          }

          if (segment) {
            currentLine = segment;
          }
        };

        for (const word of words) {
          const tentative = currentLine ? `${currentLine} ${word}` : word;
          if (ctx.measureText(tentative).width <= maxWidth) {
            currentLine = tentative;
            continue;
          }

          pushCurrentLine();
          splitWord(word);
        }

        if (currentLine) {
          lines.push(currentLine);
        }

        return lines.length ? lines : [""];
      };

      startPage();

      inventoryItems.forEach((item, itemIndex) => {
        ctx.font = `400 ${bodyFontSize}px ${fontFamily}`;
        ctx.fillStyle = "#1E293B";
        ctx.textBaseline = "top";

        const cells = columns.map((column, columnIndex) => {
          let value: string;

          switch (column.key) {
            case "index":
              value = String(itemIndex + 1);
              break;
            case "name":
              value = item.name || "Без названия";
              break;
            case "category":
              value = categoryLabels[item.category] ?? item.category;
              break;
            case "responsible":
              value = item.responsible || "Не указан";
              break;
            case "location":
              value = statusLabels[item.location] ?? item.location;
              break;
            case "amount":
              value = currencyFormatter.format(item.amount);
              break;
            default:
              value = "";
          }

          const availableWidth = Math.max(10, columnWidths[columnIndex] - cellPaddingX * 2);
          const textLines =
            column.key === "amount" || column.align === "center"
              ? [value]
              : wrapText(value, availableWidth);

          return {
            lines: textLines,
            align: column.align,
          };
        });

        const rowLineCount = Math.max(
          ...cells.map((cell) => Math.max(cell.lines.length, 1)),
        );
        const rowHeight = Math.max(rowLineCount * lineHeight + cellPaddingY * 2, lineHeight + cellPaddingY * 2);

        if (cursorY + rowHeight > pageHeight - margin.bottom) {
          finalizePage();
          startPage();
          ctx.font = `400 ${bodyFontSize}px ${fontFamily}`;
          ctx.fillStyle = "#1E293B";
          ctx.textBaseline = "top";
        }

        const rowTop = cursorY;

        if (itemIndex % 2 === 1) {
          ctx.fillStyle = zebraColor;
          ctx.fillRect(margin.left, rowTop, contentWidth, rowHeight);
        }

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(margin.left, rowTop, contentWidth, rowHeight);

        let cellX = margin.left;

        cells.forEach((cell, columnIndex) => {
          const columnWidth = columnWidths[columnIndex];

          if (columnIndex < columns.length - 1) {
            ctx.beginPath();
            ctx.moveTo(cellX + columnWidth, rowTop);
            ctx.lineTo(cellX + columnWidth, rowTop + rowHeight);
            ctx.stroke();
          }

          ctx.fillStyle = "#1E293B";
          ctx.textAlign = cell.align;

          const textX =
            cell.align === "right"
              ? cellX + columnWidth - cellPaddingX
              : cell.align === "center"
                ? cellX + columnWidth / 2
                : cellX + cellPaddingX;

          let textY = rowTop + cellPaddingY;

          cell.lines.forEach((line) => {
            ctx.fillText(line, textX, textY);
            textY += lineHeight;
          });

          cellX += columnWidth;
        });

        cursorY += rowHeight;
      });

      finalizePage();

      if (!pages.length) {
        throw new Error("Не удалось подготовить данные для PDF");
      }

      const encoder = new TextEncoder();
      const pdfChunks: ArrayBuffer[] = [];
      let currentLength = 0;

      const appendChunk = (chunk: Uint8Array) => {
        const chunkLength = chunk.length;
        const copy = new Uint8Array(chunkLength);
        copy.set(chunk);
        const buffer = copy.buffer.slice(0);
        pdfChunks.push(buffer);
        currentLength += chunkLength;
      };

      const appendString = (value: string) => {
        appendChunk(encoder.encode(value));
      };

      appendString("%PDF-1.4\n");

      const totalObjects = 2 + pages.length * 3;
      const offsets = new Array<number>(totalObjects + 1).fill(0);

      const beginObject = (objectNumber: number) => {
        offsets[objectNumber] = currentLength;
        appendString(`${objectNumber} 0 obj\n`);
      };

      const endObject = () => {
        appendString("endobj\n");
      };

      beginObject(1);
      appendString("<< /Type /Catalog /Pages 2 0 R >>\n");
      endObject();

      const kidReferences = pages
        .map((_, index) => `${3 + index} 0 R`)
        .join(" ");

      beginObject(2);
      appendString(`<< /Type /Pages /Count ${pages.length} /Kids [${kidReferences}] >>\n`);
      endObject();

      pages.forEach((page, index) => {
        const pageObjectNumber = 3 + index;
        const contentObjectNumber = 3 + pages.length + index;
        const imageObjectNumber = 3 + pages.length * 2 + index;
        const imageName = `/Im${index + 1}`;

        beginObject(pageObjectNumber);
        appendString(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.pdfWidth} ${page.pdfHeight}] /Resources << /XObject << ${imageName} ${imageObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>\n`,
        );
        endObject();

        const contentStream = `q\n${page.pdfWidth} 0 0 ${page.pdfHeight} 0 0 cm\n${imageName} Do\nQ\n`;
        beginObject(contentObjectNumber);
        appendString(`<< /Length ${encoder.encode(contentStream).length} >>\nstream\n`);
        appendString(contentStream);
        appendString("endstream\n");
        endObject();

        beginObject(imageObjectNumber);
        appendString(
          `<< /Type /XObject /Subtype /Image /Width ${page.pixelWidth} /Height ${page.pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.data.length} >>\nstream\n`,
        );
        appendChunk(page.data);
        appendString("\nendstream\n");
        endObject();
      });

      const xrefStart = currentLength;
      appendString(`xref\n0 ${totalObjects + 1}\n`);
      appendString("0000000000 65535 f \n");
      for (let i = 1; i <= totalObjects; i += 1) {
        appendString(`${offsets[i].toString().padStart(10, "0")} 00000 n \n`);
      }

      appendString(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\n`);
      appendString(`startxref\n${xrefStart}\n%%EOF`);

      const pdfBlob = new Blob(pdfChunks, { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(pdfBlob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "inventory.pdf";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 10_000);
    } catch (error) {
      console.error("Не удалось экспортировать PDF", error);
    }
  };
  return (
    <PageContainer activeTab="warehouse">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-1 border-b border-slate-200 pb-4 dark:border-slate-700">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Склад</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Управляйте инвентарём и книжным фондом в одном месте.
          </p>
        </header>

        <nav className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
              activeTab === "inventory"
                ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-900"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
            }`}
          >
            Инвентарь
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("books")}
            className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
              activeTab === "books"
                ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-900"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
            }`}
          >
            Книги
          </button>
        </nav>

        <div className="mt-6 space-y-8">
          {activeTab === null && (
            <div className={`${cardClass} text-center text-sm text-slate-600 dark:text-slate-300`}>
              Выберите раздел, чтобы начать работу.
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="space-y-8">
              <section className={cardClass}>
                <div className="space-y-4">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
                      Поиск по инвентарю
                    </span>
                    <div className="relative">
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={handleSearchFocus}
                        onBlur={handleSearchBlur}
                        placeholder="Название, категория или ответственный"
                        className={inputClass}
                      />
                      {showSuggestionsDropdown && (
                        <div className="absolute inset-x-0 top-full z-10 mt-2 rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                          {isSearchLoading ? (
                            <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-300">Поиск...</p>
                          ) : hasSearchResults ? (
                            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                              {searchResults.map((item) => (
                                <li key={item.id}>
                                  <button
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => handleSelectSuggestion(item)}
                                    className="flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-700"
                                  >
                                    <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      {categoryLabels[item.category] ?? item.category} · {item.responsible || "без ответственного"}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-300">Ничего не найдено</p>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                  {searchError && (
                    <p className="text-sm text-rose-500 dark:text-rose-300">{searchError}</p>
                  )}
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <header>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Добавить предмет</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Укажите основные параметры и сохраните запись.
                      </p>
                    </header>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                        <span className="font-medium text-slate-700 dark:text-slate-200">Название</span>
                        <input
                          type="text"
                          name="itemName"
                          placeholder="Например, миксер"
                          required
                          className={inputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-200">Категория</span>
                        <select
                          name="category"
                          required
                          defaultValue=""
                          className={inputClass}
                        >
                          <option value="" disabled>
                            Выберите категорию
                          </option>
                          {categories.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-200">Статус</span>
                        <select
                          name="location"
                          required
                          defaultValue=""
                          className={inputClass}
                        >
                          <option value="" disabled>
                            Выберите статус
                          </option>
                          {locationStatuses.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-200">Ответственный</span>
                        <input
                          type="text"
                          name="responsible"
                          placeholder="Введите имя"
                          className={inputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-200">Сумма, ₽</span>
                        <input
                          type="number"
                          name="amount"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          placeholder="0.00"
                          required
                          className={inputClass}
                        />
                      </label>
                    </div>

                    {formError && (
                      <p className="text-sm text-rose-500 dark:text-rose-300">{formError}</p>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button type="reset" className={secondaryButtonClass}>
                        Очистить
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={primaryButtonClass}
                      >
                        {isSubmitting ? "Сохранение..." : "Добавить"}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">Выбранная запись</h2>
                    {selectedItem ? (
                      <>
                        <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">
                          <p className="font-semibold text-slate-800 dark:text-white">{selectedItem.name}</p>
                          <p>Категория: {categoryLabels[selectedItem.category] ?? selectedItem.category}</p>
                          <p>Добавлено: {createdAtFormatter.format(new Date(selectedItem.createdAt))}</p>
                        </div>
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="font-medium text-slate-700 dark:text-slate-200">Ответственный</span>
                          <input
                            type="text"
                            value={editResponsible}
                            onChange={(event) => setEditResponsible(event.target.value)}
                            className={inputClass}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="font-medium text-slate-700 dark:text-slate-200">Статус</span>
                          <select
                            value={editLocation}
                            onChange={(event) => setEditLocation(event.target.value)}
                            className={inputClass}
                          >
                            <option value="" disabled>
                              Выберите статус
                            </option>
                            {locationStatuses.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="font-medium text-slate-700 dark:text-slate-200">Сумма, ₽</span>
                          <input
                            type="text"
                            value={editAmount}
                            onChange={(event) => setEditAmount(event.target.value)}
                            className={inputClass}
                          />
                        </label>
                        {itemActionError && (
                          <p className="text-sm text-rose-500 dark:text-rose-300">{itemActionError}</p>
                        )}
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={handleUpdateSelectedItem}
                            disabled={isUpdatingItem}
                            className={primaryButtonClass}
                          >
                            {isUpdatingItem ? "Сохранение..." : "Сохранить"}
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteSelectedItem}
                            disabled={isDeletingItem}
                            className={`${secondaryButtonClass} text-rose-600 hover:border-rose-400 hover:text-rose-700 dark:text-rose-300`}
                          >
                            {isDeletingItem ? "Удаление..." : "Удалить"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Выберите запись из списка, чтобы изменить данные.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Список инвентаря</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Последние записи отображаются выше.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {inventoryItems.length > 0 && (
                      <span className={badgeClass}>{inventoryItems.length} шт.</span>
                    )}
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      disabled={!inventoryItems.length || isInventoryLoading}
                      className={secondaryButtonClass}
                    >
                      Экспорт PDF
                    </button>
                  </div>
                </div>

                {isInventoryLoading ? (
                  <div className={`${cardClass} text-center text-sm text-slate-600 dark:text-slate-300`}>
                    Загружаем инвентарь...
                  </div>
                ) : inventoryError ? (
                  <div className={`${cardClass} text-center text-sm text-rose-600 dark:text-rose-200`}>
                    {inventoryError}
                  </div>
                ) : inventoryItems.length ? (
                  <div className={listCardClass}>
                    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                      {inventoryItems.map((item) => {
                        const isSelected = selectedItemId === item.id;
                        const createdAtLabel = createdAtFormatter.format(new Date(item.createdAt));
                        return (
                          <li key={item.id} ref={(node) => registerItemRef(item.id, node)}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItemId(item.id);
                                setActiveTab("inventory");
                                setShouldShowSuggestions(false);
                                setItemActionError(null);
                              }}
                              className={`flex w-full flex-col gap-1 px-4 py-3 text-left text-sm transition focus:outline-none ${
                                isSelected
                                  ? "bg-slate-50 text-slate-900 dark:bg-slate-800/80 dark:text-white"
                                  : "hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                                <span className="font-semibold">{item.name}</span>
                                <span className="text-sm text-slate-500 dark:text-slate-300">
                                  {item.amount.toLocaleString("ru-RU", {
                                    style: "currency",
                                    currency: "RUB",
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Категория: {categoryLabels[item.category] ?? item.category}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Ответственный: {item.responsible || "не указан"}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Статус: {statusLabels[item.location] ?? item.location}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">Добавлено: {createdAtLabel}</p>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <div className={`${cardClass} text-center text-sm text-slate-600 dark:text-slate-300`}>
                    Пока нет записей. Добавьте первую позицию через форму выше.
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "books" && (
            <div className="space-y-8">
              <section className="grid gap-4 sm:grid-cols-3">
                <div className={`${cardClass} py-4 text-sm`}>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Всего книг</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                    {bookQuantityFormatter.format(totalBooksCount)}
                  </p>
                </div>
                <div className={`${cardClass} py-4 text-sm`}>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Продано</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                    {bookQuantityFormatter.format(totalSoldBooksCount)}
                  </p>
                </div>
                <div className={`${cardClass} py-4 text-sm`}>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Выручка</p>
                  <p className="mt-2 text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                    {bookCurrencyFormatter.format(totalSoldRevenue)}
                  </p>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <form onSubmit={handleBookSubmit} className={cardClass}>
                  <header className="mb-4">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Добавление книги</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Заполните поля и сохраните карточку.</p>
                  </header>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                      <span className="font-medium text-slate-700 dark:text-slate-200">Название</span>
                      <input
                        type="text"
                        name="bookTitle"
                        placeholder="Например, Бхагавад-гита"
                        required
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">Язык</span>
                      <select
                        name="bookLanguage"
                        required
                        defaultValue=""
                        className={inputClass}
                      >
                        <option value="" disabled>
                          Выберите язык
                        </option>
                        {bookLanguages.map((language) => (
                          <option key={language.value} value={language.value}>
                            {language.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">Количество</span>
                      <input
                        type="number"
                        name="bookQuantity"
                        min="1"
                        step="1"
                        placeholder="Например, 20"
                        required
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">Цена закупки</span>
                      <input
                        type="number"
                        name="bookPurchasePrice"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0.00"
                        required
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">Цена реализации</span>
                      <input
                        type="number"
                        name="bookSalePrice"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0.00"
                        required
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">Долг за книги</span>
                      <input
                        type="number"
                        name="bookDebt"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0.00"
                        required
                        className={inputClass}
                      />
                    </label>
                  </div>

                  {bookFormError && (
                    <p className="text-sm text-rose-500 dark:text-rose-300">{bookFormError}</p>
                  )}
                  {bookFormSuccess && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">{bookFormSuccess}</p>
                  )}

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isBookSubmitting}
                      className={primaryButtonClass}
                    >
                      {isBookSubmitting ? "Сохранение..." : "Добавить книгу"}
                    </button>
                  </div>
                </form>

                <form onSubmit={handleBookSaleSubmit} className={cardClass}>
                  <header className="mb-4">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Фиксация продажи</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Учтите выдачу и сумму реализации.</p>
                  </header>

                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Книга</span>
                    <select
                      name="saleBookId"
                      value={saleBookId}
                      onChange={(event) => setSaleBookId(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Выберите книгу</option>
                      {availableBooksForSale.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title} · {bookLanguageLabels[item.language] ?? item.language}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedBookForSale && (
                    <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">
                      Остаток: {bookQuantityFormatter.format(selectedBookForSale.quantity)} шт.
                    </p>
                  )}

                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Количество</span>
                    <input
                      type="number"
                      name="saleQuantity"
                      min="1"
                      step="1"
                      placeholder="1"
                      required
                      className={inputClass}
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Цена реализации</span>
                    <input
                      type="number"
                      name="salePrice"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      required
                      className={inputClass}
                    />
                  </label>

                  {bookSaleFormError && (
                    <p className="text-sm text-rose-500 dark:text-rose-300">{bookSaleFormError}</p>
                  )}
                  {bookSaleFormSuccess && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">{bookSaleFormSuccess}</p>
                  )}

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isBookSaleSubmitting}
                      className={primaryButtonClass}
                    >
                      {isBookSaleSubmitting ? "Сохранение..." : "Зафиксировать"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Каталог книг</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Всего: {bookQuantityFormatter.format(totalBooksCount)} шт.</p>
                </div>

                {isBookCatalogLoading ? (
                  <div className={`${cardClass} text-center text-sm text-slate-600 dark:text-slate-300`}>
                    Загрузка каталога...
                  </div>
                ) : bookCatalogError ? (
                  <div className={`${cardClass} text-center text-sm text-rose-500 dark:text-rose-300`}>
                    {bookCatalogError}
                  </div>
                ) : bookItems.length ? (
                  <div className={listCardClass}>
                    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                      {bookItems.map((item) => (
                        <li key={item.id} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                            <span className="font-semibold text-slate-900 dark:text-white">{item.title}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {createdAtFormatter.format(new Date(item.createdAt))}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {bookLanguageLabels[item.language] ?? item.language}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <span>В наличии: {bookQuantityFormatter.format(item.quantity)} шт.</span>
                            <span>Закупка: {bookCurrencyFormatter.format(item.purchasePrice)}</span>
                            <span>Реализация: {bookCurrencyFormatter.format(item.salePrice)}</span>
                            <span>Долг: {bookCurrencyFormatter.format(item.debt)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className={`${cardClass} text-center text-sm text-slate-600 dark:text-slate-300`}>
                    Каталог пуст. Добавьте первую книгу через форму выше.
                  </div>
                )}
              </section>

              <section className={cardClass}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Проданные книги</h3>
                  <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                    <p>Шт.: {bookQuantityFormatter.format(totalSoldBooksCount)}</p>
                    <p>Сумма: {bookCurrencyFormatter.format(totalSoldRevenue)}</p>
                  </div>
                </div>

                {isBookSalesLoading ? (
                  <div className="mt-4 rounded-md border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                    Загрузка продаж...
                  </div>
                ) : bookSalesError ? (
                  <div className="mt-4 rounded-md border border-slate-200 bg-white p-6 text-center text-sm text-rose-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-rose-300">
                    {bookSalesError}
                  </div>
                ) : soldBookItems.length ? (
                  <ul className="mt-4 space-y-3">
                    {soldBookItems.map((record) => (
                      <li
                        key={record.id}
                        className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                          <span className="font-semibold text-slate-900 dark:text-white">{record.title}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {createdAtFormatter.format(new Date(record.soldAt))}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Язык: {bookLanguageLabels[record.language] ?? record.language}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span>Количество: {bookQuantityFormatter.format(record.quantity)} шт.</span>
                          <span>Цена: {bookCurrencyFormatter.format(record.salePrice)}</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Выручка: {bookCurrencyFormatter.format(record.total)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4 rounded-md border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                    Продаж пока нет. Зафиксируйте первую сделку.
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default WarehousePage;
