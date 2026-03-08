/**
 * @file exam.js
 * @description Timed mock exam mode.
 *
 * Shows all questions from a chosen paper on a single scrollable page.
 * A countdown timer runs for 3 hours (configurable via EXAM_DURATION_MS).
 * Each question has its own notes + difficulty rating.
 * On finish, all attempts are saved to Firestore in one batch.
 *
 * Public API:
 *   openExam(year, paper, questions)  — launch the exam screen
 *   closeExam()                       — exit without saving
 */

import { addDoc, collection, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db }                              from "../core/config.js";
import { questionImagePath }                     from "../core/constants.js";
import { makeQuestionID }                        from "../core/utils.js";
import { notify }                                from "../ui/ui.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const EXAM_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {{ year: number, paper: number, questions: Object[] } | null} */
let examMeta      = null;
let timerInterval = null;
let startedAt     = null;   // Date
let timeLeftMs    = EXAM_DURATION_MS;
let finished      = false;

// Per-question working data: questionID → { notes, difficulty, attempted }
/** @type {Record<string, { notes: string, difficulty: number, attempted: boolean }>} */
let answers = {};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Launch the mock exam.
 * @param {number}   year
 * @param {number}   paper      1 | 2 | 3
 * @param {Object[]} questions  All questions — will be filtered to this paper/year
 */
export function openExam(year, paper, questions) {
  const paperQs = questions
    .filter(q => q.year === year && q.paper === paper)
    .sort((a, b) => a.question - b.question);

  if (!paperQs.length) {
    notify({ message: "No questions found for that paper.", type: "warning", timeout: 3000 });
    return;
  }

  // Reset state
  examMeta   = { year, paper, questions: paperQs };
  answers    = {};
  finished   = false;
  timeLeftMs = EXAM_DURATION_MS;
  startedAt  = new Date();

  paperQs.forEach(q => {
    answers[makeQuestionID(q)] = { notes: "", difficulty: 0, attempted: false };
  });

  _showScreen();
  _renderQuestions(paperQs);
  _startTimer();

  document.getElementById("exam-title").textContent =
    `${year} STEP ${_romanPaper(paper)}`;
}

export function closeExam() {
  _stopTimer();
  _hideScreen();
}

// ─── Screen management ────────────────────────────────────────────────────────

function _showScreen() {
  document.getElementById("main-screen").classList.add("hidden");
  document.getElementById("dashboard-screen").classList.add("hidden");
  document.getElementById("exam-screen").classList.remove("hidden");
  document.body.style.overflow = "hidden"; // header fixed, body scrolls inside exam-body
}

function _hideScreen() {
  document.getElementById("exam-screen").classList.add("hidden");
  document.getElementById("main-screen").classList.remove("hidden");
  document.body.style.overflow = "";
}

// ─── Timer ────────────────────────────────────────────────────────────────────

function _startTimer() {
  _renderTimer(timeLeftMs);
  timerInterval = setInterval(() => {
    timeLeftMs -= 1000;
    _renderTimer(timeLeftMs);

    if (timeLeftMs <= 0) {
      _stopTimer();
      notify({ title: "Time's up!", message: "Your exam time has ended.", type: "warning" });
      _finishExam();
    }

    // Warn at 30 min and 5 min remaining
    if (timeLeftMs === 30 * 60 * 1000) {
      notify({ message: "30 minutes remaining.", type: "info", timeout: 5000 });
    }
    if (timeLeftMs === 5 * 60 * 1000) {
      notify({ message: "5 minutes remaining!", type: "warning", timeout: 8000 });
    }
  }, 1000);
}

