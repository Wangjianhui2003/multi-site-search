# Multi Search

A small Chrome extension for searching the same query on several websites at
once. Type the query once, pick the sites, and each site opens in its own tab.

This is a from-scratch, popup-first take on tools like Instant Multi Search.

## Features

- One search field with a simple list of site checkboxes.
- Remembers the sites you selected last time.
- Opens all result tabs in the background, then focuses the first result.
- 27 preconfigured sites across general search, social, video, shopping,
  development, research, reference, and AI categories.
- Every site is editable: rename preconfigured sites, change their search URLs,
  add new sites, or delete the ones you do not need.
- Optional: open results in a new window.
- Three ways to search:
  - Toolbar popup.
  - Address bar keyword: type `ms`, press Space or Tab, then enter a query.
  - Right-click selected text and choose **Multi-search**.
- No remote services, analytics, or host permissions.

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder.
5. Pin **Multi Search** to the toolbar if you want one-click access.

A packaged copy is available as `multi-search-extension.zip`. Extract the zip
first if you want to load it with **Load unpacked**.

After changing any extension files, click the reload button for the extension on
`chrome://extensions`.

## Use

### Popup

1. Click the toolbar icon, or press `Ctrl+Shift+M` if the shortcut is available.
2. Type the query.
3. Check the sites you want.
4. Press Enter or click **Search N sites**.

The site selection is saved automatically. Result tabs open in the current
window and the first result is focused. Turn on **Open result tabs in a new
window** in settings if you prefer a separate window.

### Address bar

Type `ms` in the address bar, press Space or Tab, then enter the query and press
Enter. The sites currently selected in the popup are used.

### Selected text

Select text on any page, right-click it, and choose **Multi-search "..."**. The
same selected sites are used.

## Custom sites

Open **Sites & settings** from the popup. The **Custom sites** section lists all
preconfigured sites alongside any sites you add. Every entry can be changed.

- Check a site to show it in the popup.
- Click **Edit** to load it into the form, then click **Update site** to save a
  new name or search URL.
- Click **Delete** to remove a site.
- Add a new site with a name and a search URL containing `{query}`:

```text
https://example.com/search?q={query}
```

Only HTTP and HTTPS URLs are accepted. Deleting or disabling a site keeps the
rest of your settings intact. **Reset to defaults** restores the original
preconfigured sites.

If you used an earlier version, the built-in sites are migrated into editable
custom sites automatically.

## Privacy and permissions

- `storage` keeps your site choices and custom sites in Chrome sync storage.
- `contextMenus` adds the right-click search command.
- The extension does not request access to website content and does not collect
  or transmit data. Searches are regular tab navigations to the sites you pick.

Queries are not saved.

## Development

```sh
npm test
```

The tests cover URL encoding, settings normalization, legacy migration, custom
site validation, and site selection.

## Files

| File                                        | Purpose                                         |
| ------------------------------------------- | ----------------------------------------------- |
| `manifest.json`                             | Extension manifest                              |
| `popup.html`, `popup.css`, `popup.js`       | Main search popup                               |
| `options.html`, `options.css`, `options.js` | Site and behavior settings                      |
| `background.js`                             | Tab opening, omnibox, and context menu          |
| `sites.js`                                  | Preconfigured sites and shared settings helpers |
| `storage.js`                                | Chrome storage helpers                          |
| `icons/`                                    | Extension icons                                 |
| `tests/`                                    | Node tests                                      |
