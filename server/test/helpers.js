// Test helpers: swap the real DB client for an in-memory fake, and minimal
// Express req/res stand-ins. No network or database is touched.
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'src', 'db', 'index.js');

// Install `fakeDb` as the module returned by require('../db/index'), then
// (re)load `modulePath` so it picks the fake up.
function loadWithFakeDb(modulePath, fakeDb) {
  require.cache[DB_PATH] = { id: DB_PATH, filename: DB_PATH, loaded: true, exports: fakeDb };
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(resolved);
}

function mockRes() {
  const res = {
    statusCode: 200, body: undefined, headers: {}, cookies: {}, redirectedTo: null,
    status(code) { res.statusCode = code; return res; },
    send(body) { res.body = body; return res; },
    json(body) { res.body = body; return res; },
    redirect(url) { res.statusCode = 302; res.redirectedTo = url; return res; },
    cookie(name, value) { res.cookies[name] = value; },
    clearCookie() {},
  };
  return res;
}

module.exports = { loadWithFakeDb, mockRes };
