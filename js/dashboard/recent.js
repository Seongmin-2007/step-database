/**
 * @file recent.js
 * @description Computes and renders the "recently attempted" question list.
 */

import { createAttemptCard } from "../ui/ui.js";

// ─── Compute ──────────────────────────────────────────────────────────────────

/**
 * Get the N most recently attempted unique questions.
 * @param   {Object[]} attempts   Sorted descending by createdAt
 * @param   {number}   [limit=8]
 * @returns {Object[]}            Full attempt objects (most recent per question)
 */
export function computeRecentQuestions(attempts, limit = 8) {
  const seen   = new Set();
  const recent = [];

  for (const a of attempts) {
    if (!seen.has(a.questionID)) {
      seen.add(a.questionID);
      recent.push(a);
    }
    if (recent.length >= limit) break;
  }

  return recent;
}

// ─── Render ───────────────────────────────────────────────────────────────────

/**
 * Render the recent question list into #recentList.
 * @param {Object[]} list
 */
export function renderRecentList(list) {
  const ul = document.getElementById("recentList");
  if (!ul) return;

  ul.innerHTML = "";

  if (!list.length) {
    ul.innerHTML = "<li>No recent activity yet.</li>";
    return;
  }

  list.forEach(item => {
    const fakeDoc = { id: item.id, ref: null, data: () => item };
    ul.appendChild(createAttemptCard(fakeDoc, { includeID: true }));
  });
}