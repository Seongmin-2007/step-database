/**
 * @file exam.js
 * @description Timed mock exam mode.
 *
 * Shows all questions from a chosen paper on a single scrollable page.
 * A countdown timer runs for 3 hours (configurable via EXAM_DURATION_MS).
 * Each question has its own stopwatch, notes, difficulty rating, and status.
 * On finish, a review screen lets you edit everything before saving to Firestore.
 *
 * Public API:
 *   openExam(year, paper, questions)  — launch the exam screen
 *   closeExam()                       — exit without saving
 *   initExamLauncher(questions)       — wire up the paper-picker modal (call once)
 */

import { addDoc, collection, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db }                              from "./core/config.js";
import { questionImagePath }                     from "./core/constants.js";
import { makeQuestionID }                        from "./core/utils.js";
import { notify }                                from "./ui/ui.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const EXAM_DURATION_MS    = 3 * 60 * 60 * 1000; // 3 hours
const ATTEMPTS_CACHE_PFX  = "attempts:";         // must match viewer/index.js

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {{ year: number, paper: number, questions: Object[] } | null} */
let examMeta      = null;
let timerInterval = null;
let startedAt     = null;
let timeLeftMs    = EXAM_DURATION_MS;
let finished      = false;

/**
 * Per-question working data.
 * @type {Record<string, {
 *   notes:      string,
 *   difficulty: number,
 *   attempted:  boolean,
 *   status:     string,
 *   elapsed:    number,   // seconds on this question's stopwatch
 *   running:    boolean,  // is this question's stopwatch ticking?
 *   interval:   number|null
 * }>}
 */
let answers = {};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Launch the mock exam.
 * @param {number}   year
 * @param {number}   paper      1 | 2 | 3
 * @param {Object[]} questions  Full question list — filtered to this paper/year
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
    answers[makeQuestionID(q)] = {
      notes:      "",
      difficulty: 0,
      attempted:  false,
      status:     "attempted",
      elapsed:    0,
      running:    false,
      interval:   null,
    };
  });

  _showScreen();
  _renderQuestions(paperQs);
  _startCountdown();

  document.getElementById("exam-title").textContent =
    `${year} STEP ${_romanPaper(paper)}`;
}

export function closeExam() {
  // Stop all per-question timers
  Object.values(answers).forEach(a => {
    if (a.interval) clearInterval(a.interval);
  });
  _stopCountdown();
  _hideScreen();
}

// ─── Screen management ────────────────────────────────────────────────────────

