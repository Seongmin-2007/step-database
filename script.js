console.log("SCRIPT LOADED");

import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "./firebase.js";

const loginBtn = document.getElementById("login-btn");
const userMenu = document.getElementById("user-menu");
const avatarBtn = document.getElementById("user-avatar");
const dropdown = document.getElementById("dropdown");
const logoutBtn = document.getElementById("logout-btn");
const profileBtn = document.getElementById("profile-btn");

// --- Auth state handling ---
onAuthStateChanged(auth, user => {
  if (user) {
    loginBtn.classList.add("hidden");
    userMenu.classList.remove("hidden");
  } else {
    loginBtn.classList.remove("hidden");
    userMenu.classList.add("hidden");
    dropdown.classList.add("hidden");
  }
});

avatarBtn.onclick = () => {
  dropdown.classList.toggle("hidden");
};

document.addEventListener("click", e => {
  if (!e.target.closest(".user-menu")) {
    dropdown.classList.add("hidden");
  }
});

logoutBtn.onclick = async () => {
  await signOut(auth);
};

loginBtn.onclick = () => {
  window.location.href = "/login.html";
};

loginBtn.onclick = () => {
  document.getElementById("auth").scrollIntoView({ behavior: "smooth" });
};

profileBtn.onclick = () => {
  alert("Profile page coming soon!");
};


// const emailInput = document.getElementById("email");
// const passwordInput = document.getElementById("password");
// const statusText = document.getElementById("auth-status");

// document.getElementById("signup").onclick = async () => {
//   try {
//     await createUserWithEmailAndPassword(
//       auth,
//       emailInput.value,
//       passwordInput.value
//     );
//     statusText.textContent = "Signed up!";
//   } catch (e) {
//     statusText.textContent = e.message;
//   }
// };

// document.getElementById("login").onclick = async () => {
//   try {
//     await signInWithEmailAndPassword(
//       auth,
//       emailInput.value,
//       passwordInput.value
//     );
//     statusText.textContent = "Logged in!";
//   } catch (e) {
//     statusText.textContent = e.message;
//   }
// };

// document.getElementById("logout").onclick = async () => {
//   await signOut(auth);
// };

// onAuthStateChanged(auth, user => {
//   if (user) {
//     document.getElementById("logout").style.display = "inline";
//     statusText.textContent = `Logged in as ${user.email}`;
//   } else {
//     document.getElementById("logout").style.display = "none";
//     statusText.textContent = "Not logged in";
//   }
// });

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

  viewer.innerHTML = `
    <h2>${id}</h2>

    <img src="${qImg}" alt="Question ${id}">

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