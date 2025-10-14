import { Router } from "express";
import { Pool } from "pg";

const holidaysRouter = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const formatToday = () => {
  const now = new Date();
  const day = `${now.getDate()}`.padStart(2, "0");
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const year = now.getFullYear();

  return `${day}.${month}.${year}`;
};

holidaysRouter.get("/holidays/today", async (_req, res) => {
  if (!process.env.DATABASE_URL) {
    res.status(500).json({ message: "DATABASE_URL is not configured." });
    return;
  }

  try {
    const today = formatToday();
    const { rows } = await pool.query(
      "SELECT date, title, description FROM holidays WHERE date = $1",
      [today],
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "No holidays today." });
      return;
    }

    const holiday = rows[0];
    res.json({
      date: holiday.date,
      title: holiday.title,
      description: holiday.description,
    });
  } catch (error) {
    console.error("Error fetching holiday:", error);

    const message =
      error instanceof Error ? error.message : "Unknown database error";

    res.status(500).json({ error: message });
  }
});

export default holidaysRouter;
