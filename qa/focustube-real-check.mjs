import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const extensionPath = path.join(root, "extension");
const outputDir = path.join(root, "output", "playwright");
const profileDir = process.env.YTSHO_PLAYWRIGHT_PROFILE ?? path.join(outputDir, "yt-search-only-profile");
const screenshotPath = path.join(outputDir, "youtube-search-only-home.png");
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

await fs.mkdir(outputDir, { recursive: true });

const context = await chromium.launchPersistentContext(profileDir, {
  executablePath: edgePath,
  headless: false,
  viewport: { width: 1440, height: 1000 },
  locale: "ru-RU",
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-blink-features=AutomationControlled"
  ]
});

const page = context.pages()[0] ?? (await context.newPage());
const consoleMessages = [];
page.on("console", (message) => {
  const text = message.text();
  if (text.toLowerCase().includes("ytsho") || text.toLowerCase().includes("error")) {
    consoleMessages.push({ type: message.type(), text });
  }
});
page.on("pageerror", (error) => {
  consoleMessages.push({ type: "pageerror", text: error.message });
});

await page.goto("https://www.youtube.com/", { waitUntil: "domcontentloaded", timeout: 45_000 });
await page.waitForTimeout(Number(process.env.YTSHO_QA_WAIT_MS ?? 8_000));

await page.mouse.wheel(0, 900);
await page.keyboard.press("PageDown");
await page.waitForTimeout(500);

const homeState = await page.evaluate(() => {
  const isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 1 && rect.height > 1;
  };

  const cards = [
    ...document.querySelectorAll("ytd-rich-item-renderer,ytd-rich-section-renderer,yt-lockup-view-model")
  ].filter(isVisible);
  const shorts = [
    ...document.querySelectorAll('a[href="/shorts"],a[href^="/shorts/"],a[href*="youtube.com/shorts/"]')
  ].filter(isVisible);

  return {
    url: location.href,
    title: document.title,
    homeMode: document.documentElement.classList.contains("ytsho-home-mode"),
    rootExists: Boolean(document.getElementById("ytsho-home-root")),
    visibleCardCount: cards.length,
    visibleShortsCount: shorts.length,
    scrollY: window.scrollY,
    accountVisible: Boolean(document.querySelector("#avatar-btn, button#avatar-btn, ytd-topbar-menu-button-renderer"))
  };
});

await page.goto("https://www.youtube.com/shorts/short001", { waitUntil: "domcontentloaded", timeout: 45_000 });
await page.waitForTimeout(1500);
const shortsRedirectUrl = page.url();

await page.screenshot({ path: screenshotPath, fullPage: false });
await context.close();

console.log(
  JSON.stringify(
    {
      homeState,
      shortsRedirectUrl,
      consoleMessages,
      screenshotPath
    },
    null,
    2
  )
);
