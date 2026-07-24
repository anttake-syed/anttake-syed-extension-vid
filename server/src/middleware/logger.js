module.exports = (req, res, next) => {
  if (req.url !== '/captures' && !req.url.startsWith('/captures/') && req.url !== '/stats') {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  }
  next();
};