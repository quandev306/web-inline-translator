"use strict";

const DEFAULT_DEBUG_MODE = false;
let debugMode = DEFAULT_DEBUG_MODE;
const DEBUG_PREFIX = "[InlineTranslator][Options]";
const SETTINGS_STORAGE_KEY = "inlineTranslatorSettings";
const DEFAULT_SETTINGS = {
  endpoint: "https://translate.seniordev.uk/translate",
  sourceLang: "eng_Latn",
  targetLang: "vie_Latn",
  developerMode: false
};
const SETTINGS_DATA_PATH = "data/settings.json";
const LANGUAGES_DATA_PATH = "data/languages.json";
const DEFAULT_LANGUAGE_OPTIONS = [
  { code: "eng_Latn", label: "English (Latin script)" },
  { code: "vie_Latn", label: "Vietnamese (Latin script)" }
];
/** @type {LanguageOption[]} */
let languageOptionsCache = normalizeLanguageOptions(DEFAULT_LANGUAGE_OPTIONS);

document.addEventListener("DOMContentLoaded", async () => {
  debugLog("Options page loaded.");
  const form = /** @type {HTMLFormElement} */ (document.getElementById("settings-form"));
  const statusEl = /** @type {HTMLElement} */ (document.getElementById("status"));
  const resetBtn = /** @type {HTMLButtonElement} */ (document.getElementById("reset-defaults"));
  const sourceSelect = /** @type {HTMLSelectElement} */ (document.getElementById("sourceLang"));
  const targetSelect = /** @type {HTMLSelectElement} */ (document.getElementById("targetLang"));
  const developerToggle = /** @type {HTMLInputElement} */ (document.getElementById("developerMode"));
  const endpointInput = /** @type {HTMLInputElement} */ (document.getElementById("endpoint"));
  const endpointWrapper = /** @type {HTMLDivElement} */ (document.getElementById("endpointWrapper"));

  const defaultConfig = await safeLoadDefaultConfig();
  applyDefaultSettings(defaultConfig);
  debugLog("Default settings after config:", DEFAULT_SETTINGS);

  languageOptionsCache = await safeLoadLanguageOptions();
  debugLog("Language options loaded:", languageOptionsCache.length);
  populateLanguageSelect(sourceSelect, languageOptionsCache);
  populateLanguageSelect(targetSelect, languageOptionsCache);

  const settings = await loadSettings();
  debugLog("Loaded saved settings:", settings);
  populateForm(form, settings);
  if (developerToggle && endpointInput && endpointWrapper) {
    updateEndpointState(endpointInput, developerToggle, endpointWrapper, settings.developerMode);

    developerToggle.addEventListener("change", () => {
      updateEndpointState(endpointInput, developerToggle, endpointWrapper, developerToggle.checked);
      if (!developerToggle.checked) {
        endpointInput.value = DEFAULT_SETTINGS.endpoint;
      }
    });
  } else {
    debugWarn("Developer mode controls not found in DOM.");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const settings = extractSettings(form);
    debugLog("Submitting settings:", settings);
    try {
      await saveSettings(settings);
      debugLog("Settings saved successfully.");
      showStatus(statusEl, "Đã lưu thiết lập mới.", false);
    } catch (error) {
      debugError("Failed to save settings:", error);
      showStatus(
        statusEl,
        `Không thể lưu thiết lập: ${
          error instanceof Error ? error.message : "Lỗi không xác định"
        }`,
        true
      );
    }
  });

  resetBtn.addEventListener("click", async () => {
    debugLog("Reset to defaults triggered.");
    populateForm(form, DEFAULT_SETTINGS);
    try {
      await saveSettings(DEFAULT_SETTINGS);
      debugLog("Defaults saved.");
      showStatus(statusEl, "Đã khôi phục về mặc định.", false);
    } catch (error) {
      debugError("Failed to save defaults:", error);
      showStatus(
        statusEl,
        `Không thể khôi phục mặc định: ${
          error instanceof Error ? error.message : "Lỗi không xác định"
        }`,
        true
      );
    }
  });
});

/**
 * @param {HTMLFormElement} form
 * @param {TranslatorSettings} settings
 */
