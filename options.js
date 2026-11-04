import { allSites, isValidSearchUrlTemplate } from "./sites.js";
import { loadSettings, resetSettings, saveSettings } from "./storage.js";

const customSitesContainer = document.querySelector("#custom-sites");
const noCustomSites = document.querySelector("#no-custom-sites");
const siteFormTitle = document.querySelector("#site-form-title");
const addSiteForm = document.querySelector("#add-site-form");
const customName = document.querySelector("#custom-name");
const customUrl = document.querySelector("#custom-url");
const formError = document.querySelector("#form-error");
const saveSiteButton = document.querySelector("#save-site-button");
const cancelEditButton = document.querySelector("#cancel-edit-button");
const openInNewWindow = document.querySelector("#open-in-new-window");
const resetButton = document.querySelector("#reset-button");
const status = document.querySelector("#status");

let settings = null;
let saveQueue = Promise.resolve();
let editingSiteId = null;

init().catch((error) => {
  console.error(error);
  showStatus("Could not load settings.", true);
});

async function init() {
  settings = await loadSettings();

  renderCustomSites();
  openInNewWindow.checked = settings.openInNewWindow;

  customSitesContainer.addEventListener("change", handleSiteToggle);
  customSitesContainer.addEventListener("click", handleCustomSiteClick);
  openInNewWindow.addEventListener("change", () => {
    settings.openInNewWindow = openInNewWindow.checked;
    persist();
  });
  addSiteForm.addEventListener("submit", handleSiteFormSubmit);
  cancelEditButton.addEventListener("click", resetSiteForm);
  customName.addEventListener("input", clearFormError);
  customUrl.addEventListener("input", clearFormError);
  resetButton.addEventListener("click", handleReset);
}

function renderCustomSites() {
  const enabledIds = new Set(settings.enabledSiteIds);
  const fragment = document.createDocumentFragment();

  for (const site of settings.customSites) {
    const row = document.createElement("div");
    row.className = "custom-site";

    if (!enabledIds.has(site.id)) {
      row.classList.add("is-disabled");
    }

    const label = document.createElement("label");
    label.className = "custom-site-name";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.siteId = site.id;
    checkbox.checked = enabledIds.has(site.id);
    checkbox.setAttribute("aria-label", `Show ${site.name} in the popup`);

    const name = document.createElement("span");
    name.textContent = site.name;
    name.title = site.name;

    const url = document.createElement("span");
    url.className = "custom-site-url";
    url.textContent = site.url;
    url.title = site.url;

    const actions = document.createElement("div");
    actions.className = "custom-site-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "row-button";
    editButton.dataset.editId = site.id;
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit ${site.name}`);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "row-button danger";
    deleteButton.dataset.deleteId = site.id;
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${site.name}`);

    label.append(checkbox, name);
    actions.append(editButton, deleteButton);
    row.append(label, url, actions);
    fragment.append(row);
  }

  customSitesContainer.replaceChildren(fragment);
  noCustomSites.hidden = settings.customSites.length > 0;
}

function handleSiteToggle(event) {
  const checkbox = event.target.closest("input[data-site-id]");

  if (!checkbox) {
    return;
  }

  const siteId = checkbox.dataset.siteId;
  setSiteEnabled(siteId, checkbox.checked);

  const row = checkbox.closest(".custom-site");
  row?.classList.toggle("is-disabled", !checkbox.checked);
}

function setSiteEnabled(siteId, enabled) {
  const enabledIds = new Set(settings.enabledSiteIds);

  if (enabled) {
    enabledIds.add(siteId);
  } else {
    enabledIds.delete(siteId);
  }

  reorderEnabledSites(enabledIds);

  if (!enabled) {
    settings.selectedSiteIds = settings.selectedSiteIds.filter(
      (id) => id !== siteId,
    );
  }

  persist();
}

function reorderEnabledSites(enabledIds) {
  settings.enabledSiteIds = allSites(settings)
    .map((site) => site.id)
    .filter((id) => enabledIds.has(id));
}

