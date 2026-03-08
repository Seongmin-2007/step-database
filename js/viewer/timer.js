/**
 * @file timer.js
 * @description Stopwatch timer for the question viewer.
 *              Manages start/pause/resume state and exposes time get/set.
 */

import { formatTime, parseTime } from "../core/utils.js";

// ─── State ────────────────────────────────────────────────────────────────────

let interval = null;
let elapsed  = 0;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the timer UI and bind the start/pause button.
 * Must be called after render.js has injected the viewer HTML.
 *
 * @param {{ onTick: (elapsed: number) => void }} opts
 */
export function initTimer({ onTick }) {
  const startBtn = _el("start-timer");
  const display  = _el("time-display");
  if (!startBtn || !display) return;

  _updateDisplay(display);
  startBtn.textContent = elapsed === 0 ? "Start" : "Resume";

  startBtn.onclick = () => {
    if (interval) _pause(startBtn);
    else          _start(startBtn, display, onTick);
  };
}

/**
 * Stop the timer (without resetting elapsed time).
 * Call this when navigating away from a question.
 */
export function stop() {
  if (interval) clearInterval(interval);
  interval = null;
}

/**
 * Set elapsed time programmatically (e.g. when loading a draft).
 * Pauses any running interval.
 * @param {number} seconds
 */
export function setTime(seconds) {
  stop();
  elapsed = seconds;

  const display  = _el("time-display");
  const startBtn = _el("start-timer");
  if (display)  _updateDisplay(display);
  if (startBtn) startBtn.textContent = elapsed === 0 ? "Start" : "Resume";
}

/**
 * Get the current elapsed time in seconds.
 * @returns {number}
 */
export function getTime() {
  return elapsed;
}

/**
 * Make the time display clickable to manually edit the time.
 *
 * @param {HTMLElement} timeDisplay
 * @param {Function}    onSave      Called with new elapsed after save
 */
export function makeTimeEditable(timeDisplay, onSave) {
  timeDisplay.addEventListener("click", () => {
    // Prevent double-mount
    if (timeDisplay.nextElementSibling?.classList.contains("time-edit-container")) return;

    stop();
    const startBtn = _el("start-timer");
    if (startBtn) { startBtn.disabled = true; startBtn.style.display = "none"; }

    const seconds = parseTime(timeDisplay.textContent);
    const hrs  = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    timeDisplay.style.display = "none";

    const hrInput  = _numberInput(hrs,  0, null);
    const minInput = _numberInput(mins, 0, 59);
    const secInput = _numberInput(secs, 0, 59);

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "✔";
    saveBtn.className   = "time-save-btn";

    const wrap = document.createElement("span");
    wrap.className = "time-edit-container";
    wrap.append(
      hrInput,  document.createTextNode("hrs "),
      minInput, document.createTextNode("mins "),
      secInput, document.createTextNode("secs "),
      saveBtn
    );

    timeDisplay.parentNode.insertBefore(wrap, timeDisplay.nextSibling);

    saveBtn.addEventListener("click", () => {
      const total = Number(hrInput.value) * 3600 +
                    Number(minInput.value) * 60  +
                    Number(secInput.value);

      setTime(total);
      onSave();

      wrap.remove();
      timeDisplay.style.display = "inline";
      if (startBtn) { startBtn.disabled = false; startBtn.style.display = "inline"; }
    });
  });
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _start(startBtn, display, onTick) {
  interval = setInterval(() => {
    elapsed++;
    _updateDisplay(display);
    onTick(elapsed);
  }, 1000);
  startBtn.textContent = "Pause";
}

function _pause(startBtn) {
  clearInterval(interval);
  interval = null;
  startBtn.textContent = elapsed === 0 ? "Start" : "Resume";
}

function _updateDisplay(display) {
  display.textContent = formatTime(elapsed);
}

function _el(id) { return document.getElementById(id); }

function _numberInput(value, min, max) {
  const input = document.createElement("input");
  input.type  = "number";
  input.value = value;
  input.min   = min;
  if (max !== null) input.max = max;
  input.className = "time-edit-input";
  return input;
}