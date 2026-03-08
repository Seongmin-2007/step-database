/**
 * @file index.js  (dashboard)
 * @description Dashboard entry point. Orchestrates all dashboard sub-modules.
 *              Call `loadDashboard(questions)` to initialise or refresh.
 */

import { getAttempts, onAttemptsChanged } from "../core/attemptStore.js";
import { getAllQuestions }                from "../core/questionStore.js";

import { computeStats,        renderStats }         from "./stats.js";
import { computePriorityList, buildPriorityMap,
         renderPriorityList }                        from "./priority.js";
import { computeRecentQuestions, renderRecentList } from "./recent.js";
import { renderHeatmap, closeDayView }              from "./heatmap.js";
import { renderTimeChart, renderDifficultyChart }   from "./charts.js";
import { renderStepMatrix }                         from "./matrix.js";

// ─── State ────────────────────────────────────────────────────────────────────

let initialized = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise and render the dashboard.
 * Safe to call multiple times — only subscribes to attempt changes once.
 *
 * @param {Object[]} questions  Full question list (from questionStore)
 */
export function loadDashboard(questions) {
  const attempts = getAttempts();
  _render(attempts, questions);

  if (!initialized) {
    onAttemptsChanged(newAttempts => _render(newAttempts, questions));
    initialized = true;
  }

  // Wire up day-view back button (once)
  document.getElementById("close-day-view")?.addEventListener("click", closeDayView, { once: false });
}

// ─── Internal ─────────────────────────────────────────────────────────────────

/**
 * Build the dashboard data model from raw attempts.
 * @private
 */
function _buildModel(attempts) {
  const sorted = [...attempts].sort(
    (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
  );

  const priorityList = computePriorityList(sorted);

  return {
    attempts:         sorted,
    stats:            computeStats(sorted),
    priority:         priorityList,
    priorityMap:      buildPriorityMap(priorityList),
    recent:           computeRecentQuestions(sorted),
  };
}

/**
 * Render all dashboard sections from a fresh model.
 * @private
 */
function _render(attempts, questions) {
  const model = _buildModel(attempts);

  renderStats(model.stats);
  renderPriorityList(model.priority);
  renderRecentList(model.recent);
  renderHeatmap(model.attempts);
  renderStepMatrix(questions, model.priorityMap);
  renderTimeChart(model.attempts);
  renderDifficultyChart(model.attempts);
}