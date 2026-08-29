-- Migration: add_role_to_user.sql
-- Adds the `role` column to the User table for admin authorization.
--
-- Apply to local SQLite:
--   sqlite3 server/prisma/dev.db < server/prisma/migrations/add_role_to_user.sql
--
-- Apply to Cloudflare D1 (via setup-d1.js or Cloudflare dashboard):
--   npx wrangler d1 execute antcapture-db --file=server/prisma/migrations/add_role_to_user.sql
--
-- This is safe to run on an existing database — ALTER TABLE ADD COLUMN
-- only adds the column if it doesn't already exist (tested with SQLite).

ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';
