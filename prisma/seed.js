import { PrismaClient } from "@prisma/client";
import seedData from "./seed-data.json" assert { type: "json" };

const prisma = new PrismaClient();

const normalizeWalletSlug = (value) => value.trim().toLowerCase().replace(/\s+/g, "-");

async function main() {
  const { users, categories, wallets, currencies, baseCurrency } = seedData;

  await prisma.user.createMany({ data: users, skipDuplicates: true });

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

  const now = new Date();
  const pairs = currencies.flatMap((base) =>
    currencies
      .filter((target) => target !== base)
      .map((target) => ({ baseCurrency: base, targetCurrency: target }))
  );

  if (pairs.length > 0) {
    await prisma.$transaction(
      pairs.map(({ baseCurrency, targetCurrency }) =>
        prisma.exchangeRate.upsert({
          where: {
            baseCurrency_targetCurrency: { baseCurrency, targetCurrency },
          },
          update: { rate: 1, date: now },
          create: { baseCurrency, targetCurrency, rate: 1, date: now },
        })
      )
    );
  }
}

main()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
