import { auth } from "../config.js";
import { notify, createAttemptCard } from "../ui.js";

import { renderQuestion, loadSolutions } from "./render.js";
import { initTimer, stop as stopTimer, setTime, getTime } from "./timer.js";
import { saveDraft, loadDraft, clearDraft } from "./draft.js";
import { saveAttempt, loadAttempts } from "./attempts.js";

let difficulty = 0;
let authListenerBound = false;

/**
 * Entry point called from main.js
 */
export async function loadQuestion(q, tags, li) {
    // --- teardown from previous question (DOM-safe)
    stopTimer();
    difficulty = 0;

    // --- render DOM first (CRITICAL)
    const { questionID } = renderQuestion({ q, tags, li });
    await loadSolutions(q, questionID);

    // --- grab DOM references AFTER render
    const statusEl = document.getElementById("status");
    const notesEl = document.getElementById("notes");
    const starsEl = document.getElementById("stars");
    const pastList = document.getElementById("past-notes-list");
    const commitBtn = document.getElementById("commit-attempt");

    // --- defensive check (should never fail now)
    if (!statusEl || !notesEl || !starsEl || !commitBtn || !pastList) {
        console.error("Viewer DOM missing critical elements");
        return;
    }

    function disableInputs(disabled) {
        statusEl.disabled = disabled;
        notesEl.disabled = disabled;
    }

    // --- bind auth listener ONCE, AFTER DOM exists
    if (!authListenerBound) {
        authListenerBound = true;
        auth.onAuthStateChanged(user => {
            disableInputs(!user);
        });
    }

    // --- persistence helper
    function persistDraft() {
        saveDraft(questionID, {
            status: statusEl.value,
            notes: notesEl.value,
            time: getTime(),
            difficulty
        });
    }

    // --- stars (difficulty)
    starsEl.onclick = e => {
        if (!e.target.dataset.star) return;

        const n = Number(e.target.dataset.star);
        difficulty = difficulty === n ? 0 : n;

        [...starsEl.children].forEach(s => {
            s.textContent =
                Number(s.dataset.star) <= difficulty ? "★" : "☆";
        });

        persistDraft();
    };

    // --- inputs
    statusEl.onchange = persistDraft;
    notesEl.oninput = persistDraft;

    // --- timer
    initTimer({ onTick: persistDraft });

    // --- load draft AFTER everything is wired
    const draft = loadDraft(questionID);
    if (draft) {
        statusEl.value = draft.status ?? "not-started";
        notesEl.value = draft.notes ?? "";
        difficulty = draft.difficulty ?? 0;
        setTime(draft.time ?? 0);

        [...starsEl.children].forEach(s => {
            s.textContent =
                Number(s.dataset.star) <= difficulty ? "★" : "☆";
        });
    }

    // --- commit attempt
    commitBtn.onclick = async () => {
        const user = auth.currentUser;
        if (!user) {
            notify({
                message: "Sign in to save completed attempts",
                type: "warning"
            });
            return;
        }

        stopTimer();

        await saveAttempt(user.uid, questionID, {
            status: "completed",
            time: getTime(),
            difficulty,
            notes: notesEl.value.trim()
        });

        clearDraft(questionID);

        notify({
            message: "Attempt saved",
            type: "success",
            timeout: 2000
        });

        // reload attempts
        pastList.innerHTML = "";
        const snap = await loadAttempts(user.uid, questionID);
        snap.docs.forEach(d => pastList.appendChild(createAttemptCard(d)));
    };

    // --- solution toggle
    document.getElementById("solution-toggle").onclick = () => {
        const s = document.getElementById("solution-container");
        if (!s) return;
        s.style.display = s.style.display === "none" ? "block" : "none";
    };
}
