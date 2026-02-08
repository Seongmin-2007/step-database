import { auth } from "../config.js";
import { notify, createAttemptCard } from "../ui.js";

import { renderQuestion, loadSolutions } from "./render.js";
import { initTimer, stop as stopTimer, setTime, getTime } from "./timer.js";
import { saveDraft, loadDraft, clearDraft } from "./draft.js";
import { saveAttempt, loadAttempts } from "./attempts.js";
import { initNavigation } from "./navigation.js";
import { renderMath } from "../ui.js";

let difficulty = 0;
let authListenerBound = false;
let currentQuestionID = null;

function attemptsCacheKey(questionID) {
    return `attempts:${questionID}`;
}

function loadAttemptsFromCache(questionID) {
    const raw = localStorage.getItem(attemptsCacheKey(questionID));
    return raw ? JSON.parse(raw) : null;
}

function saveAttemptsToCache(questionID, docs) {
    console.log("22");
    const data = docs.map(d => ({
        id: d.id,
        data: d.data()
    }));
    localStorage.setItem(attemptsCacheKey(questionID), JSON.stringify(data));
}

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

    // Navigation (previous, after quickly)
    initNavigation({
        getQuestions: () => window.__filteredQuestions,
        getCurrentId: () => currentQuestionID,
        onNavigate: (q) => {
            // reuse existing behaviour
            loadQuestion(q.data, q.tags, q.li);
        }
    });

    const questionMain = document.querySelector(".question-main");
    const questionSidebar = document.querySelector(".question-sidebar");

    // Remove any previous animation class
    questionMain.classList.remove("show");
    questionSidebar.classList.remove("show");

    // Small timeout to trigger CSS transition
    requestAnimationFrame(() => {
        questionMain.classList.add("show");
        questionSidebar.classList.add("show");
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

    // Live changes to notes but only if user stops typing
    let mathDebounce;
    notesElement.addEventListener("input", () => {
        persistDraft();

        clearTimeout(mathDebounce);
        mathDebounce = setTimeout(() => {
            renderMath(notesElement.parentElement);
        }, 500); // render 0.5s after the last keystroke
    });

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

        // Removes cached attempts
        localStorage.removeItem(attemptsCacheKey(questionID));

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
    document.getElementById("solution-toggle").onclick = async () => {
        await loadSolutions(q, questionID);
        const s = document.getElementById("solution-container");
        if (!s) return;
        s.classList.toggle("show");
    };
}

// -----------------------------
// Sidebar helpers (fixed)
// -----------------------------
const sidebarTokens = new Map();
const sidebarTimers = new Map();

async function loadSidebarAttempts(questionID, list) {
    list.innerHTML = "";

    // Check cache first
    const cached = loadAttemptsFromCache(questionID);
    if (cached && cached.length) {
        console.log("11");
        cached.forEach(item => {
            const fakeDoc = { id: item.id, data: () => item.data };
            list.appendChild(createAttemptCard(fakeDoc));
        });
        return;
    }

    // Increment token for this question
    const token = (sidebarTokens.get(questionID) || 0) + 1;
    sidebarTokens.set(questionID, token);

    // Clear previous debounce timer for this question
    if (sidebarTimers.get(questionID)) clearTimeout(sidebarTimers.get(questionID));

    // Schedule request with debounce
    const timer = setTimeout(async () => {
        // Only proceed if token hasn't changed
        if (sidebarTokens.get(questionID) !== token) return;

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

        snap.docs.forEach(d => list.appendChild(createAttemptCard(d)));

        saveAttemptsToCache(questionID, snap.docs);

    }, 1000); // debounce delay

    sidebarTimers.set(questionID, timer);
}



function showEmptyAttempts(list) {
    list.innerHTML = `
        <li class="empty-attempts" style="opacity:0.6;font-style:italic;">
            No previous attempts
        </li>
    `;
}
