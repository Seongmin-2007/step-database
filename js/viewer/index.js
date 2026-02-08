import { auth } from "../config.js";
import { notify, createAttemptCard } from "../ui.js";

import { renderQuestion, loadSolutions } from "./render.js";
import { initTimer, stop, setTime, getTime } from "./timer.js";
import { saveDraft, loadDraft, clearDraft } from "./draft.js";
import { saveAttempt, loadAttempts } from "./attempts.js";

let difficulty = 0;
let unsubscribeAuth = null;

export async function loadQuestion(q, tags, li) {
    stop();
    difficulty = 0;

    const { questionID } = renderQuestion({ q, tags, li });
    await loadSolutions(q, questionID);

    const statusEl = document.getElementById("status");
    const notesEl = document.getElementById("notes");
    const starsEl = document.getElementById("stars");

    function disableInputs(disabled) {
        statusEl.disabled = disabled;
        notesEl.disabled = disabled;
    }

    if (!unsubscribeAuth) {
        unsubscribeAuth = auth.onAuthStateChanged(user => {
            disableInputs(!user);
        });
    }

    function persist() {
        saveDraft(questionID, {
            status: statusEl.value,
            notes: notesEl.value,
            time: getTime(),
            difficulty
        });
    }

    starsEl.onclick = e => {
        if (!e.target.dataset.star) return;
        const n = Number(e.target.dataset.star);
        difficulty = difficulty === n ? 0 : n;

        [...starsEl.children].forEach(s => {
            s.textContent = Number(s.dataset.star) <= difficulty ? "★" : "☆";
        });

        persist();
    };

    statusEl.onchange = persist;
    notesEl.oninput = persist;

    initTimer({ onTick: persist });

    const draft = loadDraft(questionID);
    if (draft) {
        statusEl.value = draft.status;
        notesEl.value = draft.notes;
        difficulty = draft.difficulty ?? 0;
        setTime(draft.time ?? 0);
    }

    document.getElementById("commit-attempt").onclick = async () => {
        const user = auth.currentUser;
        if (!user) {
            notify({ message: "Sign in first", type: "warning" });
            return;
        }

        stop();

        await saveAttempt(user.uid, questionID, {
            status: "completed",
            time: getTime(),
            difficulty,
            notes: notesEl.value.trim()
        });

        clearDraft(questionID);
        notify({ message: "Attempt saved", type: "success" });

        const snap = await loadAttempts(user.uid, questionID);
        const list = document.getElementById("past-notes-list");
        list.innerHTML = "";
        snap.docs.forEach(d => list.appendChild(createAttemptCard(d)));
    };

    document.getElementById("solution-toggle").onclick = () => {
        const s = document.getElementById("solution-container");
        s.style.display = s.style.display === "none" ? "block" : "none";
    };
}
