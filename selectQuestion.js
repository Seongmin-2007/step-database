import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


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

          <div>
            <label>Time (min):</label>
            <input id="time" type="number" min="0" placeholder="optional">
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
  // PROGRESS LOGIC
  // ==============================
  const statusEl = document.getElementById("status");
  const timeEl = document.getElementById("time");
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


  // Local saving
  function localDraftKey(qid) {
    return `draft:${qid}`;
  }

  function saveLocalDraft(questionId) {
    localStorage.setItem(
      localDraftKey(questionId),
      JSON.stringify({
        status: statusEl.value,
        time: timeEl.value,
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
      timeEl.value = "";
      notesEl.value = "";
      updateStarsUI();
      return;
    }

    const d = JSON.parse(raw);
    statusEl.value = d.status ?? "not_started";
    difficulty = d.difficulty ?? 0;
    notesEl.value = d.notes ?? "";
    updateStarsUI();
  }

  ["input", "change"].forEach(evt => {
    statusEl.addEventListener(evt, () => saveLocalDraft(questionId));
    notesEl.addEventListener(evt, () => saveLocalDraft(questionId));
    timeEl.addEventListener(evt, () => saveLocalDraft(questionId));
  });

  starsEl.onclick = e => {
    if (!e.target.dataset.star || statusEl.disabled) return;

    const n = Number(e.target.dataset.star);
    difficulty = (difficulty === n) ? 0 : n;
    updateStarsUI();
    saveLocalDraft(questionId);
  };

  loadLocalDraft(questionId);


  // Cloud upload
  async function commitCompletedAttempt(questionId) {
    const user = auth.currentUser;
    if (!user) return;

    const note = notesEl.value.trim();
    const attempt = {
      createdAt: serverTimestamp(),
      date: (new Date()).toISOString().slice(0, 10),
      status: statusEl.value,           // usually "completed"
      time: timeEl.value,
      difficulty: difficulty,
      notes: note
    };

    await addDoc(
      collection(db, "users", user.uid, "questions", questionId, "attempts"),
      attempt
    );

    // Clear local draft
    localStorage.removeItem(localDraftKey(questionId));

    // Resets the elements
    loadLocalDraft(questionId);

    // Refresh sidebar
    await loadCompletedAttempts(user.uid, questionId);
  }

  document.getElementById("commitAttempt").onclick = () => commitCompletedAttempt(questionId);


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
          <div class="past-meta">
            Date: ${a.date}
            Time taken: ${a.time + " mins" ?? "N/A"}
            Difficulty: ${"★".repeat(a.difficulty ?? 0)}
            Notes: ${a.notes ?? "None"}
          </div>
          <div class="past-notes">
            ${a.notes}
          </div>
        </div>
      `;
      list.appendChild(li);
    });
  }

  loadCompletedAttempts(questionId);

  function disableInputs(disabled) {
    [statusEl, timeEl, notesEl].forEach(el => el.disabled = disabled);
  }

  function updateCommitButton() {
    document.getElementById("commitAttempt").disabled = statusEl.value !== "completed";
  }

  statusEl.addEventListener("change", updateCommitButton);
  updateCommitButton();

  // ==============================
  // SOLUTION TOGGLE
  // ==============================
  const toggle = document.getElementById("toggle");
  const solution = viewer.querySelector(".solution");

  toggle.onclick = () => {
    solution.style.display =
      solution.style.display === "none" ? "block" : "none";
  };
}
