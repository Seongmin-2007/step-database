/**
 * @file index.js  (viewer)
 * @description Viewer entry point. `loadQuestion()` is the single public function —
 *              it tears down previous state, renders the new question, and wires up
 *              all interactivity (timer, stars, draft, attempts, navigation).
 */

import { auth }                from "../core/config.js";
import { emit }                from "../core/eventBus.js";
import { makeQuestionID }      from "../core/utils.js";
import { getFilteredQuestions } from "../core/questionStore.js";
import { COMMIT_SUCCESS_MS }   from "../core/constants.js";
import { notify, createAttemptCard } from "../ui/ui.js";

import { renderQuestion, loadSolutions } from "./render.js";
import { initTimer, stop as stopTimer, setTime, getTime, makeTimeEditable } from "./timer.js";
import { saveDraft, loadDraft, clearDraft } from "./draft.js";
import { saveAttempt, loadAttempts }      from "./attempts.js";
import { initNavigation }                  from "./navigation.js";
import { DEBOUNCE_MS }                     from "../core/constants.js";

import { toggleFlag, isFlagged } from "../core/flagStore.js";

// ─── Module state ─────────────────────────────────────────────────────────────

let currentQuestionID = null;
let difficulty        = 0;
let authListenerBound = false;

// Per-question debounce handles for sidebar loading
const sidebarTokens = new Map();
const sidebarTimers = new Map();

const ATTEMPTS_CACHE_PREFIX = "attempts:";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load a question into the viewer.
 *
 * @param {Object}          q     Question data { year, paper, question }
 * @param {string[]}        tags
 * @param {HTMLElement|null} li   Sidebar list item (for active highlight)
 */
export async function loadQuestion(q, tags, li) {
  // 1. Tear down previous state
  stopTimer();
  difficulty = 0;

  // 2. Render DOM
  const { questionID } = renderQuestion({ q, tags, li });
  currentQuestionID = questionID;

  // 3. Animate in
  const questionMain    = document.querySelector(".question-main");
  const questionSidebar = document.querySelector(".question-sidebar");
  questionMain?.classList.remove("show");
  questionSidebar?.classList.remove("show");
  requestAnimationFrame(() => {
    questionMain?.classList.add("show");
    questionSidebar?.classList.add("show");
  });

  // 4. Tag click → filter
  document.querySelectorAll(".viewer-tag").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      emit("filter:apply", e.target.dataset.tag);
    });
  });

  // 5. Navigation
  initNavigation({
    getQuestions: getFilteredQuestions,
    getCurrentId: () => currentQuestionID,
    onNavigate:   next => loadQuestion(next.data, next.tags, next.li)
  });

  // 6. DOM refs (guaranteed after renderQuestion)
  const statusEl   = document.getElementById("status");
  const notesEl    = document.getElementById("notes");
  const starsEl    = document.getElementById("stars");
  const commitBtn  = document.getElementById("commit-attempt");
  const pastList   = document.getElementById("past-notes-list");

  if (!statusEl || !notesEl || !starsEl || !commitBtn || !pastList) {
    console.error("[viewer] Required DOM elements missing after render");
    return;
  }

  // 7. Disable inputs when not logged in (bound once)
  if (!authListenerBound) {
    authListenerBound = true;
    auth.onAuthStateChanged(user => {
      statusEl.disabled = !user;
      notesEl.disabled  = !user;
    });
  } else {
    const isLoggedIn  = !!auth.currentUser;
    statusEl.disabled = !isLoggedIn;
    notesEl.disabled  = !isLoggedIn;
  }

  // 8. Draft persistence helper
  function persistDraft() {
    saveDraft(questionID, {
      status:     statusEl.value,
      notes:      notesEl.value,
      time:       getTime(),
      difficulty
    });
  }

  // 9. Stars (difficulty rating)
  starsEl.addEventListener("click", e => {
    if (!e.target.dataset.star || statusEl.disabled) return;
    const n = Number(e.target.dataset.star);
    difficulty = difficulty === n ? 0 : n;
    _renderStars(starsEl, difficulty);
    persistDraft();
    _updateCommitBtn(commitBtn, statusEl, difficulty);
  });

  // 10. Status + notes changes
  statusEl.addEventListener("change", () => {
    _updateCommitBtn(commitBtn, statusEl, difficulty);
    persistDraft();
  });
  notesEl.addEventListener("input", persistDraft);

  // 11. Timer
  initTimer({ onTick: persistDraft });
  makeTimeEditable(document.getElementById("time-display"), persistDraft);

  // 12. Restore draft
  const draft = loadDraft(questionID);
  if (draft) {
    statusEl.value = draft.status     ?? "not-started";
    notesEl.value  = draft.notes      ?? "";
    difficulty     = draft.difficulty ?? 0;
    setTime(draft.time ?? 0);
    _renderStars(starsEl, difficulty);
  } else {
    setTime(0);
  }

  _updateCommitBtn(commitBtn, statusEl, difficulty);

  // 13. Load sidebar attempts
  await _loadSidebarAttempts(questionID, pastList);

  // 14. Commit button
  commitBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
      notify({ message: "Sign in to save completed attempts", type: "warning" });
      return;
    }

    stopTimer();

    try {
      await saveAttempt(user.uid, questionID, {
        status:     "completed",
        time:       getTime(),
        difficulty,
        notes:      notesEl.value.trim()
      });
    } catch {
      notify({ message: "Failed to save attempt — please try again.", type: "danger" });
      return;
    }

    // Clear cache + draft
    localStorage.removeItem(ATTEMPTS_CACHE_PREFIX + questionID);
    clearDraft(questionID);

    // Success flash
    commitBtn.classList.add("success");
    commitBtn.textContent = "Saved ✓";
    setTimeout(() => {
      commitBtn.classList.remove("success");
      commitBtn.textContent = "Save as completed attempt";
    }, COMMIT_SUCCESS_MS);

    // Reset UI
    difficulty     = 0;
    notesEl.value  = "";
    statusEl.value = "not-started";
    setTime(0);
    _renderStars(starsEl, 0);
    _updateCommitBtn(commitBtn, statusEl, difficulty);

    await _loadSidebarAttempts(questionID, pastList);
  });

  // 15. Solution toggle
  loadSolutions(q, questionID);
  document.getElementById("solution-toggle").addEventListener("click", () => {
    document.getElementById("solution-container")?.classList.toggle("show");
  });

  // 16. Flagging
  const flagBtn = document.getElementById("viewer-flag-btn");
  _updateFlagBtn(flagBtn, isFlagged(questionID));

  flagBtn.addEventListener("click", () => {
    const nowFlagged = toggleFlag(questionID);
    _updateFlagBtn(flagBtn, nowFlagged);
  });
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _renderStars(starsEl, value) {
  [...starsEl.children].forEach(s => {
    s.textContent = Number(s.dataset.star) <= value ? "★" : "☆";
  });
}

