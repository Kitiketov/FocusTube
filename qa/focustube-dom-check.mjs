import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const fixturePath = path.join(root, "qa", "focustube-fixture.html");
const cssPath = path.join(root, "extension", "content.css");
const scriptPath = path.join(root, "extension", "content.js");
const popupHtmlPath = path.join(root, "extension", "popup.html");
const popupScriptPath = path.join(root, "extension", "popup.js");
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const fixture = await fs.readFile(fixturePath, "utf8");
const popupHtml = await fs.readFile(popupHtmlPath, "utf8");

const browser = await chromium.launch({ executablePath: await pathExists(edgePath) ? edgePath : undefined });

try {
  await checkHomeMode();
  await checkHomeSearchDisabled();
  await checkSettingsMode();
  await checkShortsLimitMode();
  await checkWatchRecommendationBlur();
  await checkNonHomePages();
  await checkShortsRedirect();
  await checkPopupSettings();
  console.log("FocusTube DOM checks passed");
} finally {
  await browser.close();
}

async function newFixturePage(url, settings = null, localState = null, setupPage = null) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.route("https://www.youtube.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: fixture
    })
  );
  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (setupPage) {
    await setupPage(page);
  }
  if (settings || localState) {
    await page.evaluate(
      ({ initialSettings, initialLocalState }) => {
        const listeners = [];
        const syncStore = { ...(initialSettings ?? {}) };
        const localStore = { ...(initialLocalState ?? {}) };
        const persist = () => {
          window.name = JSON.stringify({ syncStore, localStore });
        };
        const read = (store, keys) => {
          if (keys == null) {
            return { ...store };
          }
          if (Array.isArray(keys)) {
            return Object.fromEntries(keys.filter((key) => Object.hasOwn(store, key)).map((key) => [key, store[key]]));
          }
          if (typeof keys === "string") {
            return Object.hasOwn(store, keys) ? { [keys]: store[keys] } : {};
          }
          return { ...keys, ...Object.fromEntries(Object.keys(keys).filter((key) => Object.hasOwn(store, key)).map((key) => [key, store[key]])) };
        };
        const write = (store, areaName, items, callback) => {
          const changes = {};
          for (const [key, newValue] of Object.entries(items)) {
            changes[key] = { oldValue: store[key], newValue };
            store[key] = newValue;
          }
          for (const listener of listeners) {
            listener(changes, areaName);
          }
          persist();
          callback?.();
        };

        globalThis.__syncStore = syncStore;
        globalThis.__localStore = localStore;
        persist();
        globalThis.chrome = {
          storage: {
            sync: {
              get(keys, callback) {
                callback(read(syncStore, keys));
              },
              set(items, callback) {
                write(syncStore, "sync", items, callback);
              }
            },
            local: {
              get(keys, callback) {
                callback(read(localStore, keys));
              },
              set(items, callback) {
                write(localStore, "local", items, callback);
              }
            },
            onChanged: {
              addListener(callback) {
                listeners.push(callback);
              }
            }
          }
        };
      },
      { initialSettings: settings, initialLocalState: localState }
    );
  }
  await page.addStyleTag({ path: cssPath });
  await page.addScriptTag({ path: scriptPath });
  await page.waitForTimeout(250);
  return page;
}

