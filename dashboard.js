import {
  collectionGroup,
  query,
  where,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db } from "./firebase.js";

/* ================================
   AUTH GUARD
================================ */
if (!sessionStorage.getItem("authorized")) {
  window.location.href = "index.html";
}
sessionStorage.removeItem("authorized");

/* ================================
   ENTRY POINT
================================ */
auth.onAuthStateChanged(user => {
  if (user) loadDashboard();
});

/* ================================
   LOAD DASHBOARD
================================ */
async function loadDashboard() {
  const user = auth.currentUser;
  if (!user) return;

  const q = query(
    collectionGroup(db, "attempts"),
    where("userID", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  const attempts = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  // ---- render everything ----
  renderStats(computeStats(attempts));
  renderPriorityList(computePriorityList(attempts));
  renderRecentList(computeRecentQuestions(attempts));
  renderHeatmap(attempts);
  renderTimeChart(attempts);
  renderDifficultyChart(attempts);
}

/* ================================
   STATS
================================ */
function computeStats(attempts) {
  const attempted = new Set();
  const completed = new Set();

  let totalTime = 0;
  let timeCount = 0;
  let totalDifficulty = 0;
  let diffCount = 0;

  attempts.forEach(a => {
    attempted.add(a.questionID);

    if (a.status === "completed") {
      completed.add(a.questionID);
    }

    if (typeof a.time === "number") {
      totalTime += a.time;
      timeCount++;
    }

    if (a.difficulty) {
      totalDifficulty += a.difficulty;
      diffCount++;
    }
  });

  return {
    attempted: attempted.size,
    completed: completed.size,
    avgTimeMin: timeCount
      ? Math.round(totalTime / timeCount / 60)
      : 0,
    avgDifficulty: diffCount
      ? (totalDifficulty / diffCount).toFixed(1)
      : "—"
  };
}

function renderStats(s) {
  document.getElementById("stat-attempted").innerHTML =
    `<h3>Attempted</h3><div class="value">${s.attempted}</div>`;

  document.getElementById("stat-completed").innerHTML =
    `<h3>Completed</h3><div class="value">${s.completed}</div>`;

  document.getElementById("stat-avg-time").innerHTML =
    `<h3>Average time</h3><div class="value">${s.avgTimeMin} min</div>`;

  document.getElementById("stat-avg-difficulty").innerHTML =
    `<h3>Average difficulty</h3><div class="value">${s.avgDifficulty}</div>`;
}

/* ================================
   PRIORITY LIST
================================ */
function computePriorityList(attempts) {
  const byQuestion = {};

  attempts.forEach(a => {
    byQuestion[a.questionID] ??= [];
    byQuestion[a.questionID].push(a);
  });

  const list = [];

  for (const qid in byQuestion) {
    const attemptsForQ = byQuestion[qid].sort(
      (a, b) => b.createdAt.seconds - a.createdAt.seconds
    );

    const latest = attemptsForQ[0];
    let score = 0;

    if (latest.difficulty >= 4) score += 2;
    if (latest.time > 20 * 60) score += 1;
    if (latest.status !== "completed") score += 1;

    if (score > 0) {
      list.push({ questionID: qid, score });
    }
  }

  return list.sort((a, b) => b.score - a.score);
}

function renderPriorityList(list) {
  const ul = document.getElementById("priorityList");
  ul.innerHTML = "";

  if (!list.length) {
    ul.innerHTML = "<li>No urgent questions</li>";
    return;
  }

  list.slice(0, 10).forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.questionID} · Priority ${item.score}`;
    ul.appendChild(li);
  });
}

/* ================================
   RECENT QUESTIONS
================================ */
function computeRecentQuestions(attempts) {
  const seen = new Set();
  const recent = [];

  for (const a of attempts) {
    if (!seen.has(a.questionID)) {
      seen.add(a.questionID);
      recent.push({
        questionID: a.questionID,
        date: a.createdAt.toDate()
      });
    }
    if (recent.length >= 8) break;
  }

  return recent;
}

function renderRecentList(list) {
  const ul = document.getElementById("recentList");
  ul.innerHTML = "";

  if (!list.length) {
    ul.innerHTML = "<li>No recent activity</li>";
    return;
  }

  list.forEach(item => {
    const li = document.createElement("li");
    li.textContent =
      `${item.questionID} · ${item.date.toLocaleDateString()}`;
    ul.appendChild(li);
  });
}

/* ================================
   HEATMAP
================================ */
function renderHeatmap(attempts) {
  const container = document.getElementById("heatmap");
  container.innerHTML = "";

  const activity = {};

  attempts.forEach(a => {
    const d = a.createdAt.toDate();
    const key = d.toISOString().slice(0, 10);
    activity[key] = (activity[key] || 0) + 1;
  });

  const today = new Date();

  for (let i = 119; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = activity[key] || 0;

    const cell = document.createElement("div");
    cell.className = `heat-day heat-${Math.min(count, 4)}`;
    cell.title = `${key}: ${count} attempts`;

    container.appendChild(cell);
  }
}

/* ================================
   CHARTS
================================ */
function drawLineChart(canvas, values, color) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (values.length < 2) return;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  ctx.strokeStyle = color;
  ctx.beginPath();

  values.forEach((v, i) => {
    const x = (i / (values.length - 1)) * canvas.width;
    const y =
      canvas.height -
      ((v - min) / range) * (canvas.height - 20) -
      10;

    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.stroke();
}

function renderTimeChart(attempts) {
  const times = attempts
    .filter(a => typeof a.time === "number")
    .sort((a, b) => a.createdAt.seconds - b.createdAt.seconds)
    .map(a => a.time / 60);

  drawLineChart(
    document.getElementById("timeChart"),
    times,
    "#2563eb"
  );
}

function renderDifficultyChart(attempts) {
  const diffs = attempts
    .filter(a => a.difficulty)
    .sort((a, b) => a.createdAt.seconds - b.createdAt.seconds)
    .map(a => a.difficulty);

  drawLineChart(
    document.getElementById("difficultyChart"),
    diffs,
    "#dc2626"
  );
}
