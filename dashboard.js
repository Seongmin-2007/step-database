import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db } from "./firebase.js";

auth.onAuthStateChanged(user => {
  if (user) loadDashboard();
});

async function loadDashboard() {
  const user = auth.currentUser;
  if (!user) {
    console.log("Not logged in");
    return;
  }

  const attempts = [];

  // 1️⃣ Get all questions for this user
  const questionsSnap = await getDocs(collection(db, "users", user.uid, "questions"));
  for (const qDoc of questionsSnap.docs) {
    const questionId = qDoc.id;

    // 2️⃣ Get all attempts under each question
    const attemptsSnap = await getDocs(collection(qDoc.ref, "attempts"));
    attemptsSnap.docs.forEach(aDoc => {
      attempts.push({
        id: aDoc.id,
        questionId,
        ...aDoc.data()
      });
    });
  }

  // 3️⃣ Compute stats
  const stats = computeStats(attempts);
  renderStats(stats);

  // 4️⃣ Compute priority list
  const priority = computePriorityList(attempts);
  renderPriorityList(priority);

// 5️⃣ Render charts
  renderTimeChart(attempts);
  renderDifficultyChart(attempts);
}

function computeStats(attempts) {
  const attempted = new Set();
  const completed = new Set();
  let totalTime = 0;
  let timeCount = 0;
  let totalDifficulty = 0;
  let diffCount = 0;

  attempts.forEach(a => {
    attempted.add(a.questionId);

    if (a.status === "completed") {
      completed.add(a.questionId);
    }

    if (a.timeSeconds) {
      totalTime += a.timeSeconds;
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
    avgTimeMin: timeCount ? Math.round(totalTime / timeCount / 60) : 0,
    avgDifficulty: diffCount
      ? (totalDifficulty / diffCount).toFixed(1)
      : "—"
  };
}

function renderStats(s) {
  document.getElementById("stat-attempted").innerHTML = `
    <h3>Attempted</h3>
    <div class="value">${s.attempted}</div>
  `;

  document.getElementById("stat-completed").innerHTML = `
    <h3>Completed</h3>
    <div class="value">${s.completed}</div>
  `;

  document.getElementById("stat-avg-time").innerHTML = `
    <h3>Average time</h3>
    <div class="value">${s.avgTimeMin} min</div>
  `;

  document.getElementById("stat-avg-difficulty").innerHTML = `
    <h3>Average difficulty</h3>
    <div class="value">${s.avgDifficulty}</div>
  `;
}

function computePriorityList(attempts) {
  const byQuestion = {};

  attempts.forEach(a => {
    byQuestion[a.questionId] ??= [];
    byQuestion[a.questionId].push(a);
  });

  const priorities = [];

  for (const qid in byQuestion) {
    const list = byQuestion[qid];
    const latest = list.sort(
      (a, b) => b.createdAt.seconds - a.createdAt.seconds
    )[0];

    let score = 0;

    if (latest.difficulty >= 4) score += 2;
    if (latest.timeSeconds > 20 * 60) score += 1;
    if (latest.status !== "completed") score += 1;

    if (score > 0) {
      priorities.push({
        questionId: qid,
        score,
        latest
      });
    }
  }

  return priorities.sort((a, b) => b.score - a.score);
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
    li.textContent = `${item.questionId} — priority ${item.score}`;
    ul.appendChild(li);
  });
}

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

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

function renderTimeChart(attempts) {
  const times = attempts
    .filter(a => a.timeSeconds)
    .sort((a, b) => a.createdAt.seconds - b.createdAt.seconds)
    .map(a => a.timeSeconds / 60);

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
