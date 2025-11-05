"use strict";

const DEFAULT_DEBUG_MODE = false;
let debugMode = DEFAULT_DEBUG_MODE;
const DEBUG_PREFIX = "[InlineTranslator]";
const SETTINGS_STORAGE_KEY = "inlineTranslatorSettings";
const DEFAULT_SETTINGS = {
  endpoint: "https://translate.seniordev.uk/translate",
  sourceLang: "eng_Latn",
  targetLang: "vie_Latn",
  developerMode: false
};

const SETTINGS_DATA_PATH = "data/settings.json";
const MAX_TEXT_LENGTH = 500;

const STATE = {
  DEFAULT: "default",
  LOADING: "loading",
  ERROR: "error"
};

/** @type {TranslatorSettings} */
let currentSettings = { ...DEFAULT_SETTINGS };
let settingsLoaded = false;
let settingsSyncPromise = null;
let lastSettingsSync = 0;
const SETTINGS_SYNC_THROTTLE_MS = 5000;

(async () => {
  debugLog("Bootstrapping content script...");
  await loadDefaultConfig();
  currentSettings = { ...DEFAULT_SETTINGS };
  await syncSettingsFromStorage();
  initializeSettings();
  debugLog("Initial settings loaded:", currentSettings);
})();

document.addEventListener("keydown", async (event) => {
  if (!shouldHandleEvent(event)) {
    return;
  }

  debugLog("Handling keydown for translation.", {
    key: event.key,
    code: event.code,
    alt: event.altKey,
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    repeat: event.repeat
  });

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    debugLog("No selection detected, abort.");
    return;
  }

  const selectedText = selection.toString().trim();
  if (!selectedText) {
    debugLog("Selection empty after trimming, abort.");
    return;
  }

  event.preventDefault();

  const baseStyle = extractSelectionStyle(selection);

  debugLog("Shortcut Option+T triggered.", {
    length: selectedText.length,
    preview: selectedText.slice(0, 80)
  });
  await ensureSettingsFresh();

  if (selectedText.length > MAX_TEXT_LENGTH) {
    debugWarn(`Selected text too long (${selectedText.length} chars).`);
    renderMessage(selection, "Đoạn văn bản được chọn quá dài (tối đa 500 ký tự).", STATE.ERROR, baseStyle);
    return;
  }

  debugLog("Translating selection with settings:", currentSettings);
  const loadingBubble = renderMessage(selection, "Đang dịch…", STATE.LOADING, baseStyle);

  try {
    const translated = await translate(selectedText);
    debugLog("Translation success:", translated);
    updateBubble(loadingBubble, translated, STATE.DEFAULT, baseStyle);
  } catch (error) {
    debugError("Inline translator error:", error);
    updateBubble(
      loadingBubble,
      "Không thể dịch. Kiểm tra kết nối mạng hoặc thử lại sau.",
      STATE.ERROR,
      baseStyle
    );
  }
}, true);

/**
 * Determine if the key event should trigger the translator.
 * @param {KeyboardEvent} event
 * @returns {boolean}
 */
