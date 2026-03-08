/**
 * @file render.js
 * @description Renders the question viewer HTML and loads solution images.
 *              Kept separate from index.js so the template is easy to find and edit.
 */

import { questionImagePath, solutionImagePath } from "../core/constants.js";

// ─── Question template ────────────────────────────────────────────────────────

/**
 * Render the question viewer into #viewer.
 *
 * @param {{ q: Object, tags: string[], li: HTMLElement|null }} opts
 * @returns {{ questionID: string }}
 */
export function renderQuestion({ q, tags, li }) {
  const viewer     = document.getElementById("viewer");
  const questionID = `${q.year}-S${q.paper}-Q${q.question}`;
  const imgPath    = questionImagePath(q.year, q.paper, q.question);

  // Highlight active sidebar item
  document.querySelectorAll("#questionList li").forEach(x => x.classList.remove("active"));
  if (li) li.classList.add("active");

  const tagHTML = tags.length
    ? tags.map(t => `<span class="tag-chip viewer-tag" data-tag="${t}">${t}</span>`).join("")
    : `<span class="tag-muted">No tags</span>`;

  viewer.innerHTML = `
    <section class="question-header">
      <div class="question-title">
        <h2>${questionID}</h2>
        <div class="question-tags">${tagHTML}</div>
      </div>

      <div class="viewer-status-row">
        <div id="viewer-status-badge"></div>
        <button id="viewer-flag-btn" class="btn btn--icon" aria-label="Flag question">⚐</button>
      </div>
    </section>

    <div class="question-layout">

      <!-- LEFT: Question image + attempt panel + solution -->
      <div class="question-main">

        <div class="question-content">
          <img src="${imgPath}" alt="Question ${questionID}">
        </div>

        <section class="attempt-panel">
          <div class="attempt-row">
            <div class="attempt-field">
              <label>Status</label>
              <select id="status">
                <option value="not-started">Not started</option>
                <option value="attempted">Attempted</option>
                <option value="completed">Completed</option>
                <option value="revision">Needs revision</option>
              </select>
            </div>

            <div class="attempt-field time-control">
              <label>Timer</label>
              <div class="timer-controls">
                <span id="time-display">00min 00sec</span>
                <span class="time-edit-inline"></span>
              </div>
              <div class="timer-buttons">
                <button id="start-timer">Start</button>
              </div>
            </div>
          </div>

          <div class="attempt-row">
            <div class="attempt-field">
              <label>Difficulty</label>
              <div id="stars" class="stars">
                <span data-star="1">☆</span>
                <span data-star="2">☆</span>
                <span data-star="3">☆</span>
                <span data-star="4">☆</span>
                <span data-star="5">☆</span>
              </div>
            </div>
          </div>

          <div class="attempt-row">
            <div class="attempt-field full">
              <label>Notes</label>
              <textarea id="notes" rows="3" placeholder="Key ideas, mistakes, insights…"></textarea>
            </div>
          </div>

          <div class="attempt-actions">
            <div id="save-status" class="save-status"></div>
            <button id="commit-attempt" class="primary" disabled>
              Save as completed attempt
            </button>
          </div>
        </section>

        <div class="solution-section">
          <button id="solution-toggle" class="secondary">Show solution</button>
          <div id="solution-container" class="solution">
            <p class="placeholder hidden">Solution not available yet.</p>
          </div>
        </div>

      </div>

      <!-- RIGHT: Past attempts sidebar -->
      <aside class="question-sidebar">
        <h3>Previous completions</h3>
        <ul id="past-notes-list"></ul>
      </aside>

    </div>

    <div class="question-nav">
      <button id="prev-question">← Previous</button>
      <button id="next-question">Next →</button>
    </div>
  `;

  return { questionID };
}

// ─── Solution loader ──────────────────────────────────────────────────────────

/**
 * Progressively load solution images into #solution-container.
 * Stops when an image 404s.
 *
 * @param {Object} q           Question data object
 * @param {string} questionID  e.g. "2022-S2-Q5"
 */
export async function loadSolutions(q, questionID) {
  const container   = document.getElementById("solution-container");
  const placeholder = container?.querySelector(".placeholder");
  if (!container) return;

  let index    = 1;
  let foundAny = false;

  while (true) {
    const path = solutionImagePath(q.year, q.paper, q.question, index);
    const img  = document.createElement("img");
    img.src    = path;
    img.alt    = `Solution ${questionID} part ${index}`;

    const loaded = await new Promise(resolve => {
      img.onload  = () => resolve(true);
      img.onerror = () => resolve(false);
    });

    if (!loaded) break;

    container.appendChild(img);
    foundAny = true;
    index++;
  }

  if (!foundAny && placeholder) placeholder.classList.remove("hidden");
}