import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@/lib/prisma";

const formatDateForQuery = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
};

type HolidayRecord = {
  title: string;
  description: string | null;
};

type TodayHolidayResponse = {
  date: string;
  holiday: HolidayRecord | null;
};

type ErrorResponse = {
  message: string;
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<TodayHolidayResponse | ErrorResponse>
) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res
      .status(405)
      .json({ message: "Метод не поддерживается для этого ресурса" });
  }

  const today = new Date();
  const formatted = formatDateForQuery(today);

  try {
    const rows = await prisma.$queryRaw<
      Array<{ title: string | null; description: string | null }>
    >`
      SELECT "title", "description"
      FROM "holidays"
      WHERE "date" = ${formatted}
      LIMIT 1
    `;

    const holidayRow = rows[0];

    const holiday =
      holidayRow && holidayRow.title
        ? {
            title: holidayRow.title,
            description: holidayRow.description ?? null
          }
        : null;

    return res.status(200).json({ date: formatted, holiday });
  } catch (error) {
    console.error("Failed to load holiday", error);
    return res
      .status(500)
      .json({ message: "Не удалось получить данные о празднике" });
  }
};

export default handler;
