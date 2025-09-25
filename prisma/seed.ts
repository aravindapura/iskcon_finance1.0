import { PrismaClient, Prisma } from "@prisma/client";
import { hashPassword } from "../lib/password";
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

  const hashedUsers = await Promise.all(
    users.map(async ({ id, login, password, role }) => {
      const hash = await hashPassword(password);

      return { id, login, role, password: hash };
    })
  );

  await prisma.user.createMany({ data: hashedUsers, skipDuplicates: true });

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

  await Promise.all(
    currencies.map((currency) =>
      prisma.currencyRate.upsert({
        where: { currency },
        update: { rate: 1 },
        create: { currency, rate: new Prisma.Decimal(1) },
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
