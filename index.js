const MS_IN_DAY = 8.64e7;
const MS_IN_WEEK = 6.048e8;

const body = document.querySelector("body");
const mainContent = document.getElementById("main-content");
const resetButton = document.getElementById("reset");
const graphViewButton = document.getElementById("graph-view-button");
const listViewButton = document.getElementById("list-view-button");
const listViewContainer = document.getElementById("list-view-container");
const listViewList = document.getElementById("list-view-list");
const error = document.getElementById("error");
const search = document.getElementById("search");
const downloadButton = document.getElementById("download-button");
const blacklistButton = document.getElementById("dropbtn");
const blacklistInput = document.getElementById("blacklist-input");
const blacklistContainer = document.getElementById("dropdown-container");
const blacklistContent = document.getElementById("blacklist-content");
const timeseriesFilterDropdown = document.getElementById("sort");

const timeSeriesFilters = {
  alltime: "All Time",
  day: "24 Hours",
  week: "7 Days"
};
let searchInput = document.getElementById("search-input");
let listView = false;
let searchTerm;
let timeseriesFilter;

// Set up the new tab page on first load
if (getItems().length > 3) {
  createTimeseriesFilterDropdown();
  createBlacklistDropdownElements(getBlacklist());
  drawView(getItems());
} else {
  error.style.display = "block";
}

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

function toggleBlacklistDropdown(e) {
  blacklistContainer.classList.toggle("show");
}

function getItems() {
  let storedSites = JSON.parse(localStorage.getItem("populate")) || {};
  let items = Object.keys(storedSites)
    .filter(site => !site.startsWith("_") && site !== "null")
    .slice(0, 100)
    .filter(site => site.includes(searchInput.value)) // filter out sites that don't match search term
    .map(site => {
      return {
        url: site,
        time: getTiming(storedSites[site], timeseriesFilter)
      };
    })
    .filter(site => site.time) // filter out 0 timings
    .sort((a, b) => {
      return a.time > b.time ? -1 : 1;
    });

  return items;
}

function getTiming(timeseriesData, filter) {
  console.log(timeseriesData, filter);
  let timings = timeseriesData[0];
  let timestamps = timeseriesData[1];
  let now = Date.now();
  const getTotalTime = (total, timing) => total + timing;
  switch (filter) {
    case "day":
      return timings
        .filter((x, idx) => timestamps[idx] >= now - MS_IN_DAY)
        .reduce(getTotalTime, 0);
    case "week":
      return timings
        .filter((x, idx) => timestamps[idx] >= now - MS_IN_WEEK)
        .reduce(getTotalTime, 0);
    case "alltime":
    default:
      return timings.reduce(getTotalTime, 0);
  }
}

function getBlacklist() {
  return JSON.parse(localStorage.getItem("populate"))._blacklist;
}

function drawView(items) {
  if (listView) {
    renderListView(items);
  } else {
    renderGraphView(items);
  }
}

function renderListView(items) {
  // Clear out any previous list elements
  listViewList.innerHTML = "";
  // Set up the DOM
  searchTerm = searchInput.value !== "" ? searchInput.value : "all";
  let listViewTitle = document.createElement("li");
  listViewTitle.id = "list-view-title";
  listViewTitle.innerHTML =
    "Time Spent in Category: " + searchTerm + "<span>Visit Count</span>";
  listViewList.appendChild(listViewTitle);
  // loop through each sorted item and append to DOM
  items.forEach(site => {
    const item = document.createElement("li");

    const link = document.createElement("a");
    link.href = site.url;
    link.innerText = site.url;

    const timing = document.createElement("span");
    timing.innerText = msToMinAndSec(site.time);

    item.appendChild(link);
    item.appendChild(timing);
    listViewList.appendChild(item);
  });
}