async function checkHomeMode() {
  const page = await newFixturePage("https://www.youtube.com/");

  const state = await page.evaluate(() => {
    const visible = (selector) =>
      [...document.querySelectorAll(selector)].filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      }).length;

    return {
      homeMode: document.documentElement.classList.contains("ytsho-home-mode"),
      scrollLocked: document.documentElement.classList.contains("ytsho-scroll-locked"),
      rootExists: Boolean(document.getElementById("ytsho-home-root")),
      visibleFeedCards: visible("ytd-rich-item-renderer,ytd-rich-section-renderer,yt-lockup-view-model"),
      visibleShortsLinks: visible('a[href="/shorts"],a[href^="/shorts/"]'),
      mastheadVisible: visible("ytd-masthead") === 1,
      accountVisible: visible("#account-area") === 1,
      standardSearchVisible: visible("ytd-masthead #center #search-form") === 1,
      persistentGuideVisible: visible("ytd-app > ytd-guide-renderer") === 1,
      drawerGuideVisible: visible("tp-yt-app-drawer[opened] ytd-guide-renderer") === 1,
      miniGuideVisible: visible("ytd-mini-guide-renderer") === 1
    };
  });

  assert.equal(state.homeMode, true);
  assert.equal(state.scrollLocked, true);
  assert.equal(state.rootExists, true);
  assert.equal(state.visibleFeedCards, 0);
  assert.equal(state.visibleShortsLinks, 0);
  assert.equal(state.mastheadVisible, true);
  assert.equal(state.accountVisible, true);
  assert.equal(state.standardSearchVisible, true);
  assert.equal(state.persistentGuideVisible, false);
  assert.equal(state.drawerGuideVisible, false);
  assert.equal(state.miniGuideVisible, true);

  await page.click("#guide-button");
  await page.waitForTimeout(100);
  const blockedGuide = await page.evaluate(() => {
    const visible = (selector) =>
      [...document.querySelectorAll(selector)].filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      }).length;
    return {
      openAllowedClass: document.documentElement.classList.contains("ytsho-guide-open-allowed"),
      drawerGuideVisible: visible("tp-yt-app-drawer[opened] ytd-guide-renderer") === 1,
      visibleShortsLinks: visible('tp-yt-app-drawer a[href="/shorts"],tp-yt-app-drawer a[href^="/shorts/"]')
    };
  });
  assert.equal(blockedGuide.openAllowedClass, false);
  assert.equal(blockedGuide.drawerGuideVisible, false);
  assert.equal(blockedGuide.visibleShortsLinks, 0);

  await page.mouse.wheel(0, 900);
  await page.keyboard.press("PageDown");
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.scrollY), 0);

  await page.fill('ytd-masthead #center input[name="search_query"]', "linear algebra");
  await Promise.all([
    page.waitForURL("https://www.youtube.com/results?search_query=linear+algebra"),
    page.click("ytd-masthead #center #search-icon-legacy")
  ]);

  await page.close();
}

async function checkHomeSearchDisabled() {
  const page = await newFixturePage("https://www.youtube.com/", {
    homeSearchOnlyEnabled: false,
    shortsMode: "allowed"
  });

  const state = await page.evaluate(() => {
    const visible = (selector) =>
      [...document.querySelectorAll(selector)].filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      }).length;

    return {
      homeMode: document.documentElement.classList.contains("ytsho-home-mode"),
      scrollLocked: document.documentElement.classList.contains("ytsho-scroll-locked"),
      rootExists: Boolean(document.getElementById("ytsho-home-root")),
      visibleFeedCards: visible("ytd-rich-item-renderer,ytd-rich-section-renderer,yt-lockup-view-model")
    };
  });
  assert.equal(state.homeMode, false);
  assert.equal(state.scrollLocked, false);
  assert.equal(state.rootExists, false);
  assert.ok(state.visibleFeedCards > 0);

  await page.mouse.wheel(0, 900);
  await page.keyboard.press("PageDown");
  await page.waitForTimeout(100);
  assert.ok((await page.evaluate(() => window.scrollY)) > 0);
  await page.close();
}