function handleCustomSiteClick(event) {
  const editButton = event.target.closest("button[data-edit-id]");

  if (editButton) {
    startEditingSite(editButton.dataset.editId);
    return;
  }

  const deleteButton = event.target.closest("button[data-delete-id]");

  if (!deleteButton) {
    return;
  }

  deleteSite(deleteButton.dataset.deleteId);
}

function startEditingSite(siteId) {
  const site = settings.customSites.find((candidate) => candidate.id === siteId);

  if (!site) {
    return;
  }

  editingSiteId = siteId;
  customName.value = site.name;
  customUrl.value = site.url;
  siteFormTitle.textContent = `Edit “${site.name}”`;
  saveSiteButton.textContent = "Update site";
  cancelEditButton.hidden = false;
  clearFormError();
  customName.focus();
  addSiteForm.scrollIntoView({ block: "center" });
}

function deleteSite(siteId) {
  const site = settings.customSites.find((candidate) => candidate.id === siteId);

  if (!site) {
    return;
  }

  if (!window.confirm(`Delete "${site.name}"?`)) {
    return;
  }

  settings.customSites = settings.customSites.filter(
    (candidate) => candidate.id !== siteId,
  );
  settings.enabledSiteIds = settings.enabledSiteIds.filter(
    (id) => id !== siteId,
  );
  settings.selectedSiteIds = settings.selectedSiteIds.filter(
    (id) => id !== siteId,
  );

  if (editingSiteId === siteId) {
    resetSiteForm();
  }

  renderCustomSites();
  persist("Site deleted.");
}

async function handleSiteFormSubmit(event) {
  event.preventDefault();

  const name = customName.value.trim();
  const url = customUrl.value.trim();

  if (!name) {
    setFormError("Enter a name for the site.");
    customName.focus();
    return;
  }

  if (!isValidSearchUrlTemplate(url)) {
    setFormError(
      "Enter an HTTP or HTTPS search URL that contains the {query} placeholder.",
    );
    customUrl.focus();
    return;
  }

  if (editingSiteId) {
    const site = settings.customSites.find(
      (candidate) => candidate.id === editingSiteId,
    );

    if (!site) {
      resetSiteForm();
      renderCustomSites();
      showStatus("That site no longer exists.", true);
      return;
    }

    site.name = name;
    site.url = url;

    resetSiteForm();
    renderCustomSites();
    await persist("Site updated.");
    return;
  }

  const id = `custom-${crypto.randomUUID()}`;

  settings.customSites.push({ id, name, url });
  settings.selectedSiteIds.push(id);
  settings.enabledSiteIds.push(id);
  reorderEnabledSites(new Set(settings.enabledSiteIds));

  resetSiteForm();
  renderCustomSites();
  customName.focus();
  await persist("Site added.");
}

function resetSiteForm() {
  editingSiteId = null;
  addSiteForm.reset();
  siteFormTitle.textContent = "Add a site";
  saveSiteButton.textContent = "Add site";
  cancelEditButton.hidden = true;
  clearFormError();
}

async function handleReset() {
  const confirmed = window.confirm(
    "Reset all settings to defaults? Edits, added sites, and deleted sites will be restored.",
  );

  if (!confirmed) {
    return;
  }

  try {
    await saveQueue.catch(() => undefined);
    settings = await resetSettings();
    renderCustomSites();
    openInNewWindow.checked = settings.openInNewWindow;
    resetSiteForm();
    showStatus("Settings reset to defaults.");
  } catch (error) {
    console.error(error);
    showStatus("Could not reset settings.", true);
  }
}

function persist(message = "Saved.") {
  const snapshot = {
    settingsVersion: settings.settingsVersion,
    enabledSiteIds: [...settings.enabledSiteIds],
    selectedSiteIds: [...settings.selectedSiteIds],
    customSites: settings.customSites.map((site) => ({ ...site })),
    openInNewWindow: settings.openInNewWindow,
  };

  saveQueue = saveQueue
    .catch(() => undefined)
    .then(() => saveSettings(snapshot))
    .then(() => {
      showStatus(message);
    })
    .catch((error) => {
      console.error(error);
      showStatus("Could not save settings.", true);
    });

  return saveQueue;
}

function setFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearFormError() {
  formError.textContent = "";
  formError.hidden = true;
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}