function populateForm(form, settings) {
  debugLog("populateForm with settings:", settings);
  form.endpoint.value = settings.developerMode ? settings.endpoint : DEFAULT_SETTINGS.endpoint;
  setSelectValue(/** @type {HTMLSelectElement} */ (form.sourceLang), settings.sourceLang, DEFAULT_SETTINGS.sourceLang);
  setSelectValue(/** @type {HTMLSelectElement} */ (form.targetLang), settings.targetLang, DEFAULT_SETTINGS.targetLang);
  const developerToggle = /** @type {HTMLInputElement} */ (form.querySelector("#developerMode"));
  const endpointWrapper = /** @type {HTMLDivElement} */ (form.querySelector("#endpointWrapper"));
  if (developerToggle) {
    developerToggle.checked = Boolean(settings.developerMode);
    updateEndpointState(
      /** @type {HTMLInputElement} */ (form.endpoint),
      developerToggle,
      endpointWrapper,
      developerToggle.checked
    );
  }
}

/**
 * Render the language options into a select element.
 * @param {HTMLSelectElement|null} select
 * @param {LanguageOption[]=} options
 */
function populateLanguageSelect(select, options) {
  if (!select) {
    debugWarn("populateLanguageSelect called with null element.");
    return;
  }

  select.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const values = Array.isArray(options) && options.length ? options : languageOptionsCache;
  debugLog("populateLanguageSelect rendering options:", values.length);
  for (const optionData of values) {
    const normalized = normalizeLanguageOption(optionData);
    if (!normalized.code) {
      continue;
    }
    const option = document.createElement("option");
    option.value = normalized.code;
    option.textContent = normalized.label || normalized.code;
    fragment.appendChild(option);
  }

  select.appendChild(fragment);
}

/**
 * Ensure a select element reflects the chosen value, falling back when needed.
 * @param {HTMLSelectElement|null} select
 * @param {string} value
 * @param {string} fallback
 */
function setSelectValue(select, value, fallback) {
  if (!select) {
    debugWarn("setSelectValue called with null element.");
    return;
  }

  const trimmedValue = typeof value === "string" ? value.trim() : "";
  debugLog("setSelectValue", { value: trimmedValue, fallback });
  ensureOptionExists(select, trimmedValue, getLanguageLabel(trimmedValue));
  select.value = trimmedValue;

  const fallbackValue = typeof fallback === "string" ? fallback.trim() : "";
  if (!select.value && fallbackValue) {
    ensureOptionExists(select, fallbackValue, getLanguageLabel(fallbackValue));
    select.value = fallbackValue;
  }
}

/**
 * Add an option to a select element if it does not already exist.
 * @param {HTMLSelectElement|null} select
 * @param {string} value
 * @param {string} label
 */
function ensureOptionExists(select, value, label) {
  if (!select || !value) {
    return;
  }

  debugLog("ensureOptionExists", { value, label });
  const exists = Array.from(select.options).some((option) => option.value === value);
  if (!exists) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label || value;
    select.appendChild(option);
  }
}

function updateEndpointState(endpointInput, toggle, wrapper, isDeveloperMode) {
  if (!endpointInput || !toggle || !wrapper) {
    return;
  }

  endpointInput.disabled = !isDeveloperMode;
  endpointInput.classList.toggle("options__field--disabled", !isDeveloperMode);
  wrapper.classList.toggle("options__endpoint--visible", isDeveloperMode);
  debugLog("updateEndpointState", { isDeveloperMode });
}

/**
 * Load default configuration safely.
 * @returns {Promise<DefaultConfig|null>}
 */
async function safeLoadDefaultConfig() {
  try {
    return await loadDefaultConfig();
  } catch (error) {
    debugWarn("Không thể tải cấu hình mặc định:", error);
    console.warn("[Options] Không thể tải cấu hình mặc định:", error);
    return null;
  }
}

/**
 * Fetch default settings from the extension data directory.
 * @returns {Promise<DefaultConfig>}
 */
