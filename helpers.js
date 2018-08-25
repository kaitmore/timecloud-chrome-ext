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
