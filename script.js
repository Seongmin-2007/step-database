fetch("build.json", { cache: "no-store" })
  .then(r => r.json())
  .then(b => {
    const tag = document.createElement("div");
    tag.textContent = `Deployed ${b.commit.slice(0,7)} @ ${b.time}`;
    tag.style.cssText = `
      position:fixed;
      bottom:6px;
      right:8px;
      font-size:11px;
      opacity:0.6;
      z-index:9999;
    `;
    document.body.appendChild(tag);
  });


import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "./firebase.js";

import { selectQuestion } from "./selectQuestion.js";

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
let questionTags = {};  // <-- store tags
let FILTER = "";
let TAG_FILTER = "";

const listEl = document.getElementById("questionList");
const viewer = document.getElementById("viewer");
const search = document.getElementById("search");

// -----------------------
// Load questions + tags
// -----------------------
Promise.all([
  fetch("questions.json").then(r => r.json()),
  fetch("question_tags.json").then(r => r.json())
]).then(([questionsData, tagsData]) => {
  QUESTIONS = questionsData;
  questionTags = tagsData;
  renderList();
});

// -----------------------
// Event listeners
// -----------------------
search.addEventListener("input", e => {
  const value = e.target.value.toLowerCase();
  FILTER = value;
  renderList();
});


// -----------------------
// Helper to make ID
// -----------------------
function makeId({ year, paper, question }) {
  return `${String(year % 100).padStart(2, "0")}-S${paper}-Q${question}`;
}

// -----------------------
// Render question list
// -----------------------
function renderList() {
  listEl.innerHTML = "";

  const filter = FILTER.toLowerCase(); // normalize input

  QUESTIONS
    .filter(q => {
      const qId = makeId(q).toLowerCase();

      const qPath = `images/questions/${q.year}/step${q.paper}/q${q.question}.png`;
      const tags = (QUESTION_TAGS[qPath] || []).map(t => t.toLowerCase()); // lowercase for search

      // Search matches question ID OR any tag
      return qId.includes(filter) || tags.some(t => t.includes(filter));
    })
    .forEach(q => {
      const li = document.createElement("li");
      li.textContent = makeId(q);

      // display tags below question
      const qPath = `images/questions/${q.year}/step${q.paper}/q${q.question}.png`;
      const tags = QUESTION_TAGS[qPath] || [];

      if (tags.length) {
        const tagContainer = document.createElement("div");
        tagContainer.className = "tag-container";

        tags.forEach(tag => {
          const tagEl = document.createElement("span");
          tagEl.className = "tag-chip";
          tagEl.textContent = tag;

          // (optional) click to search by tag
          tagEl.onclick = e => {
            e.stopPropagation(); // don't trigger question click
            search.value = tag;
            FILTER = tag.toLowerCase();
            renderList();
          };

          tagContainer.appendChild(tagEl);
        });

        li.appendChild(tagContainer);
      }

      li.onclick = () => selectQuestion(q, li, questionTags);
      listEl.appendChild(li);
    });
}