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
      const fontFamily = '"Inter", "Segoe UI", "Arial", "Helvetica", sans-serif';
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
      const pdfChunks: Uint8Array[] = [];
      let currentLength = 0;

      const appendChunk = (chunk: Uint8Array) => {
        pdfChunks.push(chunk);
        currentLength += chunk.length;
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
