let interval = null;
let elapsed = 0; // in seconds

function qs(id) {
  return document.getElementById(id);
}

/**
 * Updates the timer display based on elapsed seconds
 */
function updateDisplay() {
    const hoursEl = qs("hours");
    const minutesEl = qs("minutes");
    const secondsEl = qs("seconds");

    if (!hoursEl || !minutesEl || !secondsEl) return;

    let seconds = elapsed;
    const h = Math.floor(seconds / 3600);
    seconds %= 3600;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

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
 * Make the timer editable inline for hours/minutes/seconds
 */
export function makeTimeEditable(persistDraft) {
    const units = ["hours", "minutes", "seconds"];
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

            // Get current values
            const h = Number(qs("hours")?.textContent || 0);
            const m = Number(qs("minutes")?.textContent || 0);
            const s = Number(qs("seconds")?.textContent || 0);

            // Create input field
            const input = document.createElement("input");
            input.type = "number";
            input.min = 0;
            input.value = id === "hours" ? h : id === "minutes" ? m : s;
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
            el.style.opacity = "0.3";

            saveBtn.onclick = () => {
                const val = Number(input.value);
                if (isNaN(val) || val < 0) return;

                // Update elapsed time
                let newElapsed = 0;
                if (id === "hours") newElapsed = val * 3600 + m * 60 + s;
                else if (id === "minutes") newElapsed = h * 3600 + val * 60 + s;
                else if (id === "seconds") newElapsed = h * 3600 + m * 60 + val;

                setTime(newElapsed);

                if (persistDraft) persistDraft();

                container.remove();
                el.style.opacity = "1";
                if (startBtn) startBtn.disabled = false;
            };
        });
    });
}
