/**
 * db/index.js — Database client selector
 *
 * Reads SERVER_MODE from env and returns the correct DB client.
 *   local  → Prisma ORM talking to local SQLite (dev.db)
 *   cloud  → Cloudflare D1 HTTP client
 *
 * All controllers import from here instead of directly from prisma.js,
 * so swapping the backend requires zero controller changes.
 */

const MODE = process.env.SERVER_MODE;

if (MODE === 'cloud') {
  module.exports = require('./d1Client');
} else {
  module.exports = require('./prisma');
}