async function checkSettingsMode() {
  const blockedShortsOpenGuidePage = await newFixturePage("https://www.youtube.com/", {
    shortsMode: "blocked",
    allowGuideOpen: true
  });
  await blockedShortsOpenGuidePage.click("#guide-button");
  await blockedShortsOpenGuidePage.waitForTimeout(100);
  const blockedShortsOpenGuideState = await blockedShortsOpenGuidePage.evaluate(() => {
    const visible = (selector) =>
      [...document.querySelectorAll(selector)].filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      }).length;

    return {
      openAllowedClass: document.documentElement.classList.contains("ytsho-guide-open-allowed"),
      drawerGuideVisible: visible("tp-yt-app-drawer[opened] ytd-guide-renderer") === 1,
      visibleShortsLinks: visible('tp-yt-app-drawer a[href="/shorts"],tp-yt-app-drawer a[href^="/shorts/"],tp-yt-app-drawer a[title="Shorts"],tp-yt-app-drawer a[aria-label="Shorts"]')
    };
  });
  assert.equal(blockedShortsOpenGuideState.openAllowedClass, true);
  assert.equal(blockedShortsOpenGuideState.drawerGuideVisible, true);
  assert.equal(blockedShortsOpenGuideState.visibleShortsLinks, 0);
  await blockedShortsOpenGuidePage.close();

  const page = await newFixturePage("https://www.youtube.com/", {
    shortsMode: "allowed",
    allowGuideOpen: true
  });

  const initialState = await page.evaluate(() => {
    const visible = (selector) =>
      [...document.querySelectorAll(selector)].filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      }).length;

    return {
      shortsClass: document.documentElement.classList.contains("ytsho-hide-shorts"),
      visibleShortsLinks: visible('a[href="/shorts"],a[href^="/shorts/"]'),
      drawerGuideVisible: visible("tp-yt-app-drawer[opened] ytd-guide-renderer") === 1
    };
  });
  assert.equal(initialState.shortsClass, false);
  assert.ok(initialState.visibleShortsLinks > 0);
  assert.equal(initialState.drawerGuideVisible, false);

  await page.click("#guide-button");
  await page.waitForTimeout(100);
  const openedState = await page.evaluate(() => {
    const visible = (selector) =>
      [...document.querySelectorAll(selector)].filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      }).length;

    return {
      openAllowedClass: document.documentElement.classList.contains("ytsho-guide-open-allowed"),
      drawerGuideVisible: visible("tp-yt-app-drawer[opened] ytd-guide-renderer") === 1
    };
  });
  assert.equal(openedState.openAllowedClass, true);
  assert.equal(openedState.drawerGuideVisible, true);

  await page.close();

  const shortsPage = await newFixturePage("https://www.youtube.com/shorts/short001", { shortsMode: "allowed" });
  assert.equal(shortsPage.url(), "https://www.youtube.com/shorts/short001");
  await shortsPage.close();

  const migratedAllowedPage = await newFixturePage("https://www.youtube.com/shorts/short001", { blockShorts: false });
  assert.equal(migratedAllowedPage.url(), "https://www.youtube.com/shorts/short001");
  assert.equal(await migratedAllowedPage.evaluate(() => globalThis.__syncStore.shortsMode), "allowed");
  await migratedAllowedPage.close();
}

