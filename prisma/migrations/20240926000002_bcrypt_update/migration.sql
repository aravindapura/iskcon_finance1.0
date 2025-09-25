ALTER TABLE "users" RENAME COLUMN "username" TO "login";
ALTER TABLE "users" RENAME COLUMN "password_hash" TO "password";

ALTER INDEX IF EXISTS "users_username_key" RENAME TO "users_login_key";
