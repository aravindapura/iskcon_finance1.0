import bcrypt from "bcrypt";
import { PrismaClient, Prisma } from "@prisma/client";
import seedData from "./seed-data.json" assert { type: "json" };

const prisma = new PrismaClient();

const normalizeWalletSlug = (value) => value.trim().toLowerCase().replace(/\s+/g, "-");

async function main() {
  const {
    users,
    organizations,
    memberships,
    categories,
    wallets,
    currencies,
    baseCurrency,
  } = seedData;

  const organizationIds = organizations.map(({ id }) => id);

  if (!organizationIds.length) {
    throw new Error("Seed data must include at least one organization");
  }

  const hashedUsers = await Promise.all(
    users.map(async ({ id, login, password, role }) => {
      const hash = await bcrypt.hash(password, 10);

      return { id, login, role, password: hash };
    })
  );

  await prisma.user.createMany({ data: hashedUsers, skipDuplicates: true });

  await prisma.organization.createMany({
    data: organizations.map(({ id, name }) => ({ id, name })),
    skipDuplicates: true,
  });

  if (memberships.length) {
    await prisma.userOrganization.createMany({
      data: memberships.map(({ userId, organizationId, role, isOwner = false }) => ({
        userId,
        organizationId,
        role,
        isOwner,
      })),
      skipDuplicates: true,
    });
  }

  const defaultOrganizationId = organizationIds[0];

  await prisma.category.createMany({
    data: [
      ...categories.income.map((name) => ({
        type: "income",
        name,
        organizationId: defaultOrganizationId,
      })),
      ...categories.expense.map((name) => ({
        type: "expense",
        name,
        organizationId: defaultOrganizationId,
      })),
    ],
    skipDuplicates: true,
  });

  await prisma.wallet.createMany({
    data: wallets.map(({ name, currency }) => ({
      wallet: normalizeWalletSlug(name),
      display_name: name,
      currency,
      organizationId: defaultOrganizationId,
    })),
    skipDuplicates: true,
  });

  await Promise.all(
    organizationIds.map((organizationId) =>
      prisma.settings.upsert({
        where: { organizationId },
        update: { base_currency: baseCurrency },
        create: { base_currency: baseCurrency, organizationId },
      })
    )
  );

  await Promise.all(
    organizationIds.flatMap((organizationId) =>
      currencies.map((currency) =>
        prisma.currencyRate.upsert({
          where: { currency_organizationId: { currency, organizationId } },
          update: { rate: new Prisma.Decimal(1) },
          create: { currency, rate: new Prisma.Decimal(1), organizationId },
        })
      )
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
