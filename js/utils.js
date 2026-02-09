export function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs == 0 ? "" : String(hrs) + "hrs "}${String(mins).padStart(2, "0")}min ${String(secs).padStart(2, "0")}sec`;
}

export function parseTime(str) {
    const hrsMatch = str.match(/(\d+)hrs/);
    const minMatch = str.match(/(\d+)min/);
    const secMatch = str.match(/(\d+)sec/);

    const hrs = hrsMatch ? parseInt(hrsMatch[1]) : 0;
    const mins = minMatch ? parseInt(minMatch[1]) : 0;
    const secs = secMatch ? parseInt(secMatch[1]) : 0;

    // returns time.
    return hrs * 3600 + mins * 60 + secs;
}

export function firebaseTimeToDate(date) {
    try {
        return date.toDate().toISOString().slice(0, 10);
    } catch (err) {
        // window.testVariable = date;
        return (new Date(date.seconds * 1000)).toISOString().slice(0, 10);
    }
}
