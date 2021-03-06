let initialState = {
  _blacklist: [
    "chrome://",
    "about:blank",
    "chrome-extension://",
    "localhost",
    "chrome-devtools",
    "mailto:",
    "file://"
  ],
  _settings: {
    timeseriesFilter: "alltime"
  }
};

// Set up the new tab page on first load
(async function() {
  let items = await getItems();
  let settings = await getSettings();
  let blacklist = await getBlacklist();
  createTimeseriesFilterDropdown(settings);
  createBlacklistDropdownElements(blacklist);
  drawView(items);
})();

// redraw when tab is activated
chrome.tabs.onActivated.addListener(function(x) {
  chrome.tabs.get(x.tabId, async function(active) {
    let localStorageItems = await getItems();
    if (active.url.includes("chrome://") && localStorageItems.length) {
      drawView(localStorageItems);
    }
  });
});

// redraw when window is focused
chrome.windows.onFocusChanged.addListener(function(newWindowId) {
  if (newWindowId > 0) {
    chrome.tabs.getSelected(newWindowId, async function(active) {
      let localStorageItems = await getItems();
      if (active.url.includes("chrome://newtab") && localStorageItems.length) {
        drawView(localStorageItems);
      }
    });
  }
});