async function loadDefaultConfig() {
  const url = getExtensionUrl(SETTINGS_DATA_PATH);
  if (!url) {
    throw new Error("Không tìm thấy đường dẫn cấu hình.");
  }

  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Tải cấu hình thất bại (${response.status})`);
  }

  const config = await response.json();
  if (!config || typeof config !== "object") {
    throw new Error("Cấu hình không hợp lệ.");
  }

  debugLog("loadDefaultConfig fetched:", config);
  return config;
}

/**
 * Apply values from configuration file onto DEFAULT_SETTINGS.
 * @param {DefaultConfig|null} config
 */
function applyDefaultSettings(config) {
  if (!config) {
    debugWarn("applyDefaultSettings received empty config.");
    setDebugMode(DEFAULT_DEBUG_MODE);
    return;
  }

  if (typeof config.defaultEndpoint === "string" && config.defaultEndpoint.trim()) {
    DEFAULT_SETTINGS.endpoint = config.defaultEndpoint.trim();
  }

  if (typeof config.defaultSourceLang === "string" && config.defaultSourceLang.trim()) {
    DEFAULT_SETTINGS.sourceLang = config.defaultSourceLang.trim();
  }

  if (typeof config.defaultTargetLang === "string" && config.defaultTargetLang.trim()) {
    DEFAULT_SETTINGS.targetLang = config.defaultTargetLang.trim();
  }

  if (typeof config.developerMode === "boolean") {
    DEFAULT_SETTINGS.developerMode = config.developerMode;
  }

  if (typeof config.debug === "boolean") {
    setDebugMode(config.debug);
  } else if (typeof config.debugMode === "boolean") {
    setDebugMode(config.debugMode);
  } else {
    setDebugMode(DEFAULT_DEBUG_MODE);
  }
  debugLog("applyDefaultSettings result:", DEFAULT_SETTINGS);
}

/**
 * Load language options safely, returning a fallback list if necessary.
 * @returns {Promise<LanguageOption[]>}
 */
async function safeLoadLanguageOptions() {
  try {
    const options = await loadLanguageOptions();
    if (options.length) {
      debugLog("safeLoadLanguageOptions succeeded:", options.length);
      return options;
    }
  } catch (error) {
    debugWarn("Không thể tải danh sách ngôn ngữ:", error);
    console.warn("[Options] Không thể tải danh sách ngôn ngữ:", error);
  }

  return cloneDefaultLanguageOptions();
}

/**
 * Fetch the language code dataset and build the unique option list.
 * @returns {Promise<LanguageOption[]>}
 */
async function loadLanguageOptions() {
  const url = getExtensionUrl(LANGUAGES_DATA_PATH);
  if (!url) {
    throw new Error("Không tìm thấy đường dẫn dữ liệu ngôn ngữ.");
  }

  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Tải danh sách ngôn ngữ thất bại (${response.status})`);
  }

  const payload = await response.json();
  debugLog("loadLanguageOptions payload keys:", Object.keys(payload || {}));
  let rawList = [];
  if (Array.isArray(payload?.languages)) {
    rawList = payload.languages;
  } else if (Array.isArray(payload?.detailed)) {
    rawList = payload.detailed;
  } else if (Array.isArray(payload)) {
    rawList = payload;
  } else if (Array.isArray(payload?.general)) {
    rawList = payload.general;
  }

  debugLog("loadLanguageOptions raw list length:", rawList.length);

  return normalizeLanguageOptions(rawList);
}

/**
 * Resolve an extension-relative URL.
 * @param {string} path
 * @returns {string|null}
 */
function getExtensionUrl(path) {
  if (typeof chrome !== "undefined" && chrome?.runtime?.getURL) {
    const resolved = chrome.runtime.getURL(path);
    debugLog("Resolved extension URL:", { path, resolved });
    return resolved;
  }
  debugWarn("Không thể resolve extension URL:", path);
  return null;
}

/**
 * @param {HTMLFormElement} form
 * @returns {TranslatorSettings}
 */
function extractSettings(form) {
  const endpoint = form.endpoint.value.trim();
  const sourceLang = form.sourceLang.value.trim();
  const targetLang = form.targetLang.value.trim();
  const developerMode = /** @type {HTMLInputElement} */ (form.developerMode)?.checked ?? false;

  const extracted = {
    endpoint: developerMode ? endpoint || DEFAULT_SETTINGS.endpoint : DEFAULT_SETTINGS.endpoint,
    sourceLang: sourceLang || DEFAULT_SETTINGS.sourceLang,
    targetLang: targetLang || DEFAULT_SETTINGS.targetLang,
    developerMode
  };
  debugLog("extractSettings:", extracted);
  return extracted;
}

/**
 * @returns {Promise<TranslatorSettings>}
 */
