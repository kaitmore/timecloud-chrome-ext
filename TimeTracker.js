class TimeTracker {
  constructor() {
    this._activeSite = null;
    this._startTime = null;
    this.localStorageInitialState = {
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
    this.handleNewSite = this.handleNewSite.bind(this);
    this.handleNewWindow = this.handleNewWindow.bind(this);
    this.handleNewState = this.handleNewState.bind(this);

    // When the TimeTracker class is instantiated, verify localstorage
    checkForLocalStorage(this.localStorageInitialState);

    /* LISTEN FOR NEW ACTIVE TABS */
    chrome.tabs.onActivated.addListener(this.handleNewSite);

    /* LISTEN FOR CHANGE OF BASE URL */
    chrome.webNavigation.onCommitted.addListener(this.handleNewSite);

    /* LISTEN FOR WINDOW FOCUS */
    chrome.windows.onFocusChanged.addListener(this.handleNewWindow);

    /* LISTEN FOR IDLE STATE */
    chrome.idle.onStateChanged.addListener(this.handleNewState);
  }

  set activeSite(newSite) {
    let newSiteIsValid = validateNewSite(newSite);
    if (newSiteIsValid) {
      this._activeSite = newSite;
      this._startTime = Date.now();
    } else {
      this._activeSite = null;
      this._startTime = null;
    }
  }

  get activeSite() {
    return this._activeSite;
  }

  get startTime() {
    return this._startTime;
  }

  handleNewSite(incomingSite) {
    let incomingSiteId = incomingSite.id || incomingSite.tabId;
    // Query for more info about the new tab (like URL),
    // since our chrome event listeners only give us a tab & window id
    chrome.tabs.get(incomingSiteId, newSite => {
      if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError.message);
      } else {
        // If there is an active site already and that active site url is different
        // from the new tab's url, set the end time for the previous site
        // and save the timing to local storage
        if (
          this.activeSite &&
          getBaseUrl(newSite.url) !== getBaseUrl(this.activeSite.url)
        ) {
          saveToLocalStorage(this.activeSite, this.startTime);
          this.activeSite = newSite;
        } else if (!this.activeSite) {
          this.activeSite = newSite;
        }
      }
    });
  }

  handleNewWindow(newWindowId) {
    // If the chrome window looses focus, stop tracking time and save the current timing.
    // newWindowId is an integer: a window has lost focus if it returns -1.
    if (this.activeSite && newWindowId < 0) {
      saveToLocalStorage(this.activeSite, this.startTime);
      this.activeSite = null;
    } else if (newWindowId > 0) {
      // If a different window is focused, query for the currently selected
      // tab in that new window and call the new site handler
      chrome.tabs.query({ active: true, currentWindow: true }, newTab => {
        if (newTab.length === 1) {
          this.handleNewSite(newTab[0]);
        }
      });
    }
  }

  handleNewState(newState) {
    if (newState !== "active" && this.activeSite) {
      saveToLocalStorage(this.activeSite, this.startTime);
      this.activeSite = null;
    }
  }
}

new TimeTracker();

/***
 **
 * HELPER FUNCTIONS
 **
 ***/

function checkForLocalStorage(initialState) {
  // Set initial state in localstorage
  if (!localStorage.getItem("populate")) {
    localStorage.setItem("populate", JSON.stringify(initialState));
  }
}

function validateNewSite(newSite) {
  if (!newSite) return false;
  if (newSite.transitionType) {
    let isTransitionValid =
      newSite.transitionType === "link" ||
      newSite.transitionType === "typed" ||
      newSite.transitionType === "auto_bookmark" ||
      newSite.transitionType === "generated" ||
      newSite.transitionType === "start_page" ||
      newSite.transitionType === "reload";
    // If the transition isn't valid, don't bother with the rest of the
    // validation and return
    if (!isTransitionValid) return false;
  }

  // Get blacklist from localstorage
  let blacklist = JSON.parse(localStorage.getItem("populate"))._blacklist;

  let isSiteValid = blacklist.every(site => !newSite.url.includes(site));

  return isSiteValid;
}

function saveToLocalStorage(activeSite, startTime) {
  const activeSiteUrl = getBaseUrl(activeSite.url);
  let endTime = Date.now();
  let currentState = JSON.parse(localStorage.getItem("populate"));
  let newTiming = endTime - startTime;
  let localStorageVal = currentState[activeSiteUrl];
  if (localStorageVal) {
    let previousTimings = localStorageVal[0];
    let previousTimestamps = localStorageVal[1];
    currentState[activeSiteUrl] = [
      [newTiming, ...previousTimings],
      [endTime, ...previousTimestamps]
    ];
  } else {
    currentState[activeSiteUrl] = [[newTiming], [endTime]];
  }
  localStorage.setItem("populate", JSON.stringify(currentState));
}

function getBaseUrl(url) {
  var temp = document.createElement("a");
  temp.href = url;
  let baseUrl = temp.origin.replace(/[https*:\\]*www./, "");
  return baseUrl;
}
