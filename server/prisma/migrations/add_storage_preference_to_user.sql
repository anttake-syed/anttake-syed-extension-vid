-- Migration: add_storage_preference_to_user.sql
-- Adds the `storagePreference` column to the User table.
-- This replaces the non-existent UserSettings model that was causing the crash:
--   "Cannot read properties of undefined (reading 'findUnique')"
--
-- Apply to local SQLite:
--   sqlite3 server/prisma/dev.db < server/prisma/migrations/add_storage_preference_to_user.sql
--
-- Apply to Cloudflare D1:
--   npx wrangler d1 execute antcapture-db --file=server/prisma/migrations/add_storage_preference_to_user.sql
--
-- Safe to run on existing databases (ADD COLUMN is idempotent in SQLite).

ALTER TABLE "User" ADD COLUMN "storagePreference" TEXT NOT NULL DEFAULT 'local';
