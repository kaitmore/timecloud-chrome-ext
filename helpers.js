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
