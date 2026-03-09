/**
 * @file priority.js
 * @description Computes a priority score for each attempted question and
 *              renders the top-10 priority list.
 *
 * Scoring formula:
 *   score = Σ (difficulty² × 2 + cappedTime/10 + recencyPenalty) × timeDecayWeight
 *   normalized by total weight, then scaled by a log(attempts) bonus.
 */

import {
  PRIORITY_DECAY_DAYS,
  PRIORITY_LATEST_BOOST,
  PRIORITY_ATTEMPT_LOG
} from "../core/constants.js";

import { toDate, makeQuestionID }   from "../core/utils.js";
import { getAllQuestions, getTagsFor } from "../core/questionStore.js";
import { emit }                        from "../core/eventBus.js";
import { loadQuestion }                from "../viewer/index.js";

// ─── Compute ──────────────────────────────────────────────────────────────────

/**
 * Compute a sorted priority list from attempts.
 * @param   {Object[]} attempts
 * @returns {{ questionID: string, score: string }[]}  Sorted descending by score
 */
export function computePriorityList(attempts) {
  /** @type {Record<string, Object[]>} */
  const byQuestion = {};
  attempts.forEach(a => {
    (byQuestion[a.questionID] ??= []).push(a);
  });

  const list = Object.entries(byQuestion).map(([qid, qAttempts]) => {
    const sorted = [...qAttempts].sort(
      (a, b) => b.createdAt.seconds - a.createdAt.seconds
    );

    let totalScore = 0;
    let totalWeight = 0;

    sorted.forEach((attempt, index) => {
      const daysAgo = (Date.now() - toDate(attempt.createdAt)) / (1000 * 60 * 60 * 24);
      const weight  = Math.exp(-daysAgo / PRIORITY_DECAY_DAYS) * (index === 0 ? PRIORITY_LATEST_BOOST : 1);

      const difficulty  = (attempt.difficulty ?? 0) ** 2 * 2;
      const cappedTime  = Math.min((attempt.time ?? 0) / 60, 120) / 10;
      const recency     = 20 * (1 - Math.exp(-daysAgo / 30));
      const combined    = difficulty + cappedTime + recency;

      totalScore  += combined * weight;
      totalWeight += weight;
    });

    const avgScore     = totalWeight > 0 ? totalScore / totalWeight : 0;
    const attemptBonus = 1 + PRIORITY_ATTEMPT_LOG * Math.log(1 + sorted.length);
    const finalScore   = avgScore * attemptBonus;

    return { questionID: qid, score: finalScore.toFixed(2) };
  });

  return list.sort((a, b) => b.score - a.score);
}

/**
 * Build a fast lookup map of questionID → priority score.
 * @param   {{ questionID: string, score: string }[]} priorityList
 * @returns {Record<string, number>}
 */
export function buildPriorityMap(priorityList) {
  return Object.fromEntries(priorityList.map(p => [p.questionID, Number(p.score)]));
}

// ─── Render ───────────────────────────────────────────────────────────────────

/**
 * Render the top-10 priority list into #priorityList.
 * @param {{ questionID: string, score: string }[]} list
 */
export function renderPriorityList(list) {
  const ul = document.getElementById("priorityList");
  if (!ul) return;

  ul.innerHTML = "";

  if (!list.length) {
    ul.innerHTML = "<li>No urgent questions yet.</li>";
    return;
  }

  const allQuestions = getAllQuestions();

  list.slice(0, 20).forEach(item => {
    const q = allQuestions.find(q => makeQuestionID(q) === item.questionID);

    const li = document.createElement("li");
    li.className = "priority-item";
    li.innerHTML = `
      <span class="priority-item__id">${item.questionID}</span>
      <span class="priority-item__score">Priority ${item.score}</span>
    `;

    if (q) {
      li.style.cursor = "pointer";
      li.addEventListener("click", () => {
        const tags = getTagsFor(q.year, q.paper, q.question);
        loadQuestion(q, tags, null);
        emit("filter:apply", item.questionID);

        // Switch to main screen
        document.getElementById("main-screen")?.classList.remove("hidden");
        document.getElementById("dashboard-screen")?.classList.add("hidden");
      });
    }

    ul.appendChild(li);
  });
}