/**
 * Site definitions and settings helpers shared by the popup, options page,
 * and service worker.
 *
 * Every site is stored as an editable custom site. The preconfigured list
 * below is only used to seed a new install or restore the defaults.
 *
 * Search URLs use {query} as the placeholder for the encoded search text.
 */

export const SETTINGS_VERSION = 2;

export const PRECONFIGURED_SITES = Object.freeze([
  {
    id: "google",
    name: "Google",
    url: "https://www.google.com/search?q={query}",
  },
  {
    id: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com/results?search_query={query}",
  },
  {
    id: "reddit",
    name: "Reddit",
    url: "https://www.reddit.com/search/?q={query}",
  },
  {
    id: "wikipedia",
    name: "Wikipedia",
    url: "https://en.wikipedia.org/w/index.php?search={query}",
  },
  {
    id: "github",
    name: "GitHub",
    url: "https://github.com/search?q={query}&type=repositories",
  },
  {
    id: "stackoverflow",
    name: "Stack Overflow",
    url: "https://stackoverflow.com/search?q={query}",
  },
  {
    id: "amazon",
    name: "Amazon",
    url: "https://www.amazon.com/s?k={query}",
  },
  {
    id: "google-images",
    name: "Google Images",
    url: "https://www.google.com/search?tbm=isch&q={query}",
  },
  {
    id: "bing",
    name: "Bing",
    url: "https://www.bing.com/search?q={query}",
  },
  {
    id: "duckduckgo",
    name: "DuckDuckGo",
    url: "https://duckduckgo.com/?q={query}",
  },
  {
    id: "brave",
    name: "Brave Search",
    url: "https://search.brave.com/search?q={query}",
  },
  {
    id: "google-news",
    name: "Google News",
    url: "https://news.google.com/search?q={query}",
  },
  {
    id: "x",
    name: "X",
    url: "https://x.com/search?q={query}",
  },
  {
    id: "hacker-news",
    name: "Hacker News",
    url: "https://hn.algolia.com/?q={query}",
  },
  {
    id: "spotify",
    name: "Spotify",
    url: "https://open.spotify.com/search/{query}",
  },
  {
    id: "ebay",
    name: "eBay",
    url: "https://www.ebay.com/sch/i.html?_nkw={query}",
  },
  {
    id: "etsy",
    name: "Etsy",
    url: "https://www.etsy.com/search?q={query}",
  },
  {
    id: "mdn",
    name: "MDN",
    url: "https://developer.mozilla.org/en-US/search?q={query}",
  },
  {
    id: "npm",
    name: "npm",
    url: "https://www.npmjs.com/search?q={query}",
  },
  {
    id: "pypi",
    name: "PyPI",
    url: "https://pypi.org/search/?q={query}",
  },
  {
    id: "google-scholar",
    name: "Google Scholar",
    url: "https://scholar.google.com/scholar?q={query}",
  },
  {
    id: "arxiv",
    name: "arXiv",
    url: "https://arxiv.org/search/?query={query}&searchtype=all",
  },
  {
    id: "imdb",
    name: "IMDb",
    url: "https://www.imdb.com/find/?q={query}",
  },
  {
    id: "goodreads",
    name: "Goodreads",
    url: "https://www.goodreads.com/search?q={query}",
  },
  {
    id: "google-maps",
    name: "Google Maps",
    url: "https://www.google.com/maps/search/?api=1&query={query}",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    url: "https://www.perplexity.ai/search?q={query}",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    url: "https://chatgpt.com/?q={query}",
  },
]);

export const DEFAULT_SETTINGS = Object.freeze({
  settingsVersion: SETTINGS_VERSION,
  enabledSiteIds: Object.freeze([
    "google",
    "youtube",
    "reddit",
    "wikipedia",
    "github",
    "stackoverflow",
    "amazon",
    "google-images",
  ]),
  selectedSiteIds: Object.freeze([
    "google",
    "reddit",
    "wikipedia",
    "youtube",
  ]),
  customSites: PRECONFIGURED_SITES,
  openInNewWindow: false,
});

