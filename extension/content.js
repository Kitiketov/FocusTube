(function () {
  "use strict";

  if (window.__ytshoInstalled) {
    return;
  }
  window.__ytshoInstalled = true;

  const HOME_ROOT_ID = "ytsho-home-root";
  const WATCH_TOGGLE_ID = "ytsho-watch-toggle";
  const WATCH_SECONDARY_SELECTOR = "ytd-watch-flexy #secondary";
  const APPLY_DELAY_MS = 60;
  const SHORTS_USAGE_TICK_MS = 1000;
  const DEFAULT_SETTINGS = {
    homeSearchOnlyEnabled: true,
    shortsMode: "blocked",
    shortsDailyLimitMinutes: 15,
    shortsBlockMode: "untilTomorrow",
    shortsBlockHours: 24,
    allowGuideOpen: false,
    blurWatchRecommendations: false,
    language: "ru"
  };
  const SETTINGS_KEYS = [
    "homeSearchOnlyEnabled",
    "shortsMode",
    "shortsDailyLimitMinutes",
    "shortsBlockMode",
    "shortsBlockHours",
    "allowGuideOpen",
    "blurWatchRecommendations",
    "language",
    "blockShorts"
  ];
  const SHORTS_STATE_KEYS = ["shortsUsageDate", "shortsUsedMs", "shortsBlockedUntil"];
  const SHORTS_LIMIT_OPTIONS = new Set([5, 10, 15, 30, 60]);
  const SHORTS_BLOCK_HOUR_OPTIONS = new Set([1, 3, 6, 12, 24]);
  const SHORTS_MODES = new Set(["blocked", "limited", "allowed"]);
  const LANGUAGES = new Set(["ru", "eu"]);
  const TEXT = {
    ru: {
      homeSearchAria: "Поиск YouTube",
      recommendationsHidden: "Рекомендации скрыты",
      recommendationsVisible: "Рекомендации видны",
      hideRecommendations: "Скрыть боковые рекомендации",
      showRecommendations: "Показать боковые рекомендации"
    },
    eu: {
      homeSearchAria: "YouTube search",
      recommendationsHidden: "Recommendations hidden",
      recommendationsVisible: "Recommendations visible",
      hideRecommendations: "Hide side recommendations",
      showRecommendations: "Show side recommendations"
    }
  };
  const SCROLL_KEYS = new Set([" ", "ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp"]);
  const GUIDE_BUTTON_SELECTOR = [
    "#guide-button",
    "ytd-masthead button[aria-label='Guide']",
    "ytd-masthead button[aria-label='Menu']",
    "ytd-masthead button[aria-label='Меню']",
    "ytd-masthead button[aria-label='Навигация']",
    "ytd-masthead [aria-label='Guide']",
    "ytd-masthead [aria-label='Menu']",
    "ytd-masthead [aria-label='Меню']",
    "ytd-masthead [aria-label='Навигация']"
  ].join(",");
  const SHORTS_ANCHOR_SELECTOR = [
    'a[href="/shorts"]',
    'a[href$="/shorts"]',
    'a[href^="/shorts/"]',
    'a[href*="/shorts"]',
    'a[href*="youtube.com/shorts/"]'
  ].join(",");
  const SHORTS_SURFACE_SELECTOR = [
    "ytd-guide-entry-renderer",
    "ytd-mini-guide-entry-renderer",
    "ytd-guide-collapsible-entry-renderer",
    "ytd-guide-section-renderer",
    "tp-yt-paper-item",
    "yt-chip-cloud-chip-renderer",
    "ytd-rich-section-renderer",
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-grid-video-renderer",
    "yt-lockup-view-model",
    "ytd-reel-shelf-renderer",
    "ytd-reel-item-renderer",
    "ytm-shorts-lockup-view-model",
    "a",
    "[role='link']",
    "[role='button']"
  ].join(",");
  const SHORTS_TEXT_SELECTOR = [
    "ytd-guide-entry-renderer",
    "ytd-mini-guide-entry-renderer",
    "ytd-guide-collapsible-entry-renderer",
    "tp-yt-paper-item",
    "a",
    "[role='link']",
    "[role='button']"
  ].join(",");
  const WATCH_VISIBLE_ICON = [
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
    '<path d="M2.75 12s3.25-6.5 9.25-6.5 9.25 6.5 9.25 6.5-3.25 6.5-9.25 6.5S2.75 12 2.75 12Z"/>',
    '<circle cx="12" cy="12" r="2.75"/>',
    "</svg>"
  ].join("");
  const WATCH_HIDDEN_ICON = [
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
    '<path d="M3.25 3.25 20.75 20.75"/>',
    '<path d="M9.55 5.35A9.7 9.7 0 0 1 12 5c6 0 9.25 7 9.25 7a13.42 13.42 0 0 1-2.32 3.42"/>',
    '<path d="M6.28 6.95A13.74 13.74 0 0 0 2.75 12s3.25 6.5 9.25 6.5c1.43 0 2.73-.36 3.88-.92"/>',
    '<path d="M10.18 10.18a2.75 2.75 0 0 0 3.64 3.64"/>',
    '<path d="M13.35 9.35a2.75 2.75 0 0 1 1.3 1.3"/>',
    "</svg>"
  ].join("");

  let applyTimer = 0;
  let shortsUsageTimer = 0;
  let observer = null;
  let settings = { ...DEFAULT_SETTINGS };
  let shortsState = {
    shortsUsageDate: getLocalDateKey(),
    shortsUsedMs: 0,
    shortsBlockedUntil: 0
  };
  let settingsReady = false;
  let shortsStateReady = false;
  let watchRecommendationsRevealed = false;

  redirectShortsIfNeeded();
  loadSettings();
  loadShortsState();
  installNavigationHooks();
  installScrollBlockers();
  installGuideBlocker();
  installShortsUsageTimer();

  if (document.readyState === "loading") {
    markBaseClasses();
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  function init() {
    markBaseClasses();
    applyState();

    if (document.documentElement && !observer) {
      observer = new MutationObserver(scheduleApply);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    window.addEventListener("yt-navigate-finish", scheduleApply, true);
    window.addEventListener("yt-page-data-updated", scheduleApply, true);
    window.addEventListener("resize", scheduleApply);
    installSettingsListener();
  }

  function loadSettings() {
    const storage = getSyncStorageArea();
    if (!storage) {
      settingsReady = true;
      return;
    }

    storage.get(SETTINGS_KEYS, (value) => {
      const result = normalizeSettings(value);
      settings = result.settings;
      settingsReady = true;
      if (result.shouldMigrateBlockShorts) {
        storage.set({ shortsMode: settings.shortsMode });
      }
      refreshShortsState();
      scheduleApply();
    });
  }

  function loadShortsState() {
    const storage = getLocalStorageArea();
    if (!storage) {
      shortsStateReady = true;
      return;
    }

    storage.get(SHORTS_STATE_KEYS, (value) => {
      shortsState = normalizeShortsState(value);
      shortsStateReady = true;
      refreshShortsState();
      scheduleApply();
    });
  }

  function installSettingsListener() {
    if (!chromeRuntimeAvailable() || !chrome.storage?.onChanged) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local") {
        if (!SHORTS_STATE_KEYS.some((key) => Boolean(changes[key]))) {
          return;
        }
        shortsState = normalizeShortsState({
          ...shortsState,
          shortsUsageDate: changes.shortsUsageDate?.newValue ?? shortsState.shortsUsageDate,
          shortsUsedMs: changes.shortsUsedMs?.newValue ?? shortsState.shortsUsedMs,
          shortsBlockedUntil: changes.shortsBlockedUntil?.newValue ?? shortsState.shortsBlockedUntil
        });
        shortsStateReady = true;
        refreshShortsState();
        scheduleApply();
        return;
      }

      if (areaName !== "sync") {
        return;
      }
      if (!SETTINGS_KEYS.some((key) => Boolean(changes[key]))) {
        return;
      }

      settings = normalizeSettings({
        homeSearchOnlyEnabled: changes.homeSearchOnlyEnabled?.newValue ?? settings.homeSearchOnlyEnabled,
        shortsMode: changes.shortsMode?.newValue ?? settings.shortsMode,
        shortsDailyLimitMinutes: changes.shortsDailyLimitMinutes?.newValue ?? settings.shortsDailyLimitMinutes,
        shortsBlockMode: changes.shortsBlockMode?.newValue ?? settings.shortsBlockMode,
        shortsBlockHours: changes.shortsBlockHours?.newValue ?? settings.shortsBlockHours,
        blockShorts: changes.blockShorts?.newValue,
        allowGuideOpen: changes.allowGuideOpen?.newValue ?? settings.allowGuideOpen,
        blurWatchRecommendations: changes.blurWatchRecommendations?.newValue ?? settings.blurWatchRecommendations,
        language: changes.language?.newValue ?? settings.language
      }).settings;
      settingsReady = true;
      refreshShortsState();
      scheduleApply();
    });
  }

  function installNavigationHooks() {
    const nativePushState = history.pushState;
    const nativeReplaceState = history.replaceState;

    history.pushState = function pushState() {
      const result = nativePushState.apply(this, arguments);
      scheduleApply();
      return result;
    };

    history.replaceState = function replaceState() {
      const result = nativeReplaceState.apply(this, arguments);
      scheduleApply();
      return result;
    };

    window.addEventListener("popstate", scheduleApply);
  }

  function installScrollBlockers() {
    document.addEventListener("wheel", preventHomeScroll, { capture: true, passive: false });
    document.addEventListener("touchmove", preventHomeScroll, { capture: true, passive: false });
    document.addEventListener(
      "keydown",
      (event) => {
        if (!isHomeSearchOnlyPage() || isEditableTarget(event.target) || !SCROLL_KEYS.has(event.key)) {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        lockScrollPosition();
      },
      true
    );
    window.addEventListener("scroll", () => {
      if (isHomeSearchOnlyPage()) {
        lockScrollPosition();
      }
    });
  }

  function preventHomeScroll(event) {
    if (!isHomeSearchOnlyPage()) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    lockScrollPosition();
  }

  function scheduleApply() {
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(applyState, APPLY_DELAY_MS);
  }

  function applyState() {
    redirectShortsIfNeeded();
    refreshShortsState();
    markBaseClasses();
    if (shouldBlockShortsNow()) {
      hideShortsSurfaces();
    } else {
      showShortsSurfaces();
    }
    collapseGuideIfNeeded();
    applyWatchRecommendationState();

    if (isHomeSearchOnlyPage()) {
      document.documentElement.classList.add("ytsho-home-mode", "ytsho-scroll-locked");
      ensureHomeRoot();
      lockScrollPosition();
      return;
    }

    document.documentElement.classList.remove("ytsho-home-mode", "ytsho-scroll-locked");
    removeHomeRoot();
  }

  function markBaseClasses() {
    if (!document.documentElement) {
      return;
    }
    const watchPage = isWatchPage();
    document.documentElement.classList.toggle("ytsho-hide-shorts", shouldBlockShortsNow());
    document.documentElement.classList.toggle("ytsho-allow-guide-open", settings.allowGuideOpen);
    document.documentElement.classList.toggle("ytsho-watch-mode", watchPage);
    document.documentElement.classList.toggle(
      "ytsho-watch-recommendations-blurred",
      watchPage && settings.blurWatchRecommendations && !watchRecommendationsRevealed
    );
    if (!settings.allowGuideOpen) {
      document.documentElement.classList.remove("ytsho-guide-open-allowed");
    }
    document.documentElement.classList.add("ytsho-collapse-guide");
  }

  function ensureHomeRoot() {
    if (!document.body) {
      return;
    }

    let root = document.getElementById(HOME_ROOT_ID);
    if (root) {
      root.setAttribute("aria-label", t("homeSearchAria"));
      return;
    }

    root = document.createElement("section");
    root.id = HOME_ROOT_ID;
    root.setAttribute("aria-label", t("homeSearchAria"));

    const shell = document.createElement("div");
    shell.className = "ytsho-search-shell";

    const wordmark = document.createElement("div");
    wordmark.className = "ytsho-wordmark";
    wordmark.textContent = "YouTube";

    shell.append(wordmark);
    root.append(shell);
    document.body.append(root);
  }

  function removeHomeRoot() {
    document.getElementById(HOME_ROOT_ID)?.remove();
  }

  function applyWatchRecommendationState() {
    const shouldShowToggle = isWatchPage() && settings.blurWatchRecommendations;
    document.documentElement.classList.toggle(
      "ytsho-watch-recommendations-blurred",
      shouldShowToggle && !watchRecommendationsRevealed
    );
    document.documentElement.classList.toggle("ytsho-watch-recommendations-revealed", shouldShowToggle && watchRecommendationsRevealed);

    if (!shouldShowToggle) {
      watchRecommendationsRevealed = false;
      document.documentElement.classList.remove("ytsho-watch-recommendations-blurred", "ytsho-watch-recommendations-revealed");
      removeWatchToggle();
      return;
    }

    ensureWatchToggle();
  }

  function ensureWatchToggle() {
    const secondary = document.querySelector(WATCH_SECONDARY_SELECTOR);
    if (!secondary) {
      removeWatchToggle();
      return;
    }

    let button = document.getElementById(WATCH_TOGGLE_ID);
    if (!button) {
      button = document.createElement("button");
      button.id = WATCH_TOGGLE_ID;
      button.type = "button";
      button.addEventListener("click", () => {
        watchRecommendationsRevealed = !watchRecommendationsRevealed;
        applyWatchRecommendationState();
      });
    }

    if (button.parentElement !== secondary || secondary.firstElementChild !== button) {
      secondary.prepend(button);
    }
    updateWatchToggle(button);
  }

  function updateWatchToggle(button) {
    const state = watchRecommendationsRevealed ? "revealed" : "blurred";
    const label = watchRecommendationsRevealed ? t("recommendationsVisible") : t("recommendationsHidden");
    const icon = watchRecommendationsRevealed ? WATCH_VISIBLE_ICON : WATCH_HIDDEN_ICON;

    button.classList.toggle("ytsho-watch-toggle-revealed", watchRecommendationsRevealed);
    button.title = watchRecommendationsRevealed ? t("hideRecommendations") : t("showRecommendations");
    button.setAttribute("aria-label", button.title);
    button.setAttribute("aria-pressed", String(!watchRecommendationsRevealed));

    const renderedState = `${settings.language}:${state}`;
    if (button.dataset.state !== renderedState) {
      button.dataset.state = renderedState;
      button.innerHTML = `<span class="ytsho-watch-toggle-icon">${icon}</span><span class="ytsho-watch-toggle-label">${label}</span>`;
    }
  }

  function removeWatchToggle() {
    document.getElementById(WATCH_TOGGLE_ID)?.remove();
  }

  function hideShortsSurfaces() {
    for (const anchor of document.querySelectorAll(SHORTS_ANCHOR_SELECTOR)) {
      const surface = anchor.closest(SHORTS_SURFACE_SELECTOR);
      if (surface) {
        surface.classList.add("ytsho-shorts-hidden");
      } else {
        anchor.classList.add("ytsho-shorts-hidden");
      }
    }

    for (const element of document.querySelectorAll(SHORTS_TEXT_SELECTOR)) {
      if (isShortsElement(element)) {
        element.classList.add("ytsho-shorts-hidden");
      }
    }

    for (const surface of document.querySelectorAll(
      "ytd-reel-shelf-renderer,ytd-reel-item-renderer,ytm-shorts-lockup-view-model"
    )) {
      surface.classList.add("ytsho-shorts-hidden");
    }
  }

  function showShortsSurfaces() {
    document.documentElement.classList.remove("ytsho-hide-shorts");
    for (const surface of document.querySelectorAll(".ytsho-shorts-hidden")) {
      surface.classList.remove("ytsho-shorts-hidden");
    }
  }

  function installShortsUsageTimer() {
    if (shortsUsageTimer) {
      return;
    }

    shortsUsageTimer = window.setInterval(trackShortsUsage, SHORTS_USAGE_TICK_MS);
    document.addEventListener("visibilitychange", trackShortsUsage);
    window.addEventListener("focus", trackShortsUsage);
  }

  function trackShortsUsage() {
    if (!settingsReady || !shortsStateReady || settings.shortsMode !== "limited") {
      return;
    }

    refreshShortsState();
    if (isShortsLimitBlocked()) {
      scheduleApply();
      return;
    }

    if (!isShortsPage() || document.visibilityState !== "visible" || !document.hasFocus()) {
      return;
    }

    const limitMs = settings.shortsDailyLimitMinutes * 60 * 1000;
    const nextUsedMs = Math.min(limitMs, Number(shortsState.shortsUsedMs) + SHORTS_USAGE_TICK_MS);
    if (nextUsedMs === shortsState.shortsUsedMs) {
      return;
    }

    shortsState = {
      ...shortsState,
      shortsUsedMs: nextUsedMs
    };

    if (nextUsedMs >= limitMs) {
      shortsState.shortsBlockedUntil = getNextShortsUnlockTime();
    }

    saveShortsState();
    scheduleApply();
  }

  function refreshShortsState() {
    if (!settingsReady || !shortsStateReady) {
      return false;
    }

    const today = getLocalDateKey();
    const now = Date.now();
    let changed = false;
    const nextState = { ...shortsState };

    if (nextState.shortsUsageDate !== today) {
      nextState.shortsUsageDate = today;
      nextState.shortsUsedMs = 0;
      if (settings.shortsBlockMode === "untilTomorrow") {
        nextState.shortsBlockedUntil = 0;
      }
      changed = true;
    }

    if (nextState.shortsBlockedUntil > 0 && nextState.shortsBlockedUntil <= now) {
      nextState.shortsBlockedUntil = 0;
      changed = true;
    }

    if (changed) {
      shortsState = normalizeShortsState(nextState);
      saveShortsState();
    }

    return changed;
  }

  function saveShortsState() {
    const storage = getLocalStorageArea();
    if (!storage) {
      return;
    }

    storage.set({
      shortsUsageDate: shortsState.shortsUsageDate,
      shortsUsedMs: shortsState.shortsUsedMs,
      shortsBlockedUntil: shortsState.shortsBlockedUntil
    });
  }

  function shouldBlockShortsNow() {
    if (!settingsReady && settings.shortsMode !== "blocked") {
      return false;
    }
    if (settings.shortsMode === "blocked") {
      return true;
    }
    return settings.shortsMode === "limited" && isShortsLimitBlocked();
  }

  function isShortsLimitBlocked() {
    return shortsStateReady && Number(shortsState.shortsBlockedUntil) > Date.now();
  }

  function getNextShortsUnlockTime() {
    if (settings.shortsBlockMode === "hours") {
      return Date.now() + settings.shortsBlockHours * 60 * 60 * 1000;
    }

    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    return tomorrow.getTime();
  }

  function installGuideBlocker() {
    document.addEventListener(
      "click",
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const guideButton = target.closest(GUIDE_BUTTON_SELECTOR);
        if (guideButton && settings.allowGuideOpen) {
          document.documentElement.classList.add("ytsho-guide-open-allowed");
          return;
        }

        if (guideButton && !settings.allowGuideOpen) {
          event.preventDefault();
          event.stopImmediatePropagation();
          closeGuideDrawer();
          return;
        }
      },
      true
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          closeGuideDrawer();
        }
      },
      true
    );
  }

  function closeGuideDrawer() {
    document.documentElement.classList.remove("ytsho-guide-open-allowed");
    const drawer = findGuideDrawer();
    if (drawer) {
      drawer.removeAttribute("opened");
      drawer.setAttribute("aria-hidden", "true");
    }
  }

  function collapseGuideIfNeeded() {
    if (settings.allowGuideOpen) {
      return;
    }
    const drawer = findGuideDrawer();
    if (drawer) {
      drawer.removeAttribute("opened");
      drawer.setAttribute("aria-hidden", "true");
    }
  }

  function findGuideDrawer() {
    return document.querySelector("tp-yt-app-drawer");
  }

  function redirectShortsIfNeeded() {
    if (!settingsReady || !isShortsPage() || !shouldBlockShortsNow()) {
      return;
    }
    location.replace("/");
  }

  function isHomePage() {
    return location.hostname === "www.youtube.com" && (location.pathname === "/" || location.pathname === "");
  }

  function isHomeSearchOnlyPage() {
    return settings.homeSearchOnlyEnabled && isHomePage();
  }

  function isShortsPage() {
    return location.hostname === "www.youtube.com" && (location.pathname === "/shorts" || location.pathname.startsWith("/shorts/"));
  }

  function isWatchPage() {
    return location.hostname === "www.youtube.com" && location.pathname === "/watch";
  }

  function isEditableTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }
    return Boolean(target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"));
  }

  function isShortsElement(element) {
    const href = element.getAttribute("href") ?? "";
    const title = element.getAttribute("title") ?? "";
    const aria = element.getAttribute("aria-label") ?? "";
    const text = (element.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    const combined = `${href} ${title} ${aria}`.toLowerCase();
    return combined.includes("/shorts") || combined.includes("shorts") || text === "shorts" || text === "шортс";
  }

  function lockScrollPosition() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }

  function normalizeSettings(value) {
    let shortsMode = value?.shortsMode;
    const shouldMigrateBlockShorts = !SHORTS_MODES.has(shortsMode) && value?.blockShorts !== undefined;
    if (!SHORTS_MODES.has(shortsMode)) {
      shortsMode = shouldMigrateBlockShorts && value.blockShorts === false ? "allowed" : DEFAULT_SETTINGS.shortsMode;
    }

    const shortsDailyLimitMinutes = Number(value?.shortsDailyLimitMinutes);
    const shortsBlockHours = Number(value?.shortsBlockHours);

    return {
      settings: {
        homeSearchOnlyEnabled: value?.homeSearchOnlyEnabled !== false,
        shortsMode,
        shortsDailyLimitMinutes: SHORTS_LIMIT_OPTIONS.has(shortsDailyLimitMinutes)
          ? shortsDailyLimitMinutes
          : DEFAULT_SETTINGS.shortsDailyLimitMinutes,
        shortsBlockMode: value?.shortsBlockMode === "hours" ? "hours" : DEFAULT_SETTINGS.shortsBlockMode,
        shortsBlockHours: SHORTS_BLOCK_HOUR_OPTIONS.has(shortsBlockHours) ? shortsBlockHours : DEFAULT_SETTINGS.shortsBlockHours,
        allowGuideOpen: value?.allowGuideOpen === true,
        blurWatchRecommendations: value?.blurWatchRecommendations === true,
        language: LANGUAGES.has(value?.language) ? value.language : DEFAULT_SETTINGS.language
      },
      shouldMigrateBlockShorts
    };
  }

  function normalizeShortsState(value) {
    const shortsUsageDate = typeof value?.shortsUsageDate === "string" ? value.shortsUsageDate : getLocalDateKey();
    const shortsUsedMs = Math.max(0, Number(value?.shortsUsedMs) || 0);
    const shortsBlockedUntil = Math.max(0, Number(value?.shortsBlockedUntil) || 0);

    return {
      shortsUsageDate,
      shortsUsedMs,
      shortsBlockedUntil
    };
  }

  function getLocalDateKey() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getSyncStorageArea() {
    if (!chromeRuntimeAvailable()) {
      return null;
    }
    return chrome.storage?.sync ?? chrome.storage?.local ?? null;
  }

  function getLocalStorageArea() {
    if (!chromeRuntimeAvailable()) {
      return null;
    }
    return chrome.storage?.local ?? chrome.storage?.sync ?? null;
  }

  function getStorageArea() {
    return getSyncStorageArea();
  }

  function t(key) {
    const dictionary = TEXT[settings.language] ?? TEXT[DEFAULT_SETTINGS.language];
    return dictionary[key] ?? TEXT[DEFAULT_SETTINGS.language][key] ?? key;
  }

  function chromeRuntimeAvailable() {
    try {
      return typeof chrome !== "undefined" && Boolean(chrome.storage);
    } catch {
      return false;
    }
  }
})();
