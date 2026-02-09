import { formatTime, parseTime } from "../utils.js";

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
        // Avoid spawning multiple containers
        if (timeDisplay.nextElementSibling?.classList.contains("time-edit-container")) {
            return;
        }

        const seconds = parseTime(timeDisplay.textContent);
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        timeDisplay.style.display = "none";

        // Create inputs
        const hrInput = document.createElement("input");
        hrInput.type = "number";
        hrInput.min = 0;
        hrInput.value = hrs || 0;
        hrInput.style.width = "40px";

        const minInput = document.createElement("input");
        minInput.type = "number";
        minInput.min = 0;
        minInput.max = 59;
        minInput.value = mins || 0;
        minInput.style.width = "40px";

        const secInput = document.createElement("input");
        secInput.type = "number";
        secInput.min = 0;
        secInput.max = 59;
        secInput.value = secs || 0;
        secInput.style.width = "40px";

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "✔";
        saveBtn.style.marginLeft = "4px";
        
        hrInput.classList.add("time-edit-input");
        minInput.classList.add("time-edit-input");
        secInput.classList.add("time-edit-input");
        saveBtn.classList.add("time-save-btn");

        const container = document.createElement("span");
        container.classList.add("time-edit-container"); // add class for identification
        container.appendChild(hrInput);
        container.appendChild(document.createTextNode("hrs "));
        container.appendChild(minInput);
        container.appendChild(document.createTextNode("mins "));
        container.appendChild(secInput);
        container.appendChild(document.createTextNode("secs "));
        container.appendChild(saveBtn);

        timeDisplay.parentNode.insertBefore(container, timeDisplay.nextSibling);

        saveBtn.onclick = () => {
            const totalSec =
                Number(hrInput.value) * 3600 +
                Number(minInput.value) * 60 +
                Number(secInput.value);

            setTime(totalSec);
            timeDisplay.textContent = formatTime(totalSec);

            container.remove();
            timeDisplay.style.display = ""; // show original span again
        };
    });
}
