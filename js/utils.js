export function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs == 0 ? "" : String(hrs) + "hrs "}${String(mins).padStart(2, "0")}min ${String(secs).padStart(2, "0")}sec`;
}

export function firebaseTimeToDate(date) {
    if (!date) return "N/A";

    // Firestore Timestamp
    if (typeof date.toDate === "function") return date.toDate().toISOString().slice(0, 10);

    // Native JS Date
    if (date instanceof Date) return date.toISOString().slice(0, 10);

    // If it’s an object we don’t recognize, return N/A
    if (typeof date === "object") return "N/A";

    // Otherwise, return as string
    return String(date);
}