function _updateCommitBtn(btn, statusEl, difficulty) {
  btn.disabled = !(statusEl.value === "completed" && difficulty > 0);
}

async function _loadSidebarAttempts(questionID, list) {
  list.innerHTML = "";

  // Try cache first
  const cached = _readAttemptsCache(questionID);
  if (cached?.length) {
    cached.forEach(item => {
      const fakeDoc = { id: item.id, ref: null, data: () => item.data };
      list.appendChild(createAttemptCard(fakeDoc));
    });
    
    return;
  }

  // Debounce Firestore fetch
  const token = (sidebarTokens.get(questionID) ?? 0) + 1;
  sidebarTokens.set(questionID, token);
  clearTimeout(sidebarTimers.get(questionID));

  const timer = setTimeout(async () => {
    if (sidebarTokens.get(questionID) !== token) return;

    const user = auth.currentUser;
    if (!user) { _showEmpty(list); return; }

    try {
      const snap = await loadAttempts(user.uid, questionID);
      if (snap.empty) { _showEmpty(list); return; }

      snap.docs.forEach(d => list.appendChild(createAttemptCard(d)));
      _writeAttemptsCache(questionID, snap.docs);
    } catch (err) {
      console.error("[viewer] loadAttempts failed:", err);
      _showEmpty(list);
    }
  }, DEBOUNCE_MS);

  sidebarTimers.set(questionID, timer);
}

function _showEmpty(list) {
  list.innerHTML = `
    <li class="empty-attempts" style="opacity:0.6;font-style:italic;">
      No previous attempts
    </li>
  `;
}

function _readAttemptsCache(questionID) {
  try {
    const raw = localStorage.getItem(ATTEMPTS_CACHE_PREFIX + questionID);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function _writeAttemptsCache(questionID, docs) {
  try {
    const data = docs.map(d => ({ id: d.id, data: d.data() }));
    localStorage.setItem(ATTEMPTS_CACHE_PREFIX + questionID, JSON.stringify(data));
  } catch (err) {
    console.warn("[viewer] Could not write attempts cache:", err);
  }
}

function _updateFlagBtn(btn, flagged) {
  btn.textContent = flagged ? "⚑" : "⚐";
  btn.title       = flagged ? "Remove flag" : "Flag for later";
  btn.classList.toggle("flagged", flagged);
}