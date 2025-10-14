import express from 'express';
import holidaysRouter from './holidays/today';

const app = express();

app.use(holidaysRouter);

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`Holiday API listening on port ${PORT}`);
});

export default app;
