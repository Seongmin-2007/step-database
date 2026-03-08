/**
 * @file weakTopics.js
 * @description Computes and renders the weak topics report.
 *
 * A topic is "weak" if attempts on questions tagged with it have a high
 * average difficulty rating. Topics with no difficulty data are excluded.
 *
 * Output: sorted list of tags with avg difficulty, attempt count, and
 * a colour-coded severity indicator.
 */

import { getQuestionTags } from "../core/questionStore.js";

// ─── Compute ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} TopicStat
 * @property {string}  tag
 * @property {number}  avgDifficulty   1–5
 * @property {number}  attemptCount
 * @property {number}  questionCount   unique questions attempted
 */

/**
 * Compute per-topic stats from attempts.
 * @param   {Object[]} attempts
 * @returns {TopicStat[]} Sorted by avgDifficulty descending
 */
export function computeWeakTopics(attempts) {
  const tagData = getQuestionTags(); // { "assets/images/...": ["tag1", ...] }

  // Build reverse map: questionID → tags[]
  const questionToTags = {};
  for (const [path, tags] of Object.entries(tagData)) {
    // path: "assets/images/questions/2022/S2/Q5.png"
    const match = path.match(/(\d{4})\/S(\d)\/Q(\d+)\.png/);
    if (!match) continue;
    const qid = `${match[1]}-S${match[2]}-Q${match[3]}`;
    questionToTags[qid] = tags;
  }

  // Aggregate per tag
  /** @type {Record<string, { totalDifficulty: number, count: number, questions: Set<string> }>} */
  const stats = {};

  attempts.forEach(a => {
    if (!a.difficulty) return; // skip attempts with no rating
    const tags = questionToTags[a.questionID] ?? [];

    tags.forEach(tag => {
      if (!stats[tag]) stats[tag] = { totalDifficulty: 0, count: 0, questions: new Set() };
      stats[tag].totalDifficulty += a.difficulty;
      stats[tag].count++;
      stats[tag].questions.add(a.questionID);
    });
  });

  return Object.entries(stats)
    .map(([tag, s]) => ({
      tag,
      avgDifficulty:  s.totalDifficulty / s.count,
      attemptCount:   s.count,
      questionCount:  s.questions.size
    }))
    .filter(t => t.attemptCount >= 1)
    .sort((a, b) => b.avgDifficulty - a.avgDifficulty);
}

// ─── Render ───────────────────────────────────────────────────────────────────

/**
 * Render the weak topics list into #weakTopicsList.
 * @param {TopicStat[]} topics
 */
export function renderWeakTopics(topics) {
  const container = document.getElementById("weakTopicsList");
  if (!container) return;

  container.innerHTML = "";

  if (!topics.length) {
    container.innerHTML = `<p class="dashboard-empty">Rate some questions with difficulty stars to see your weak topics.</p>`;
    return;
  }

  const maxDiff = 5;

  topics.slice(0, 15).forEach(t => {
    const pct        = (t.avgDifficulty / maxDiff) * 100;
    const severity   = _severity(t.avgDifficulty);
    const stars      = "★".repeat(Math.round(t.avgDifficulty)) + "☆".repeat(5 - Math.round(t.avgDifficulty));

    const row = document.createElement("div");
    row.className = "weak-topic-row";
    row.innerHTML = `
      <div class="weak-topic-header">
        <span class="weak-topic-tag">${t.tag}</span>
        <span class="weak-topic-stars ${severity}">${stars}</span>
      </div>
      <div class="weak-topic-bar-track">
        <div class="weak-topic-bar ${severity}" style="width: ${pct}%"></div>
      </div>
      <div class="weak-topic-meta">
        ${t.questionCount} question${t.questionCount !== 1 ? "s" : ""} · ${t.attemptCount} attempt${t.attemptCount !== 1 ? "s" : ""}
      </div>
    `;
    container.appendChild(row);
  });
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _severity(avg) {
  if (avg >= 4)   return "severity-high";
  if (avg >= 2.5) return "severity-mid";
  return "severity-low";
}