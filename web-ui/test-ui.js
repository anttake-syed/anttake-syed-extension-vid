const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  await page.goto('http://localhost:5173');
  // Wait for load
  await new Promise(r => setTimeout(r, 2000));
  // Find "Sign in" or login
  // Since we don't know the exact auth flow, maybe we can't do this easily.
  await browser.close();
})();
