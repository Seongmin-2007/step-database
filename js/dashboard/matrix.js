/**
 * @file matrix.js
 * @description Renders the STEP question matrix — a year × paper × question
 *              grid coloured by priority score.
 */

import { PAPERS, PAPER_QUESTION_COUNT } from "../core/constants.js";
import { makeQuestionID }               from "../core/utils.js";
import { getTagsFor }                   from "../core/questionStore.js";
import { emit }                         from "../core/eventBus.js";
import { loadQuestion }                 from "../viewer/index.js";

/**
 * Render the full STEP matrix into #stepMatrix.
 *
 * @param {Object[]}                          questions    Full question list
 * @param {Record<string, number>}            priorityMap  questionID → score
 */
export function renderStepMatrix(questions, priorityMap) {
  const container = document.getElementById("stepMatrix");
  if (!container) return;

  container.innerHTML = "";

  const years = [...new Set(questions.map(q => q.year))].sort((a, b) => b - a);

  years.forEach(year => {
    const row = document.createElement("div");
    row.className = "matrix-row";

    const label = document.createElement("div");
    label.className   = "matrix-year";
    label.textContent = year;
    row.appendChild(label);

    PAPERS.forEach(paper => {
      const maxQ = PAPER_QUESTION_COUNT[paper];

      for (let qn = 1; qn <= maxQ; qn++) {
        const q    = questions.find(x => x.year === year && x.paper === paper && x.question === qn);
        const cell = document.createElement("div");
        cell.className = "matrix-cell";

        if (!q) {
          cell.classList.add("matrix-missing");
          row.appendChild(cell);
          continue;
        }

        const id    = makeQuestionID(q);
        const score = priorityMap[id];

        if      (score === undefined) cell.classList.add("matrix-empty");
        else if (score < 30)          cell.classList.add("matrix-low");
        else if (score < 50)          cell.classList.add("matrix-mid");
        else                          cell.classList.add("matrix-high");

        const tags  = getTagsFor(q.year, q.paper, q.question);
        cell.title  = `${id}\n${tags.join(", ")}`;

        cell.addEventListener("click", () => {
          loadQuestion(q, tags, null);
          emit("filter:apply", id);

          // Switch back to main screen
          document.getElementById("main-screen")?.classList.remove("hidden");
          document.getElementById("dashboard-screen")?.classList.add("hidden");
        });

        row.appendChild(cell);
      }

      // Visual gap between papers
      const gap = document.createElement("div");
      gap.className = "matrix-paper-gap";
      row.appendChild(gap);
    });

    container.appendChild(row);
  });
}