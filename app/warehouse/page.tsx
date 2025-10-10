"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";

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

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  responsible: string;
  location: string;
  amount: number;
};

const WarehousePage = () => {
  const [activeTab, setActiveTab] = useState<"inventory" | "warehouse" | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const createId = () => {
      if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
      }

      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };

    const rawAmount = Number(formData.get("amount"));

    const newItem: InventoryItem = {
      id: createId(),
      name: String(formData.get("itemName") ?? "").trim(),
      category: String(formData.get("category") ?? ""),
      responsible: String(formData.get("responsible") ?? "").trim(),
      location: String(formData.get("location") ?? ""),
      amount: Number.isFinite(rawAmount) ? rawAmount : 0,
    };

    if (!newItem.name) {
      return;
    }

    setInventoryItems((prev) => [...prev, newItem]);
    event.currentTarget.reset();
  };

  const handleExportPdf = async () => {
    if (!inventoryItems.length) {
      return;
    }

    try {
      const padLabel = (label: string) => `${label}:`;

      const lines = [
        "Инвентарь", 
        `Всего позиций: ${inventoryItems.length}`,
        "",
      ];

      inventoryItems.forEach((item, index) => {
        lines.push(`${index + 1}. ${item.name || "Без названия"}`);
        lines.push(`   ${padLabel("Категория")} ${categoryLabels[item.category] ?? item.category}`);
        lines.push(`   ${padLabel("Ответственный")} ${item.responsible || "не указан"}`);
        lines.push(`   ${padLabel("Статус")} ${statusLabels[item.location] ?? item.location}`);
        lines.push(
          `   ${padLabel("Сумма")} ${item.amount.toLocaleString("ru-RU", {
            style: "currency",
            currency: "RUB",
            minimumFractionDigits: 2,
          })}`,
        );
        lines.push("");
      });

      const encodePdfString = (value: string) => {
        const hex = Array.from(value)
          .map((char) => char.charCodeAt(0).toString(16).padStart(4, "0"))
          .join("");
        return `<feff${hex}>`;
      };

      const lineHeight = 18;
      const topOffset = 790;
      const bottomMargin = 60;
      const usableHeight = topOffset - bottomMargin;
      const maxLinesPerPage = Math.max(1, Math.floor(usableHeight / lineHeight));

      const chunkedLines: string[][] = [];
      for (let start = 0; start < lines.length; start += maxLinesPerPage) {
        chunkedLines.push(lines.slice(start, start + maxLinesPerPage));
      }

      const buildPageContent = (pageLines: string[]) => {
        const entries = [
          "BT",
          "/F1 14 Tf",
          `1 0 0 1 56 ${topOffset} Tm`,
          `${lineHeight} TL`,
        ];

        if (pageLines.length === 0) {
          entries.push(`${encodePdfString("")} Tj`);
        } else {
          entries.push(`${encodePdfString(pageLines[0])} Tj`);
        }

        for (let i = 1; i < pageLines.length; i += 1) {
          entries.push("T*");
          entries.push(`${encodePdfString(pageLines[i])} Tj`);
        }

        entries.push("ET");

        return `${entries.join("\n")}\n`;
      };

      const encoder = new TextEncoder();
      const pageContents = chunkedLines.map((pageLines) => buildPageContent(pageLines));
      const contentLengths = pageContents.map((content) => encoder.encode(content).length);

      const pageCount = pageContents.length || 1;
      const fontObjectNumber = 3 + pageCount;
      const firstContentObjectNumber = fontObjectNumber + 1;

      const pageObjects = new Array(pageCount).fill(null).map((_, index) => {
        const contentNumber = firstContentObjectNumber + index;
        return `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentNumber} 0 R >>`;
      });

      const kidReferences = pageObjects
        .map((_, index) => `${3 + index} 0 R`)
        .join(" ");

      const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        `<< /Type /Pages /Count ${pageCount} /Kids [${kidReferences}] >>`,
        ...pageObjects,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        ...pageContents.map(
          (content, index) =>
            `<< /Length ${contentLengths[index]} >>\nstream\n${content}endstream`,
        ),
      ];

      const pdfParts: string[] = [];
      const offsets: number[] = [0];
      let currentLength = 0;

      const append = (chunk: string) => {
        pdfParts.push(chunk);
        currentLength += encoder.encode(chunk).length;
      };

      append("%PDF-1.4\n");

      objects.forEach((object, index) => {
        offsets.push(currentLength);
        append(`${index + 1} 0 obj\n${object}\nendobj\n`);
      });

      const xrefStart = currentLength;
      append(`xref\n0 ${objects.length + 1}\n`);
      append("0000000000 65535 f \n");
      for (let i = 1; i <= objects.length; i += 1) {
        append(`${offsets[i].toString().padStart(10, "0")} 00000 n \n`);
      }

      append(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`);
      append(`startxref\n${xrefStart}\n%%EOF`);

      const pdfBlob = new Blob(pdfParts, { type: "application/pdf" });
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
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`group flex-1 rounded-2xl px-6 py-4 text-center text-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:max-w-[240px] ${
              activeTab === "inventory"
                ? "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-500"
                : "border border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            }`}
          >
            <span
              className={`block text-sm font-medium uppercase tracking-[0.2em] ${
                activeTab === "inventory"
                  ? "text-slate-300"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Вкладка
            </span>
            Инвентарь
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("warehouse")}
            className={`flex-1 rounded-2xl px-6 py-4 text-center text-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:max-w-[240px] ${
              activeTab === "warehouse"
                ? "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-500"
                : "border border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            }`}
          >
            Склад
          </button>
        </div>

        {activeTab === "inventory" ? (
          <form
            className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80"
            onSubmit={handleSubmit}
          >
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Добавление инвентаря</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Заполните карточку, чтобы зафиксировать новый предмет на складе.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Название предмета</span>
                <input
                  type="text"
                  name="itemName"
                  placeholder="Например, кухонный миксер"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Категория</span>
                <select
                  name="category"
                  required
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  defaultValue={categories[0]?.value}
                >
                  {categories.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ответственный</span>
                <input
                  type="text"
                  name="responsible"
                  placeholder="ФИО ответственного"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Где находится</span>
                <select
                  name="location"
                  required
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  defaultValue={locationStatuses[0]?.value}
                >
                  {locationStatuses.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Сумма, ₽</span>
                <input
                  type="number"
                  name="amount"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!inventoryItems.length}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
              >
                Экспорт PDF
              </button>
              <button
                type="reset"
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 sm:w-auto dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
              >
                Очистить форму
              </button>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 sm:w-auto"
              >
                Добавить в инвентарь
              </button>
            </div>

            {inventoryItems.length > 0 && (
              <div className="mt-10 space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Текущий инвентарь
                </h2>
                <ul className="space-y-3">
                  {inventoryItems.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>
                        <span>
                          Категория: {categoryLabels[item.category] ?? item.category}
                        </span>
                        <span>
                          Ответственный: {item.responsible || "не указан"}
                        </span>
                        <span>
                          Статус: {statusLabels[item.location] ?? item.location}
                        </span>
                        <span>
                          Сумма: {item.amount.toLocaleString("ru-RU", {
                            style: "currency",
                            currency: "RUB",
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        ) : activeTab === "warehouse" ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-100">Раздел «Склад»</h2>
            <p className="mt-3 text-sm leading-relaxed">
              Здесь появится управление складскими ячейками и движением запасов.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-10 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            <p className="text-sm">
              Выберите вкладку, чтобы продолжить работу со складом.
            </p>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default WarehousePage;