function shouldHandleEvent(event) {
  if (event.repeat) {
    return false;
  }

  if (event.altKey) {
    debugLog("Keydown detected:", {
      key: event.key,
      code: event.code,
      alt: event.altKey,
      ctrl: event.ctrlKey,
      meta: event.metaKey
    });
  }

  if (!event.altKey) {
    return false;
  }

  const isKeyT = event.code === "KeyT" || (typeof event.key === "string" && event.key.toLowerCase() === "t");
  if (!isKeyT) {
    return false;
  }

  const activeElement = document.activeElement;
  if (activeElement && isEditable(activeElement)) {
    return false;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;

  return !isEditable(anchorNode) && !isEditable(focusNode);
}

/**
 * Check if a node is part of an editable element.
 * @param {Node|null} node
 * @returns {boolean}
 */
function isEditable(node) {
  if (!node) {
    return false;
  }

  const element = node.nodeType === Node.ELEMENT_NODE ? /** @type {Element} */ (node) : node.parentElement;
  if (!element) {
    return false;
  }

  if (element.closest("[contenteditable='true']")) {
    return true;
  }

  const tag = element.tagName;
  return tag === "INPUT" || tag === "TEXTAREA";
}

/**
 * Call the translation API.
 * @param {string} text
 * @returns {Promise<string>}
 */
async function translate(text) {
  const url = buildRequestUrl(text);
  debugLog("Requesting translation via background:", url);
  let message;

  try {
    message = await chrome.runtime.sendMessage({
      type: "translate",
      url
    });
  } catch (runtimeError) {
    debugError("Runtime messaging failed:", runtimeError);
    throw new Error(runtimeError instanceof Error ? runtimeError.message : String(runtimeError));
  }

  if (!message?.success) {
    const errorMessage = message?.error || "Translation request failed.";
    debugWarn(`Background error: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  /** @type {{translated?: string, translatedText?: string, translation?: string, result?: string}|null} */
  const data = message.data ?? null;
  debugLog("Background response payload:", data);
  const translated =
    data?.translated ||
    data?.translatedText ||
    data?.translation ||
    data?.result;

  if (typeof translated === "string" && translated.trim().length > 0) {
    return translated;
  }

  throw new Error("No translation returned from API");
}

/**
 * Build endpoint URL using current settings.
 * @param {string} text
 * @returns {string}
 */
function buildRequestUrl(text) {
  const effective = currentSettings?.endpoint?.trim() || DEFAULT_SETTINGS.endpoint;
  if (!effective) {
    throw new Error("API endpoint chưa được cấu hình.");
  }

  let url;
  try {
    url = new URL(effective);
  } catch {
    try {
      url = new URL(`https://${effective}`);
    } catch {
      throw new Error("API endpoint không hợp lệ.");
    }
  }

  url.searchParams.set("q", text);

  const source = currentSettings?.sourceLang?.trim();
  const target = currentSettings?.targetLang?.trim();

  if (source) {
    // url.searchParams.set("source", source);
    url.searchParams.set("src", source);
  }

  if (target) {
    // url.searchParams.set("target", target);
    url.searchParams.set("tgt", target);
  }

  const finalUrl = url.toString();
  debugLog("buildRequestUrl", { source, target, finalUrl });
  return finalUrl;
}

/**
 * Insert a bubble element next to the selection.
 * @param {Selection} selection
 * @param {string} text
 * @param {string} state
 * @returns {HTMLElement}
 */
function renderMessage(selection, text, state, baseStyle) {
  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(false);

  const bubble = createBubble(text, state, baseStyle);
  insertBubble(range, bubble);
  selection.removeAllRanges();

  return bubble;
}

/**
 * Update an existing bubble element.
 * @param {HTMLElement} bubble
 * @param {string} text
 * @param {string} state
 */
function updateBubble(bubble, text, state, baseStyle) {
  const textElement = bubble.querySelector(".inline-translation__text");
  if (textElement) {
    textElement.textContent = state === STATE.DEFAULT ? `[${text}]` : text;
  }

  bubble.classList.remove(
    "inline-translation--loading",
    "inline-translation--error",
    "inline-translation--default"
  );

  switch (state) {
    case STATE.LOADING:
      bubble.classList.add("inline-translation--loading");
      break;
    case STATE.ERROR:
      bubble.classList.add("inline-translation--error");
      break;
    default:
      bubble.classList.add("inline-translation--default");
      break;
  }

  const style = baseStyle ?? readStoredStyle(bubble);
  if (style && textElement) {
    applyInlineStyle(bubble, textElement, style);
  }
}

/**
 * Generate the DOM node used to display translations.
 * @param {string} text
 * @param {string} state
 * @returns {HTMLElement}
 */
function createBubble(text, state, baseStyle) {
  const bubble = document.createElement("span");
  bubble.className = "inline-translation inline-translation--default";
  bubble.dataset.inlineTranslator = "true";
  bubble.setAttribute("role", "note");

  if (state === STATE.LOADING) {
    bubble.classList.remove("inline-translation--default");
    bubble.classList.add("inline-translation--loading");
  } else if (state === STATE.ERROR) {
    bubble.classList.remove("inline-translation--default");
    bubble.classList.add("inline-translation--error");
  }

  const textElement = document.createElement("span");
  textElement.className = "inline-translation__text";
  textElement.textContent = state === STATE.DEFAULT ? `[${text}]` : text;

  if (baseStyle) {
    storeStyle(bubble, baseStyle);
    applyInlineStyle(bubble, textElement, baseStyle);
  }

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "inline-translation__close";
  removeButton.setAttribute("aria-label", "Xóa đoạn dịch");
  const bracketOpen = document.createElement("span");
  bracketOpen.className = "inline-translation__bracket";
  bracketOpen.textContent = "[";
  const closeX = document.createElement("span");
  closeX.className = "inline-translation__close-x";
  closeX.textContent = "X";
  const bracketClose = document.createElement("span");
  bracketClose.className = "inline-translation__bracket";
  bracketClose.textContent = "]";
  removeButton.append(bracketOpen, closeX, bracketClose);
  removeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    bubble.remove();
  });

  bubble.append(textElement, removeButton);
  return bubble;
}

