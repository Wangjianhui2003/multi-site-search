import {
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  normalizeSettings,
} from "./sites.js";

const STORAGE_KEY = "multiSearchSettings";

export async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const raw = result[STORAGE_KEY];
    const normalized = normalizeSettings(raw);

    if (!raw || raw.settingsVersion !== SETTINGS_VERSION) {
      try {
        await chrome.storage.sync.set({ [STORAGE_KEY]: normalized });
      } catch (error) {
        console.warn("Could not save migrated Multi Search settings:", error);
      }
    }

    return normalized;
  } catch (error) {
    console.error("Could not load Multi Search settings:", error);
    return normalizeSettings(DEFAULT_SETTINGS);
  }
}

export async function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  await chrome.storage.sync.set({ [STORAGE_KEY]: normalized });
  return normalized;
}

export async function resetSettings() {
  const normalized = normalizeSettings(DEFAULT_SETTINGS);
  await chrome.storage.sync.set({ [STORAGE_KEY]: normalized });
  return normalized;
}
