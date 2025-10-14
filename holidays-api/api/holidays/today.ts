import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Client } from 'pg';

const PORT = Number(process.env.PORT ?? 3000);
const { DATABASE_URL } = process.env;

const sendJson = (res: ServerResponse, statusCode: number, payload: Record<string, unknown>) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const formatToday = (): string => {
  const today = new Date();
  const day = `${today.getDate()}`.padStart(2, '0');
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const year = today.getFullYear();

  return `${day}.${month}.${year}`;
};

const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
  if (!DATABASE_URL) {
    sendJson(res, 500, { message: 'DATABASE_URL not configured.' });
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  if ((req.url ?? '/') !== '/' && (req.url ?? '').split('?')[0] !== '/today') {
    sendJson(res, 404, { message: 'Not found.' });
    return;
  }

  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();

    const formattedDate = formatToday();
    const query = 'SELECT date, title, description FROM holidays WHERE date = $1';
    const result = await client.query(query, [formattedDate]);

    if (result.rows.length > 0) {
      const holiday = result.rows[0];
      sendJson(res, 200, {
        date: holiday.date,
        title: holiday.title,
        description: holiday.description,
      });
    } else {
      sendJson(res, 200, { message: 'No holidays today.' });
    }
  } catch (error) {
    console.error('Database error:', error);
    sendJson(res, 500, { message: 'Internal server error.' });
  } finally {
    await client.end().catch(() => {
      // Ignore closing errors to avoid masking the main response.
    });
  }
};

const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error('Unexpected error:', error);
    sendJson(res, 500, { message: 'Internal server error.' });
  });
});

server.listen(PORT, () => {
  console.log(`Holiday API listening on port ${PORT}`);
});
