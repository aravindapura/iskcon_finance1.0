import { PrismaClient, Prisma } from "@prisma/client";
import seedData from "./seed-data.json" assert { type: "json" };

const prisma = new PrismaClient();

const normalizeWalletSlug = (value) => value.trim().toLowerCase().replace(/\s+/g, "-");

async function main() {
  const { users, categories, wallets, currencies, baseCurrency } = seedData;

  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;

  const hashedUsers = await Promise.all(
    users.map(async ({ id, username, password, role }) => {
      const [row] = await prisma.$queryRaw`SELECT crypt(${password}, gen_salt('bf', 12)) AS hash`;

      if (!row?.hash) {
        throw new Error(`Не удалось захешировать пароль для пользователя ${username}`);
      }

      return { id, username, role, passwordHash: row.hash };
    })
  );

  await prisma.user.createMany({ data: hashedUsers, skipDuplicates: true });

  await prisma.category.createMany({
    data: [
      ...categories.income.map((name) => ({ type: "income", name })),
      ...categories.expense.map((name) => ({ type: "expense", name })),
    ],
    skipDuplicates: true,
  });

  await prisma.wallet.createMany({
    data: wallets.map((displayName) => ({
      wallet: normalizeWalletSlug(displayName),
      display_name: displayName,
    })),
    skipDuplicates: true,
  });

  const existingSettings = await prisma.settings.findFirst({ orderBy: { id: "desc" } });

  if (!existingSettings) {
    await prisma.settings.create({ data: { base_currency: baseCurrency } });
  }

  await Promise.all(
    currencies.map((currency) =>
      prisma.currencyRate.upsert({
        where: { currency },
        update: { rate: 1 },
        create: { currency, rate: new Prisma.Decimal(1) },
      })
    )
  );
}

main()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
