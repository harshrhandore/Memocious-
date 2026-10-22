import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
async function loadAll() {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  await page.waitForTimeout(200);
}
await loadAll();
await page.screenshot({ path: "evidence/home-desktop.png", fullPage: true });
await page.screenshot({ path: "evidence/preview.png" });
await page.setViewportSize({ width: 390, height: 844 });
await loadAll();
await page.screenshot({ path: "evidence/home-mobile.png", fullPage: true });
const widths = [];
for (const width of [360, 390, 768, 1024, 1280, 1536]) {
  await page.setViewportSize({ width, height: 900 });
  widths.push({
    width,
    overflow: await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  });
}
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload({ waitUntil: "networkidle" });
await page.goto("http://localhost:3000/account", { waitUntil: "networkidle" });
const cached = await page.evaluate(async () => {
  const out = {};
  for (const name of await caches.keys()) {
    out[name] = (await (await caches.open(name)).keys()).map(
      (r) => new URL(r.url).pathname,
    );
  }
  return out;
});
await context.setOffline(true);
await page.goto("http://localhost:3000/shop");
const offline = await page.locator("body").innerText();
await context.setOffline(false);
const evidence = {
  date: new Date().toISOString(),
  browser: browser.version(),
  widths,
  errors,
  serviceWorkerCache: cached,
  offlineFallback: offline,
};
await writeFile(
  "evidence/browser-preview.json",
  JSON.stringify(evidence, null, 2),
);
console.log(JSON.stringify(evidence));
await browser.close();