function _stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function _renderTimer(ms) {
  const el = document.getElementById("exam-timer");
  if (!el) return;

  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  el.textContent = `${String(h)}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  // Colour shifts as time runs out
  el.classList.toggle("timer-warn",  ms <= 30 * 60 * 1000 && ms > 5 * 60 * 1000);
  el.classList.toggle("timer-crit",  ms <= 5  * 60 * 1000);
}

// ─── Question rendering ───────────────────────────────────────────────────────

function _renderQuestions(paperQs) {
  const container = document.getElementById("exam-questions");
  container.innerHTML = "";

  paperQs.forEach((q, idx) => {
    const qid     = makeQuestionID(q);
    const imgPath = questionImagePath(q.year, q.paper, q.question);

    const block = document.createElement("div");
    block.className  = "exam-question-block";
    block.id         = `exam-q-${qid}`;
    block.dataset.qid = qid;

    block.innerHTML = `
      <div class="exam-question-block__header">
        <span class="exam-q-number">Q${q.question}</span>
        <span id="exam-badge-${qid}" class="exam-q-badge badge-unattempted">Not attempted</span>
      </div>

      <div class="exam-question-block__body">
        <div class="exam-question-block__img">
          <img src="${imgPath}" alt="Question ${qid}">
        </div>

        <div class="exam-question-block__panel">
          <div class="exam-field">
            <label class="exam-field__label">Difficulty</label>
            <div class="stars exam-stars" id="exam-stars-${qid}">
              <span data-star="1">☆</span>
              <span data-star="2">☆</span>
              <span data-star="3">☆</span>
              <span data-star="4">☆</span>
              <span data-star="5">☆</span>
            </div>
          </div>

          <div class="exam-field">
            <label class="exam-field__label" for="exam-notes-${qid}">Notes</label>
            <textarea
              id="exam-notes-${qid}"
              class="exam-notes"
              rows="5"
              placeholder="Working, key steps, mistakes…"
            ></textarea>
          </div>

          <div class="exam-field exam-field--checkbox">
            <label class="exam-attempted-label">
              <input type="checkbox" id="exam-attempted-${qid}" class="exam-attempted-cb">
              Mark as attempted
            </label>
          </div>
        </div>
      </div>
    `;

    container.appendChild(block);
    _bindQuestionControls(block, qid);
  });

  _updateProgress();
}

function _bindQuestionControls(block, qid) {
  // Stars
  const starsEl = block.querySelector(`#exam-stars-${qid}`);
  starsEl.querySelectorAll("span").forEach(star => {
    star.addEventListener("click", () => {
      const val = Number(star.dataset.star);
      answers[qid].difficulty = val;
      _renderStars(starsEl, val);
      _markAttempted(qid);
    });
    star.addEventListener("mouseenter", () => _renderStars(starsEl, Number(star.dataset.star), true));
    star.addEventListener("mouseleave", () => _renderStars(starsEl, answers[qid].difficulty));
  });

  // Notes
  const notesEl = block.querySelector(`#exam-notes-${qid}`);
  notesEl.addEventListener("input", () => {
    answers[qid].notes = notesEl.value;
    if (notesEl.value.trim()) _markAttempted(qid);
  });

  // Attempted checkbox
  const cb = block.querySelector(`#exam-attempted-${qid}`);
  cb.addEventListener("change", () => {
    answers[qid].attempted = cb.checked;
    _updateBadge(qid);
    _updateProgress();
  });
}

function _markAttempted(qid) {
  if (answers[qid].attempted) return;
  answers[qid].attempted = true;
  const cb = document.getElementById(`exam-attempted-${qid}`);
  if (cb) cb.checked = true;
  _updateBadge(qid);
  _updateProgress();
}

function _updateBadge(qid) {
  const badge = document.getElementById(`exam-badge-${qid}`);
  if (!badge) return;
  const attempted = answers[qid].attempted;
  badge.textContent = attempted ? "✓ Attempted" : "Not attempted";
  badge.className   = `exam-q-badge ${attempted ? "badge-attempted" : "badge-unattempted"}`;
}

function _updateProgress() {
  const total     = Object.keys(answers).length;
  const attempted = Object.values(answers).filter(a => a.attempted).length;
  const pct       = total > 0 ? (attempted / total) * 100 : 0;

  const text = document.getElementById("exam-progress-text");
  const bar  = document.getElementById("exam-progress-bar");
  if (text) text.textContent = `${attempted} / ${total} attempted`;
  if (bar)  bar.style.width  = `${pct}%`;
}

