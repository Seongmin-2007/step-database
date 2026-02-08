export function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${hrs == 0 ? "" : String(hrs) + "hrs "}${String(mins).padStart(2, "0")}min ${String(secs).padStart(2, "0")}sec`;
}

export function firebaseTimeToDate(date) {
    return date.toDate().toISOString().slice(0, 10);
}