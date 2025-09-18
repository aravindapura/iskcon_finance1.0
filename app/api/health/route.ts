export const GET = () =>
  Response.json({ ok: true, time: new Date().toISOString() });