export function allSites(settings = {}) {
  const sites = Array.isArray(settings.customSites)
    ? settings.customSites
    : [];

  return sites.map((site) => ({ ...site }));
}

export function getSite(siteId, settings = {}) {
  return allSites(settings).find((site) => site.id === siteId) || null;
}

export function getSitesByIds(settings, siteIds) {
  const ids = new Set(Array.isArray(siteIds) ? siteIds : []);
  return allSites(settings).filter((site) => ids.has(site.id));
}

export function getSelectedSites(settings) {
  return getSitesByIds(settings, settings.selectedSiteIds);
}

export function buildSearchUrl(siteOrTemplate, query) {
  const template =
    typeof siteOrTemplate === "string" ? siteOrTemplate : siteOrTemplate.url;

  return template.replaceAll("{query}", encodeURIComponent(String(query).trim()));
}

export function isValidSearchUrlTemplate(value) {
  if (typeof value !== "string" || !value.includes("{query}")) {
    return false;
  }

  try {
    const parsed = new URL(value.replaceAll("{query}", "test query"));
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Coerce anything read from storage into a safe, predictable settings object.
 * Version 1 stored built-in sites separately, so those records are merged into
 * the editable site list once during migration.
 */
export function normalizeSettings(value) {
  const raw = value && typeof value === "object" ? value : {};
  const siteCandidates = getSiteCandidates(raw);
  const customSites = [];
  const knownIds = new Set();

  for (const candidate of siteCandidates) {
    const site = normalizeSite(candidate);
    if (site && !knownIds.has(site.id)) {
      customSites.push(site);
      knownIds.add(site.id);
    }
  }

  const enabledSource = Array.isArray(raw.enabledSiteIds)
    ? raw.enabledSiteIds
    : DEFAULT_SETTINGS.enabledSiteIds;
  const enabledSiteIds = uniqueIds(enabledSource).filter((id) =>
    knownIds.has(id),
  );
  const enabledIds = new Set(enabledSiteIds);

  const selectedSource = Array.isArray(raw.selectedSiteIds)
    ? raw.selectedSiteIds
    : DEFAULT_SETTINGS.selectedSiteIds;
  const selectedSiteIds = uniqueIds(selectedSource).filter((id) =>
    enabledIds.has(id),
  );

  return {
    settingsVersion: SETTINGS_VERSION,
    enabledSiteIds,
    selectedSiteIds,
    customSites,
    openInNewWindow: raw.openInNewWindow === true,
  };
}

function getSiteCandidates(raw) {
  if (raw.settingsVersion === SETTINGS_VERSION) {
    return Array.isArray(raw.customSites)
      ? raw.customSites
      : PRECONFIGURED_SITES;
  }

  if (hasLegacySettings(raw)) {
    const legacySites = Array.isArray(raw.customSites) ? raw.customSites : [];
    return [...PRECONFIGURED_SITES, ...legacySites];
  }

  return PRECONFIGURED_SITES;
}

function hasLegacySettings(raw) {
  const keys = [
    "customSites",
    "enabledSiteIds",
    "selectedSiteIds",
    "openInNewWindow",
  ];
  return keys.some((key) => Object.hasOwn(raw, key));
}

function normalizeSite(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const id =
    typeof candidate.id === "string" ? candidate.id.trim().slice(0, 80) : "";
  const name =
    typeof candidate.name === "string" ? candidate.name.trim().slice(0, 60) : "";
  const url =
    typeof candidate.url === "string" ? candidate.url.trim() : "";

  if (
    !/^[a-z0-9][a-z0-9-]*$/i.test(id) ||
    !name ||
    !isValidSearchUrlTemplate(url)
  ) {
    return null;
  }

  return { id, name, url };
}

function uniqueIds(ids) {
  const seen = new Set();
  const result = [];

  for (const id of ids) {
    if (typeof id !== "string" || seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push(id);
  }

  return result;
}
