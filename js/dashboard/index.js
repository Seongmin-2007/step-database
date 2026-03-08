/**
 * @file index.js  (dashboard)
 * @description Dashboard entry point.
 *
 * Sections (in order):
 *   1. Stats          — headline numbers
 *   2. STEP Matrix    — question grid coloured by priority
 *   3. Heatmap        — activity over last 120 days
 *   4. Priority List  — top questions to revisit
 *   5. Weak Topics    — tags with highest average difficulty
 *   6. Topic Tree     — full syllabus tree with completion progress
 *
 * Removed (were bloat):
 *   - Time per attempt chart     (not actionable)
 *   - Difficulty over time chart (not actionable)
 *   - Recent Activity list       (duplicated by heatmap day-view)
 */

import { getAttempts, onAttemptsChanged } from "../core/attemptStore.js";

import { computeStats,        renderStats }      from "./stats.js";
import { computePriorityList, buildPriorityMap,
         renderPriorityList }                     from "./priority.js";
import { renderHeatmap, closeDayView }           from "./heatmap.js";
import { renderStepMatrix }                      from "./matrix.js";
import { computeWeakTopics,  renderWeakTopics }  from "./weakTopics.js";
import { buildTopicTree,     renderTopicTree }   from "./topicTree.js";

// ─── State ────────────────────────────────────────────────────────────────────

let initialized = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise and render the dashboard.
 * Safe to call multiple times — only subscribes to attempt changes once.
 * @param {Object[]} questions
 */
export function loadDashboard(questions) {
  _render(getAttempts(), questions);

  if (!initialized) {
    onAttemptsChanged(newAttempts => _render(newAttempts, questions));
    initialized = true;
  }

  document.getElementById("close-day-view")
    ?.addEventListener("click", closeDayView);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _buildModel(attempts, questions) {
  const priorityList = computePriorityList(attempts);

  return {
    attempts,
    stats:       computeStats(attempts),
    priority:    priorityList,
    priorityMap: buildPriorityMap(priorityList),
    weakTopics:  computeWeakTopics(attempts),
    topicTree:   buildTopicTree(questions, attempts)
  };
}

function _render(attempts, questions) {
  const model = _buildModel(attempts, questions);

  renderStats(model.stats);
  renderStepMatrix(questions, model.priorityMap);
  renderHeatmap(model.attempts);
  renderPriorityList(model.priority);
  renderWeakTopics(model.weakTopics);
  renderTopicTree(model.topicTree);
}