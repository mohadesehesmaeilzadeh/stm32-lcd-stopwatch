const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "assets", "images", "screenshot-latest.png");
const candidates = [
  process.env.PLAYWRIGHT_CHROME,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe"
].filter(Boolean);

function existingExecutable() {
  return candidates.find((file) => fs.existsSync(file));
}

(async () => {
  const executablePath = existingExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1
  });

  await page.goto(pathToFileURL(path.join(root, "index.html")).href, {
    waitUntil: "domcontentloaded"
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: output, fullPage: false });
  await browser.close();
  console.log(`Updated ${path.relative(root, output)}`);
})();
