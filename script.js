console.log("SCRIPT LOADED");

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db } from "./firebase.js";



import {
  auth,
  createUserWithEmailAndPassword,
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

async function selectQuestion(q, li) {
  // Highlight selected question
  document
    .querySelectorAll("#questionList li")
    .forEach(x => x.classList.remove("active"));

  li.classList.add("active");

  const id = makeId(q);

  const qImg =
    `images/questions/${q.year}/step${q.paper}/q${q.question}.png`;

  // viewer.innerHTML = `
  //   <h2>${id}</h2>

  //   <img src="${qImg}" alt="Question ${id}">

  //   <button id="toggle">Show solution</button>

  //   <div class="solution" id="solution-container" style="display:none;">
  //     <p class="placeholder" style="display:none;">
  //       Solution not available yet.
  //     </p>
  //   </div>
  // `;

  viewer.innerHTML = `
    <h2>${id}</h2>

    <img src="${qImg}" alt="Question ${id}">

    <!-- PROGRESS PANEL -->
    <div id="progress-panel" class="progress-panel">
      <div class="status-row">
        <label>Status:</label>
        <select id="status">
          <option value="not_started">Not started</option>
          <option value="attempted">Attempted</option>
          <option value="completed">Completed</option>
          <option value="revision">Needs revision</option>
        </select>
      </div>

      <div class="time-row">
        <label>Time (minutes):</label>
        <input id="time" type="number" min="0" placeholder="optional">
      </div>

      <div class="difficulty-row">
        <label>Difficulty:</label>
        <div id="stars" class="stars">
          ${[1,2,3,4,5].map(i => `<span data-star="${i}">☆</span>`).join("")}
        </div>
      </div>

      <div class="notes-row">
        <label>Notes:</label>
        <textarea id="notes" rows="3" placeholder="optional"></textarea>
      </div>

      <div id="save-status" class="save-status"></div>
    </div>

    <button id="toggle">Show solution</button>

    <div class="solution" id="solution-container" style="display:none;">
      <p class="placeholder" style="display:none;">
        Solution not available yet.
      </p>
    </div>
  `;

  const toggle = document.getElementById("toggle");
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
      img.alt = `Solution ${id} (${i})`;

      solutionContainer.appendChild(img);
      foundAny = true;
      i++;
    } catch {
      console.log("Error: " + i);
      break;
    }
  }

  if (!foundAny) {
    placeholder.style.display = "block";
  }

  // Toggle visibility
  toggle.onclick = () => {
    solutionContainer.style.display =
      solutionContainer.style.display === "none" ? "block" : "none";
  };
}