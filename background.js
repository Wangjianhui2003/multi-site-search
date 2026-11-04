import {
  buildSearchUrl,
  getSelectedSites,
  getSitesByIds,
} from "./sites.js";
import { loadSettings } from "./storage.js";

const OPEN_MESSAGE = "multi-search:open";
const CONTEXT_MENU_ID = "multi-search-selection";
const MAX_QUERY_LENGTH = 2000;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      {
        id: CONTEXT_MENU_ID,
        title: 'Multi-search "%s"',
        contexts: ["selection"],
      },
      () => {
        // Reading lastError suppresses a harmless duplicate-menu warning.
        void chrome.runtime.lastError;
      },
    );
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !info.selectionText) {
    return;
  }

  openSearches(info.selectionText)
    .then(focusResults)
    .catch((error) => console.error("Multi Search:", error));
});

chrome.omnibox.setDefaultSuggestion({
  description: "Search across your selected sites",
});

let suggestionRequest = 0;

chrome.omnibox.onInputChanged.addListener(async (text) => {
  const query = normalizeQuery(text);
  const request = ++suggestionRequest;

  if (!query) {
    chrome.omnibox.setDefaultSuggestion({
      description: "Search across your selected sites",
    });
    return;
  }

  chrome.omnibox.setDefaultSuggestion({
    description: `Multi-search “${escapeXml(truncate(query, 80))}”`,
  });

  try {
    const settings = await loadSettings();
    const count = getSelectedSites(settings).length;

    if (request !== suggestionRequest) {
      return;
    }

    const description =
      count > 0
        ? `Search ${count} ${count === 1 ? "site" : "sites"} for “${escapeXml(
            truncate(query, 80),
          )}”`
        : "No sites selected. Open Multi Search settings to choose sites.";

    chrome.omnibox.setDefaultSuggestion({ description });
  } catch (error) {
    console.error("Multi Search:", error);
  }
});

chrome.omnibox.onInputEntered.addListener((text) => {
  openSearches(text)
    .then(focusResults)
    .catch((error) => console.error("Multi Search:", error));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== OPEN_MESSAGE) {
    return false;
  }

  openSearches(message.query, message.siteIds)
    .then((result) => {
      sendResponse({ ok: true, count: result.count });
      focusResults(result).catch((error) =>
        console.error("Multi Search:", error),
      );
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error.message || "Could not open the search tabs.",
      });
    });

  return true;
});

async function openSearches(rawQuery, requestedSiteIds) {
  const query = normalizeQuery(rawQuery);

  if (!query) {
    throw new Error("Enter a search query.");
  }

  const settings = await loadSettings();
  const sites = Array.isArray(requestedSiteIds)
    ? getSitesByIds(settings, requestedSiteIds)
    : getSelectedSites(settings);

  if (sites.length === 0) {
    throw new Error("No sites selected. Choose at least one site first.");
  }

  const urls = sites.map((site) => buildSearchUrl(site, query));

  if (settings.openInNewWindow) {
    const window = await chrome.windows.create({
      url: urls,
      type: "normal",
      focused: false,
    });

    return {
      count: urls.length,
      windowId: window.id,
      firstTabId: null,
    };
  }

  const tabs = [];

  for (const url of urls) {
    const tab = await chrome.tabs.create({ url, active: false });
    tabs.push(tab);
  }

  return {
    count: urls.length,
    windowId: null,
    firstTabId: tabs.find((tab) => typeof tab.id === "number")?.id ?? null,
  };
}

async function focusResults(result) {
  if (typeof result.windowId === "number") {
    await chrome.windows.update(result.windowId, { focused: true });
    return;
  }

  if (typeof result.firstTabId === "number") {
    await chrome.tabs.update(result.firstTabId, { active: true });
  }
}

function normalizeQuery(value) {
  if (typeof value !== "string") {
    return "";
  }

  return Array.from(value.trim()).slice(0, MAX_QUERY_LENGTH).join("");
}

function truncate(value, length) {
  const characters = Array.from(value);
  return characters.length > length
    ? `${characters.slice(0, length).join("")}…`
    : value;
}

function escapeXml(value) {
  return value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character],
  );
}
