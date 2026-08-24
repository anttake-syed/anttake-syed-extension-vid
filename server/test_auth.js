const express = require('express');
const requireAuth = require('./src/middleware/auth');
const app = express();

app.get('/test', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.listen(3002, () => console.log('Listening on 3002'));
