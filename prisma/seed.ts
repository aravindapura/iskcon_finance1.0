import { PrismaClient, Prisma } from "@prisma/client";
import seedData from "./seed-data.json" assert { type: "json" };

const prisma = new PrismaClient();

const normalizeWalletSlug = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "-");

const main = async () => {
  const { users, categories, wallets, currencies, baseCurrency } = seedData as {
    users: Array<{ id: string; login: string; password: string; role: string }>;
    categories: { income: string[]; expense: string[] };
    wallets: string[];
    currencies: string[];
    baseCurrency: string;
  };

  await prisma.user.createMany({ data: users, skipDuplicates: true });

  await prisma.category.createMany({
    data: [
      ...categories.income.map((name) => ({ type: "income" as const, name })),
      ...categories.expense.map((name) => ({ type: "expense" as const, name })),
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

  const now = new Date();

  await Promise.all(
    currencies.map((currency) =>
      prisma.exchangeRate.upsert({
        where: {
          baseCurrency_targetCurrency: {
            baseCurrency: currency,
            targetCurrency: currency,
          },
        },
        update: { rate: new Prisma.Decimal(1), date: now },
        create: {
          baseCurrency: currency,
          targetCurrency: currency,
          rate: new Prisma.Decimal(1),
          date: now,
        },
      })
    )
  );
};

main()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
