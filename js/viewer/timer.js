import { formatTime } from "../utils.js";

let interval = null;
let elapsed = 0;

export function initTimer({ onTick }) {
    const startBtn = document.getElementById("start-timer");
    const stopBtn = document.getElementById("stop-timer");
    const display = document.getElementById("time-display");

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
    clearInterval(interval);
    interval = null;
    document.getElementById("start-timer").disabled = false;
    document.getElementById("stop-timer").disabled = true;
}

export function setTime(seconds) {
    elapsed = seconds;
}

export function getTime() {
    return elapsed;
}