function _renderStars(container, value, preview = false) {
  container.querySelectorAll("span").forEach(s => {
    const n = Number(s.dataset.star);
    s.textContent = n <= value ? "★" : "☆";
    s.style.color = preview && n <= value ? "var(--clr-warning)" : "";
  });
}

// ─── Finish + save ────────────────────────────────────────────────────────────

function _bindFinishButton() {
  const finishBtn    = document.getElementById("exam-finish");
  const modal        = document.getElementById("exam-finish-modal");
  const confirmBtn   = document.getElementById("exam-finish-confirm");
  const cancelBtn    = document.getElementById("exam-finish-cancel");
  const summaryEl    = document.getElementById("exam-finish-summary");

  finishBtn.addEventListener("click", () => {
    const attempted = Object.values(answers).filter(a => a.attempted).length;
    const total     = Object.keys(answers).length;
    summaryEl.textContent =
      `You've attempted ${attempted} of ${total} questions. This will save all your notes and ratings.`;
    modal.classList.remove("hidden");
  });

  cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));

  confirmBtn.addEventListener("click", async () => {
    modal.classList.add("hidden");
    await _finishExam();
  });
}

async function _finishExam() {
  if (finished) return;
  finished = true;
  _stopTimer();

  const elapsed = Date.now() - startedAt.getTime();
  const user    = auth.currentUser;

  // Save each attempted question to Firestore
  const saves = [];

  for (const [qid, ans] of Object.entries(answers)) {
    if (!ans.attempted && !ans.notes.trim() && !ans.difficulty) continue;

    const attemptData = {
      questionID:  qid,
      userID:      user?.uid ?? null,
      status:      ans.attempted ? "attempted" : "not-started",
      difficulty:  ans.difficulty || null,
      notes:       ans.notes.trim(),
      time:        Math.round(elapsed / 1000), // whole exam time, per question
      createdAt:   serverTimestamp(),
      examMode:    true,
      examPaper:   `${examMeta.year}-S${examMeta.paper}`
    };

    if (user) {
      saves.push(
        addDoc(
          collection(db, "users", user.uid, "questions", qid, "attempts"),
          attemptData
        ).catch(err => console.error(`[exam] Failed to save ${qid}:`, err))
      );
    }
  }

  await Promise.all(saves);
  _showResults(elapsed);
}

function _showResults(elapsedMs) {
  const questionsEl = document.getElementById("exam-questions");
  const resultsEl   = document.getElementById("exam-results");
  const headerEl    = document.querySelector(".exam-header");

  if (questionsEl) questionsEl.classList.add("hidden");
  if (headerEl)    headerEl.classList.add("exam-header--finished");
  resultsEl.classList.remove("hidden");

  const attempted  = Object.values(answers).filter(a => a.attempted).length;
  const total      = Object.keys(answers).length;
  const withNotes  = Object.values(answers).filter(a => a.notes.trim()).length;
  const rated      = Object.values(answers).filter(a => a.difficulty > 0);
  const avgDiff    = rated.length
    ? (rated.reduce((s, a) => s + a.difficulty, 0) / rated.length).toFixed(1)
    : "—";

  const h = Math.floor(elapsedMs / 3_600_000);
  const m = Math.floor((elapsedMs % 3_600_000) / 60_000);
  const timeStr = `${h}h ${m}m`;

  document.getElementById("exam-results-title").textContent =
    `${examMeta.year} STEP ${_romanPaper(examMeta.paper)} — Complete`;

  document.getElementById("exam-results-stats").innerHTML = `
    <div class="results-stat"><span class="results-stat__val">${attempted}/${total}</span><span class="results-stat__label">Attempted</span></div>
    <div class="results-stat"><span class="results-stat__val">${withNotes}</span><span class="results-stat__label">With notes</span></div>
    <div class="results-stat"><span class="results-stat__val">${avgDiff}</span><span class="results-stat__label">Avg difficulty</span></div>
    <div class="results-stat"><span class="results-stat__val">${timeStr}</span><span class="results-stat__label">Time taken</span></div>
  `;

  // Per-question summary
  const listEl = document.getElementById("exam-results-list");
  listEl.innerHTML = "";
  examMeta.questions.forEach(q => {
    const qid = makeQuestionID(q);
    const ans = answers[qid];
    const stars = ans.difficulty
      ? "★".repeat(ans.difficulty) + "☆".repeat(5 - ans.difficulty)
      : "Not rated";

    const row = document.createElement("div");
    row.className = "results-row";
    row.innerHTML = `
      <span class="results-row__id">${qid}</span>
      <span class="results-row__badge ${ans.attempted ? "badge-attempted" : "badge-unattempted"}">
        ${ans.attempted ? "✓" : "—"}
      </span>
      <span class="results-row__stars">${stars}</span>
      <span class="results-row__notes">${ans.notes.trim() || "No notes"}</span>
    `;
    listEl.appendChild(row);
  });

  // Result screen buttons
  document.getElementById("exam-results-close").addEventListener("click", () => {
    closeExam();
  });
  document.getElementById("exam-results-dashboard").addEventListener("click", () => {
    closeExam();
    document.getElementById("dashboard-screen").classList.remove("hidden");
    document.getElementById("main-screen").classList.add("hidden");
  });
}

