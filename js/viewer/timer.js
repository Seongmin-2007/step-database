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
    const display = qs("time-display");
    elapsed = seconds;
    display.textContent = formatTime(elapsed);
}

export function getTime() {
    return elapsed;
}

/**
 * Makes a given span element editable on click
 * @param {HTMLElement} timeDisplay
 */
export function makeTimeEditable(timeDisplay) {
    timeDisplay.addEventListener("click", () => {
        // Parse current display
        const [minutes, seconds] = timeDisplay.textContent
            .replace("min", "").replace("sec", "")
            .split(" ")
            .map(s => parseInt(s)) 
            .filter(n => !isNaN(n));

        // Create inputs
        const minInput = document.createElement("input");
        minInput.type = "number";
        minInput.min = 0;
        minInput.value = minutes || 0;
        minInput.style.width = "40px";

        const secInput = document.createElement("input");
        secInput.type = "number";
        secInput.min = 0;
        secInput.max = 59;
        secInput.value = seconds || 0;
        secInput.style.width = "40px";

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "✔";
        saveBtn.style.marginLeft = "4px";

        const container = document.createElement("span");
        container.appendChild(minInput);
        container.appendChild(document.createTextNode(" : "));
        container.appendChild(secInput);
        container.appendChild(saveBtn);

        timeDisplay.replaceWith(container);

        saveBtn.onclick = () => {
            const totalSec = Number(minInput.value) * 60 + Number(secInput.value);
            setTime(totalSec);
            container.replaceWith(timeDisplay);
            timeDisplay.textContent = `${minInput.value}min ${secInput.value}sec`;
        };
    });
}
