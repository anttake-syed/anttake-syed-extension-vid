-- Migration: add_app_settings
-- Run this against your Cloudflare D1 database to create the AppSettings table.
--
-- Via Wrangler CLI:
--   npx wrangler d1 execute <YOUR_DB_NAME> --remote --file=./prisma/migrations/add_app_settings/migration.sql
--
-- Via Cloudflare D1 Dashboard:
--   Workers & Pages > D1 > your database > Console > paste the SQL below

CREATE TABLE IF NOT EXISTS "AppSettings" (
  "id"                        TEXT     NOT NULL PRIMARY KEY DEFAULT 'global',
  "adminBypassEnabled"        BOOLEAN  NOT NULL DEFAULT 1,
  "adminDiagnosticsEnabled"   BOOLEAN  NOT NULL DEFAULT 1,
  "cloudSubscriptionRequired" BOOLEAN  NOT NULL DEFAULT 1,
  "selfHostedBillingRequired" BOOLEAN  NOT NULL DEFAULT 0,
  "updatedAt"                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
