(function () {
  "use strict";

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
      tagline: "YouTube для фокуса: поиск, лимиты Shorts и меньше отвлечений.",
      feedbackLink: "Обратная связь",
      settingsAria: "Настройки",
      languageTitle: "Язык",
      languageHint: "Меняет язык интерфейса расширения.",
      languageAria: "Язык расширения",
      languageRu: "Русский",
      languageEu: "English (EU)",
      homeSearchTitle: "Поиск на главной",
      homeSearchHint: "Когда выключено, главная YouTube снова показывает обычные рекомендации.",
      shortsHint: "Можно выключить полностью, разрешить или включить дневной лимит.",
      shortsModeAria: "Режим Shorts",
      shortsModeBlocked: "Отключены",
      shortsModeLimited: "Лимит",
      shortsModeAllowed: "Разрешены",
      watchTimeLabel: "Время просмотра",
      dailyLimitAria: "Лимит просмотра Shorts",
      minutes5: "5 минут",
      minutes10: "10 минут",
      minutes15: "15 минут",
      minutes30: "30 минут",
      minutes60: "60 минут",
      afterLimitLabel: "После лимита",
      blockModeAria: "Срок блокировки Shorts",
      untilTomorrow: "До завтра",
      selectedTime: "На выбранное время",
      blockTermLabel: "Срок",
      blockHoursAria: "Количество часов блокировки Shorts",
      hour1: "1 час",
      hour3: "3 часа",
      hour6: "6 часов",
      hour12: "12 часов",
      hour24: "24 часа",
      sidebarTitle: "Разрешить боковую панель",
      sidebarHint: "Кнопка меню сможет открывать полную панель слева.",
      blurTitle: "Блюрить рекомендации при просмотре",
      blurHint: "Скрывает боковые рекомендации на странице видео. Кнопка с глазом временно показывает их обратно.",
      supportAria: "Поддержать разработчика",
      supportTitle: "Поддержать разработчика",
      supportHint: "Если расширение помогает не залипать в YouTube, можно сказать спасибо.",
      supportButton: "Поддержать через ЮMoney",
      shortsBlockedStatus: "Shorts выключены.",
      shortsAllowedStatus: "Shorts разрешены без лимита.",
      shortsBlockedUntilStatus: "Shorts заблокированы до {time}.",
      remainingStatus: "Осталось {minutes} мин.",
      savedStatus: "Сохранено",
      openingSupportStatus: "Открываю ЮMoney...",
      supportErrorStatus: "Не удалось открыть ЮMoney",
      tomorrowTime: "завтра, {time}"
    },
    eu: {
      tagline: "YouTube for focus: search, Shorts limits, and fewer distractions.",
      feedbackLink: "Feedback",
      settingsAria: "Settings",
      languageTitle: "Language",
      languageHint: "Changes the extension interface language.",
      languageAria: "Extension language",
      languageRu: "Russian",
      languageEu: "English (EU)",
      homeSearchTitle: "Search-only home",
      homeSearchHint: "When disabled, YouTube home shows normal recommendations again.",
      shortsHint: "Block Shorts completely, allow them, or use a daily limit.",
      shortsModeAria: "Shorts mode",
      shortsModeBlocked: "Blocked",
      shortsModeLimited: "Limited",
      shortsModeAllowed: "Allowed",
      watchTimeLabel: "Watch time",
      dailyLimitAria: "Shorts watch limit",
      minutes5: "5 minutes",
      minutes10: "10 minutes",
      minutes15: "15 minutes",
      minutes30: "30 minutes",
      minutes60: "60 minutes",
      afterLimitLabel: "After limit",
      blockModeAria: "Shorts block duration",
      untilTomorrow: "Until tomorrow",
      selectedTime: "For selected time",
      blockTermLabel: "Duration",
      blockHoursAria: "Shorts block hours",
      hour1: "1 hour",
      hour3: "3 hours",
      hour6: "6 hours",
      hour12: "12 hours",
      hour24: "24 hours",
      sidebarTitle: "Allow sidebar",
      sidebarHint: "The menu button will be able to open the full left sidebar.",
      blurTitle: "Blur watch recommendations",
      blurHint: "Hides side recommendations on video pages. The eye button temporarily reveals them.",
      supportAria: "Support the developer",
      supportTitle: "Support the developer",
      supportHint: "If the extension helps you avoid YouTube rabbit holes, you can say thanks.",
      supportButton: "Support via YooMoney",
      shortsBlockedStatus: "Shorts are blocked.",
      shortsAllowedStatus: "Shorts are allowed without a limit.",
      shortsBlockedUntilStatus: "Shorts are blocked until {time}.",
      remainingStatus: "{minutes} min left.",
      savedStatus: "Saved",
      openingSupportStatus: "Opening YooMoney...",
      supportErrorStatus: "Could not open YooMoney",
      tomorrowTime: "tomorrow, {time}"
    }
  };

  const language = document.getElementById("language");
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

    syncFormFromSettings();
    applyLanguage();
    renderShortsLimitControls();

    language.addEventListener("change", () => saveSetting("language", language.value));
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

      if (areaName === "sync" && SETTINGS_KEYS.some((key) => Boolean(changes[key]))) {
        currentSettings = normalizeSettings({
          homeSearchOnlyEnabled: changes.homeSearchOnlyEnabled?.newValue ?? currentSettings.homeSearchOnlyEnabled,
          shortsMode: changes.shortsMode?.newValue ?? currentSettings.shortsMode,
          shortsDailyLimitMinutes: changes.shortsDailyLimitMinutes?.newValue ?? currentSettings.shortsDailyLimitMinutes,
          shortsBlockMode: changes.shortsBlockMode?.newValue ?? currentSettings.shortsBlockMode,
          shortsBlockHours: changes.shortsBlockHours?.newValue ?? currentSettings.shortsBlockHours,
          allowGuideOpen: changes.allowGuideOpen?.newValue ?? currentSettings.allowGuideOpen,
          blurWatchRecommendations: changes.blurWatchRecommendations?.newValue ?? currentSettings.blurWatchRecommendations,
          language: changes.language?.newValue ?? currentSettings.language,
          blockShorts: changes.blockShorts?.newValue
        }).settings;
        refreshShortsState();
        syncFormFromSettings();
        applyLanguage();
        renderShortsLimitControls();
      }
    });
  }

  function saveSetting(key, value) {
    currentSettings = normalizeSettings({ ...currentSettings, [key]: value }).settings;
    refreshShortsState();
    syncFormFromSettings();
    applyLanguage();
    renderShortsLimitControls();
    chrome.storage.sync.set({ [key]: currentSettings[key] }, () => {
      status.textContent = t("savedStatus");
      window.setTimeout(() => {
        status.textContent = "";
      }, 1200);
    });
  }

  function syncFormFromSettings() {
    language.value = currentSettings.language;
    homeSearchOnlyEnabled.checked = currentSettings.homeSearchOnlyEnabled;
    shortsMode.value = currentSettings.shortsMode;
    shortsDailyLimitMinutes.value = String(currentSettings.shortsDailyLimitMinutes);
    shortsBlockMode.value = currentSettings.shortsBlockMode;
    shortsBlockHours.value = String(currentSettings.shortsBlockHours);
    allowGuideOpen.checked = currentSettings.allowGuideOpen;
    blurWatchRecommendations.checked = currentSettings.blurWatchRecommendations;
  }

  function applyLanguage() {
    document.documentElement.lang = currentSettings.language === "eu" ? "en" : "ru";

    for (const element of document.querySelectorAll("[data-i18n]")) {
      element.textContent = t(element.dataset.i18n);
    }

    for (const element of document.querySelectorAll("[data-i18n-aria]")) {
      element.setAttribute("aria-label", t(element.dataset.i18nAria));
    }
  }

  function renderShortsLimitControls() {
    const limited = currentSettings.shortsMode === "limited";
    shortsLimitControls.hidden = !limited;
    shortsBlockHoursRow.hidden = currentSettings.shortsBlockMode !== "hours";

    if (currentSettings.shortsMode === "blocked") {
      shortsLimitStatus.textContent = t("shortsBlockedStatus");
      return;
    }

    if (currentSettings.shortsMode === "allowed") {
      shortsLimitStatus.textContent = t("shortsAllowedStatus");
      return;
    }

    const now = Date.now();
    if (currentShortsState.shortsBlockedUntil > now) {
      shortsLimitStatus.textContent = t("shortsBlockedUntilStatus", {
        time: formatUnlockTime(currentShortsState.shortsBlockedUntil)
      });
      return;
    }

    const limitMs = currentSettings.shortsDailyLimitMinutes * 60 * 1000;
    const remainingMinutes = Math.max(0, Math.ceil((limitMs - currentShortsState.shortsUsedMs) / 60000));
    shortsLimitStatus.textContent = t("remainingStatus", { minutes: remainingMinutes });
  }

  async function openYooMoneyPayment() {
    supportButton.disabled = true;
    status.textContent = t("openingSupportStatus");

    try {
      const response = await sendRuntimeMessage({ type: "ytsho:open-support" });
      if (!response?.ok) {
        throw new Error(response?.error || "YooMoney payment URL was not opened");
      }
      status.textContent = "";
    } catch {
      status.textContent = t("supportErrorStatus");
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
        blurWatchRecommendations: value?.blurWatchRecommendations === true,
        language: LANGUAGES.has(value?.language) ? value.language : DEFAULT_SETTINGS.language
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
    const time = `${hours}:${minutes}`;
    return getLocalDateKey(date) === getLocalDateKey() ? time : t("tomorrowTime", { time });
  }

  function t(key, params = {}) {
    const dictionary = TEXT[currentSettings.language] ?? TEXT[DEFAULT_SETTINGS.language];
    const template = dictionary[key] ?? TEXT[DEFAULT_SETTINGS.language][key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_match, name) => String(params[name] ?? ""));
  }

  function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
})();
