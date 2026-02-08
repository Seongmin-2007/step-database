import { auth } from "../config.js";
import { notify, createAttemptCard } from "../ui.js";

import { renderQuestion, loadSolutions } from "./render.js";
import { initTimer, stop as stopTimer, setTime, getTime } from "./timer.js";
import { saveDraft, loadDraft, clearDraft } from "./draft.js";
import { saveAttempt, loadAttempts } from "./attempts.js";

let difficulty = 0;
let authListenerBound = false;

/**
 * Entry point from main.js
 */
export async function loadQuestion(q, tags, li) {
    // --- teardown previous state (DOM-safe)
    stopTimer();
    difficulty = 0;

    // --- render DOM FIRST
    const { questionID } = renderQuestion({ q, tags, li });
    await loadSolutions(q, questionID);

    // --- DOM refs (safe now)
    const statusEl = document.getElementById("status");
    const notesEl = document.getElementById("notes");
    const starsEl = document.getElementById("stars");
    const commitBtn = document.getElementById("commit-attempt");
    const pastList = document.getElementById("past-notes-list");

    if (!statusEl || !notesEl || !starsEl || !commitBtn || !pastList) {
        console.error("Viewer DOM not fully rendered");
        return;
    }

    function disableInputs(disabled) {
        statusEl.disabled = disabled;
        notesEl.disabled = disabled;
    }

    // --- auth binding (ONCE, after DOM exists)
    if (!authListenerBound) {
        authListenerBound = true;
        auth.onAuthStateChanged(user => {
            disableInputs(!user);
        });
    }

    // --- helper to save draft
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
        if (!e.target.dataset.star || statusEl.disabled) return;

        const n = Number(e.target.dataset.star);
        difficulty = difficulty === n ? 0 : n;

        [...starsEl.children].forEach(s => {
            s.textContent =
                Number(s.dataset.star) <= difficulty ? "★" : "☆";
        });

        persistDraft();
        updateCommitButton();
    };

    // --- commit button enable logic
    function updateCommitButton() {
        commitBtn.disabled = !(statusEl.value === "completed" && difficulty > 0);
    }

    statusEl.onchange = () => {
        updateCommitButton();
        persistDraft();
    };

    notesEl.oninput = persistDraft;

    // --- timer
    initTimer({ onTick: persistDraft });

    // --- load local draft
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
    } else {
        setTime(0);
    }

    updateCommitButton();

    // --- load sidebar attempts
    await loadSidebarAttempts(questionID, pastList);

    // --- commit completed attempt
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
            timeout: 1500
        });

        // reset UI
        difficulty = 0;
        notesEl.value = "";
        statusEl.value = "not-started";
        setTime(0);

        [...starsEl.children].forEach(s => (s.textContent = "☆"));
        updateCommitButton();

        await loadSidebarAttempts(questionID, pastList);
    };

    // --- solution toggle
    document.getElementById("solution-toggle").onclick = () => {
        const s = document.getElementById("solution-container");
        if (!s) return;
        s.style.display = s.style.display === "none" ? "block" : "none";
    };
}

/* -----------------------------
   Sidebar helpers
------------------------------ */
async function loadSidebarAttempts(questionID, list) {
    list.innerHTML = "";

    const user = auth.currentUser;
    if (!user) {
        showEmptyAttempts(list);
        return;
    }

    const snap = await loadAttempts(user.uid, questionID);

    if (snap.empty) {
        showEmptyAttempts(list);
        return;
    }

    snap.docs.forEach(d =>
        list.appendChild(createAttemptCard(d))
    );
}

function showEmptyAttempts(list) {
    list.innerHTML = `
        <li class="empty-attempts" style="opacity:0.6;font-style:italic;">
            No previous attempts
        </li>
    `;
}
