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
  console.log("1");

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
    console.log("2");
    placeholder.style.display = "block";
  }

  // Toggle visibility
  toggle.onclick = () => {
    console.log("3");
    solutionContainer.style.display =
      solutionContainer.style.display === "none" ? "block" : "none";
  };
}