const MS_IN_DAY = 8.64e7;
const MS_IN_WEEK = 6.048e8;

function msToMinAndSec(millis) {
  if (millis < 1000) {
    return `${millis} ms`;
  }
  const d = new Date(millis);
  const hours = d.getUTCHours() ? `${d.getUTCHours()} hrs ` : "";
  const minutes = d.getUTCMinutes() ? `${d.getUTCMinutes()} mins ` : "";
  const seconds = d.getUTCSeconds() ? `${d.getUTCSeconds()} secs ` : "";
  return hours + minutes + seconds;
}

function getBlacklist() {
  return JSON.parse(localStorage.getItem("populate"))._blacklist;
}

function getTiming(timeseriesData, filter) {
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

function getItems() {
  let storedSites = JSON.parse(localStorage.getItem("populate")) || {};
  let items = Object.keys(storedSites)
    .filter(site => !site.startsWith("_") && site !== "null")
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
