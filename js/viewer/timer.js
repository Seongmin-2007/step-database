let interval = null;
let elapsed = 0; // seconds

function qs(id) {
  return document.getElementById(id);
}

/**
 * Updates the timer display based on elapsed seconds
 */
function updateDisplay() {
  const daysEl = qs("days");
  const hoursEl = qs("hours");
  const minutesEl = qs("minutes");
  const secondsEl = qs("seconds");

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  let seconds = elapsed;
  const d = Math.floor(seconds / 86400);
  seconds %= 86400;
  const h = Math.floor(seconds / 3600);
  seconds %= 3600;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  daysEl.textContent = d.toString().padStart(2, "0");
  hoursEl.textContent = h.toString().padStart(2, "0");
  minutesEl.textContent = m.toString().padStart(2, "0");
  secondsEl.textContent = s.toString().padStart(2, "0");
}

/**
 * Initialize the timer
 * @param {function} onTick callback every second
 */
export function initTimer({ onTick }) {
  const startBtn = qs("start-timer");
  if (!startBtn) return;

  function start() {
    if (interval) return;
    interval = setInterval(() => {
      elapsed++;
      updateDisplay();
      if (onTick) onTick(elapsed);
    }, 1000);
    startBtn.textContent = "⏸"; // pause icon
  }

  function pause() {
    clearInterval(interval);
    interval = null;
    startBtn.textContent = "▶"; // play icon
  }

  startBtn.onclick = () => {
    if (interval) pause();
    else start();
  };

  updateDisplay();
}

/**
 * Stop the timer completely
 */
export function stop() {
  if (interval) clearInterval(interval);
  interval = null;
}

/**
 * Set elapsed time manually
 */
export function setTime(seconds) {
  elapsed = seconds;
  updateDisplay();

  // pause if running
  if (interval) {
    clearInterval(interval);
    interval = null;
    const startBtn = qs("start-timer");
    if (startBtn) startBtn.textContent = "▶";
  }
}

/**
 * Get elapsed time in seconds
 */
export function getTime() {
  return elapsed;
}

/**
 * Make the timer editable inline for days/hours/minutes/seconds
 */
export function makeTimeEditable(persistDraft) {
  const units = ["days", "hours", "minutes", "seconds"];
  const startBtn = qs("start-timer");

  units.forEach((id) => {
    const el = qs(id);
    if (!el) return;

    el.addEventListener("click", () => {
      // Prevent multiple editors
      if (el.nextElementSibling?.classList.contains("time-edit-container")) return;

      // Pause timer if running
      if (interval) {
        clearInterval(interval);
        interval = null;
        if (startBtn) startBtn.textContent = "▶";
      }

      if (startBtn) startBtn.disabled = true;

      // Get current time values
      const d = Number(qs("days")?.textContent || 0);
      const h = Number(qs("hours")?.textContent || 0);
      const m = Number(qs("minutes")?.textContent || 0);
      const s = Number(qs("seconds")?.textContent || 0);

      // Create input fields inline
      const input = document.createElement("input");
      input.type = "number";
      input.min = 0;
      input.value = id === "days" ? d : id === "hours" ? h : id === "minutes" ? m : s;
      input.classList.add("time-edit-input");
      input.style.width = "50px";

      // Save button
      const saveBtn = document.createElement("button");
      saveBtn.textContent = "✔";
      saveBtn.classList.add("time-save-btn");

      const container = document.createElement("span");
      container.classList.add("time-edit-container");
      container.append(input, saveBtn);

      el.parentNode.insertBefore(container, el.nextSibling);
      el.style.opacity = "0.3"; // indicate editing

      saveBtn.onclick = () => {
        const val = Number(input.value);
        if (isNaN(val) || val < 0) return;

        // Update elapsed time
        let newElapsed = 0;
        newElapsed += qs("days")?.textContent ? Number(qs("days").textContent) * 86400 : 0;
        newElapsed += qs("hours")?.textContent ? Number(qs("hours").textContent) * 3600 : 0;
        newElapsed += qs("minutes")?.textContent ? Number(qs("minutes").textContent) * 60 : 0;
        newElapsed += qs("seconds")?.textContent ? Number(qs("seconds").textContent) : 0;

        if (id === "days") newElapsed = val * 86400 + (newElapsed % 86400);
        else if (id === "hours") newElapsed = Math.floor(newElapsed / 86400) * 86400 + val * 3600 + (newElapsed % 3600);
        else if (id === "minutes") newElapsed = Math.floor(newElapsed / 3600) * 3600 + val * 60 + (newElapsed % 60);
        else if (id === "seconds") newElapsed = Math.floor(newElapsed / 60) * 60 + val;

        setTime(newElapsed);
        if (persistDraft) persistDraft();

        container.remove();
        el.style.opacity = "1";
        if (startBtn) startBtn.disabled = false;
      };
    });
  });
}
