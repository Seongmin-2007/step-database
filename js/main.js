/**
 * @file main.js
 * @description Application entry point. Responsibilities:
 *   - Load question/tag data
 *   - Render and filter the question sidebar
 *   - Handle theme toggle
 *   - Handle profile dropdown
 *   - Route between main view and dashboard
 *   - Show build info
 *
 * Auth and splash are side-effect imports that self-initialise.
 */

import "./ui/auth.js";
import "./ui/splash.js";

import { on }                           from "./core/eventBus.js";
import { loadQuestionData, getTagsFor, setFilteredQuestions, getFilteredQuestions } from "./core/questionStore.js";
import { makeQuestionID }               from "./core/utils.js";
import { BUILD_JSON }                   from "./core/constants.js";
import { loadQuestion }                 from "./viewer/index.js";
import { loadDashboard }                from "./dashboard/index.js";
import { initImageZoom }                from "./ui/imageZoom.js";
import { initExamLauncher }             from "./exam.js";

// ─── Build info ───────────────────────────────────────────────────────────────

fetch(BUILD_JSON, { cache: "no-store" })
  .then(r => r.json())
  .then(b => {
    const tag = document.createElement("div");
    tag.textContent = `Deployed ${b.commit.slice(0, 7)} @ ${b.time}`;
    Object.assign(tag.style, {
      position: "fixed", bottom: "6px", right: "8px",
      fontSize: "11px", opacity: "0.6", zIndex: "9999"
    });
    document.body.appendChild(tag);
  })
  .catch(() => { /* build.json missing in dev — silently ignore */ });

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const listEl          = document.getElementById("questionList");
const searchEl        = document.getElementById("search");
const themeToggleBtn  = document.getElementById("theme-toggle");
const profileBtn      = document.getElementById("profile-btn");
const dropdown        = document.getElementById("profile-dropdown");
const dashboardBtn    = document.getElementById("open-dashboard");
const mainScreen      = document.getElementById("main-screen");
const dashboardScreen = document.getElementById("dashboard-screen");

// ─── Theme ────────────────────────────────────────────────────────────────────

const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.body.classList.add("dark-mode");
  themeToggleBtn.textContent = "🌙";
} else {
  themeToggleBtn.textContent = "🌞";
}

themeToggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeToggleBtn.textContent = isDark ? "🌙" : "🌞";
});

// ─── Profile dropdown ─────────────────────────────────────────────────────────

profileBtn.addEventListener("click", () => dropdown.classList.toggle("hidden"));

document.addEventListener("click", e => {
  if (!e.target.closest("#user-menu")) dropdown.classList.add("hidden");
});

// ─── Dashboard routing ────────────────────────────────────────────────────────

dashboardBtn.addEventListener("click", () => {
  mainScreen.classList.add("hidden");
  dashboardScreen.classList.remove("hidden");
  loadDashboard(allQuestions);
});

document.getElementById("close-dashboard").addEventListener("click", () => {
  dashboardScreen.classList.add("hidden");
  mainScreen.classList.remove("hidden");
});

// ─── Question list ────────────────────────────────────────────────────────────

let allQuestions = [];
let filter       = "";

// Load data then render
loadQuestionData().then(({ questions }) => {
  allQuestions = questions;
  renderList();
});

// Search input
searchEl.addEventListener("input", e => {
  filter = e.target.value.toLowerCase();
  renderList();
});

// Tag filter events from viewer
on("filter:apply", tag => {
  searchEl.value = filter = tag.toLowerCase();
  renderList();

  // Auto-load first result
  const first = getFilteredQuestions()[0];
  if (first) loadQuestion(first.data, first.tags, first.li);
});

/**
 * Re-render the sidebar question list based on the current filter.
 */
function renderList() {
  listEl.innerHTML = "";

  const filtered = allQuestions
    .filter(q => {
      const id   = makeQuestionID(q).toLowerCase();
      const tags = getTagsFor(q.year, q.paper, q.question).map(t => t.toLowerCase());
      return id.includes(filter) || tags.some(t => t.includes(filter));
    })
    .map(q => {
      const id   = makeQuestionID(q);
      const tags = getTagsFor(q.year, q.paper, q.question);
      const li   = _buildQuestionListItem(q, id, tags);
      listEl.appendChild(li);
      return { id, data: q, tags, li };
    });

  setFilteredQuestions(filtered);
}

/**
 * Build a single `<li>` for the question sidebar.
 * @private
 */
function _buildQuestionListItem(q, id, tags) {
  const li = document.createElement("li");
  li.textContent = id;

  if (tags.length) {
    const tagContainer = document.createElement("div");
    tagContainer.className = "tag-container";

    tags.forEach(tag => {
      const chip = document.createElement("span");
      chip.className   = "tag-chip";
      chip.textContent = tag;
      chip.addEventListener("click", e => {
        e.stopPropagation();
        searchEl.value = filter = tag.toLowerCase();
        renderList();
      });
      tagContainer.appendChild(chip);
    });

    li.appendChild(tagContainer);
  }

  li.addEventListener("click", () => loadQuestion(q, tags, li));
  return li;
}

// Initialises Image Zoom
initImageZoom();

// Initialises Mock Exam launcher
initExamLauncher(allQuestions);