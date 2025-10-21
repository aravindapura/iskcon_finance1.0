import express from "express";

import holidaysRouter from "./routes/holidays";

const app = express();

app.use(express.json());
app.use("/api", holidaysRouter);

const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

export default app;
