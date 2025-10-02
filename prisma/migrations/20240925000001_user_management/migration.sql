CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "users" RENAME COLUMN "login" TO "username";
ALTER TABLE "users" RENAME COLUMN "password" TO "password_hash";

-- Столбец created_at уже существует, строка закомментирована
-- ALTER TABLE "users"
--   ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "users" SET "role" = 'admin' WHERE "role" = 'accountant';

ALTER INDEX IF EXISTS "users_login_key" RENAME TO "users_username_key";
