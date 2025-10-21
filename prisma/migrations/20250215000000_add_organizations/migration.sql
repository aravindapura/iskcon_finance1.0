-- DropIndex
DROP INDEX "categories_type_name_key";

-- AlterTable
ALTER TABLE "operations" ADD COLUMN     "organization_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "debts" ADD COLUMN     "organization_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "goals" ADD COLUMN     "organization_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "organization_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "organization_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "organization_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "book_inventory_items" ADD COLUMN     "organization_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "book_sales" ADD COLUMN     "organization_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "organization_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "organization_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "currency_rates" DROP CONSTRAINT "currency_rates_pkey",
ADD COLUMN     "organization_id" UUID NOT NULL,
ALTER COLUMN "currency" SET DATA TYPE VARCHAR(255),
ADD CONSTRAINT "currency_rates_pkey" PRIMARY KEY ("currency", "organization_id");

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_organizations" (
    "id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "is_owner" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,

    CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_organizations_user_id_organization_id_key" ON "user_organizations"("user_id", "organization_id");

-- CreateIndex
CREATE INDEX "operations_organization_id_idx" ON "operations"("organization_id");

-- CreateIndex
CREATE INDEX "debts_organization_id_idx" ON "debts"("organization_id");

-- CreateIndex
CREATE INDEX "categories_organization_id_idx" ON "categories"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_organization_id_type_name_key" ON "categories"("organization_id", "type", "name");

-- CreateIndex
CREATE INDEX "inventory_items_organization_id_idx" ON "inventory_items"("organization_id");

-- CreateIndex
CREATE INDEX "book_inventory_items_organization_id_idx" ON "book_inventory_items"("organization_id");

-- CreateIndex
CREATE INDEX "book_sales_organization_id_idx" ON "book_sales"("organization_id");

-- CreateIndex
CREATE INDEX "tasks_organization_id_idx" ON "tasks"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_organization_id_key" ON "settings"("organization_id");

-- AddForeignKey
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_inventory_items" ADD CONSTRAINT "book_inventory_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_sales" ADD CONSTRAINT "book_sales_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_rates" ADD CONSTRAINT "currency_rates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

