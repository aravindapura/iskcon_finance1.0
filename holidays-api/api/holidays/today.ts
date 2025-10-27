import express from 'express';
import { Pool } from 'pg';

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get('/api/holidays/today', async (_req, res) => {
  try {
    const today = new Date().toLocaleDateString('ru-RU').replace(/\//g, '.');
    const { rows } = await pool.query('SELECT * FROM holidays WHERE date = $1', [today]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No holidays today.' });
    }

    const holiday = rows[0];

    return res.json({
      date: holiday.date,
      title: holiday.title,
      description: holiday.description ?? null,
    });
  } catch (error) {
    console.error('Failed to fetch today\'s holiday:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

export default router;