// ─── Exam launcher (modal) ────────────────────────────────────────────────────

/**
 * Show the paper picker modal and wire up the launch button.
 * Call this once on app init.
 * @param {Object[]} questions
 */
export function initExamLauncher(questions) {
  _buildLauncherModal(questions);
  _bindFinishButton();
  _bindExitButton();
}

function _buildLauncherModal(questions) {
  // Collect available year+paper combos
  const papers = new Map();
  questions.forEach(q => {
    const key = `${q.year}-${q.paper}`;
    if (!papers.has(key)) papers.set(key, { year: q.year, paper: q.paper, count: 0 });
    papers.get(key).count++;
  });

  const sorted = [...papers.values()].sort((a, b) =>
    b.year - a.year || a.paper - b.paper
  );

  // Build modal DOM
  const modal = document.createElement("div");
  modal.id = "exam-picker-modal";
  modal.className = "modal hidden";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "exam-picker-title");

  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content exam-picker-content">
      <h3 id="exam-picker-title">Start Mock Exam</h3>
      <p style="font-size:0.85rem; color:var(--clr-text-muted); margin-bottom:1rem;">
        Choose a paper to attempt under timed conditions (3 hours).
        Your notes and difficulty ratings will be saved when you finish.
      </p>
      <div class="exam-picker__select-row">
        <select id="exam-picker-select" class="exam-picker-select">
          ${sorted.map(p =>
            `<option value="${p.year}-${p.paper}">
              ${p.year} STEP ${_romanPaper(p.paper)} — ${p.count} questions
            </option>`
          ).join("")}
        </select>
      </div>
      <div class="modal-actions">
        <button id="exam-picker-start" class="btn btn--primary">Start exam →</button>
        <button class="btn close-exam-picker">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Show from topbar button (wire this in main.js)
  document.addEventListener("click", e => {
    if (e.target.id === "open-exam") modal.classList.remove("hidden");
    if (e.target.classList.contains("close-exam-picker")) modal.classList.add("hidden");
    if (e.target.classList.contains("modal-backdrop") && modal.contains(e.target)) {
      modal.classList.add("hidden");
    }
  });

  document.getElementById("exam-picker-start").addEventListener("click", () => {
    const val   = document.getElementById("exam-picker-select").value;
    const [yearStr, paperStr] = val.split("-");
    modal.classList.add("hidden");
    openExam(Number(yearStr), Number(paperStr), questions);
  });
}

function _bindExitButton() {
  document.getElementById("exam-exit")?.addEventListener("click", () => {
    if (finished) { closeExam(); return; }

    // Confirm before discarding
    if (confirm("Exit exam? Your work will not be saved.")) {
      closeExam();
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _romanPaper(paper) {
  return ["I", "II", "III"][paper - 1] ?? `Paper ${paper}`;
}