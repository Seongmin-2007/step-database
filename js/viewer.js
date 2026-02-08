import {
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { createAttemptCard, notify } from "./ui.js";

import { auth, db } from "./config.js";

export async function loadQuestion(q, tags, li) {
    const viewer = document.getElementById("viewer");
    const questionID = `${q.year}-step${q.paper}-q${q.question}`;
    const questionImage = `images/questions/${q.year}/S${q.paper}/Q${q.question}.png`;

    // Highlights only the selected question
    document.querySelectorAll("#questionList li").forEach(x => x.classList.remove("active"));
    li.classList.add("active");


    // Render Question HTML
    viewer.innerHTML = `
        <h2>${questionID}</h2>
        <div style="margin-top:10px; font-size:0.9em; color:#555;">
        <strong>Tags:</strong> ${tags.length ? tags.join(", ") : "No tags available"}
        </div>

        <div class="question-layout">
        <!-- LEFT: main content -->
        <div class="question-main">
            <img src="${questionImage}" alt="Question ${questionID}">

            <div class="progress-panel">
            <div>
                <label>Status:</label>
                <select id="status">
                <option value="not-started">Not started</option>
                <option value="attempted">Attempted</option>
                <option value="completed">Completed</option>
                <option value="revision">Needs revision</option>
                </select>
            </div>

            <div class="time-control">
                <button id="start-timer">Start</button>
                <button id="stop-timer" disabled>Stop</button>
                <span id="time-display">00min 00sec</span>
            </div>

            <div>
                <label>Difficulty:</label>
                <div id="stars" class="stars">
                <span data-star="1">☆</span>
                <span data-star="2">☆</span>
                <span data-star="3">☆</span>
                <span data-star="4">☆</span>
                <span data-star="5">☆</span>
                </div>
            </div>

            <div>
                <label>Notes:</label>
                <textarea id="notes" rows="3"></textarea>
            </div>

            <div id="save-status" class="save-status"></div>

            <button id="commit-attempt">
                Save as completed attempt
            </button>
            </div>

            <button id="solution-toggle">Show solution</button>
            <div class="solution" id="solution-container" style="display:none;">
            <p class="placeholder" style="display:none">
                Solution not available yet.
            </p>
            </div>
        </div>

        <!-- RIGHT: sidebar -->
        <aside class="question-sidebar">
            <h3>Previous completions</h3>
            <ul id="past-notes-list"></ul>
        </aside>
        </div>
    `;
 

    // Loads solutions
    const solutionContainer = document.getElementById("solution-container");
    const placeHolder = solutionContainer.querySelector(".placeholder");

    let i = 1;
    let foundAny = false;

    while (true) {
        const solutionImagePath = `images/solutions/${q.year}/S${q.paper}/Q${q.question}-${i}.png`;
        try {
            // Attempts to fetch the requested image
            const fetched = await fetch(solutionImagePath, { method: "HEAD" });

            if (!fetched.ok) break;

            // Image element to be displayed
            const image = document.createElement("img");
            image.src = solutionImagePath;
            image.alt = `Solution ${questionID} (${i})`;

            solutionContainer.appendChild(image);
            foundAny = true;
            i++;
        } catch {
            break;
        }
    }

    if (!foundAny) {
        placeHolder.style.display = "block";
    }

    // Solution Toggle
    const solutionToggle = document.getElementById("solution-toggle");
    const solution = solutionContainer;

    solutionToggle.onclick = () => {
        solution.style.display =
        solution.style.display === "none" ? "block" : "none";
    };

    
    // Progress Saver
    const statusEl = document.getElementById("status");
    const notesEl = document.getElementById("notes");
    const starsEl = document.getElementById("stars");
    const saveStatus = document.getElementById("save-status");
    let difficulty = 0;

    function updateStarsUI() {
        starsEl.querySelectorAll("span").forEach(span => {
            const n = Number(span.dataset.star);
            span.textContent = (n <= difficulty) ? "★" : "☆";
            span.classList.toggle("active", n <= difficulty);
        })
    }

    starsEl.addEventListener("click", (event) => {
        if (!event.target.dataset.star || statusEl.disabled) return;

        const n = Number(event.target.dataset.star);
        difficulty = (difficulty === n) ? 0 : n;

        updateStarsUI();
        updateCommitButton();
        saveLocalDraft(questionID);
    })

    function updateCommitButton() {
        const commitButton = document.getElementById("commit-attempt");
        const valid = (statusEl.value === "completed" && difficulty > 0);
        commitButton.disabled = !valid;
    }

    statusEl.addEventListener("change", updateCommitButton);
    updateCommitButton();

    function disableInputs(disabled) {
        statusEl.disabled = disabled;
        notesEl.disabled = disabled;
    }

    statusEl.addEventListener("input", () => saveLocalDraft(questionID));
    statusEl.addEventListener("change", () => saveLocalDraft(questionID));
    notesEl.addEventListener("input", () => saveLocalDraft(questionID));
    notesEl.addEventListener("change", () => saveLocalDraft(questionID));

    auth.onAuthStateChanged(user => {
        disableInputs(!user);
    });

    // Timer
    let timerInterval = null;
    let elapsedSeconds = 0;

    const startButton = document.getElementById("start-timer");
    const stopButton = document.getElementById("stop-timer");
    const timeDisplay = document.getElementById("time-display");

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, "0")}min ${String(s).padStart(2, "0")}sec`;
    }

    startButton.addEventListener("click", () => {
        if (timerInterval) return;

        startButton.disabled = true;
        stopButton.disabled = false;

        timerInterval = setInterval(() => {
            elapsedSeconds++;
            timeDisplay.textContent = formatTime(elapsedSeconds);
            saveLocalDraft(questionID);
        }, 1000);
    });

    stopButton.addEventListener("click", () => {
        clearInterval(timerInterval);
        timerInterval = null;

        startButton.disabled = false;
        stopButton.disabled = true;
    });



    // Local saving
    function localDraftKey(qid) {
        return `draft:${qid}`;
    }

    function saveLocalDraft(questionID) {
        localStorage.setItem(
            localDraftKey(questionID),
            JSON.stringify({
                status: statusEl.value,
                time: elapsedSeconds,
                difficulty: difficulty,
                notes: notesEl.value
            })
        );
    }

    // Loads locally saved draft data
    function loadLocalDraft(questionID) {
        const raw = localStorage.getItem(localDraftKey(questionID));
        // If there is no local saved data
        if (!raw) {
            statusEl.value = "not-started";
            difficulty = 0;
            elapsedSeconds = 0;
            timeDisplay.textContent = formatTime(0);
            notesEl.value = "";
            updateStarsUI();
            updateCommitButton();
            return;
        }

        const d = JSON.parse(raw);
        statusEl.value = d.status ?? "not-started";
        difficulty = d.difficulty ?? 0;
        notesEl.value = d.notes ?? "";
        elapsedSeconds = d.time ?? 0;
        timeDisplay.textContent = formatTime(elapsedSeconds);
        updateStarsUI();
    }



    // Uploads completions to cloud
    async function commitCompletedAttempt(questionID) {
        const user = auth.currentUser;
        if (!user) {
            notify({
                title: "Not signed in",
                message: "Sign in to save completed attempts to the cloud",
                type: "warning"
            });
            return;
        }

        // If timer is active, pause it automatically
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            startButton.disabled = false;
            stopButton.disabled = true;
        }

        const note = notesEl.value.trim();
        const attempt = {
            createdAt: serverTimestamp(),
            status: statusEl.value,   // must be "completed" to go through
            time: elapsedSeconds,
            difficulty: difficulty,
            questionID: questionID,
            notes: note,
            userID: user.uid
        }

        // Uploads data to cloud Firebase server
        await addDoc(
            collection(db, "users", user.uid, "questions", questionID, "attempts"),
            attempt
        );

        notify({
            message: "Attempt saved.",
            type: "success",
            timeout: 2000
        });

        // Deletes local draft data, and reloads the elements
        localStorage.removeItem(localDraftKey(questionID));
        loadLocalDraft(questionID);

        // Adds new thing to side
        await loadCompletedAttempts(questionID);
    }

    // Downloads data from cloud
    async function loadCompletedAttempts(questionID) {
        const user = auth.currentUser;
        if (!user) {
            saveStatus.textContent = "Log in to track progress";
            disableInputs(true);
            return;
        }

        const q = query(
            collection(db, "users", user.uid, "questions", questionID, "attempts"),
            where("status", "==", "completed"),
            orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);

        const list = document.getElementById("past-notes-list");
        list.innerHTML = "";

        if (snap.empty) {
            list.innerHTML = "<li>No completed attempts yet</li>";
            return;
        }

        snap.docs.forEach(doc => {
            // Should be returning an html element
            const attemptCard = createAttemptCard(doc);
            list.appendChild(attemptCard);
        });
    }

    // Load it at start
    loadLocalDraft(questionID);
    document.getElementById("commit-attempt").onclick = () => commitCompletedAttempt(questionID);
    loadCompletedAttempts(questionID);
}