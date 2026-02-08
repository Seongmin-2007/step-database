import { auth } from "../config.js";
import { notify, createAttemptCard } from "../ui.js";

import { renderQuestion, loadSolutions } from "./render.js";
import { initTimer, stop as stopTimer, setTime, getTime } from "./timer.js";
import { saveDraft, loadDraft, clearDraft } from "./draft.js";
import { saveAttempt, loadAttempts } from "./attempts.js";
import { initNavigation } from "./navigation.js";

let difficulty = 0;
let authListenerBound = false;
let currentQuestionID = null;

/**
 * Entry point from main.js
 */
export async function loadQuestion(q, tags, li) {
    // --- teardown previous state (DOM-safe)
    stopTimer();
    difficulty = 0;

    // --- render DOM FIRST
    const { questionID } = renderQuestion({ q, tags, li });
    currentQuestionID = questionID;
    await loadSolutions(q, questionID);

    // Navigation (previous, after quickly)
    initNavigation({
        getQuestions: () => window.__filteredQuestions,
        getCurrentId: () => currentQuestionID,
        onNavigate: (q) => {
            // reuse existing behaviour
            loadQuestion(q.data, q.tags, q.li);
        }
    });

    // --- DOM refs (safe now)
    const statusElement = document.getElementById("status");
    const notesElement = document.getElementById("notes");
    const starsElement = document.getElementById("stars");
    const commitButton = document.getElementById("commit-attempt");
    const pastList = document.getElementById("past-notes-list");

    if (!statusElement || !notesElement || !starsElement || !commitButton || !pastList) {
        console.error("Viewer DOM not fully rendered");
        return;
    }

    function disableInputs(disabled) {
        statusElement.disabled = disabled;
        notesElement.disabled = disabled;
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
            status: statusElement.value,
            notes: notesElement.value,
            time: getTime(),
            difficulty
        });
    }

    // --- stars (difficulty)
    starsElement.onclick = e => {
        if (!e.target.dataset.star || statusElement.disabled) return;

        const n = Number(e.target.dataset.star);
        difficulty = difficulty === n ? 0 : n;

        [...starsElement.children].forEach(s => {
            s.textContent =
                Number(s.dataset.star) <= difficulty ? "★" : "☆";
        });

        persistDraft();
        updateCommitButton();
    };

    // --- commit button enable logic
    function updateCommitButton() {
        commitButton.disabled = !(statusElement.value === "completed" && difficulty > 0);
    }

    statusElement.onchange = () => {
        updateCommitButton();
        persistDraft();
    };

    notesElement.oninput = persistDraft;

    // --- timer
    initTimer({ onTick: persistDraft });

    // --- load local draft
    const draft = loadDraft(questionID);
    if (draft) {
        statusElement.value = draft.status ?? "not-started";
        notesElement.value = draft.notes ?? "";
        difficulty = draft.difficulty ?? 0;
        setTime(draft.time ?? 0);

        [...starsElement.children].forEach(s => {
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
    commitButton.onclick = async () => {
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
            notes: notesElement.value.trim()
        });

        clearDraft(questionID);

        commitButton.classList.add("success");
        commitButton.textContent = "Saved ✓";

        setTimeout(() => {
            commitButton.classList.remove("success");
            commitButton.textContent = "Save as completed attempt";
        }, 1200);


        // reset UI
        difficulty = 0;
        notesElement.value = "";
        statusElement.value = "not-started";
        setTime(0);

        [...starsElement.children].forEach(s => (s.textContent = "☆"));
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
