import { formatTime } from "../utils.js";

let interval = null;
let elapsed = 0;

function qs(id) {
    return document.getElementById(id);
}

export function initTimer({ onTick }) {
    const startBtn = qs("start-timer");
    const stopBtn = qs("stop-timer");
    const display = qs("time-display");

    if (!startBtn || !stopBtn || !display) return;

    function update() {
        display.textContent = formatTime(elapsed);
    }

    startBtn.onclick = () => {
        if (interval) return;

        startBtn.disabled = true;
        stopBtn.disabled = false;

        interval = setInterval(() => {
            elapsed++;
            update();
            onTick(elapsed);
        }, 1000);
    };

    stopBtn.onclick = stop;

    update();
}

export function stop() {
    if (interval) clearInterval(interval);
    interval = null;

    const startBtn = qs("start-timer");
    const stopBtn = qs("stop-timer");

    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
}

export function setTime(seconds) {
    elapsed = seconds;
}

export function getTime() {
    return elapsed;
}