async function checkShortsLimitMode() {
  const activePage = await newFixturePage(
    "https://www.youtube.com/shorts/short001",
    {
      shortsMode: "limited",
      shortsDailyLimitMinutes: 5,
      shortsBlockMode: "untilTomorrow"
    },
    {
      shortsUsageDate: getLocalDateKey(),
      shortsUsedMs: 0,
      shortsBlockedUntil: 0
    },
    forceFocusedDocument
  );
  await activePage.waitForTimeout(1200);
  const activeState = await activePage.evaluate(() => ({
    url: location.href,
    usedMs: globalThis.__localStore.shortsUsedMs,
    blockedUntil: globalThis.__localStore.shortsBlockedUntil
  }));
  assert.equal(activeState.url, "https://www.youtube.com/shorts/short001");
  assert.ok(activeState.usedMs >= 1000, "active visible Shorts page should count time");
  assert.equal(activeState.blockedUntil, 0);
  await activePage.close();

  const hiddenPage = await newFixturePage(
    "https://www.youtube.com/shorts/short001",
    {
      shortsMode: "limited",
      shortsDailyLimitMinutes: 5,
      shortsBlockMode: "untilTomorrow"
    },
    {
      shortsUsageDate: getLocalDateKey(),
      shortsUsedMs: 0,
      shortsBlockedUntil: 0
    },
    async (page) => {
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          get() {
            return "hidden";
          }
        });
      });
    }
  );
  await hiddenPage.waitForTimeout(1200);
  assert.equal(await hiddenPage.evaluate(() => globalThis.__localStore.shortsUsedMs), 0);
  await hiddenPage.close();

  const almostLimitMs = 5 * 60 * 1000 - 1000;
  const limitedPage = await newFixturePage(
    "https://www.youtube.com/shorts/short001",
    {
      shortsMode: "limited",
      shortsDailyLimitMinutes: 5,
      shortsBlockMode: "hours",
      shortsBlockHours: 3
    },
    {
      shortsUsageDate: getLocalDateKey(),
      shortsUsedMs: almostLimitMs,
      shortsBlockedUntil: 0
    },
    forceFocusedDocument
  );
  await limitedPage.waitForURL("https://www.youtube.com/", { timeout: 3000 });
  const limitedState = await limitedPage.evaluate(() => ({
    usedMs: JSON.parse(window.name).localStore.shortsUsedMs,
    blockedUntil: JSON.parse(window.name).localStore.shortsBlockedUntil
  }));
  assert.equal(limitedState.usedMs, 5 * 60 * 1000);
  assert.ok(limitedState.blockedUntil > Date.now() + 2.5 * 60 * 60 * 1000);
  await limitedPage.close();

  const resetPage = await newFixturePage(
    "https://www.youtube.com/",
    {
      shortsMode: "limited",
      shortsDailyLimitMinutes: 5,
      shortsBlockMode: "untilTomorrow"
    },
    {
      shortsUsageDate: "2000-01-01",
      shortsUsedMs: 5 * 60 * 1000,
      shortsBlockedUntil: Date.now() + 60 * 60 * 1000
    }
  );
  const resetState = await resetPage.evaluate(() => ({
    usageDate: globalThis.__localStore.shortsUsageDate,
    usedMs: globalThis.__localStore.shortsUsedMs,
    blockedUntil: globalThis.__localStore.shortsBlockedUntil
  }));
  assert.equal(resetState.usageDate, getLocalDateKey());
  assert.equal(resetState.usedMs, 0);
  assert.equal(resetState.blockedUntil, 0);
  await resetPage.close();
}

async function checkNonHomePages() {
  for (const url of ["https://www.youtube.com/results?search_query=math", "https://www.youtube.com/watch?v=abc123"]) {
    const page = await newFixturePage(url);
    const state = await page.evaluate(() => ({
      homeMode: document.documentElement.classList.contains("ytsho-home-mode"),
      rootExists: Boolean(document.getElementById("ytsho-home-root")),
      watchMode: document.documentElement.classList.contains("ytsho-watch-mode"),
      miniGuideVisible: [...document.querySelectorAll("ytd-mini-guide-renderer")].filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      }).length === 1,
      visibleFeedCards: [...document.querySelectorAll("ytd-rich-item-renderer,yt-lockup-view-model")].filter((element) => {
        const rect = element.getBoundingClientRect();
        return getComputedStyle(element).display !== "none" && rect.width > 0 && rect.height > 0;
      }).length
    }));
    assert.equal(state.homeMode, false, `${url} should not enter home mode`);
    assert.equal(state.rootExists, false, `${url} should not render the home search UI`);
    assert.ok(state.visibleFeedCards > 0, `${url} should not hide normal page content`);
    if (url.includes("/watch")) {
      assert.equal(state.watchMode, true, `${url} should be marked as watch mode`);
      assert.equal(state.miniGuideVisible, false, `${url} should hide the compact guide`);
    }
    await page.close();
  }
}