function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([SETTINGS_STORAGE_KEY], (result) => {
      const stored = result?.[SETTINGS_STORAGE_KEY];
      if (stored && typeof stored === "object") {
        const settings = {
          endpoint: typeof stored.endpoint === "string" && stored.endpoint.trim()
            ? stored.endpoint.trim()
            : DEFAULT_SETTINGS.endpoint,
          sourceLang: typeof stored.sourceLang === "string" && stored.sourceLang.trim()
            ? stored.sourceLang.trim()
            : DEFAULT_SETTINGS.sourceLang,
          targetLang: typeof stored.targetLang === "string" && stored.targetLang.trim()
            ? stored.targetLang.trim()
            : DEFAULT_SETTINGS.targetLang,
          developerMode: typeof stored.developerMode === "boolean" ? stored.developerMode : DEFAULT_SETTINGS.developerMode
        };
        debugLog("loadSettings returning stored:", settings);
        resolve(settings);
        return;
      }

      const fallback = { ...DEFAULT_SETTINGS };
      debugLog("loadSettings falling back to defaults:", fallback);
      resolve(fallback);
    });
  });
}

/**
 * @param {TranslatorSettings} settings
 * @returns {Promise<void>}
 */
function saveSettings(settings) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: settings }, () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        debugError("saveSettings failed:", lastError);
        reject(new Error(lastError.message));
        return;
      }
      debugLog("saveSettings success:", settings);
      resolve();
    });
  });
}

/**
 * @param {HTMLElement} statusEl
 * @param {string} message
 * @param {boolean} isError
 */
function showStatus(statusEl, message, isError) {
  debugLog("showStatus", { message, isError });
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#d93025" : "#188038";
  if (message) {
    window.setTimeout(() => {
      statusEl.textContent = "";
    }, 3000);
  }
}

/**
 * Clone the fallback language options.
 * @returns {LanguageOption[]}
 */
function cloneDefaultLanguageOptions() {
  const cloned = normalizeLanguageOptions(DEFAULT_LANGUAGE_OPTIONS);
  debugLog("cloneDefaultLanguageOptions", cloned);
  return cloned;
}

/**
 * @typedef {Object} TranslatorSettings
 * @property {string} endpoint
 * @property {string} sourceLang
 * @property {string} targetLang
 * @property {boolean} developerMode
 */

/**
 * @typedef {Object} DefaultConfig
 * @property {string=} defaultEndpoint
 * @property {string=} defaultSourceLang
 * @property {string=} defaultTargetLang
  * @property {boolean=} developerMode
  * @property {boolean=} debug
  * @property {boolean=} debugMode
 */

/**
 * @typedef {Object} LanguageOption
 * @property {string} code
 * @property {string} label
 */

/**
 * Normalize a language option entry into a {code,label} object.
 * @param {unknown} option
 * @returns {LanguageOption}
 */
function normalizeLanguageOption(option) {
  if (typeof option === "string") {
    const code = option.trim();
    debugLog("normalizeLanguageOption (string)", code);
    return { code, label: code };
  }

  if (option && typeof option === "object") {
    const code = typeof option.code === "string" ? option.code.trim() : "";
    const labelValue = typeof option.label === "string" ? option.label.trim() : "";
    debugLog("normalizeLanguageOption (object)", { code, labelValue });
    return {
      code,
      label: labelValue || code
    };
  }

  debugWarn("normalizeLanguageOption received invalid entry:", option);
  return { code: "", label: "" };
}

/**
 * Normalize and deduplicate a list of language options.
 * @param {unknown} list
 * @returns {LanguageOption[]}
 */
function normalizeLanguageOptions(list) {
  const seen = new Set();
  const normalized = [];

  if (!Array.isArray(list)) {
    return normalized;
  }

  for (const entry of list) {
    const option = normalizeLanguageOption(entry);
    if (!option.code || seen.has(option.code)) {
      continue;
    }
    seen.add(option.code);
    normalized.push(option);
  }

  const sorted = normalized.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  debugLog("normalizeLanguageOptions result count:", sorted.length);
  return sorted;
}

/**
 * Find the display label for a language code.
 * @param {string} code
 * @returns {string}
 */
function getLanguageLabel(code) {
  if (!code) {
    return "";
  }

  const match = languageOptionsCache.find((option) => option.code === code);
  if (match) {
    return match.label;
  }

  return code;
}

function isDebugMode() {
  return debugMode;
}

function setDebugMode(enabled) {
  debugMode = Boolean(enabled);
}

function debugLog(...args) {
  if (!isDebugMode()) {
    return;
  }
  console.log(DEBUG_PREFIX, ...args);
}

function debugWarn(...args) {
  if (!isDebugMode()) {
    return;
  }
  console.warn(DEBUG_PREFIX, ...args);
}

function debugError(...args) {
  if (!isDebugMode()) {
    return;
  }
  console.error(DEBUG_PREFIX, ...args);
}
