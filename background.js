"use strict";

const DEBUG = true;
const DEBUG_PREFIX = "[InlineTranslator][BG]";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (DEBUG) {
    console.log(DEBUG_PREFIX, "Received message:", request, "from", sender);
  }

  if (request?.type !== "translate") {
    return;
  }

  const { url } = request;
  if (!url) {
    sendResponse({
      success: false,
      error: "Thiếu URL dịch."
    });
    return;
  }

  (async () => {
    try {
      if (DEBUG) {
        console.log(DEBUG_PREFIX, "Fetching:", url);
      }
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        const error = `Translation API responded with ${response.status}`;
        if (DEBUG) {
          console.warn(DEBUG_PREFIX, error);
        }
        sendResponse({
          success: false,
          error
        });
        return;
      }

      const data = await response.json().catch(() => null);
      if (DEBUG) {
        console.log(DEBUG_PREFIX, "Response data:", data);
      }
      sendResponse({
        success: true,
        data
      });
    } catch (error) {
      if (DEBUG) {
        console.error(DEBUG_PREFIX, "Fetch failed:", error);
      }
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  })();

  return true;
});