async function checkWatchRecommendationBlur() {
  const page = await newFixturePage("https://www.youtube.com/watch?v=abc123", {
    blurWatchRecommendations: true
  });

  const blurredState = await page.evaluate(() => ({
    blurClass: document.documentElement.classList.contains("ytsho-watch-recommendations-blurred"),
    revealClass: document.documentElement.classList.contains("ytsho-watch-recommendations-revealed"),
    toggleExists: Boolean(document.getElementById("ytsho-watch-toggle")),
    toggleParentIsSecondary:
      document.getElementById("ytsho-watch-toggle")?.parentElement === document.querySelector("ytd-watch-flexy #secondary"),
    toggleIsFirstChild:
      document.querySelector("ytd-watch-flexy #secondary")?.firstElementChild === document.getElementById("ytsho-watch-toggle"),
    togglePosition: getComputedStyle(document.getElementById("ytsho-watch-toggle")).position,
    toggleText: document.getElementById("ytsho-watch-toggle")?.textContent.trim(),
    secondaryFilter: getComputedStyle(document.querySelector("ytd-watch-flexy #secondary")).filter,
    recommendationFilter: getComputedStyle(
      document.querySelector("ytd-watch-flexy #secondary > :not(#ytsho-watch-toggle)")
    ).filter,
    recommendationPointerEvents: getComputedStyle(
      document.querySelector("ytd-watch-flexy #secondary > :not(#ytsho-watch-toggle)")
    ).pointerEvents,
    miniGuideVisible: [...document.querySelectorAll("ytd-mini-guide-renderer")].filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    }).length === 1
  }));
  assert.equal(blurredState.blurClass, true);
  assert.equal(blurredState.revealClass, false);
  assert.equal(blurredState.toggleExists, true);
  assert.equal(blurredState.toggleParentIsSecondary, true);
  assert.equal(blurredState.toggleIsFirstChild, true);
  assert.equal(blurredState.togglePosition, "sticky");
  assert.equal(blurredState.toggleText, "Рекомендации скрыты");
  assert.equal(blurredState.secondaryFilter, "none");
  assert.notEqual(blurredState.recommendationFilter, "none");
  assert.equal(blurredState.recommendationPointerEvents, "none");
  assert.equal(blurredState.miniGuideVisible, false);

  await page.click("#ytsho-watch-toggle");
  await page.waitForTimeout(100);
  const revealedState = await page.evaluate(() => ({
    blurClass: document.documentElement.classList.contains("ytsho-watch-recommendations-blurred"),
    revealClass: document.documentElement.classList.contains("ytsho-watch-recommendations-revealed"),
    toggleText: document.getElementById("ytsho-watch-toggle")?.textContent.trim(),
    secondaryFilter: getComputedStyle(document.querySelector("ytd-watch-flexy #secondary")).filter,
    recommendationFilter: getComputedStyle(
      document.querySelector("ytd-watch-flexy #secondary > :not(#ytsho-watch-toggle)")
    ).filter
  }));
  assert.equal(revealedState.blurClass, false);
  assert.equal(revealedState.revealClass, true);
  assert.equal(revealedState.toggleText, "Рекомендации видны");
  assert.equal(revealedState.secondaryFilter, "none");
  assert.equal(revealedState.recommendationFilter, "none");

  await page.close();
}

async function checkShortsRedirect() {
  const page = await newFixturePage("https://www.youtube.com/shorts/short001");
  await page.waitForURL("https://www.youtube.com/", { timeout: 3000 });
  await page.close();
}

