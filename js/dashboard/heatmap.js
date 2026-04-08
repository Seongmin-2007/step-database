/**
 * @file heatmap.js
 * @description Activity heatmap (last N days) and the day-view drill-down.
 */

import { HEATMAP_DAYS }      from "../core/constants.js";
import { toDate }            from "../core/utils.js";
import { parseQuestionID }   from "../core/utils.js";
import { questionImagePath } from "../core/constants.js";
import { createAttemptCard } from "../ui/ui.js";
import { navigate }          from "../router.js";

// ─── Heatmap ──────────────────────────────────────────────────────────────────

/**
 * Render the heatmap grid into #heatmap.
 * @param {Object[]} attempts
 */
export function renderHeatmap(attempts) {
  const container = document.getElementById("heatmap");
  if (!container) return;

  container.innerHTML = "";

  // Build activity map: "YYYY-MM-DD" → count
  const activity = {};
  attempts.forEach(a => {
    if (!a.createdAt) return;
    const key = toDate(a.createdAt).toISOString().slice(0, 10);
    activity[key] = (activity[key] ?? 0) + 1;
  });

  const today = new Date();

  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d     = new Date(today);
    d.setDate(today.getDate() - i);
    const key   = d.toISOString().slice(0, 10);
    const count = activity[key] ?? 0;

    const cell  = document.createElement("div");
    cell.className = `heat-day heat-${Math.min(count, 10)}`;
    cell.title     = `${key}: ${count} attempt${count !== 1 ? "s" : ""}`;
    cell.addEventListener("click", () => openDayView(key, attempts));
    container.appendChild(cell);
  }
}

// ─── Day view ─────────────────────────────────────────────────────────────────

/**
 * Open the day-view drill-down for a specific date.
 * @param {string}   dateKey   "YYYY-MM-DD"
 * @param {Object[]} allAttempts
 */
export function openDayView(dateKey, allAttempts) {
  navigate("day");

  // Format date nicely e.g. "Thursday, 3 April 2025"
  const dateObj     = new Date(dateKey + "T12:00:00");
  const dateLabel   = dateObj.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  document.getElementById("dayTitle").textContent = dateLabel;

  const container = document.getElementById("dayAttempts");
  container.innerHTML = "";

  const dayAttempts = allAttempts.filter(a => {
    if (!a.createdAt) return false;
    return toDate(a.createdAt).toISOString().slice(0, 10) === dateKey;
  });

  if (!dayAttempts.length) {
    container.innerHTML = "<p>No attempts that day.</p>";
    return;
  }

  // ── Daily stats bar ───────────────────────────────────────────────────────
  const uniqueQuestions = new Set(dayAttempts.map(a => a.questionID));
  const completed       = dayAttempts.filter(a => a.status === "completed");
  const totalSecs       = dayAttempts.reduce((sum, a) => sum + (a.time ?? 0), 0);
  const ratedAttempts   = dayAttempts.filter(a => a.difficulty);
  const avgDiff         = ratedAttempts.length
    ? (ratedAttempts.reduce((sum, a) => sum + a.difficulty, 0) / ratedAttempts.length).toFixed(1)
    : null;

  const hours   = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const timeStr = hours > 0
    ? `${hours}h ${minutes}m`
    : minutes > 0 ? `${minutes}m` : "< 1m";

  const statsBar = document.createElement("div");
  statsBar.className = "day-stats-bar";
  statsBar.innerHTML = `
    <div class="day-stat">
      <span class="day-stat__value">${timeStr}</span>
      <span class="day-stat__label">Time spent</span>
    </div>
    <div class="day-stat">
      <span class="day-stat__value">${uniqueQuestions.size}</span>
      <span class="day-stat__label">Question${uniqueQuestions.size !== 1 ? "s" : ""} attempted</span>
    </div>
    <div class="day-stat">
      <span class="day-stat__value">${completed.length}</span>
      <span class="day-stat__label">Completed</span>
    </div>
    <div class="day-stat">
      <span class="day-stat__value">${dayAttempts.length}</span>
      <span class="day-stat__label">Total attempt${dayAttempts.length !== 1 ? "s" : ""}</span>
    </div>
    ${avgDiff !== null ? `
    <div class="day-stat">
      <span class="day-stat__value">${avgDiff}</span>
      <span class="day-stat__label">Avg difficulty</span>
    </div>` : ""}
  `;
  container.appendChild(statsBar);

  // Group by question
  /** @type {Record<string, Object[]>} */
  const byQuestion = {};
  dayAttempts.forEach(a => (byQuestion[a.questionID] ??= []).push(a));

  for (const [qid, qAttempts] of Object.entries(byQuestion)) {
    const { year, paper, question } = parseQuestionID(qid);

    const block = document.createElement("div");
    block.className = "question-block";

    // Question image
    const imgBox = document.createElement("div");
    imgBox.className = "question-content";
    imgBox.innerHTML = `<img src="${questionImagePath(year, paper, question)}" alt="Question ${qid}">`;
    block.appendChild(imgBox);

    // Attempt cards
    const attemptsBox = document.createElement("div");
    attemptsBox.className = "attempts-container";

    qAttempts.forEach(a => {
      const fakeDoc = { id: a.id ?? a.questionID + "_" + (a.createdAt?.seconds ?? Date.now()), ref: null, data: () => a };
      attemptsBox.appendChild(createAttemptCard(fakeDoc, { includeID: true }));
    });

    block.appendChild(attemptsBox);
    container.appendChild(block);
  }
}

/**
 * Close the day view and return to the dashboard layout.
 */
export function closeDayView() {
  navigate("dashboard-root");
}