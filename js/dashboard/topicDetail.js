/**
 * @file topicDetail.js
 * @description Per-topic progress page.
 *
 * Shown when user clicks a topic tag anywhere in the app.
 * Renders as a full-screen overlay with:
 *   - Topic name + completion summary
 *   - Avg difficulty trend (text, not a chart — no Chart.js dep)
 *   - Two columns: attempted questions | not yet attempted
 *   - Each question card shows last attempt date, best time, avg difficulty
 *
 * Usage:
 *   import { openTopicDetail } from "./topicDetail.js";
 *   openTopicDetail("Integration");
 */

import { getAllQuestions, getTagsFor } from "../core/questionStore.js";
import { getAttempts }                 from "../core/attemptStore.js";
import { makeQuestionID }              from "../core/utils.js";
import { loadQuestion }                from "../viewer/index.js";
import { emit }                        from "../core/eventBus.js";

// ─── State ────────────────────────────────────────────────────────────────────

let panel = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Open the topic detail panel for a given tag.
 * @param {string} tag
 */
export function openTopicDetail(tag) {
  _ensurePanel();
  _render(tag);
  panel.classList.add("open");
  document.body.style.overflow = "hidden";
}

export function closeTopicDetail() {
  panel?.classList.remove("open");
  document.body.style.overflow = "";
}

// ─── Internal — DOM ───────────────────────────────────────────────────────────

function _ensurePanel() {
  if (panel) return;

  panel = document.createElement("div");
  panel.id = "topic-detail-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");

  panel.innerHTML = `
    <div class="topic-detail__backdrop"></div>
    <div class="topic-detail__sheet">
      <div class="topic-detail__header">
        <div>
          <p class="dashboard-header__label">Topic Progress</p>
          <h2 id="topic-detail-title" class="topic-detail__title"></h2>
        </div>
        <button class="btn btn--ghost topic-detail__close">✕ Close</button>
      </div>

      <div class="topic-detail__summary" id="topic-detail-summary"></div>

      <div class="topic-detail__columns">
        <div class="topic-detail__col">
          <h3 class="topic-detail__col-title">Attempted</h3>
          <div id="topic-detail-attempted" class="topic-detail__list"></div>
        </div>
        <div class="topic-detail__col">
          <h3 class="topic-detail__col-title">Not yet started</h3>
          <div id="topic-detail-unattempted" class="topic-detail__list"></div>
        </div>
      </div>
    </div>
  `;

  // Dismiss on backdrop or close button
  panel.querySelector(".topic-detail__backdrop")
    .addEventListener("click", closeTopicDetail);
  panel.querySelector(".topic-detail__close")
    .addEventListener("click", closeTopicDetail);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeTopicDetail();
  });

  document.body.appendChild(panel);
}

// ─── Internal — Data ──────────────────────────────────────────────────────────

