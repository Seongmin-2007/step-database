/**
 * @file flagStore.js
 * @description Persists flagged/bookmarked question IDs in localStorage.
 * Flags are per-device (not synced to Firestore) — intentionally lightweight.
 */

const KEY = "step:flagged";

// ─── Internal ─────────────────────────────────────────────────────────────────

function _load() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function _save(set) {
  localStorage.setItem(KEY, JSON.stringify([...set]));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Toggle the flagged state of a question.
 * @param   {string} questionID  e.g. "2022-S2-Q5"
 * @returns {boolean} true if now flagged, false if unflagged
 */
export function toggleFlag(questionID) {
  const flags = _load();
  if (flags.has(questionID)) {
    flags.delete(questionID);
    _save(flags);
    return false;
  }
  flags.add(questionID);
  _save(flags);
  return true;
}

/** @returns {boolean} */
export function isFlagged(questionID) {
  return _load().has(questionID);
}

/** @returns {Set<string>} */
export function getAllFlags() {
  return _load();
}