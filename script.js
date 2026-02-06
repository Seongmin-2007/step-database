console.log("SCRIPT LOADED 112345");

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  auth,
  createUserWithEmailAndPassword,
  db,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "./firebase.js";

// Buttons
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const authButtons = document.getElementById("auth-buttons");
const userMenu = document.getElementById("user-menu");

// Modals
const loginModal = document.getElementById("login-modal");
const signupModal = document.getElementById("signup-modal");

// Inputs
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const signupEmail = document.getElementById("signup-email");
const signupPassword = document.getElementById("signup-password");

// Profile
const profileBtn = document.getElementById("profile-btn");
const dropdown = document.getElementById("profile-dropdown");
const logoutBtn = document.getElementById("logout-btn");

// --- Modal open / close ---
loginBtn.onclick = () => loginModal.classList.remove("hidden");
signupBtn.onclick = () => signupModal.classList.remove("hidden");

document.querySelectorAll(".close-modal").forEach(btn => {
  btn.onclick = () => {
    loginModal.classList.add("hidden");
    signupModal.classList.add("hidden");
  };
});

// --- Signup ---
document.getElementById("signup-submit").onclick = async () => {
  try {
    await createUserWithEmailAndPassword(
      auth,
      signupEmail.value,
      signupPassword.value
    );
    signupModal.classList.add("hidden");
  } catch (e) {
    alert(e.message);
  }
};

// --- Login ---
document.getElementById("login-submit").onclick = async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      loginEmail.value,
      loginPassword.value
    );
    loginModal.classList.add("hidden");
  } catch (e) {
    alert(e.message);
  }
};

// --- Auth state UI ---
onAuthStateChanged(auth, user => {
  if (user) {
    authButtons.classList.add("hidden");
    userMenu.classList.remove("hidden");
    loginModal.classList.add("hidden");
    signupModal.classList.add("hidden");
  } else {
    authButtons.classList.remove("hidden");
    userMenu.classList.add("hidden");
    dropdown.classList.add("hidden");
  }
});

// --- Profile dropdown ---
profileBtn.onclick = () => {
  dropdown.classList.toggle("hidden");
};

logoutBtn.onclick = async () => {
  await signOut(auth);
};

document.addEventListener("click", e => {
  if (!e.target.closest("#user-menu")) {
    dropdown.classList.add("hidden");
  }
});



let QUESTIONS = [];
let FILTER = "";

const listEl = document.getElementById("questionList");
const viewer = document.getElementById("viewer");
const search = document.getElementById("search");

fetch("questions.json")
  .then(r => r.json())
  .then(data => {
    QUESTIONS = data;
    renderList();
  });

search.addEventListener("input", e => {
  FILTER = e.target.value.toLowerCase();
  renderList();
});

function makeId({ year, paper, question }) {
  return `${String(year % 100).padStart(2, "0")}-S${paper}-Q${question}`;
}

function renderList() {
  listEl.innerHTML = "";

  QUESTIONS
    .filter(q => makeId(q).toLowerCase().includes(FILTER))
    .forEach(q => {
      const li = document.createElement("li");
      li.textContent = makeId(q);

      li.onclick = () => selectQuestion(q, li);
      listEl.appendChild(li);
    });
}

// ==============================
// QUESTION SELECTION
// ==============================
export async function selectQuestion(q, li) {
  // Highlight selected question
  document
    .querySelectorAll("#questionList li")
    .forEach(x => x.classList.remove("active"));

  li.classList.add("active");

  const questionId = `${q.year}-step${q.paper}-q${q.question}`;
  const qImg = `images/questions/${q.year}/step${q.paper}/q${q.question}.png`;

  // ------------------------------
  // Render question + progress UI
  // ------------------------------
  viewer.innerHTML = `
    <h2>${questionId}</h2>

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
    </div>

    <button id="toggle">Show solution</button>
    <div class="solution" style="display:none;"></div>
  `;

  // ==============================
  // PROGRESS LOGIC
  // ==============================
  const statusEl = document.getElementById("status");
  const timeEl = document.getElementById("time");
  const notesEl = document.getElementById("notes");
  const starsEl = document.getElementById("stars");
  const saveStatus = document.getElementById("save-status");

  let difficulty = 0;
  let saveTimeout = null;

  // ----- Load existing progress -----
  async function loadProgress() {
    const user = auth.currentUser;
    if (!user) {
      saveStatus.textContent = "Log in to track progress";
      disableInputs(true);
      return;
    }

    disableInputs(false);

    const ref = doc(db, "users", user.uid, "progress", questionId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const data = snap.data();
    statusEl.value = data.status ?? "not_started";
    timeEl.value = data.timeMinutes ?? "";
    notesEl.value = data.notes ?? "";
    difficulty = data.difficulty ?? 0;
    updateStars();
  }

  let currentDifficulty = 0;
  async function saveProgress() {
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, "users", user.uid, "progress", questionId);

    try {
      await setDoc(ref, {
        questionId,
        status: statusEl.value,
        timeMinutes: timeEl.value ? Number(timeEl.value) : null,
        difficulty: currentDifficulty || null,
        notes: notesEl.value || "",
        updatedAt: serverTimestamp(),
      }, { merge: true });

      saveStatus.textContent = "Saved ✓";
    } catch (err) {
      console.error("SAVE FAILED:", err);
      saveStatus.textContent = "Save failed ❌";
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveProgress, 500);
  }

  // ----- Difficulty stars -----
  function updateStars() {
    starsEl.querySelectorAll("span").forEach(span => {
      const n = Number(span.dataset.star);
      span.textContent = n <= difficulty ? "★" : "☆";
      span.classList.toggle("active", n <= difficulty);
    });
  }

  starsEl.onclick = e => {
    if (!e.target.dataset.star) return;
    const n = Number(e.target.dataset.star);
    difficulty = (difficulty === n) ? 0 : n;
    updateStars();
    saveProgress();
  };

  // ----- Input wiring -----
  statusEl.onchange = saveProgress;
  timeEl.oninput = scheduleSave;
  notesEl.oninput = scheduleSave;

  function disableInputs(disabled) {
    [statusEl, timeEl, notesEl].forEach(el => el.disabled = disabled);
  }

  loadProgress();

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