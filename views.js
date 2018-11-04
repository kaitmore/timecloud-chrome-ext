/**
 * Renders the list view elements by looping through the nodes
 * array and appending list items to the list view container
 * @param {Array.<{url: String, time:Number>} nodes
 */
function renderListView(nodes) {
  error.classList.remove("show");
  // Clear out any previous list elements
  listViewList.innerHTML = "";

  // Set up the DOM
  searchTerm = searchInput.value !== "" ? searchInput.value : "all";
  let listViewTitle = document.createElement("li");
  listViewTitle.id = "list-view-title";
  listViewTitle.innerHTML = "Time Spent: " + searchTerm;
  listViewList.appendChild(listViewTitle);

  // Loop through each sorted item and append to DOM
  nodes.forEach(site => {
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

/**
 * Creates the d3 force simulation and handles mouse events for the svgs
 * @param {Array.<{url: String, time:Number>} nodes
 */
function renderGraphView(nodes = []) {
  // Clean up DOM
  error.classList.remove("show");
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

  const simulation = d3
    .forceSimulation(newScaledData)
    .force("charge", d3.forceManyBody().strength(3))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collision",
      d3.forceCollide().radius(function(d) {
        return d.radius + 5;
      })
    )
    .on("tick", ticked);

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
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .merge(circles)
      .merge(links)
      .attr("fill", d => color(d.time))
      .attr("index", d => d.index)
      .attr("r", d => d.radius)
      .attr("cx", d => Math.max(d.radius, Math.min(width - d.radius, d.x)))
      .attr("cy", d => Math.max(d.radius, Math.min(height - d.radius, d.y)))
      .style("cursor", "pointer");

    circles.on("mouseover", function(d) {
      // highlight circle on mouseover
      const circle = d3.select(this);
      circle.attr("stroke-width", 4);

      tooltip
        .html(
          d.url +
            "<br/> - <br/>Time Spent: " +
            msToMinAndSec(d.time) +
            " <br/> " +
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
      circle.attr("stroke-width", 2);
    });

    circles.exit().remove();
  }
}

/**
 * Renders the appropriate view based on the available nodes
 * and the selected view type.
 * @param {Array.<{url: String, time:Number>} nodes
 */
function drawView(nodes) {
  // If there are too few nodes and it's not because a
  // search term is filtering them, show the error message
  if (nodes.length < 4 && !searchTerm) {
    error.classList.add("show");
    listViewButton.setAttribute("disabled", true);
  } else if (listView) {
    listViewButton.setAttribute("disabled", false);
    renderListView(nodes);
  } else {
    renderGraphView(nodes);
  }
}

/**
 * Generates the timeseries filter dropdown elements so that we can set
 * the user's prefered filter from local storage
 */
function createTimeseriesFilterDropdown(settings) {
  timeseriesFilter = settings.timeseriesFilter || "alltime";
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

/**
 * Generates the blacklist dropdown elements so that we can set
 * the user's blacklisted sites from local storage
 */
function createBlacklistDropdownElements(blacklistedSites) {
  blacklistedSites.forEach(site => {
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
