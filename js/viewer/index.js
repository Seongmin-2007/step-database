import { auth, db } from "../config.js";
import { addDoc, collection, query, where, orderBy, getDocs, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { renderQuestion } from "./render.js";
import { initTimer, getElapsedSeconds, resetTimer } from "./timer.js";
import { loadDraft, saveDraft, clearDraft } from "./draft.js";
import { createAttemptCard, notify } from "../ui.js";

/* -------------------------
   Public entry point
-------------------------- */
export async function loadQuestion(q, tags, li) {
    const questionID = `${q.year}-step${q.paper}-q${q.question}`;

    // highlight selected question
    document.querySelectorAll("#questionList li")
        .forEach(x => x.classList.remove("active"));
    li.classList.add("active");

    // render UI
    renderQuestion(q, tags, questionID);

    // DOM refs (SAFE: after render)
    const statusEl = document.getElementById("status");
    const notesEl = document.getElementById("notes");
    const starsEl = document.getElementById("stars");
    const commitBtn = document.getElementById("commit-attempt");
    const pastList = document.getElementById("past-notes-list");

    let difficulty = 0;

    /* -------------------------
       Difficulty stars
    -------------------------- */
    function updateStars() {
        starsEl.querySelectorAll("span").forEach(s => {
            const n = Number(s.dataset.star);
            s.textContent = n <= difficulty ? "★" : "☆";
            s.classList.toggle("active", n <= difficulty);
        });
    }

    starsEl.onclick = e => {
        if (!e.target.dataset.star || statusEl.disabled) return;
        const n = Number(e.target.dataset.star);
        difficulty = (difficulty === n) ? 0 : n;
        updateStars();
        updateCommitButton();
        saveDraft(questionID, statusEl, notesEl, difficulty, getElapsedSeconds());
    };

    /* -------------------------
       Commit button logic
    -------------------------- */
    function updateCommitButton() {
        commitBtn.disabled = !(statusEl.value === "completed" && difficulty > 0);
    }

    statusEl.onchange = () => {
        updateCommitButton();
        saveDraft(questionID, statusEl, notesEl, difficulty, getElapsedSeconds());
    };

    notesEl.oninput = () =>
        saveDraft(questionID, statusEl, notesEl, difficulty, getElapsedSeconds());

    /* -------------------------
       Timer
    -------------------------- */
    initTimer(questionID, () =>
        saveDraft(questionID, statusEl, notesEl, difficulty, getElapsedSeconds())
    );

    /* -------------------------
       Load local draft
    -------------------------- */
    const draft = loadDraft(questionID);
    if (draft) {
        statusEl.value = draft.status ?? "not-started";
        notesEl.value = draft.notes ?? "";
        difficulty = draft.difficulty ?? 0;
        resetTimer(draft.time ?? 0);
        updateStars();
    } else {
        resetTimer(0);
    }

    updateCommitButton();

    /* -------------------------
       Sidebar: previous attempts
    -------------------------- */
    await loadPreviousAttempts(questionID, pastList);

    /* -------------------------
       Save completed attempt
    -------------------------- */
    commitBtn.onclick = async () => {
        const user = auth.currentUser;
        if (!user) {
            notify({
                message: "Sign in to save completed attempts",
                type: "warning"
            });
            return;
        }

        const attempt = {
            createdAt: serverTimestamp(),
            status: "completed",
            time: getElapsedSeconds(),
            difficulty,
            notes: notesEl.value.trim(),
            questionID,
            userID: user.uid
        };

        await addDoc(
            collection(db, "users", user.uid, "questions", questionID, "attempts"),
            attempt
        );

        notify({ message: "Attempt saved", type: "success", timeout: 1500 });

        clearDraft(questionID);
        resetTimer(0);
        difficulty = 0;
        notesEl.value = "";
        updateStars();
        updateCommitButton();

        await loadPreviousAttempts(questionID, pastList);
    };
}

/* -------------------------
   Load sidebar attempts
-------------------------- */
async function loadPreviousAttempts(questionID, pastList) {
    pastList.innerHTML = "";

    const user = auth.currentUser;
    if (!user) {
        showEmptyAttempts(pastList);
        return;
    }

    const q = query(
        collection(db, "users", user.uid, "questions", questionID, "attempts"),
        where("status", "==", "completed"),
        orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
        showEmptyAttempts(pastList);
        return;
    }

    snap.docs.forEach(d =>
        pastList.appendChild(createAttemptCard(d))
    );
}

/* -------------------------
   Empty sidebar state
-------------------------- */
function showEmptyAttempts(list) {
    list.innerHTML = `
        <li class="empty-attempts" style="opacity:0.6;font-style:italic;">
            No previous attempts
        </li>
    `;
}
