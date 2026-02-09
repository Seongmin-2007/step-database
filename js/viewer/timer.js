import { formatTime, parseTime } from "../utils.js";

let interval = null;
let elapsed = 0;

function qs(id) {
    return document.getElementById(id);
}

export function initTimer({ onTick }) {
    const startBtn = qs("start-timer");
    const display = qs("time-display");

    if (!startBtn || !display) return;

    function update() {
        display.textContent = formatTime(elapsed);
    }

    function start() {
        if (interval) return;
        interval = setInterval(() => {
            elapsed++;
            update();
            onTick(elapsed);
        }, 1000);

        startBtn.textContent = "Pause";
    }

    function pause() {
        if (interval) clearInterval(interval);
        interval = null;

        startBtn.textContent = "Resume";
    }

    startBtn.onclick = () => {
        if (interval) pause();
        else start();
    };

    update();
}

export function stop() {
    if (interval) clearInterval(interval);
    interval = null;
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
 * @param {function} persistDraft Saves draft to local cloud on switching
 */
export function makeTimeEditable(timeDisplay, persistDraft) {
    const startBtn = qs("start-timer");

    timeDisplay.addEventListener("click", () => {
        // Prevent multiple containers
        if (timeDisplay.nextElementSibling?.classList.contains("time-edit-container")) return;

        // Disable timer button while editing
        if (startBtn) startBtn.disabled = true;
        
        const seconds = parseTime(timeDisplay.textContent);
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        timeDisplay.style.display = "none";

        const hrInput = document.createElement("input");
        hrInput.type = "number";
        hrInput.min = 0;
        hrInput.value = hrs;
        hrInput.classList.add("time-edit-input");

        const minInput = document.createElement("input");
        minInput.type = "number";
        minInput.min = 0;
        minInput.max = 59;
        minInput.value = mins;
        minInput.classList.add("time-edit-input");

        const secInput = document.createElement("input");
        secInput.type = "number";
        secInput.min = 0;
        secInput.max = 59;
        secInput.value = secs;
        secInput.classList.add("time-edit-input");

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "✔";
        saveBtn.classList.add("time-save-btn");

        const container = document.createElement("span");
        container.classList.add("time-edit-container");
        container.append(hrInput, document.createTextNode("hrs "),
                         minInput, document.createTextNode("mins "),
                         secInput, document.createTextNode("secs "),
                         saveBtn);

        timeDisplay.parentNode.insertBefore(container, timeDisplay.nextSibling);

        saveBtn.onclick = () => {
            const totalSec = Number(hrInput.value) * 3600 +
                             Number(minInput.value) * 60 +
                             Number(secInput.value);

            setTime(totalSec);
            persistDraft();

            // Reset display & remove input container
            timeDisplay.textContent = formatTime(totalSec);
            container.remove();
            timeDisplay.style.display = "";
            
            if (startBtn) startBtn.disabled = false;
        };
    });
}
