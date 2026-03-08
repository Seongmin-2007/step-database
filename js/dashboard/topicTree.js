/**
 * @file topicTree.js
 * @description Renders a topic/syllabus tree grouping questions by tag.
 *
 * Each tag becomes a collapsible section showing every question with that
 * tag, colour-coded by attempt status (not attempted / attempted / completed).
 * Users can click any question to jump straight to it.
 */

import { getAllQuestions, getTagsFor } from "../core/questionStore.js";
import { makeQuestionID }              from "../core/utils.js";
import { emit }                        from "../core/eventBus.js";
import { loadQuestion }                from "../viewer/index.js";

// ─── Compute ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} TopicNode
 * @property {string}   tag
 * @property {Object[]} questions   Full question objects with attempt status
 */

/**
 * Build the topic tree from questions and attempts.
 * @param   {Object[]} questions
 * @param   {Object[]} attempts
 * @returns {TopicNode[]} Sorted alphabetically by tag
 */
export function buildTopicTree(questions, attempts) {
  // Build status map: questionID → "completed" | "attempted" | "none"
  const statusMap = {};
  attempts.forEach(a => {
    const current = statusMap[a.questionID];
    // "completed" wins over "attempted"
    if (a.status === "completed") {
      statusMap[a.questionID] = "completed";
    } else if (!current) {
      statusMap[a.questionID] = "attempted";
    }
  });

  // Group questions by tag
  /** @type {Record<string, Object[]>} */
  const byTag = {};

  questions.forEach(q => {
    const tags = getTagsFor(q.year, q.paper, q.question);
    if (!tags.length) {
      (byTag["Untagged"] ??= []).push(q);
      return;
    }
    tags.forEach(tag => {
      (byTag[tag] ??= []).push(q);
    });
  });

  return Object.entries(byTag)
    .map(([tag, qs]) => ({
      tag,
      questions: qs
        .map(q => ({
          ...q,
          id:     makeQuestionID(q),
          status: statusMap[makeQuestionID(q)] ?? "none"
        }))
        .sort((a, b) => {
          // Sort by year desc, then paper, then question number
          if (b.year  !== a.year)     return b.year - a.year;
          if (a.paper !== b.paper)    return a.paper - b.paper;
          return a.question - b.question;
        })
    }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

// ─── Render ───────────────────────────────────────────────────────────────────

/**
 * Render the topic tree into #topicTree.
 * @param {TopicNode[]} tree
 */
export function renderTopicTree(tree) {
  const container = document.getElementById("topicTree");
  if (!container) return;

  container.innerHTML = "";

  if (!tree.length) {
    container.innerHTML = `<p class="dashboard-empty">No tagged questions found.</p>`;
    return;
  }

  tree.forEach(node => {
    const completed = node.questions.filter(q => q.status === "completed").length;
    const attempted = node.questions.filter(q => q.status === "attempted").length;
    const total     = node.questions.length;
    const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

    const section = document.createElement("div");
    section.className = "topic-node";

    section.innerHTML = `
      <button class="topic-node__header" aria-expanded="false">
        <div class="topic-node__title">
          <span class="topic-node__tag">${node.tag}</span>
          <span class="topic-node__counts">
            <span class="count-completed">${completed} done</span>
            ${attempted ? `<span class="count-attempted">${attempted} in progress</span>` : ""}
            <span class="count-total">${total} total</span>
          </span>
        </div>
        <div class="topic-node__progress">
          <div class="topic-node__bar-track">
            <div class="topic-node__bar" style="width: ${pct}%"></div>
          </div>
          <span class="topic-node__pct">${pct}%</span>
        </div>
        <span class="topic-node__chevron">›</span>
      </button>

      <ul class="topic-node__questions hidden" role="list">
        ${node.questions.map(q => `
          <li class="topic-question status-${q.status}" data-id="${q.id}" data-year="${q.year}" data-paper="${q.paper}" data-question="${q.question}">
            <span class="topic-question__id">${q.id}</span>
            <span class="topic-question__status">${_statusLabel(q.status)}</span>
          </li>
        `).join("")}
      </ul>
    `;

    // Toggle expand/collapse
    const header  = section.querySelector(".topic-node__header");
    const list    = section.querySelector(".topic-node__questions");
    const chevron = section.querySelector(".topic-node__chevron");

    header.addEventListener("click", () => {
      const isOpen = !list.classList.contains("hidden");
      list.classList.toggle("hidden", isOpen);
      header.setAttribute("aria-expanded", String(!isOpen));
      chevron.classList.toggle("open", !isOpen);

      openTopicDetail(node.tag);
    });

    // Question click → navigate to viewer
    list.querySelectorAll(".topic-question").forEach(item => {
      item.addEventListener("click", () => {
        const q = {
          year:     Number(item.dataset.year),
          paper:    Number(item.dataset.paper),
          question: Number(item.dataset.question)
        };
        const tags = getTagsFor(q.year, q.paper, q.question);
        loadQuestion(q, tags, null);
        emit("filter:apply", item.dataset.id);

        // Switch to main screen
        document.getElementById("main-screen")?.classList.remove("hidden");
        document.getElementById("dashboard-screen")?.classList.add("hidden");
      });
    });

    container.appendChild(section);
  });
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _statusLabel(status) {
  if (status === "completed") return "✓ Done";
  if (status === "attempted") return "In progress";
  return "Not started";
}