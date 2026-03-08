/**
 * @file utils.js
 * @description Pure utility functions shared across modules.
 *              No side effects, no imports from internal modules.
 */

// ─── Time formatting ──────────────────────────────────────────────────────────

/**
 * Format a duration in seconds to a human-readable string.
 * @param   {number} seconds
 * @returns {string} e.g. "1hrs 04min 32sec" or "04min 32sec"
 */
export function formatTime(seconds) {
  const hrs  = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const hPart = hrs > 0 ? `${hrs}hrs ` : "";
  const mPart = `${String(mins).padStart(2, "0")}min `;
  const sPart = `${String(secs).padStart(2, "0")}sec`;

  return `${hPart}${mPart}${sPart}`;
}

/**
 * Parse a formatted time string back to seconds.
 * @param   {string} str  e.g. "1hrs 04min 32sec"
 * @returns {number} Total seconds
 */
export function parseTime(str) {
  const hrs  = str.match(/(\d+)hrs/)?.[1]  ?? 0;
  const mins = str.match(/(\d+)min/)?.[1]  ?? 0;
  const secs = str.match(/(\d+)sec/)?.[1]  ?? 0;
  return Number(hrs) * 3600 + Number(mins) * 60 + Number(secs);
}

// ─── Firebase helpers ─────────────────────────────────────────────────────────

/**
 * Convert a Firestore Timestamp (or plain seconds object) to an ISO date string.
 * @param   {import("firebase/firestore").Timestamp|{seconds:number}} ts
 * @returns {string} "YYYY-MM-DD"
 */
export function timestampToDateStr(ts) {
  try {
    return ts.toDate().toISOString().slice(0, 10);
  } catch {
    return new Date(ts.seconds * 1000).toISOString().slice(0, 10);
  }
}

/**
 * Convert a Firestore Timestamp to a JS Date, safely.
 * @param   {import("firebase/firestore").Timestamp|Date} ts
 * @returns {Date}
 */
export function toDate(ts) {
  if (ts instanceof Date) return ts;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  return new Date(ts);
}

// ─── Question ID helpers ──────────────────────────────────────────────────────

/**
 * Build a canonical question ID string from its parts.
 * @param   {{ year: string|number, paper: string|number, question: string|number }} q
 * @returns {string} e.g. "2022-S2-Q5"
 */
export function makeQuestionID({ year, paper, question }) {
  return `${year}-S${paper}-Q${question}`;
}

/**
 * Parse a canonical question ID string into its parts.
 * @param   {string} id  e.g. "2022-S2-Q5"
 * @returns {{ year: string, paper: string, question: string }}
 */
export function parseQuestionID(id) {
  const [year, s, q] = id.split("-");
  return {
    year,
    paper:    s.replace("S", ""),
    question: q.replace("Q", "")
  };
}