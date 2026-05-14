(function () {
  "use strict";

  const DEFAULT_SETTINGS = {
    homeSearchOnlyEnabled: true,
    shortsMode: "blocked",
    shortsDailyLimitMinutes: 15,
    shortsBlockMode: "untilTomorrow",
    shortsBlockHours: 24,
    allowGuideOpen: false,
    blurWatchRecommendations: false
  };
  const DEFAULT_SHORTS_STATE = {
    shortsUsageDate: getLocalDateKey(),
    shortsUsedMs: 0,
    shortsBlockedUntil: 0
  };
  const SETTINGS_KEYS = [
    "homeSearchOnlyEnabled",
    "shortsMode",
    "shortsDailyLimitMinutes",
    "shortsBlockMode",
    "shortsBlockHours",
    "allowGuideOpen",
    "blurWatchRecommendations",
    "blockShorts"
  ];
  const SHORTS_STATE_KEYS = ["shortsUsageDate", "shortsUsedMs", "shortsBlockedUntil"];
  const SHORTS_LIMIT_OPTIONS = new Set([5, 10, 15, 30, 60]);
  const SHORTS_BLOCK_HOUR_OPTIONS = new Set([1, 3, 6, 12, 24]);
  const SHORTS_MODES = new Set(["blocked", "limited", "allowed"]);

  const homeSearchOnlyEnabled = document.getElementById("homeSearchOnlyEnabled");
  const shortsMode = document.getElementById("shortsMode");
  const shortsDailyLimitMinutes = document.getElementById("shortsDailyLimitMinutes");
  const shortsBlockMode = document.getElementById("shortsBlockMode");
  const shortsBlockHours = document.getElementById("shortsBlockHours");
  const shortsBlockHoursRow = document.getElementById("shortsBlockHoursRow");
  const shortsLimitControls = document.getElementById("shortsLimitControls");
  const shortsLimitStatus = document.getElementById("shortsLimitStatus");
  const allowGuideOpen = document.getElementById("allowGuideOpen");
  const blurWatchRecommendations = document.getElementById("blurWatchRecommendations");
  const supportButton = document.getElementById("supportButton");
  const status = document.getElementById("status");

  let currentSettings = { ...DEFAULT_SETTINGS };
  let currentShortsState = { ...DEFAULT_SHORTS_STATE };

  init();

  async function init() {
    currentSettings = await loadSettings();
    currentShortsState = await loadShortsState();
    refreshShortsState();

    homeSearchOnlyEnabled.checked = currentSettings.homeSearchOnlyEnabled;
    shortsMode.value = currentSettings.shortsMode;
    shortsDailyLimitMinutes.value = String(currentSettings.shortsDailyLimitMinutes);
    shortsBlockMode.value = currentSettings.shortsBlockMode;
    shortsBlockHours.value = String(currentSettings.shortsBlockHours);
    allowGuideOpen.checked = currentSettings.allowGuideOpen;
    blurWatchRecommendations.checked = currentSettings.blurWatchRecommendations;
    renderShortsLimitControls();

    homeSearchOnlyEnabled.addEventListener("change", () =>
      saveSetting("homeSearchOnlyEnabled", homeSearchOnlyEnabled.checked)
    );
    shortsMode.addEventListener("change", () => saveSetting("shortsMode", shortsMode.value));
    shortsDailyLimitMinutes.addEventListener("change", () =>
      saveSetting("shortsDailyLimitMinutes", Number(shortsDailyLimitMinutes.value))
    );
    shortsBlockMode.addEventListener("change", () => saveSetting("shortsBlockMode", shortsBlockMode.value));
    shortsBlockHours.addEventListener("change", () => saveSetting("shortsBlockHours", Number(shortsBlockHours.value)));
    allowGuideOpen.addEventListener("change", () => saveSetting("allowGuideOpen", allowGuideOpen.checked));
    blurWatchRecommendations.addEventListener("change", () =>
      saveSetting("blurWatchRecommendations", blurWatchRecommendations.checked)
    );
    supportButton.addEventListener("click", openYooMoneyPayment);
    installStorageListener();
  }

  function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(SETTINGS_KEYS, (value) => {
        const result = normalizeSettings(value);
        if (result.shouldMigrateBlockShorts) {
          chrome.storage.sync.set({ shortsMode: result.settings.shortsMode });
        }
        resolve(result.settings);
      });
    });
  }

  function loadShortsState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(SHORTS_STATE_KEYS, (value) => {
        resolve(normalizeShortsState(value));
      });
    });
  }

  function installStorageListener() {
    if (!chrome.storage?.onChanged) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && SHORTS_STATE_KEYS.some((key) => Boolean(changes[key]))) {
        currentShortsState = normalizeShortsState({
          ...currentShortsState,
          shortsUsageDate: changes.shortsUsageDate?.newValue ?? currentShortsState.shortsUsageDate,
          shortsUsedMs: changes.shortsUsedMs?.newValue ?? currentShortsState.shortsUsedMs,
          shortsBlockedUntil: changes.shortsBlockedUntil?.newValue ?? currentShortsState.shortsBlockedUntil
        });
        refreshShortsState();
        renderShortsLimitControls();
      }
    });
  }

  function saveSetting(key, value) {
    currentSettings = normalizeSettings({ ...currentSettings, [key]: value }).settings;
    refreshShortsState();
    syncFormFromSettings();
    renderShortsLimitControls();
    chrome.storage.sync.set({ [key]: currentSettings[key] }, () => {
      status.textContent = "Сохранено";
      window.setTimeout(() => {
        status.textContent = "";
      }, 1200);
    });
  }

  function syncFormFromSettings() {
    homeSearchOnlyEnabled.checked = currentSettings.homeSearchOnlyEnabled;
    shortsMode.value = currentSettings.shortsMode;
    shortsDailyLimitMinutes.value = String(currentSettings.shortsDailyLimitMinutes);
    shortsBlockMode.value = currentSettings.shortsBlockMode;
    shortsBlockHours.value = String(currentSettings.shortsBlockHours);
    allowGuideOpen.checked = currentSettings.allowGuideOpen;
    blurWatchRecommendations.checked = currentSettings.blurWatchRecommendations;
  }

  function renderShortsLimitControls() {
    const limited = currentSettings.shortsMode === "limited";
    shortsLimitControls.hidden = !limited;
    shortsBlockHoursRow.hidden = currentSettings.shortsBlockMode !== "hours";

    if (currentSettings.shortsMode === "blocked") {
      shortsLimitStatus.textContent = "Shorts выключены.";
      return;
    }

    if (currentSettings.shortsMode === "allowed") {
      shortsLimitStatus.textContent = "Shorts разрешены без лимита.";
      return;
    }

    const now = Date.now();
    if (currentShortsState.shortsBlockedUntil > now) {
      shortsLimitStatus.textContent = `Shorts заблокированы до ${formatUnlockTime(currentShortsState.shortsBlockedUntil)}.`;
      return;
    }

    const limitMs = currentSettings.shortsDailyLimitMinutes * 60 * 1000;
    const remainingMinutes = Math.max(0, Math.ceil((limitMs - currentShortsState.shortsUsedMs) / 60000));
    shortsLimitStatus.textContent = `Осталось ${remainingMinutes} мин.`;
  }

  async function openYooMoneyPayment() {
    supportButton.disabled = true;
    status.textContent = "Открываю ЮMoney...";

    try {
      const response = await sendRuntimeMessage({ type: "ytsho:open-support" });
      if (!response?.ok) {
        throw new Error(response?.error || "YooMoney payment URL was not opened");
      }
      status.textContent = "";
    } catch {
      status.textContent = "Не удалось открыть ЮMoney";
      window.setTimeout(() => {
        status.textContent = "";
      }, 2200);
    } finally {
      supportButton.disabled = false;
    }
  }

  function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(response);
      });
    });
  }

  function normalizeSettings(value) {
    let mode = value?.shortsMode;
    const shouldMigrateBlockShorts = !SHORTS_MODES.has(mode) && value?.blockShorts !== undefined;
    if (!SHORTS_MODES.has(mode)) {
      mode = shouldMigrateBlockShorts && value.blockShorts === false ? "allowed" : DEFAULT_SETTINGS.shortsMode;
    }

    const limit = Number(value?.shortsDailyLimitMinutes);
    const blockHours = Number(value?.shortsBlockHours);

    return {
      settings: {
        homeSearchOnlyEnabled: value?.homeSearchOnlyEnabled !== false,
        shortsMode: mode,
        shortsDailyLimitMinutes: SHORTS_LIMIT_OPTIONS.has(limit) ? limit : DEFAULT_SETTINGS.shortsDailyLimitMinutes,
        shortsBlockMode: value?.shortsBlockMode === "hours" ? "hours" : DEFAULT_SETTINGS.shortsBlockMode,
        shortsBlockHours: SHORTS_BLOCK_HOUR_OPTIONS.has(blockHours) ? blockHours : DEFAULT_SETTINGS.shortsBlockHours,
        allowGuideOpen: value?.allowGuideOpen === true,
        blurWatchRecommendations: value?.blurWatchRecommendations === true
      },
      shouldMigrateBlockShorts
    };
  }

  function normalizeShortsState(value) {
    return {
      shortsUsageDate: typeof value?.shortsUsageDate === "string" ? value.shortsUsageDate : getLocalDateKey(),
      shortsUsedMs: Math.max(0, Number(value?.shortsUsedMs) || 0),
      shortsBlockedUntil: Math.max(0, Number(value?.shortsBlockedUntil) || 0)
    };
  }

  function refreshShortsState() {
    const today = getLocalDateKey();
    const now = Date.now();
    let changed = false;
    const nextState = { ...currentShortsState };

    if (nextState.shortsUsageDate !== today) {
      nextState.shortsUsageDate = today;
      nextState.shortsUsedMs = 0;
      if (currentSettings.shortsBlockMode === "untilTomorrow") {
        nextState.shortsBlockedUntil = 0;
      }
      changed = true;
    }

    if (nextState.shortsBlockedUntil > 0 && nextState.shortsBlockedUntil <= now) {
      nextState.shortsBlockedUntil = 0;
      changed = true;
    }

    if (changed) {
      currentShortsState = normalizeShortsState(nextState);
      chrome.storage.local.set({
        shortsUsageDate: currentShortsState.shortsUsageDate,
        shortsUsedMs: currentShortsState.shortsUsedMs,
        shortsBlockedUntil: currentShortsState.shortsBlockedUntil
      });
    }
  }

  function formatUnlockTime(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return getLocalDateKey(date) === getLocalDateKey() ? `${hours}:${minutes}` : `завтра, ${hours}:${minutes}`;
  }

  function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
})();