/**
 * Insert the bubble after the selection.
 * @param {Range} range
 * @param {HTMLElement} bubble
 */
function insertBubble(range, bubble) {
  range.insertNode(bubble);

  const previousSibling = bubble.previousSibling;
  const needsSpaceBefore =
    previousSibling?.nodeType === Node.TEXT_NODE && !/\s$/.test(previousSibling.textContent || "");

  if (needsSpaceBefore && bubble.parentNode) {
    bubble.parentNode.insertBefore(document.createTextNode(" "), bubble);
  }
}

/**
 * Capture style from the current selection to reuse for the translation bubble.
 * @param {Selection} selection
 * @returns {InlineStyle|null}
 */
function extractSelectionStyle(selection) {
  const range = selection.getRangeAt(0);
  let baseNode = range.startContainer;

  if (baseNode.nodeType === Node.TEXT_NODE) {
    baseNode = baseNode.parentElement;
  }

  if (!baseNode || !(baseNode instanceof Element)) {
    return null;
  }

  const computed = window.getComputedStyle(baseNode);
  return {
    fontFamily: computed.fontFamily,
    fontSize: computed.fontSize,
    fontWeight: computed.fontWeight,
    fontStyle: computed.fontStyle,
    lineHeight: computed.lineHeight,
    letterSpacing: computed.letterSpacing
  };
}

/**
 * @typedef {Object} InlineStyle
 * @property {string} fontFamily
 * @property {string} fontSize
 * @property {string} fontWeight
 * @property {string} fontStyle
 * @property {string} lineHeight
 * @property {string} letterSpacing
 */

/**
 * Apply captured style to bubble/text nodes.
 * @param {HTMLElement} bubble
 * @param {HTMLElement} textElement
 * @param {InlineStyle} style
 */
function applyInlineStyle(bubble, textElement, style) {
  bubble.style.fontFamily = style.fontFamily;
  bubble.style.fontSize = style.fontSize;
  bubble.style.fontStyle = style.fontStyle;
  bubble.style.fontWeight = style.fontWeight;
  if (style.lineHeight && style.lineHeight !== "normal") {
    bubble.style.lineHeight = style.lineHeight;
  }
  if (style.letterSpacing && style.letterSpacing !== "normal") {
    textElement.style.letterSpacing = style.letterSpacing;
  }
}

/**
 * Store style data on the bubble for later reuse.
 * @param {HTMLElement} bubble
 * @param {InlineStyle} style
 */
function storeStyle(bubble, style) {
  try {
    bubble.dataset.inlineTranslatorStyle = JSON.stringify(style);
  } catch {
    // Ignore JSON serialization errors.
  }
}

/**
 * Retrieve stored style from the bubble dataset.
 * @param {HTMLElement} bubble
 * @returns {InlineStyle|null}
 */
function readStoredStyle(bubble) {
  const raw = bubble.dataset.inlineTranslatorStyle;
  if (!raw) {
    return null;
  }

  try {
    /** @type {InlineStyle} */
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @typedef {Object} TranslatorSettings
 * @property {string} endpoint
 * @property {string} sourceLang
 * @property {string} targetLang
 * @property {boolean} developerMode
 */

/**
 * Initialize settings from storage and subscribe to updates.
 */
function initializeSettings() {
  if (!chrome?.storage?.sync) {
    currentSettings = { ...DEFAULT_SETTINGS };
    debugWarn("chrome.storage.sync unavailable; using defaults only.");
    return;
  }

  chrome.storage.onChanged?.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(changes, SETTINGS_STORAGE_KEY)) {
      const change = changes[SETTINGS_STORAGE_KEY];
      const newValue = change?.newValue;
      setCurrentSettings(newValue);
      settingsLoaded = true;
      lastSettingsSync = Date.now();
       debugLog("Settings updated via storage.onChanged:", currentSettings);
    }
  });
}