async function checkPopupSettings() {
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  await page.setContent(popupHtml.replace('<script src="popup.js"></script>', ""), { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const listeners = [];
    const syncStore = {
      homeSearchOnlyEnabled: true,
      shortsMode: "limited",
      shortsDailyLimitMinutes: 15,
      shortsBlockMode: "hours",
      shortsBlockHours: 3,
      allowGuideOpen: true,
      blurWatchRecommendations: true
    };
    const now = new Date();
    const localDateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const localStore = {
      shortsUsageDate: localDateKey,
      shortsUsedMs: 5 * 60 * 1000,
      shortsBlockedUntil: 0
    };
    const read = (store, keys) => {
      if (Array.isArray(keys)) {
        return Object.fromEntries(keys.filter((key) => Object.hasOwn(store, key)).map((key) => [key, store[key]]));
      }
      return { ...keys, ...Object.fromEntries(Object.keys(keys ?? {}).filter((key) => Object.hasOwn(store, key)).map((key) => [key, store[key]])) };
    };
    const write = (store, areaName, items, callback) => {
      const changes = {};
      for (const [key, newValue] of Object.entries(items)) {
        changes[key] = { oldValue: store[key], newValue };
        store[key] = newValue;
      }
      for (const listener of listeners) {
        listener(changes, areaName);
      }
      callback?.();
    };

    globalThis.__syncStore = syncStore;
    globalThis.__localStore = localStore;
    globalThis.chrome = {
      storage: {
        sync: {
          get(keys, callback) {
            callback(read(syncStore, keys));
          },
          set(items, callback) {
            write(syncStore, "sync", items, callback);
          }
        },
        local: {
          get(keys, callback) {
            callback(read(localStore, keys));
          },
          set(items, callback) {
            write(localStore, "local", items, callback);
          }
        },
        onChanged: {
          addListener(callback) {
            listeners.push(callback);
          }
        }
      },
      runtime: {
        sendMessage(_message, callback) {
          callback({ ok: true });
        }
      }
    };
  });
  await page.addScriptTag({ path: popupScriptPath });
  await page.waitForFunction(() => document.getElementById("shortsMode").value === "limited");

  const initialState = await page.evaluate(() => ({
    title: document.querySelector("h1")?.textContent.trim(),
    feedbackHref: document.querySelector(".feedback-link")?.href,
    homeSearchOnlyEnabled: document.getElementById("homeSearchOnlyEnabled").checked,
    mode: document.getElementById("shortsMode").value,
    limit: document.getElementById("shortsDailyLimitMinutes").value,
    blockMode: document.getElementById("shortsBlockMode").value,
    blockHours: document.getElementById("shortsBlockHours").value,
    controlsHidden: document.getElementById("shortsLimitControls").hidden,
    hoursHidden: document.getElementById("shortsBlockHoursRow").hidden,
    status: document.getElementById("shortsLimitStatus").textContent.trim(),
    allowGuideOpen: document.getElementById("allowGuideOpen").checked,
    blurWatchRecommendations: document.getElementById("blurWatchRecommendations").checked
  }));
  assert.equal(initialState.title, "FocusTube");
  assert.equal(initialState.feedbackHref, "https://forms.gle/RRq2P8Bh814HoqZ48");
  assert.equal(initialState.homeSearchOnlyEnabled, true);
  assert.equal(initialState.mode, "limited");
  assert.equal(initialState.limit, "15");
  assert.equal(initialState.blockMode, "hours");
  assert.equal(initialState.blockHours, "3");
  assert.equal(initialState.controlsHidden, false);
  assert.equal(initialState.hoursHidden, false);
  assert.match(initialState.status, /Осталось 10 мин\./);
  assert.equal(initialState.allowGuideOpen, true);
  assert.equal(initialState.blurWatchRecommendations, true);

  await page.uncheck("#homeSearchOnlyEnabled");
  await page.waitForFunction(() => globalThis.__syncStore.homeSearchOnlyEnabled === false);
  assert.equal(await page.evaluate(() => document.getElementById("homeSearchOnlyEnabled").checked), false);

  await page.selectOption("#shortsMode", "allowed");
  await page.waitForFunction(() => globalThis.__syncStore.shortsMode === "allowed");
  const allowedState = await page.evaluate(() => ({
    savedMode: globalThis.__syncStore.shortsMode,
    controlsHidden: document.getElementById("shortsLimitControls").hidden
  }));
  assert.equal(allowedState.savedMode, "allowed");
  assert.equal(allowedState.controlsHidden, true);

  await page.selectOption("#shortsMode", "limited");
  await page.selectOption("#shortsDailyLimitMinutes", "30");
  await page.selectOption("#shortsBlockMode", "untilTomorrow");
  await page.waitForFunction(
    () =>
      globalThis.__syncStore.shortsMode === "limited" &&
      globalThis.__syncStore.shortsDailyLimitMinutes === 30 &&
      globalThis.__syncStore.shortsBlockMode === "untilTomorrow"
  );
  const updatedState = await page.evaluate(() => ({
    limit: globalThis.__syncStore.shortsDailyLimitMinutes,
    blockMode: globalThis.__syncStore.shortsBlockMode,
    hoursHidden: document.getElementById("shortsBlockHoursRow").hidden,
    status: document.getElementById("shortsLimitStatus").textContent.trim()
  }));
  assert.equal(updatedState.limit, 30);
  assert.equal(updatedState.blockMode, "untilTomorrow");
  assert.equal(updatedState.hoursHidden, true);
  assert.match(updatedState.status, /Осталось 25 мин\./);

  await page.close();
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function forceFocusedDocument(page) {
  await page.evaluate(() => {
    document.hasFocus = () => true;
  });
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