function _showScreen() {
  document.getElementById("main-screen").classList.add("hidden");
  document.getElementById("dashboard-screen").classList.add("hidden");
  document.getElementById("exam-screen").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function _hideScreen() {
  document.getElementById("exam-screen").classList.add("hidden");
  document.getElementById("main-screen").classList.remove("hidden");
  document.body.style.overflow = "";
}

// ─── Countdown timer (whole exam) ────────────────────────────────────────────

function _startCountdown() {
  _renderCountdown(timeLeftMs);
  timerInterval = setInterval(() => {
    timeLeftMs -= 1000;
    _renderCountdown(timeLeftMs);

    if (timeLeftMs <= 0) {
      _stopCountdown();
      notify({ title: "Time's up!", message: "Your exam time has ended.", type: "warning" });
      _openReviewScreen();
    }

    if (timeLeftMs === 30 * 60 * 1000)
      notify({ message: "30 minutes remaining.", type: "info", timeout: 5000 });
    if (timeLeftMs === 5 * 60 * 1000)
      notify({ message: "5 minutes remaining!", type: "warning", timeout: 8000 });
  }, 1000);
}

function _stopCountdown() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function _renderCountdown(ms) {
  const el = document.getElementById("exam-timer");
  if (!el) return;
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  el.textContent = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  el.classList.toggle("timer-warn", ms <= 30 * 60 * 1000 && ms > 5 * 60 * 1000);
  el.classList.toggle("timer-crit", ms <= 5  * 60 * 1000);
}

// ─── Per-question stopwatch ───────────────────────────────────────────────────

function _startQuestionTimer(qid) {
  const ans = answers[qid];
  if (ans.running) return;
  ans.running = true;

  ans.interval = setInterval(() => {
    ans.elapsed++;
    _renderQuestionTimer(qid);
  }, 1000);

  _renderQuestionTimerBtn(qid);
}

function _pauseQuestionTimer(qid) {
  const ans = answers[qid];
  if (!ans.running) return;
  ans.running = false;
  clearInterval(ans.interval);
  ans.interval = null;
  _renderQuestionTimerBtn(qid);
}

function _renderQuestionTimer(qid) {
  const el = document.getElementById(`exam-qtimer-${qid}`);
  if (!el) return;
  el.textContent = _formatSeconds(answers[qid].elapsed);
}

function _renderQuestionTimerBtn(qid) {
  const btn = document.getElementById(`exam-qtimer-btn-${qid}`);
  if (!btn) return;
  btn.textContent = answers[qid].running ? "⏸ Pause" : "▶ Start";
  btn.classList.toggle("running", answers[qid].running);
}

// ─── Question rendering ───────────────────────────────────────────────────────

function _renderQuestions(paperQs) {
  const container = document.getElementById("exam-questions");
  container.innerHTML = "";

  paperQs.forEach(q => {
    const qid     = makeQuestionID(q);
    const imgPath = questionImagePath(q.year, q.paper, q.question);

    const block = document.createElement("div");
    block.className   = "exam-question-block";
    block.id          = `exam-q-${qid}`;
    block.dataset.qid = qid;

    block.innerHTML = `
      <div class="exam-question-block__header">
        <span class="exam-q-number">Q${q.question}</span>
        <div class="exam-q-header-right">
          <div class="exam-q-timer">
            <span id="exam-qtimer-${qid}" class="exam-qtimer-display">0:00:00</span>
            <button id="exam-qtimer-btn-${qid}" class="btn btn--sm exam-qtimer-btn">▶ Start</button>
          </div>
          <span id="exam-badge-${qid}" class="exam-q-badge badge-unattempted">Not attempted</span>
        </div>
      </div>

      <div class="exam-question-block__body">
        <div class="exam-question-block__img">
          <img src="${imgPath}" alt="Question ${qid}">
        </div>

        <div class="exam-question-block__panel">

          <div class="exam-field">
            <label class="exam-field__label">Status</label>
            <select id="exam-status-${qid}" class="exam-status-select">
              <option value="attempted">Attempted</option>
              <option value="completed">Completed</option>
              <option value="not-started">Not started</option>
              <option value="revision">Needs revision</option>
            </select>
          </div>

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
  // Per-question timer button
  const timerBtn = block.querySelector(`#exam-qtimer-btn-${qid}`);
  timerBtn.addEventListener("click", () => {
    if (answers[qid].running) _pauseQuestionTimer(qid);
    else                      _startQuestionTimer(qid);
  });

  // Status select
  const statusEl = block.querySelector(`#exam-status-${qid}`);
  statusEl.addEventListener("change", () => {
    answers[qid].status = statusEl.value;
    if (statusEl.value !== "not-started") _markAttempted(qid);
  });

  // Stars
  const starsEl = block.querySelector(`#exam-stars-${qid}`);
  starsEl.querySelectorAll("span").forEach(star => {
    star.addEventListener("click", () => {
      const val = Number(star.dataset.star);
      answers[qid].difficulty = answers[qid].difficulty === val ? 0 : val;
      _renderStars(starsEl, answers[qid].difficulty);
      _markAttempted(qid);
    });
    star.addEventListener("mouseenter", () =>
      _renderStars(starsEl, Number(star.dataset.star), true));
    star.addEventListener("mouseleave", () =>
      _renderStars(starsEl, answers[qid].difficulty));
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
  // Auto-start timer if not already running
  if (!answers[qid].running && answers[qid].elapsed === 0) {
    _startQuestionTimer(qid);
  }
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

// ─── Finish button ────────────────────────────────────────────────────────────

function _bindFinishButton() {
  const finishBtn  = document.getElementById("exam-finish");
  const modal      = document.getElementById("exam-finish-modal");
  const confirmBtn = document.getElementById("exam-finish-confirm");
  const cancelBtn  = document.getElementById("exam-finish-cancel");
  const summaryEl  = document.getElementById("exam-finish-summary");

  finishBtn.addEventListener("click", () => {
    const attempted = Object.values(answers).filter(a => a.attempted).length;
    const total     = Object.keys(answers).length;
    summaryEl.textContent =
      `You've attempted ${attempted} of ${total} questions. Review your answers before saving.`;
    modal.classList.remove("hidden");
  });

  cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));

  confirmBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    _stopAllQuestionTimers();
    _stopCountdown();
    _openReviewScreen();
  });
}

function _stopAllQuestionTimers() {
  Object.keys(answers).forEach(qid => _pauseQuestionTimer(qid));
}

// ─── Review screen (edit before saving) ──────────────────────────────────────

/**
 * Show the editable review screen. User can adjust notes/difficulty/status
 * per question before anything is written to Firestore.
 */
function _openReviewScreen() {
  if (finished) return;
  _stopAllQuestionTimers();
  _stopCountdown();

  const questionsEl = document.getElementById("exam-questions");
  const reviewEl    = document.getElementById("exam-review");
  const headerEl    = document.querySelector(".exam-header");

  if (questionsEl) questionsEl.classList.add("hidden");
  if (headerEl)    headerEl.classList.add("exam-header--finished");
  if (reviewEl)    reviewEl.classList.remove("hidden");

  const listEl = document.getElementById("exam-review-list");
  listEl.innerHTML = "";

  examMeta.questions.forEach(q => {
    const qid = makeQuestionID(q);
    const ans = answers[qid];

    const row = document.createElement("div");
    row.className = "review-row";

    row.innerHTML = `
      <div class="review-row__head">
        <span class="review-row__id">${qid}</span>
        <span class="review-row__time">${_formatSeconds(ans.elapsed)}</span>
      </div>

      <div class="review-row__fields">

        <div class="review-field">
          <label class="review-field__label">Status</label>
          <select class="review-status exam-status-select" data-qid="${qid}">
            <option value="attempted"   ${ans.status === "attempted"    ? "selected" : ""}>Attempted</option>
            <option value="completed"   ${ans.status === "completed"    ? "selected" : ""}>Completed</option>
            <option value="not-started" ${ans.status === "not-started"  ? "selected" : ""}>Not started</option>
            <option value="revision"    ${ans.status === "revision"     ? "selected" : ""}>Needs revision</option>
          </select>
        </div>

        <div class="review-field">
          <label class="review-field__label">Difficulty</label>
          <div class="stars review-stars" id="review-stars-${qid}" data-qid="${qid}">
            ${[1,2,3,4,5].map(n =>
              `<span data-star="${n}">${n <= ans.difficulty ? "★" : "☆"}</span>`
            ).join("")}
          </div>
        </div>

        <div class="review-field review-field--notes">
          <label class="review-field__label">Notes</label>
          <textarea class="review-notes exam-notes" data-qid="${qid}" rows="4">${ans.notes}</textarea>
        </div>

        <div class="review-field review-field--include">
          <label class="review-field__label">
            <input type="checkbox" class="review-include-cb" data-qid="${qid}"
              ${(ans.attempted || ans.notes.trim() || ans.difficulty) ? "checked" : ""}>
            Save this question
          </label>
        </div>

      </div>
    `;

    listEl.appendChild(row);

    // Bind review controls back to answers{}
    const starsEl  = row.querySelector(`#review-stars-${qid}`);
    const notesEl  = row.querySelector(`.review-notes[data-qid="${qid}"]`);
    const statusEl = row.querySelector(`.review-status[data-qid="${qid}"]`);
    const includeCb = row.querySelector(`.review-include-cb[data-qid="${qid}"]`);

    statusEl.addEventListener("change", () => { answers[qid].status = statusEl.value; });
    notesEl.addEventListener("input",   () => { answers[qid].notes  = notesEl.value;  });
    includeCb.addEventListener("change", () => { answers[qid].attempted = includeCb.checked; });

    starsEl.querySelectorAll("span").forEach(star => {
      star.addEventListener("click", () => {
        const val = Number(star.dataset.star);
        answers[qid].difficulty = answers[qid].difficulty === val ? 0 : val;
        _renderStars(starsEl, answers[qid].difficulty);
      });
      star.addEventListener("mouseenter", () =>
        _renderStars(starsEl, Number(star.dataset.star), true));
      star.addEventListener("mouseleave", () =>
        _renderStars(starsEl, answers[qid].difficulty));
    });
  });

  // Save button
  document.getElementById("exam-review-save").addEventListener("click", async () => {
    await _saveToFirestore();
  });

  // Go back to exam (only if time hasn't run out)
  const backBtn = document.getElementById("exam-review-back");
  if (backBtn) {
    if (timeLeftMs > 0) {
      backBtn.classList.remove("hidden");
      backBtn.addEventListener("click", () => {
        reviewEl.classList.add("hidden");
        questionsEl.classList.remove("hidden");
        headerEl?.classList.remove("exam-header--finished");
        _startCountdown();
        // Resume timers that were running
        Object.keys(answers).forEach(qid => {
          if (answers[qid].running) _startQuestionTimer(qid);
        });
      });
    } else {
      backBtn.classList.add("hidden");
    }
  }
}

// ─── Save to Firestore ────────────────────────────────────────────────────────

async function _saveToFirestore() {
  if (finished) return;
  finished = true;

  const user = auth.currentUser;
  if (!user) {
    notify({ message: "You must be signed in to save attempts.", type: "warning" });
    return;
  }

  const saves = [];

  for (const [qid, ans] of Object.entries(answers)) {
    // Only save if the "Save this question" checkbox was checked
    if (!ans.attempted && !ans.notes.trim() && !ans.difficulty) continue;

    const attemptData = {
      questionID:  qid,
      userID:      user.uid,
      status:      ans.status || "attempted",
      difficulty:  ans.difficulty || null,
      notes:       ans.notes.trim(),
      time:        ans.elapsed,          // ← per-question time, not total exam time
      createdAt:   serverTimestamp(),
      examMode:    true,
      examPaper:   `${examMeta.year}-S${examMeta.paper}`
    };

    saves.push(
      addDoc(
        collection(db, "users", user.uid, "questions", qid, "attempts"),
        attemptData
      )
      .then(() => {
        // ← Bust the sidebar cache so the viewer fetches fresh attempts
        localStorage.removeItem(ATTEMPTS_CACHE_PFX + qid);
      })
      .catch(err => console.error(`[exam] Failed to save ${qid}:`, err))
    );
  }

  const saveBtn = document.getElementById("exam-review-save");
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving…"; }

  await Promise.all(saves);

  notify({ message: "Exam saved!", type: "success", timeout: 3000 });
  _showResults();
}

// ─── Results screen ───────────────────────────────────────────────────────────

function _showResults() {
  const reviewEl  = document.getElementById("exam-review");
  const resultsEl = document.getElementById("exam-results");
  if (reviewEl)  reviewEl.classList.add("hidden");
  if (resultsEl) resultsEl.classList.remove("hidden");

  const attempted = Object.values(answers).filter(a => a.attempted).length;
  const total     = Object.keys(answers).length;
  const withNotes = Object.values(answers).filter(a => a.notes.trim()).length;
  const rated     = Object.values(answers).filter(a => a.difficulty > 0);
  const avgDiff   = rated.length
    ? (rated.reduce((s, a) => s + a.difficulty, 0) / rated.length).toFixed(1)
    : "—";

  const examElapsed = EXAM_DURATION_MS - timeLeftMs;
  const h = Math.floor(examElapsed / 3_600_000);
  const m = Math.floor((examElapsed % 3_600_000) / 60_000);

  document.getElementById("exam-results-title").textContent =
    `${examMeta.year} STEP ${_romanPaper(examMeta.paper)} — Complete`;

  document.getElementById("exam-results-stats").innerHTML = `
    <div class="results-stat">
      <span class="results-stat__val">${attempted}/${total}</span>
      <span class="results-stat__label">Attempted</span>
    </div>
    <div class="results-stat">
      <span class="results-stat__val">${withNotes}</span>
      <span class="results-stat__label">With notes</span>
    </div>
    <div class="results-stat">
      <span class="results-stat__val">${avgDiff}</span>
      <span class="results-stat__label">Avg difficulty</span>
    </div>
    <div class="results-stat">
      <span class="results-stat__val">${h}h ${m}m</span>
      <span class="results-stat__label">Exam time</span>
    </div>
  `;

  // Per-question breakdown
  const listEl = document.getElementById("exam-results-list");
  listEl.innerHTML = "";
  examMeta.questions.forEach(q => {
    const qid  = makeQuestionID(q);
    const ans  = answers[qid];
    const stars = ans.difficulty
      ? "★".repeat(ans.difficulty) + "☆".repeat(5 - ans.difficulty)
      : "—";

    const row = document.createElement("div");
    row.className = "results-row";
    row.innerHTML = `
      <span class="results-row__id">${qid}</span>
      <span class="results-row__time">${_formatSeconds(ans.elapsed)}</span>
      <span class="results-row__badge ${ans.attempted ? "badge-attempted" : "badge-unattempted"}">
        ${ans.attempted ? "✓ Saved" : "—"}
      </span>
      <span class="results-row__stars">${stars}</span>
      <span class="results-row__notes">${ans.notes.trim() || "No notes"}</span>
    `;
    listEl.appendChild(row);
  });

  document.getElementById("exam-results-close")?.addEventListener("click", closeExam);
  document.getElementById("exam-results-dashboard")?.addEventListener("click", () => {
    closeExam();
    document.getElementById("dashboard-screen")?.classList.remove("hidden");
    document.getElementById("main-screen")?.classList.add("hidden");
  });
}

// ─── Exam launcher modal ──────────────────────────────────────────────────────

/**
 * Build the paper-picker modal and wire up all exam entry points.
 * Call once on app init.
 * @param {Object[]} questions
 */
export function initExamLauncher(questions) {
  _buildLauncherModal(questions);
  _bindFinishButton();
  _bindExitButton();
}

function _buildLauncherModal(questions) {
  const papers = new Map();
  questions.forEach(q => {
    const key = `${q.year}-${q.paper}`;
    if (!papers.has(key)) papers.set(key, { year: q.year, paper: q.paper, count: 0 });
    papers.get(key).count++;
  });

  const sorted = [...papers.values()].sort((a, b) => b.year - a.year || a.paper - b.paper);

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
        Choose a paper. Each question has its own timer so your time per question
        is tracked individually. Review and edit everything before saving.
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

  document.addEventListener("click", e => {
    if (e.target.id === "open-exam") modal.classList.remove("hidden");
    if (e.target.classList.contains("close-exam-picker")) modal.classList.add("hidden");
    if (e.target.classList.contains("modal-backdrop") && modal.contains(e.target)) {
      modal.classList.add("hidden");
    }
  });

  document.getElementById("exam-picker-start").addEventListener("click", () => {
    const val = document.getElementById("exam-picker-select").value;
    const [yearStr, paperStr] = val.split("-");
    modal.classList.add("hidden");
    openExam(Number(yearStr), Number(paperStr), questions);
  });
}

function _bindExitButton() {
  document.getElementById("exam-exit")?.addEventListener("click", () => {
    if (finished) { closeExam(); return; }
    if (confirm("Exit exam? Your work will not be saved.")) closeExam();
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _romanPaper(paper) {
  return ["I", "II", "III"][paper - 1] ?? `Paper ${paper}`;
}

function _formatSeconds(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}