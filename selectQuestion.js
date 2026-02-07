import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { notify } from "./notification.js";

import {
  auth,
  db
} from "./firebase.js";

// ==============================
// QUESTION SELECTION
// ==============================
export async function selectQuestion(q, li, questionTags) {
  // Highlight selected question
  document
    .querySelectorAll("#questionList li")
    .forEach(x => x.classList.remove("active"));

  li.classList.add("active");

  const questionId = `${q.year}-step${q.paper}-q${q.question}`;
  const qImg = `images/questions/${q.year}/step${q.paper}/q${q.question}.png`;
  const tags = questionTags[qImg] || [];
  
  // ------------------------------
  // Render question + progress UI
  // ------------------------------
  viewer.innerHTML = `
    <h2>${questionId}</h2>
    <div style="margin-top:10px; font-size:0.9em; color:#555;">
      <strong>Tags:</strong> ${tags.length ? tags.join(", ") : "No tags available"}
    </div>

    <div class="question-layout">
      <!-- LEFT: main content -->
      <div class="question-main">
        <img src="${qImg}" alt="Question ${questionId}">

        <div class="progress-panel">
          <div>
            <label>Status:</label>
            <select id="status">
              <option value="not_started">Not started</option>
              <option value="attempted">Attempted</option>
              <option value="completed">Completed</option>
              <option value="revision">Needs revision</option>
            </select>
          </div>

          <div class="time-control">
            <button id="startTimer">Start</button>
            <button id="stopTimer" disabled>Stop</button>
            <span id="timeDisplay">00min 00sec</span>
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

          <button id="commitAttempt">
            Save as completed attempt
          </button>
        </div>

        <button id="toggle">Show solution</button>
        <div class="solution" id="solution-container" style="display:none;">
          <p class="placeholder" style="display:none">
            Solution not available yet.
          </p>
        </div>
      </div>

      <!-- RIGHT: sidebar -->
      <aside class="question-sidebar">
        <h3>Previous completions</h3>
        <ul id="pastNotesList"></ul>
      </aside>
    </div>
  `;

  const solutionContainer = document.getElementById("solution-container");
  const placeholder = solutionContainer.querySelector(".placeholder");

  // Load all solution images automatically
  let i = 1;
  let foundAny = false;
  while (true) {
    const imgPath =
      `images/solutions/${q.year}/step${q.paper}/q${q.question}-${i}.jpg`;
    try {
      const res = await fetch(imgPath, { method: "HEAD" });

      if (!res.ok) break;

      const img = document.createElement("img");
      img.src = imgPath;
      img.alt = `Solution ${questionId} (${i})`;

      solutionContainer.appendChild(img);
      foundAny = true;
      i++;
    } catch {
      break;
    }
  }

  if (!foundAny) {
    placeholder.style.display = "block";
  }

  // ==============================
  // SOLUTION TOGGLE
  // ==============================
  const toggle = document.getElementById("toggle");
  const solution = viewer.querySelector(".solution");

  toggle.onclick = () => {
    solution.style.display =
      solution.style.display === "none" ? "block" : "none";
  };

  // ==============================
  // PROGRESS LOGIC
  // ==============================
  const statusEl = document.getElementById("status");
  const notesEl = document.getElementById("notes");
  const starsEl = document.getElementById("stars");
  const saveStatus = document.getElementById("save-status");
  let difficulty = 0;

  // ----- Difficulty stars -----
  function updateStarsUI() {
    starsEl.querySelectorAll("span").forEach(span => {
      const n = Number(span.dataset.star);
      span.textContent = n <= difficulty ? "★" : "☆";
      span.classList.toggle("active", n <= difficulty);
    });
  }

  function disableInputs(disabled) {
    [statusEl, notesEl].forEach(el => el.disabled = disabled);
  }

  function updateCommitButton() {
    const btn = document.getElementById("commitAttempt");

    const valid = statusEl.value === "completed" && difficulty > 0;
    btn.disabled = !valid;
  }

  statusEl.addEventListener("change", updateCommitButton);
  notesEl.addEventListener("input", updateCommitButton);
  updateCommitButton(); // run once on load



  ["input", "change"].forEach(evt => {
    statusEl.addEventListener(evt, () => saveLocalDraft(questionId));
    notesEl.addEventListener(evt, () => saveLocalDraft(questionId));
  });

  starsEl.onclick = e => {
    if (!e.target.dataset.star || statusEl.disabled) return;

    const n = Number(e.target.dataset.star);
    difficulty = (difficulty === n) ? 0 : n;
    updateStarsUI();
    updateCommitButton();
    saveLocalDraft(questionId);
  };
  
  
  // Timer
  let timerInterval = null;
  let elapsedSeconds = 0;

  const startBtn = document.getElementById("startTimer");
  const stopBtn = document.getElementById("stopTimer");
  const timeDisplay = document.getElementById("timeDisplay");

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}min ${String(s).padStart(2, "0")}sec`;
  }

  startBtn.addEventListener("click", () => {
    if (timerInterval) return;

    startBtn.disabled = true;
    stopBtn.disabled = false;

    timerInterval = setInterval(() => {
      elapsedSeconds++;
      timeDisplay.textContent = formatTime(elapsedSeconds);
      saveLocalDraft(questionId);
    }, 1000);
  });

  stopBtn.addEventListener("click", () => {
    clearInterval(timerInterval);
    timerInterval = null;

    startBtn.disabled = false;
    stopBtn.disabled = true;
  });




  // Local saving
  function localDraftKey(qid) {
    return `draft:${qid}`;
  }

  function saveLocalDraft(questionId) {
    localStorage.setItem(
      localDraftKey(questionId),
      JSON.stringify({
        status: statusEl.value,
        time: elapsedSeconds,
        difficulty: difficulty,
        notes: notesEl.value
      })
    );
  }

  function loadLocalDraft(questionId) {
    const raw = localStorage.getItem(localDraftKey(questionId));
    if (!raw) {
      statusEl.value = "not_started";
      difficulty = 0;
      elapsedSeconds = 0;
      timeDisplay.textContent = formatTime(0);
      notesEl.value = "";
      updateStarsUI();
      updateCommitButton();
      return;
    }

    const d = JSON.parse(raw);
    statusEl.value = d.status ?? "not_started";
    difficulty = d.difficulty ?? 0;
    notesEl.value = d.notes ?? "";
    elapsedSeconds = d.time ?? 0;
    timeDisplay.textContent = formatTime(elapsedSeconds);
    updateStarsUI();
  }
  

  // Cloud upload
  async function commitCompletedAttempt(questionId) {
    const user = auth.currentUser;
    if (!user) {
      notify({
        title: "Not signed in",
        message: "Sign in to save completed attempts to the cloud.",
        type: "warning"
      });
      return;
    }

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }

    const note = notesEl.value.trim();
    const attempt = {
      createdAt: serverTimestamp(),
      date: (new Date()).toISOString().slice(0, 10),
      status: statusEl.value,           // usually "completed"
      time: elapsedSeconds,
      difficulty: difficulty,
      notes: note,
      userID: user.uid
    };

    await addDoc(
      collection(db, "users", user.uid, "questions", questionId, "attempts"),
      attempt
    );

    notify({
      message: "Attempt saved.",
      type: "success",
      timeout: 2000
    });

    // Clear local draft
    localStorage.removeItem(localDraftKey(questionId));

    // Resets the elements
    loadLocalDraft(questionId);

    // Refresh sidebar
    await loadCompletedAttempts(questionId);
  }


  // Cloud download
  async function loadCompletedAttempts(questionId) {
    const user = auth.currentUser;
    if(!user) {
      saveStatus.textContent = "Log in to track progress";
      disableInputs(true);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "questions", questionId, "attempts"),
      where("status", "==", "completed"),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    const list = document.getElementById("pastNotesList");
    list.innerHTML = "";

    if (snap.empty) {
      console.log(":(");
      list.innerHTML = "<li>No completed attempts yet</li>";
      return;
    }

    snap.docs.forEach(doc => {
      const a = doc.data();

      const li = document.createElement("li");
      li.innerHTML = `
        <div class="past-attempt">
          <div class="delete-attempt" title="Delete">×</div>
          
          <div class="past-meta">
            Date: ${a.date}<br>
            Time taken: ${a.time == 0 ? "N/A" : formatTime(a.time)}<br>
            Difficulty: ${"★".repeat(a.difficulty ?? 0)}<br>
            Notes:
          </div>
          <div class="past-notes">
            ${a.notes}
          </div>
        </div>
      `;
      
      // Delete button
      const deleteBtn = li.querySelector(".delete-attempt");
      let armed = false;
      let armTimeout = null;
      
      deleteBtn.addEventListener("click", async () => {
        if (!armed) {
          armed = true;
          deleteBtn.classList.add("confirm");
          deleteBtn.textContent = "×"; // keep symbol clean

          // auto-cancel if user hesitates
          armTimeout = setTimeout(() => {
            armed = false;
            deleteBtn.classList.remove("confirm");
          }, 2000);

          return;
        }

        clearTimeout(armTimeout);

        try {
          await deleteDoc(doc.ref);

          // Remove from UI
          li.remove();
        } catch (err) {
          console.error("Failed to delete attempt:", err);
          deleteBtn.classList.remove("confirm");
          armed = false;
        }
      });

      list.appendChild(li);
    });
  }

  // Load it at start
  loadLocalDraft(questionId);
  document.getElementById("commitAttempt").onclick = () => commitCompletedAttempt(questionId);
  loadCompletedAttempts(questionId);
}
