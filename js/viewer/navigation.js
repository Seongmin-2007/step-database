/**
 * @file navigation.js
 * @description Previous / next question navigation for the viewer.
 *              Supports both button clicks and keyboard arrow keys.
 *
 *              The keyboard listener is bound once globally — subsequent calls
 *              to initNavigation() update the callbacks without adding more listeners.
 */

// ─── State ────────────────────────────────────────────────────────────────────

/** Current navigation callbacks — updated on each initNavigation() call */
let _getQuestions = () => [];
let _getCurrentId  = () => null;
let _onNavigate    = () => {};

let keyListenerBound = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise navigation controls.
 * Safe to call on every question load — button handlers and keyboard listener
 * are refreshed without creating duplicates.
 *
 * @param {Object}   opts
 * @param {Function} opts.getQuestions  () => { id, data, tags, li }[]
 * @param {Function} opts.getCurrentId  () => string
 * @param {Function} opts.onNavigate    (question) => void
 */
export function initNavigation({ getQuestions, getCurrentId, onNavigate }) {
  _getQuestions = getQuestions;
  _getCurrentId  = getCurrentId;
  _onNavigate    = onNavigate;

  const prevBtn = document.getElementById("prev-question");
  const nextBtn = document.getElementById("next-question");

  if (!prevBtn || !nextBtn) return;

  // Replace onclick to avoid stacking listeners
  prevBtn.onclick = () => _go(-1);
  nextBtn.onclick = () => _go(+1);

  _updateButtons(prevBtn, nextBtn);

  // Global keyboard listener — bound only once ever
  if (!keyListenerBound) {
    keyListenerBound = true;
    document.addEventListener("keydown", e => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if (e.key === "ArrowLeft")  _go(-1);
      if (e.key === "ArrowRight") _go(+1);
    });
  }
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _getIndex() {
  const id = _getCurrentId();
  return _getQuestions().findIndex(q => q.id === id);
}

function _go(delta) {
  const questions = _getQuestions();
  const index     = _getIndex();
  if (index === -1) return;

  const next = index + delta;
  if (next < 0 || next >= questions.length) return;

  _onNavigate(questions[next]);
}

function _updateButtons(prevBtn, nextBtn) {
  const questions = _getQuestions();
  const index     = _getIndex();
  prevBtn.disabled = index <= 0;
  nextBtn.disabled = index === -1 || index >= questions.length - 1;
}