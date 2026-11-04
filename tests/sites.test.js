import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_SETTINGS,
  PRECONFIGURED_SITES,
  SETTINGS_VERSION,
  allSites,
  buildSearchUrl,
  getSelectedSites,
  getSitesByIds,
  isValidSearchUrlTemplate,
  normalizeSettings,
} from "../sites.js";

test("buildSearchUrl encodes the query and replaces every placeholder", () => {
  const url = buildSearchUrl(
    { url: "https://example.com/?q={query}&again={query}" },
    "  hello world & more  ",
  );

  assert.equal(
    url,
    "https://example.com/?q=hello%20world%20%26%20more&again=hello%20world%20%26%20more",
  );
});

test("a new install is seeded with editable preconfigured sites", () => {
  const settings = normalizeSettings();
  const preconfiguredIds = PRECONFIGURED_SITES.map((site) => site.id);

  assert.equal(settings.settingsVersion, SETTINGS_VERSION);
  assert.deepEqual(
    settings.customSites.map((site) => site.id),
    preconfiguredIds,
  );
  assert.deepEqual(settings.enabledSiteIds, [
    ...DEFAULT_SETTINGS.enabledSiteIds,
  ]);
  assert.deepEqual(settings.selectedSiteIds, [
    ...DEFAULT_SETTINGS.selectedSiteIds,
  ]);
});

test("current settings preserve edited and deleted preconfigured sites", () => {
  const customSites = [
    {
      id: "google",
      name: "My Google",
      url: "https://www.google.com/search?q={query}&num=20",
    },
    {
      id: "custom-one",
      name: "One",
      url: "https://one.example/?q={query}",
    },
  ];
  const settings = normalizeSettings({
    settingsVersion: SETTINGS_VERSION,
    customSites,
    enabledSiteIds: ["google", "custom-one"],
    selectedSiteIds: ["custom-one"],
    openInNewWindow: true,
  });

  assert.deepEqual(settings.customSites, customSites);
  assert.deepEqual(settings.enabledSiteIds, ["google", "custom-one"]);
  assert.deepEqual(settings.selectedSiteIds, ["custom-one"]);
  assert.equal(settings.openInNewWindow, true);
});

test("current settings can have an empty site list", () => {
  const settings = normalizeSettings({
    settingsVersion: SETTINGS_VERSION,
    customSites: [],
    enabledSiteIds: [],
    selectedSiteIds: [],
  });

  assert.deepEqual(settings.customSites, []);
  assert.deepEqual(settings.enabledSiteIds, []);
  assert.deepEqual(settings.selectedSiteIds, []);
});

test("version 1 settings are migrated into editable sites", () => {
  const settings = normalizeSettings({
    enabledSiteIds: ["google", "reddit", "custom-old"],
    selectedSiteIds: ["google", "custom-old"],
    customSites: [
      {
        id: "custom-old",
        name: "Old Site",
        url: "https://old.example/?q={query}",
      },
    ],
    openInNewWindow: true,
  });
  const siteIds = settings.customSites.map((site) => site.id);

  assert.equal(settings.settingsVersion, SETTINGS_VERSION);
  assert.equal(settings.customSites.length, PRECONFIGURED_SITES.length + 1);
  assert.ok(siteIds.includes("google"));
  assert.ok(siteIds.includes("reddit"));
  assert.ok(siteIds.includes("custom-old"));
  assert.deepEqual(settings.enabledSiteIds, [
    "google",
    "reddit",
    "custom-old",
  ]);
  assert.deepEqual(settings.selectedSiteIds, ["google", "custom-old"]);
  assert.equal(settings.openInNewWindow, true);
});

test("unknown and disabled selections are filtered out", () => {
  const settings = normalizeSettings({
    settingsVersion: SETTINGS_VERSION,
    customSites: [
      {
        id: "google",
        name: "Google",
        url: "https://www.google.com/search?q={query}",
      },
      {
        id: "reddit",
        name: "Reddit",
        url: "https://www.reddit.com/search/?q={query}",
      },
    ],
    enabledSiteIds: ["google", "not-real"],
    selectedSiteIds: ["google", "reddit", "not-real"],
  });

  assert.deepEqual(settings.enabledSiteIds, ["google"]);
  assert.deepEqual(settings.selectedSiteIds, ["google"]);
});

test("invalid and duplicate site records are discarded", () => {
  const settings = normalizeSettings({
    settingsVersion: SETTINGS_VERSION,
    customSites: [
      {
        id: "custom-good",
        name: "  Example  ",
        url: " https://example.com/search?q={query} ",
      },
      {
        id: "custom-bad",
        name: "Bad",
        url: "javascript:alert({query})",
      },
      {
        id: "custom-missing-placeholder",
        name: "Missing placeholder",
        url: "https://example.com/search",
      },
      {
        id: "custom-good",
        name: "Duplicate",
        url: "https://duplicate.example/?q={query}",
      },
    ],
    enabledSiteIds: ["custom-good", "custom-bad"],
    selectedSiteIds: ["custom-good"],
  });

  assert.deepEqual(settings.customSites, [
    {
      id: "custom-good",
      name: "Example",
      url: "https://example.com/search?q={query}",
    },
  ]);
  assert.deepEqual(settings.enabledSiteIds, ["custom-good"]);
});

test("getSelectedSites uses selected sites, not every enabled site", () => {
  const settings = normalizeSettings({
    settingsVersion: SETTINGS_VERSION,
    customSites: [
      {
        id: "google",
        name: "Google",
        url: "https://www.google.com/search?q={query}",
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
    ],
    enabledSiteIds: ["google", "reddit", "wikipedia"],
    selectedSiteIds: ["google", "wikipedia"],
  });

  assert.deepEqual(
    getSelectedSites(settings).map((site) => site.id),
    ["google", "wikipedia"],
  );
});

test("allSites and getSitesByIds preserve the stored site order", () => {
  const settings = normalizeSettings({
    settingsVersion: SETTINGS_VERSION,
    customSites: [
      {
        id: "one",
        name: "One",
        url: "https://one.example/?q={query}",
      },
      {
        id: "two",
        name: "Two",
        url: "https://two.example/?q={query}",
      },
    ],
    enabledSiteIds: ["one", "two"],
    selectedSiteIds: ["two"],
  });

  assert.deepEqual(
    allSites(settings).map((site) => site.id),
    ["one", "two"],
  );
  assert.deepEqual(
    getSitesByIds(settings, ["two", "one"]).map((site) => site.id),
    ["one", "two"],
  );
  assert.deepEqual(getSitesByIds(settings, []), []);
});

test("custom search URL validation requires HTTP(S) and {query}", () => {
  assert.equal(
    isValidSearchUrlTemplate("https://example.com/?q={query}"),
    true,
  );
  assert.equal(
    isValidSearchUrlTemplate("http://example.com/search/{query}"),
    true,
  );
  assert.equal(isValidSearchUrlTemplate("https://example.com/search"), false);
  assert.equal(
    isValidSearchUrlTemplate("javascript:alert({query})"),
    false,
  );
  assert.equal(isValidSearchUrlTemplate("not a url {query}"), false);
});
