/**
 * @file stats.js
 * @description Computes and renders the four headline stat cards on the dashboard.
 */

// ─── Compute ──────────────────────────────────────────────────────────────────

/**
 * Compute aggregate stats from a list of attempts.
 * @param   {Object[]} attempts
 * @returns {{ attempted: number, completed: number, avgTimeMin: number, avgDifficulty: string }}
 */
export function computeStats(attempts) {
  const attempted  = new Set();
  const completed  = new Set();
  let totalTime    = 0, timeCount = 0;
  let totalDiff    = 0, diffCount = 0;

  attempts.forEach(a => {
    attempted.add(a.questionID);
    if (a.status === "completed") completed.add(a.questionID);

    if (typeof a.time === "number") { totalTime += a.time;       timeCount++; }
    if (a.difficulty)               { totalDiff += a.difficulty; diffCount++; }
  });

  return {
    attempted:     attempted.size,
    completed:     completed.size,
    avgTimeMin:    timeCount ? Math.round(totalTime / timeCount / 60) : 0,
    avgDifficulty: diffCount ? (totalDiff / diffCount).toFixed(1) : "—"
  };
}

// ─── Render ───────────────────────────────────────────────────────────────────

/**
 * Render the stat cards into their DOM containers.
 * @param {{ attempted: number, completed: number, avgTimeMin: number, avgDifficulty: string }} s
 */
export function renderStats(s) {
  _set("stat-attempted",     "Attempted",         s.attempted);
  _set("stat-completed",     "Completed",         s.completed);
  _set("stat-avg-time",      "Average time",      `${s.avgTimeMin} min`);
  _set("stat-avg-difficulty","Average difficulty", s.avgDifficulty);
}

function _set(id, label, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<h3>${label}</h3><div class="value">${value}</div>`;
}