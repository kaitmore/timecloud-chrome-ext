const body = document.querySelector("body");
const mainContent = document.getElementById("main-content");
const resetButton = document.getElementById("reset");
const graphViewButton = document.getElementById("graph-view-button");
const listViewButton = document.getElementById("list-view-button");
const listViewContainer = document.getElementById("list-view-container");
const listViewList = document.getElementById("list-view-list");
const error = document.getElementById("error");
const downloadButton = document.getElementById("download-button");
const blacklistButton = document.getElementById("dropbtn");
const blacklistInput = document.getElementById("blacklist-input");
const blacklistContainer = document.getElementById("dropdown-container");
const blacklistContent = document.getElementById("blacklist-content");
const timeseriesFilterDropdown = document.getElementById("sort");
const search = document.getElementById("search");
let searchInput = document.getElementById("search-input");

const timeSeriesFilters = {
  alltime: "All Time",
  day: "24 Hours",
  week: "7 Days"
};
let listView = false;
let searchTerm;
let timeseriesFilter;

timeseriesFilterDropdown.addEventListener("change", e => {
  timeseriesFilter = e.target.value;
  drawView(getItems());
  let currentState = JSON.parse(localStorage.getItem("populate"));
  currentState._settings.timeseriesFilter = timeseriesFilter;
  localStorage.setItem("populate", JSON.stringify(currentState));
});

searchInput.addEventListener("input", e => {
  e.preventDefault();
  resetButton.style.display = "inline";
  searchTerm = searchInput.value;
  drawView(getItems());
});

resetButton.addEventListener("click", e => {
  resetButton.style.display = "none";
  searchInput.value = "";
  drawView(getItems());
});

listViewButton.addEventListener("click", e => {
  // Clean up DOM
  listView = true;
  search.classList.toggle("show");
  listViewContainer.classList.toggle("show");
  mainContent.removeChild(document.querySelector("svg"));
  listViewButton.setAttribute("disabled", true);
  graphViewButton.removeAttribute("disabled");
  drawView(getItems());
});

graphViewButton.addEventListener("click", e => {
  // Clean up DOM
  listView = false;
  searchInput.value = "";
  search.classList.toggle("show");
  listViewContainer.classList.toggle("show");
  graphViewButton.setAttribute("disabled", true);
  listViewButton.removeAttribute("disabled");
  drawView(getItems());
});

downloadButton.addEventListener("click", e => {
  e.preventDefault();
  downloadCSV();
});

// Listener to remove items from the blacklist dropdown
blacklistContent.addEventListener("click", function(e) {
  if (e.target.classList.contains("blacklist-remove")) {
    let itemToRemove = document.getElementById(e.target.dataset.value);
    blacklistContent.removeChild(itemToRemove);
    let currentState = JSON.parse(localStorage.getItem("populate"));
    currentState._blacklist = currentState._blacklist.filter(
      site => site.trim() !== itemToRemove.id.trim()
    );
    localStorage.setItem("populate", JSON.stringify(currentState));
  }
});

// Listener for new blacklist site input, listen for enter key
blacklistInput.addEventListener("keyup", e => {
  if (event.keyCode === 13) {
    let newBlacklistSite = e.target.value.trim();
    let currentState = JSON.parse(localStorage.getItem("populate"));
    if (!currentState._blacklist.includes(newBlacklistSite)) {
      currentState._blacklist.push(newBlacklistSite);
      localStorage.setItem("populate", JSON.stringify(currentState));
      createBlacklistDropdownElements([newBlacklistSite]);
    }
    blacklistInput.value = "";
  }
});

// Listeners to show/hide blacklist dropdown
blacklistButton.addEventListener("click", toggleBlacklistDropdown);
blacklistContainer.addEventListener("blur", toggleBlacklistDropdown);
blacklistInput.addEventListener("blur", toggleBlacklistDropdown);

function toggleBlacklistDropdown(e) {
  if (
    e.relatedTarget &&
    e.relatedTarget.id !== "blacklist-input" &&
    e.relatedTarget.id !== "dropbtn"
  ) {
    blacklistContainer.classList.toggle("show");
  } else if (e.currentTarget.id === "dropbtn") {
    blacklistContainer.classList.toggle("show");
    blacklistContainer.focus();
  }
}
