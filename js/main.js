// Shows build date in bottom right corner
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


import { loadQuestion } from "./viewer.js";

const profileBtn = document.getElementById("profile-btn");
const dashboardBtn = document.getElementById("open-dashboard");
const dropdown = document.getElementById("profile-dropdown");

// Profile dropdown
profileBtn.onclick = () => {
    dropdown.classList.toggle("hidden");
};

document.addEventListener("click", e => {
    if (!e.target.closest("#user-menu")) {
        dropdown.classList.add("hidden");
    }
});

// Opens dashboard
// dashboardBtn.onclick = () => {
//     window.location.href = "dashboard.html";
// };



let questions = [];
let questionTags = {};  // <-- store tags
let FILTER = "";

const listEl = document.getElementById("questionList");
const search = document.getElementById("search");

// Load questions + tags
Promise.all([
    fetch("questions.json").then(r => r.json()),
    fetch("question_tags.json").then(r => r.json())
]).then(([questionsData, tagsData]) => {
    questions = questionsData;
    questionTags = tagsData;
    renderList();
});

// Event listeners
search.addEventListener("input", e => {
    const value = e.target.value.toLowerCase();
    FILTER = value;
    renderList();
});


// Helper to make ID
function makeId({ year, paper, question }) {
    return `${String(year % 100).padStart(2, "0")}-S${paper}-Q${question}`;
}

// Render question sidebar list
function renderList() {
  listEl.innerHTML = "";

  const filter = FILTER.toLowerCase(); // normalize input

  questions
    .filter(q => {
        const qId = makeId(q).toLowerCase();

        const qPath = `images/questions/${q.year}/S${q.paper}/Q${q.question}.png`;
        const tags = (questionTags[qPath] || []).map(t => t.toLowerCase()); // lowercase for search

        // Search matches question ID OR any tag
        return qId.includes(filter) || tags.some(t => t.includes(filter));
    })
    .forEach(q => {
        const li = document.createElement("li");
        li.textContent = makeId(q);

        // display tags below question
        const qPath = `images/questions/${q.year}/S${q.paper}/Q${q.question}.png`;
        const tags = questionTags[qPath] || [];

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

        li.onclick = () => loadQuestion(q, tags, li);
        listEl.appendChild(li);
    });
}