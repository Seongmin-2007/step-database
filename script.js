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

function selectQuestion(q, li) {
  document
    .querySelectorAll("#questionList li")
    .forEach(x => x.classList.remove("active"));

  li.classList.add("active");

  const id = makeId(q);

  const qImg =
    `images/questions/${q.year}/step${q.paper}/q${q.question}.png`;
  const sImg =
    `images/solutions/${q.year}/step${q.paper}/q${q.question}.png`;

  viewer.innerHTML = `
    <h2>${id}</h2>

    <img src="${qImg}" alt="Question ${id}">

    <button id="toggle">Show solution</button>

    <div class="solution" style="display:none;">
      <img src="${sImg}" alt="Solution ${id}">
      <p class="placeholder" style="display:none;">
        Solution not available yet.
      </p>
    </div>
  `;

  const toggle = document.getElementById("toggle");
  const sol = viewer.querySelector(".solution");
  const solImg = sol.querySelector("img");
  const fallback = sol.querySelector(".placeholder");

  solImg.onerror = () => {
    solImg.style.display = "none";
    fallback.style.display = "block";
  };

  toggle.onclick = () => {
    sol.style.display =
      sol.style.display === "none" ? "block" : "none";
  };
}
