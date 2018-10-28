/**
 *
 * The TimeTracker class listens for chrome events. It is
 * responsible for tracking the currently active site and updating
 * local storage with timings.
 *
 * @class TimeTracker
 *
 **/
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
    validateNewSite(newSite).then(newSiteIsValid => {
      if (newSiteIsValid) {
        this._activeSite = newSite;
        this._startTime = Date.now();
        chrome.browserAction.setBadgeText({
          text: " "
        });
        chrome.browserAction.setBadgeBackgroundColor({ color: "limegreen" });
      } else {
        this._activeSite = null;
        this._startTime = null;
        chrome.browserAction.setBadgeText({
          text: ""
        });
      }
    });
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
    } else if (newState === "active") {
      chrome.tabs.query({ active: true, currentWindow: true }, newTab => {
        if (newTab.length === 1) {
          this.handleNewSite(newTab[0]);
        }
      });
    }
  }
}

new TimeTracker();

/**
 * Checks for the populate key in local storage.
 * If it's not there, set it with initial state.
 * @param {object} initialState
 **/
async function checkForLocalStorage(initialState) {
  const { timetracker = {} } = await fetchStorage();
  if (!Object.keys(timetracker).length) {
    // Set initial state in localstorage
    chrome.storage.sync.set({ timetracker: initialState });
  }
}

/**
 * Fetches chrome.storage
 * @returns Promise
 **/
function fetchStorage() {
  return new Promise(function(resolve, reject) {
    chrome.storage.sync.get("timetracker", function(result) {
      if (!result) {
        reject();
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Validates a site by first checking it's transition type, which indicates
 * whether or not the user initiated the transiton, then check the site
 * against the user's blacklist.
 * @param {object} newSite
 * @returns {boolean}
 */
async function validateNewSite(newSite) {
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

  const {
    timetracker: { _blacklist }
  } = await fetchStorage();

  // Get blacklist from localstorage
  let isSiteValid = _blacklist.every(site => !newSite.url.includes(site));

  return isSiteValid;
}

/**
 * Takes a site and a start time, calculates the new timing, and
 * updates that site's local storage entry.
 * @param {object} activeSite
 * @param {number} startTime
 */
async function saveToLocalStorage(site, startTime) {
  const url = getBaseUrl(site.url);
  const endTime = Date.now();
  const newTiming = endTime - startTime;

  const { timetracker = {} } = await fetchStorage();
  const localStorageVal = timetracker[url] || null;

  if (localStorageVal) {
    const previousTimings = localStorageVal[0];
    const previousTimestamps = localStorageVal[1];
    timetracker[url] = [
      [newTiming, ...previousTimings],
      [endTime, ...previousTimestamps]
    ];
  } else {
    timetracker[url] = [[newTiming], [endTime]];
  }

  chrome.storage.sync.set({ timetracker }, function() {
    console.log("Value is set to", url, timetracker[url]);
  });
}

/**
 * A utility function that takes a url and creates a temporary element
 * in the DOM for the purpose of extracting a clean base url using the
 * `origin` property. It also strips out `www` using regex.
 * @param {string} url
 * @returns {string}
 */
function getBaseUrl(url) {
  let temp = document.createElement("a");
  temp.href = url;
  let baseUrl = temp.origin.replace(/www.(?!^https?:\/\/)/, ""); // https://regexr.com/3ufss
  return baseUrl;
}
