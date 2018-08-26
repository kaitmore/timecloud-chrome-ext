// Set up the new tab page on first load
createTimeseriesFilterDropdown(getSettings());
createBlacklistDropdownElements(getBlacklist());
drawView(getItems());

// redraw when tab is activated
chrome.tabs.onActivated.addListener(function(x) {
  chrome.tabs.get(x.tabId, function(active) {
    let localStorageItems = getItems();
    if (active.url.includes("chrome://") && localStorageItems.length) {
      drawView(localStorageItems);
    }
  });
});

// redraw when window is focused
chrome.windows.onFocusChanged.addListener(function(newWindowId) {
  if (newWindowId > 0) {
    chrome.tabs.getSelected(newWindowId, function(active) {
      let localStorageItems = getItems();
      if (active.url.includes("chrome://newtab") && localStorageItems.length) {
        drawView(localStorageItems);
      }
    });
  }
});