function _render(tag) {
  const questions = getAllQuestions().filter(q =>
    getTagsFor(q.year, q.paper, q.question).includes(tag)
  );

  const attempts  = getAttempts();

  // Map questionID → all its attempts
  /** @type {Record<string, Object[]>} */
  const attemptsByQ = {};
  attempts.forEach(a => {
    (attemptsByQ[a.questionID] ??= []).push(a);
  });

  const attempted   = [];
  const unattempted = [];

  questions.forEach(q => {
    const id = makeQuestionID(q);
    const qAttempts = attemptsByQ[id] ?? [];
    if (qAttempts.length) {
      attempted.push({ q, id, attempts: qAttempts });
    } else {
      unattempted.push({ q, id });
    }
  });

  // Sort attempted: most recently attempted first
  attempted.sort((a, b) => {
    const latestA = Math.max(...a.attempts.map(at => at.timestamp?.toMillis?.() ?? 0));
    const latestB = Math.max(...b.attempts.map(at => at.timestamp?.toMillis?.() ?? 0));
    return latestB - latestA;
  });

  // Compute summary stats
  const allDiffs = attempted.flatMap(a =>
    a.attempts.map(at => at.difficulty).filter(Boolean)
  );
  const avgDiff = allDiffs.length
    ? (allDiffs.reduce((s, d) => s + d, 0) / allDiffs.length).toFixed(1)
    : null;

  const completed = attempted.filter(a =>
    a.attempts.some(at => at.status === "completed")
  ).length;

  // ── Render header ──
  document.getElementById("topic-detail-title").textContent = tag;

  const summaryEl = document.getElementById("topic-detail-summary");
  summaryEl.innerHTML = `
    <div class="topic-summary-pill">${completed} / ${questions.length} completed</div>
    <div class="topic-summary-pill">${attempted.length} attempted</div>
    ${avgDiff !== null ? `<div class="topic-summary-pill">Avg difficulty: ${avgDiff} / 5</div>` : ""}
    <div class="topic-summary-pill">${unattempted.length} not started</div>
  `;

  // ── Render attempted questions ──
  const attemptedEl = document.getElementById("topic-detail-attempted");
  attemptedEl.innerHTML = "";

  if (!attempted.length) {
    attemptedEl.innerHTML = `<p class="dashboard-empty">None yet.</p>`;
  } else {
    attempted.forEach(({ q, id, attempts: qAttempts }) => {
      const latestAttempt  = qAttempts.sort((a, b) =>
        (b.timestamp?.toMillis?.() ?? 0) - (a.timestamp?.toMillis?.() ?? 0)
      )[0];
      const diffs          = qAttempts.map(a => a.difficulty).filter(Boolean);
      const avgQDiff       = diffs.length
        ? (diffs.reduce((s, d) => s + d, 0) / diffs.length).toFixed(1)
        : "—";
      const isCompleted    = qAttempts.some(a => a.status === "completed");
      const dateStr        = latestAttempt.timestamp
        ? new Date(latestAttempt.timestamp.toMillis()).toLocaleDateString()
        : "—";

      const card = _makeQuestionCard(q, id, {
        badge:    isCompleted ? "completed" : "attempted",
        meta:     `Last: ${dateStr} · Avg difficulty: ${avgQDiff} · ${qAttempts.length} attempt${qAttempts.length !== 1 ? "s" : ""}`,
        notes:    latestAttempt.notes ?? ""
      });
      attemptedEl.appendChild(card);
    });
  }

  // ── Render unattempted questions ──
  const unattemptedEl = document.getElementById("topic-detail-unattempted");
  unattemptedEl.innerHTML = "";

  if (!unattempted.length) {
    unattemptedEl.innerHTML = `<p class="dashboard-empty">All questions attempted! 🎉</p>`;
  } else {
    unattempted.forEach(({ q, id }) => {
      const card = _makeQuestionCard(q, id, { badge: "none", meta: "", notes: "" });
      unattemptedEl.appendChild(card);
    });
  }
}

function _makeQuestionCard(q, id, { badge, meta, notes }) {
  const card = document.createElement("div");
  card.className = "topic-q-card";
  card.dataset.id = id;

  card.innerHTML = `
    <div class="topic-q-card__top">
      <span class="topic-q-card__id">${id}</span>
      <span class="topic-q-card__badge status-${badge}">${_badgeLabel(badge)}</span>
    </div>
    ${meta  ? `<p class="topic-q-card__meta">${meta}</p>` : ""}
    ${notes ? `<p class="topic-q-card__notes">"${notes}"</p>` : ""}
  `;

  card.addEventListener("click", () => {
    const tags = getTagsFor(q.year, q.paper, q.question);
    loadQuestion(q, tags, null);

    // Navigate to viewer
    document.getElementById("main-screen")?.classList.remove("hidden");
    document.getElementById("dashboard-screen")?.classList.add("hidden");
    closeTopicDetail();
    emit("filter:apply", id);
  });

  return card;
}

function _badgeLabel(badge) {
  if (badge === "completed") return "✓ Done";
  if (badge === "attempted") return "In progress";
  return "Not started";
}