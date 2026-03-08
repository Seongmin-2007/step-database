/**
 * @file heatmap.js
 * @description Activity heatmap (last N days) and the day-view drill-down.
 */

import { HEATMAP_DAYS }      from "../core/constants.js";
import { toDate }            from "../core/utils.js";
import { parseQuestionID }   from "../core/utils.js";
import { questionImagePath } from "../core/constants.js";
import { createAttemptCard } from "../ui/ui.js";

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
  const dashboard = document.querySelector(".dashboard-layout");
  const dayScreen = document.getElementById("day-screen");

  if (!dashboard || !dayScreen) return;

  dashboard.style.display = "none";
  dayScreen.style.display = "block";

  document.getElementById("dayTitle").textContent = `Attempts on ${dateKey}`;

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
      const fakeDoc = { id: a.id, ref: null, data: () => a };
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
  const dashboard = document.querySelector(".dashboard-layout");
  const dayScreen = document.getElementById("day-screen");
  if (dashboard) dashboard.style.display = "";
  if (dayScreen) dayScreen.style.display = "none";
}