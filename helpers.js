// Scale the data for the viz
function compress(arr, max, range) {
  var hardMax = 1;
  var softMax = 0.75;
  var compressedVals = [];
  var xtra = max - softMax;
  for (var i = 0; i < arr.length; i++) {
    let obj = Object.assign({}, arr[i]);
    obj.radius =
      softMax +
      (hardMax - softMax) * (parseFloat(arr[i].time - softMax) / xtra);
    compressedVals.push(obj);
  }
  return compressedVals;
}

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

function myFunction() {
  document.getElementById("myDropdown").classList.toggle("show");
}

function filterFunction() {
  var input, filter, ul, li, a, i;
  input = document.getElementById("myInput");
  filter = input.value.toUpperCase();
  div = document.getElementById("myDropdown");
  a = div.getElementsByTagName("a");
  for (i = 0; i < a.length; i++) {
    if (a[i].innerHTML.toUpperCase().indexOf(filter) > -1) {
      a[i].style.display = "";
    } else {
      a[i].style.display = "none";
    }
  }
}
