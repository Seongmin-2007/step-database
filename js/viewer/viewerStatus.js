/**
 * @file viewerStatus.js
 * @description
 * Renders the completion status badge and flag button in the viewer header.
 *
 * HOW TO WIRE INTO render.js:
 *   1. Import at top of render.js:
 *        import { renderViewerStatus, bindFlagButton } from "./viewerStatus.js";
 *
 *   2. In renderQuestion(), after setting the question title,
 *      call:  renderViewerStatus(questionID, attempts);
 *
 *   3. In loadQuestion() (viewer/index.js), after attempts load,
 *      call:  bindFlagButton(questionID);
 *
 * HTML required in viewer (add inside .question-header):
 *   <div class="viewer-status-row">
 *     <div id="viewer-status-badge"></div>
 *     <button id="viewer-flag-btn" class="btn btn--icon" aria-label="Flag question" title="Flag for later">⚑</button>
 *   </div>
 */

import { isFlagged, toggleFlag } from "../core/flagStore.js";

// ─── Status Badge ─────────────────────────────────────────────────────────────

/**
 * Render the completion badge next to the question title.
 * @param {string}   questionID
 * @param {Object[]} attempts    All attempts for this question
 */
export function renderViewerStatus(questionID, attempts) {
  const el = document.getElementById("viewer-status-badge");
  if (!el) return;

  if (!attempts.length) {
    el.innerHTML = `<span class="viewer-badge status-none">Not attempted</span>`;
    return;
  }

  const isCompleted = attempts.some(a => a.status === "completed");
  const count       = attempts.length;
  const diffs       = attempts.map(a => a.difficulty).filter(Boolean);
  const avgDiff     = diffs.length
    ? (diffs.reduce((s, d) => s + d, 0) / diffs.length).toFixed(1)
    : null;

  const latest      = attempts.sort((a, b) =>
    (b.timestamp?.toMillis?.() ?? 0) - (a.timestamp?.toMillis?.() ?? 0)
  )[0];
  const dateStr     = latest.timestamp
    ? new Date(latest.timestamp.toMillis()).toLocaleDateString()
    : "";

  el.innerHTML = `
    <span class="viewer-badge status-${isCompleted ? "completed" : "attempted"}">
      ${isCompleted ? "✓ Completed" : "In progress"}
    </span>
    <span class="viewer-badge-meta">
      ${count} attempt${count !== 1 ? "s" : ""}
      ${avgDiff !== null ? `· avg difficulty ${avgDiff}` : ""}
      ${dateStr ? `· last ${dateStr}` : ""}
    </span>
  `;
}

// ─── Flag Button ──────────────────────────────────────────────────────────────

/**
 * Set up the flag toggle button for the current question.
 * Safe to call on every question load — replaces previous listener.
 * @param {string} questionID
 */
export function bindFlagButton(questionID) {
  const btn = document.getElementById("viewer-flag-btn");
  if (!btn) return;

  // Reflect current state
  _updateFlagBtn(btn, isFlagged(questionID));

  // Replace listener each load to avoid stacking
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener("click", () => {
    const nowFlagged = toggleFlag(questionID);
    _updateFlagBtn(newBtn, nowFlagged);
  });
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _updateFlagBtn(btn, flagged) {
  btn.textContent  = flagged ? "⚑" : "⚐";
  btn.title        = flagged ? "Remove flag" : "Flag for later";
  btn.classList.toggle("flagged", flagged);
}