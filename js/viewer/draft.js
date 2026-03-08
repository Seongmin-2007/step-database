/**
 * @file draft.js
 * @description localStorage-backed draft persistence for in-progress attempts.
 *              Drafts are keyed by question ID and survive page refreshes.
 */

const PREFIX = "draft:";

/**
 * Save a draft for a question.
 * @param {string} questionID
 * @param {{ status: string, notes: string, time: number, difficulty: number }} data
 */
export function saveDraft(questionID, data) {
  try {
    localStorage.setItem(PREFIX + questionID, JSON.stringify(data));
  } catch (err) {
    console.warn("[draft] Could not save draft:", err);
  }
}

/**
 * Load a saved draft for a question.
 * @param   {string} questionID
 * @returns {{ status: string, notes: string, time: number, difficulty: number } | null}
 */
export function loadDraft(questionID) {
  try {
    const raw = localStorage.getItem(PREFIX + questionID);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Delete the draft for a question (e.g. after a successful commit).
 * @param {string} questionID
 */
export function clearDraft(questionID) {
  localStorage.removeItem(PREFIX + questionID);
}