/**
 * Merge stored settings with defaults.
 * @param {Partial<TranslatorSettings>|undefined|null} raw
 */
function setCurrentSettings(raw) {
  currentSettings = normalizeSettings(raw);
  debugLog("setCurrentSettings:", currentSettings);
}

/**
 * Normalize user-defined settings to ensure sane defaults.
 * @param {Partial<TranslatorSettings>|undefined|null} raw
 * @returns {TranslatorSettings}
 */
function normalizeSettings(raw) {
  const normalized = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== "object") {
    debugLog("normalizeSettings fallback triggered (invalid raw):", raw);
    return normalized;
  }

  if (typeof raw.endpoint === "string" && raw.endpoint.trim()) {
    normalized.endpoint = raw.endpoint.trim();
  }

  if (typeof raw.sourceLang === "string") {
    normalized.sourceLang = raw.sourceLang.trim() || DEFAULT_SETTINGS.sourceLang;
  }

  if (typeof raw.targetLang === "string") {
    normalized.targetLang = raw.targetLang.trim() || DEFAULT_SETTINGS.targetLang;
  }

  if (typeof raw.developerMode === "boolean") {
    normalized.developerMode = raw.developerMode;
  }

  return normalized;
}

/**
 * Ensure current settings are up-to-date by syncing from storage if needed.
 * @returns {Promise<void>}
 */
async function ensureSettingsFresh() {
  if (!chrome?.storage?.sync) {
    return;
  }

  if (settingsSyncPromise) {
    debugLog("Awaiting in-flight settings sync.");
    await settingsSyncPromise;
    return;
  }

  if (settingsLoaded && Date.now() - lastSettingsSync < SETTINGS_SYNC_THROTTLE_MS) {
    debugLog("Settings considered fresh (within throttle).");
    return;
  }

  debugLog("Syncing settings from storage (ensureSettingsFresh).");
  settingsSyncPromise = syncSettingsFromStorage();
  try {
    await settingsSyncPromise;
  } finally {
    settingsSyncPromise = null;
  }
}

/**
 * Sync settings from chrome.storage.sync and update currentSettings.
 * @returns {Promise<void>}
 */
function syncSettingsFromStorage() {
  if (!chrome?.storage?.sync) {
    settingsLoaded = true;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    chrome.storage.sync.get([SETTINGS_STORAGE_KEY], (result) => {
      if (chrome.runtime?.lastError) {
        debugError("Failed reading settings from storage:", chrome.runtime.lastError);
        resolve();
        return;
      }

      const stored = result?.[SETTINGS_STORAGE_KEY];
      if (stored) {
        setCurrentSettings(stored);
        debugLog("Settings synchronized from storage:", currentSettings);
      }
      settingsLoaded = true;
      lastSettingsSync = Date.now();
      resolve();
    });
  });
}

/**
 * Fetch default settings from bundled config file and merge into DEFAULT_SETTINGS.
 * @returns {Promise<void>}
 */
async function loadDefaultConfig() {
  const url = getExtensionUrl(SETTINGS_DATA_PATH);
  if (!url) {
    setDebugMode(DEFAULT_DEBUG_MODE);
    return;
  }

  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Tải cấu hình thất bại (${response.status})`);
    }

    const config = await response.json();
    applyDefaultConfig(config);
  } catch (error) {
    setDebugMode(DEFAULT_DEBUG_MODE);
    debugWarn("Không thể tải cấu hình mặc định:", error);
  }
}

/**
 * Merge config values into default settings safely.
 * @param {DefaultConfig|null} config
 */
function applyDefaultConfig(config) {
  if (!config || typeof config !== "object") {
    debugWarn("applyDefaultConfig called with invalid payload:", config);
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

  debugLog("Default config applied:", DEFAULT_SETTINGS);
}

function getExtensionUrl(path) {
  if (typeof chrome !== "undefined" && chrome?.runtime?.getURL) {
    const resolved = chrome.runtime.getURL(path);
    debugLog("Resolved extension URL:", { path, resolved });
    return resolved;
  }
  debugWarn("Unable to resolve extension URL; chrome.runtime.getURL missing.", path);
  return null;
}

/**
 * @typedef {Object} DefaultConfig
 * @property {string=} defaultEndpoint
 * @property {string=} defaultSourceLang
 * @property {string=} defaultTargetLang
 * @property {boolean=} developerMode
 * @property {boolean=} debug
 * @property {boolean=} debugMode
*/
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