function renderGraphView(items) {
  // Clean up DOM
  error.style.display = "none";
  d3.selectAll("svg").remove();
  d3.selectAll("#tooltip").remove();

  const height = window.innerHeight;
  const width = window.innerWidth;

  // Create the canvas
  d3.select("#main-content")
    .append("svg")
    .attr("height", height)
    .attr("width", width)
    .style("margin-top", "-84px");

  const tooltip = d3
    .select("#main-content")
    .append("div")
    .attr("id", "tooltip")
    .style("opacity", 0);

  const nodes = items.map(function(d) {
    return {
      time: d.time,
      url: d.url
    };
  });

  // Scale data
  const minDataPoint = d3.min(nodes, function(d) {
    return d.time;
  });
  const maxDataPoint = d3.max(nodes, function(d) {
    return d.time;
  });

  const linearScale = d3
    .scaleLinear()
    .domain([minDataPoint, maxDataPoint])
    .range([8, 100]);

  let newScaledData = nodes.map(node => ({
    ...node,
    radius: linearScale(node.time)
  }));

  const totalTimeSpent = newScaledData.reduce((total, curr) => {
    return total + curr.time;
  }, 0);

  const color = d3.scaleOrdinal(d3.schemeCategory20c);

  d3.forceSimulation(newScaledData)
    .force("charge", d3.forceManyBody().strength(3))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collision",
      d3.forceCollide().radius(function(d) {
        return d.radius + 10;
      })
    )
    .on("tick", ticked);

  d3.select("svg").append("defs");

  function ticked() {
    const circles = d3
      .select("svg")
      .selectAll("circle")
      .data(newScaledData);

    const links = d3
      .select("svg")
      .selectAll("a")
      .data(newScaledData)
      .attr("href", d => d.url);

    circles
      .enter()
      .append("a")
      .append("circle")
      .merge(circles)
      .merge(links)
      .attr("fill", d => color(d.time))
      .attr("index", d => d.index)
      .attr("r", d => d.radius)
      .attr("cx", d => Math.max(d.radius, Math.min(width - d.radius, d.x)))
      .attr("cy", d => Math.max(d.radius, Math.min(height - d.radius, d.y)))
      .style("stroke", "white")
      .style("cursor", "pointer")
      .style("stroke-width", 2);

    circles.on("mouseover", function(d) {
      // highlight circle on mouseover
      const circle = d3.select(this);
      circle.style("stroke-width", 4);

      tooltip
        .html(
          d.url +
            "<br/> - <br/>Time Spent: " +
            msToMinAndSec(d.time) +
            " <br/> Percentage: " +
            ((d.time * 100) / totalTimeSpent).toFixed(2) +
            "%"
        )
        .style("left", d3.event.pageX + "px")
        .style("top", d3.event.pageY + "px")
        .style("opacity", 0.9)
        .style("visibility", "visible");
    });

    circles.on("mouseout", function(d) {
      // hide tooltip
      tooltip.style("visibility", "hidden");
      // select circle and remove highlighted border
      const circle = d3.select(this);
      circle.style("stroke-width", 2);
    });

    circles.exit().remove();
  }

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
        if (
          active.url.includes("chrome://newtab") &&
          localStorageItems.length
        ) {
          drawView(localStorageItems);
        }
      });
    }
  });
}

function createTimeseriesFilterDropdown() {
  console.log("this is run");
  let currentState = JSON.parse(localStorage.getItem("populate"));
  timeseriesFilter = currentState._settings.timeseriesFilter;

  Object.keys(timeSeriesFilters).forEach(filter => {
    let option = document.createElement("option");
    option.value = filter;
    option.innerText = timeSeriesFilters[filter];
    if (filter === timeseriesFilter) {
      option.setAttribute("selected", true);
    }
    timeseriesFilterDropdown.appendChild(option);
  });
}

function createBlacklistDropdownElements(sites) {
  sites.forEach(site => {
    let div = document.createElement("div");
    div.className = "blacklist-item";
    div.id = site;
    let siteName = document.createElement("span");
    let remove = document.createElement("span");
    siteName.innerText = site;
    remove.className = "blacklist-remove glyphicon glyphicon-remove-circle";
    remove.setAttribute("data-value", site);
    div.appendChild(siteName);
    div.appendChild(remove);
    blacklistContent.prepend(div);
  });
}

function downloadCSV() {
  let csvContent = "data:text/csv;charset=utf-8,";
  let sites = JSON.parse(localStorage.getItem("populate"));
  let csvData = ["Site, Past 24hrs/ms, Past 7 days/ms, All Time/ms"];

  Object.keys(sites)
    .filter(key => !key.startsWith("_") && key !== "null")
    .forEach(site => {
      let allTime = getTiming(sites[site], "alltime");
      let day = getTiming(sites[site], "day");
      let week = getTiming(sites[site], "week");
      csvData.push(`${site},${day},${week},${allTime}`);
    });

  csvContent += csvData.join("\n");
  window.open(encodeURI(csvContent));
}
