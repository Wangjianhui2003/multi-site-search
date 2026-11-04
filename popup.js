import { allSites } from "./sites.js";
import { loadSettings, saveSettings } from "./storage.js";

const OPEN_MESSAGE = "multi-search:open";

const form = document.querySelector("#search-form");
const queryInput = document.querySelector("#query");
const siteGrid = document.querySelector("#sites");
const sitesLabel = document.querySelector("#sites-label");
const selectAllButton = document.querySelector("#select-all");
const selectNoneButton = document.querySelector("#select-none");
const noSitesNotice = document.querySelector("#no-sites");
const summary = document.querySelector("#summary");
const searchButton = document.querySelector("#search-button");
const status = document.querySelector("#status");

let settings = null;
let saving = Promise.resolve();
let submitting = false;

init().catch((error) => {
  console.error(error);
  showStatus("Could not load settings. Reload the extension and try again.");
});

async function init() {
  settings = await loadSettings();
  renderSites();

  form.addEventListener("submit", handleSubmit);
  queryInput.addEventListener("input", () => {
    clearStatus();
    updateFooter();
  });
  selectAllButton.addEventListener("click", () => setAllChecked(true));
  selectNoneButton.addEventListener("click", () => setAllChecked(false));

  updateFooter();
  queryInput.focus({ preventScroll: true });
}

function renderSites() {
  const enabledIds = new Set(settings.enabledSiteIds);
  const selectedIds = new Set(settings.selectedSiteIds);
  const sites = allSites(settings).filter((site) => enabledIds.has(site.id));
  const fragment = document.createDocumentFragment();

  for (const site of sites) {
    const label = document.createElement("label");
    label.className = "site-option";
    label.title = site.url;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = site.id;
    checkbox.checked = selectedIds.has(site.id);
    checkbox.addEventListener("change", handleSelectionChange);

    const name = document.createElement("span");
    name.textContent = site.name;

    label.append(checkbox, name);
    fragment.append(label);
  }

  siteGrid.replaceChildren(fragment);
  siteGrid.hidden = sites.length === 0;
  sitesLabel.hidden = sites.length === 0;
  selectAllButton.hidden = sites.length === 0;
  selectNoneButton.hidden = sites.length === 0;
  noSitesNotice.hidden = sites.length > 0;
}

function handleSelectionChange() {
  settings.selectedSiteIds = getCheckedSiteIds();
  updateFooter();
  clearStatus();
  queueSave();
}

function setAllChecked(checked) {
  for (const checkbox of siteGrid.querySelectorAll('input[type="checkbox"]')) {
    checkbox.checked = checked;
  }
  handleSelectionChange();
}

function getCheckedSiteIds() {
  return [...siteGrid.querySelectorAll('input[type="checkbox"]:checked')].map(
    (checkbox) => checkbox.value,
  );
}

function updateFooter() {
  const count = getCheckedSiteIds().length;
  const hasQuery = queryInput.value.trim().length > 0;
  const siteWord = count === 1 ? "site" : "sites";

  summary.textContent =
    count === 0 ? "No sites selected" : `${count} ${siteWord} selected`;
  searchButton.textContent =
    count === 0 ? "Search" : `Search ${count} ${siteWord}`;
  searchButton.disabled = count === 0 || !hasQuery || submitting;
}

function queueSave() {
  const snapshot = snapshotSettings();

  saving = saving
    .catch(() => undefined)
    .then(() => saveSettings(snapshot))
    .then(() => {
      clearStatus();
    })
    .catch((error) => {
      console.error(error);
      showStatus("Could not save your site selection.");
    });

  return saving;
}

function snapshotSettings() {
  return {
    enabledSiteIds: [...settings.enabledSiteIds],
    selectedSiteIds: [...settings.selectedSiteIds],
    customSites: settings.customSites.map((site) => ({ ...site })),
    openInNewWindow: settings.openInNewWindow,
  };
}

async function handleSubmit(event) {
  event.preventDefault();

  const query = queryInput.value.trim();
  const siteIds = getCheckedSiteIds();

  if (!query) {
    showStatus("Enter a search query.");
    queryInput.focus();
    return;
  }

  if (siteIds.length === 0) {
    showStatus("Select at least one site.");
    return;
  }

  submitting = true;
  updateFooter();
  searchButton.textContent = "Opening…";
  clearStatus();

  try {
    await queueSave();

    const response = await chrome.runtime.sendMessage({
      type: OPEN_MESSAGE,
      query,
      siteIds,
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Could not open the search tabs.");
    }

    window.close();
  } catch (error) {
    console.error(error);
    submitting = false;
    updateFooter();
    showStatus(error.message || "Could not open the search tabs.");
  }
}

function showStatus(message) {
  status.textContent = message;
}

function clearStatus() {
  status.textContent = "";
}
