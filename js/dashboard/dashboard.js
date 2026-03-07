import { auth, db } from "../config.js";
import { createAttemptCard } from "../ui.js";
import { parseQuestionID } from "../utils.js";
import { loadQuestion } from "../viewer/index.js";
import { getAttempts, onAttemptsChanged } from "../attemptStore.js";

let ALL_ATTEMPTS = [];

/* ================================
   ENTRY POINT
================================ */
auth.onAuthStateChanged(user => {
  if (user) {
     window.__USER = user;
  }
});

function renderDashboard(model, questions) {

  renderStats(model.stats);
  renderPriorityList(model.priority);
  renderRecentList(model.recent);
  renderHeatmap(model.attempts);
  renderStepMatrix(questions, model.priority);

  drawLineChart(
    document.getElementById("timeChart"),
    model.timeSeries,
    "#2563eb"
  );

  drawLineChart(
    document.getElementById("difficultyChart"),
    model.difficultySeries,
    "#dc2626"
  );

  // const grouped = groupQuestions(questions);
  // renderOverview(grouped);
}

function buildDashboardModel(attempts) {
  return {
    attempts,

    stats: computeStats(attempts),

    priority: computePriorityList(attempts),

    recent: computeRecentQuestions(attempts),

    timeSeries: attempts
      .filter(a => typeof a.time === "number")
      .sort((a,b)=>a.createdAt.seconds-b.createdAt.seconds)
      .map(a => a.time/60),

    difficultySeries: attempts
      .filter(a => a.difficulty)
      .sort((a,b)=>a.createdAt.seconds-b.createdAt.seconds)
      .map(a => a.difficulty)
  };
}

/* ================================
   LOAD DASHBOARD
================================ */
let dashboardInitialized = false;

export function loadDashboard(questions) {

  const attempts = getAttempts();
  ALL_ATTEMPTS = attempts;

  const model = buildDashboardModel(attempts);
  renderDashboard(model, questions);

  if (!dashboardInitialized) {

    onAttemptsChanged(newAttempts => {

      ALL_ATTEMPTS = newAttempts;

      const model = buildDashboardModel(newAttempts);
      renderDashboard(model, questions);

    });

    dashboardInitialized = true;
  }

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
  const DECAY = 45;
  const LATEST_BOOST = 3;

  for (const qid in byQuestion) {
    const attemptsForQ = byQuestion[qid].sort(
      (a, b) => b.createdAt.seconds - a.createdAt.seconds
    );

    let totalScore = 0;
    let totalWeight = 0;

    attemptsForQ.forEach((attempt, index) => {
      const daysAgo =
        (Date.now() - attempt.createdAt.toDate()) /
        (1000 * 60 * 60 * 24);

      const weight =
        Math.exp(-daysAgo / DECAY) *
        (index === 0 ? LATEST_BOOST : 1);

      // ----- Difficulty
      const difficulty =
        (attempt.difficulty ?? 0) ** 2 * 2;

      // ----- Time
      const minutes =
        typeof attempt.time === "number"
          ? attempt.time / 60
          : 0;

      const cappedTime =
        Math.min(minutes, 120) / 10;

      // ----- Recency
      const recency =
        20 * (1 - Math.exp(-daysAgo / 30));

      const combined =
        difficulty + cappedTime + recency;

      totalScore += combined * weight;
      totalWeight += weight;
    });

    // 🔥 NORMALISED SCORE
    const averageScore =
      totalWeight > 0
        ? totalScore / totalWeight
        : 0;

    // Slight attempt bonus (saturates)
    const attemptFactor =
      1 + 0.15 * Math.log(1 + attemptsForQ.length);

    const finalScore =
      averageScore * attemptFactor;

    list.push({
      questionID: qid,
      score: finalScore.toFixed(2)
    });
  }

  return list.sort((a, b) => b.score - a.score);
}

function buildPriorityMap(priorityList){
  const map = {};

  priorityList.forEach(p=>{
    map[p.questionID] = Number(p.score);
  });

  return map;
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

function renderStepMatrix(questions, priorityList){

  const container = document.getElementById("stepMatrix");
  container.innerHTML = "";

  const priorityMap = buildPriorityMap(priorityList);

  const years = [...new Set(questions.map(q=>q.year))].sort((a,b)=>b-a);

  const paperSizes = {
    1: 14,
    2: 14,
    3: 14
  };

  years.forEach(year=>{

    const row = document.createElement("div");
    row.className = "matrix-row";

    const label = document.createElement("div");
    label.className = "matrix-year";
    label.textContent = year;

    row.appendChild(label);

    [1,2,3].forEach(paper=>{

      const maxQ = paperSizes[paper];

      for(let qn=1; qn<=maxQ; qn++){

        const q = questions.find(
          x => x.year===year && x.paper===paper && x.question===qn
        );

        const cell = document.createElement("div");
        cell.className = "matrix-cell";

        if(!q){
          cell.classList.add("matrix-missing");
          row.appendChild(cell);
          continue;
        }

        const id = `${q.year}-S${q.paper}-Q${q.question}`;
        const score = priorityMap[id];

        if(score === undefined){
          cell.classList.add("matrix-empty");
        }else if(score < 10){
          cell.classList.add("matrix-low");
        }else if(score < 20){
          cell.classList.add("matrix-mid");
        }else{
          cell.classList.add("matrix-high");
        }

        const qPath = `images/questions/${q.year}/S${q.paper}/Q${q.question}.png`;
        const tags = window.questionTags?.[qPath] ?? [];

        cell.title = `${id}\n${tags.join(", ")}`;

        cell.onclick = () => {
          loadQuestion(q, tags);

          const mainScreen = document.getElementById("main-screen");
          const dashboardScreen = document.getElementById("dashboard-screen");
          mainScreen.classList.remove("hidden");
          dashboardScreen.classList.add("hidden");
        };

        row.appendChild(cell);
      }

      const gap = document.createElement("div");
      gap.className = "matrix-paper-gap";
      row.appendChild(gap);

    });

    container.appendChild(row);
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
      recent.push(a); // keep FULL attempt
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
    const fakeDoc = {
      id: item.id,
      ref: null,
      data: () => item
    };

    const attemptCard = createAttemptCard(fakeDoc, {includeID: true});
    ul.appendChild(attemptCard);
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
    if (!a.createdAt) return;

    const d =
      typeof a.createdAt.toDate === "function"
        ? a.createdAt.toDate()
        : a.createdAt;

    if (!(d instanceof Date)) return;

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
    cell.className = `heat-day heat-${Math.min(count, 10)}`;
    cell.title = `${key}: ${count} attempts`;

    cell.addEventListener("click", () => {
      openDayView(key);
    });

    container.appendChild(cell);
  }
}

function openDayView(dateKey) {
  const dashboard = document.querySelector(".dashboard-layout");
  const dayScreen = document.getElementById("day-screen");

  dashboard.style.display = "none";
  dayScreen.style.display = "block";

  document.getElementById("dayTitle").textContent =
    `Attempts on ${dateKey}`;

  const container = document.getElementById("dayAttempts");
  container.innerHTML = "";

  // filter attempts from that day
  const attempts = ALL_ATTEMPTS.filter(a => {
    if (!a.createdAt) return false;

    const d =
      typeof a.createdAt.toDate === "function"
        ? a.createdAt.toDate()
        : a.createdAt;

    const key = d.toISOString().slice(0,10);

    return key === dateKey;
  });

  if (!attempts.length) {
    container.innerHTML = "<p>No attempts that day.</p>";
    return;
  }

  // GROUP ATTEMPTS BY QUESTION
  const byQuestion = {};

  attempts.forEach(a => {
    byQuestion[a.questionID] ??= [];
    byQuestion[a.questionID].push(a);
  });

  // render each question group
  for (const qid in byQuestion) {

    const q = parseQuestionID(qid);

    const questionImage =
      `images/questions/${q.year}/S${q.paper}/Q${q.question}.png`;

    const questionBlock = document.createElement("div");
    questionBlock.className = "question-block";

    // image
    const questionBox = document.createElement("div");
    questionBox.className = "question-content";

    questionBox.innerHTML = `
      <img src="${questionImage}" alt="Question ${qid}">
    `;

    questionBlock.appendChild(questionBox);

    // attempts container
    const attemptsContainer = document.createElement("div");
    attemptsContainer.className = "attempts-container";

    byQuestion[qid].forEach(a => {

      const fakeDoc = {
        id: a.id,
        ref: null,
        data: () => a
      };

      const card = createAttemptCard(fakeDoc, {includeID:true});
      attemptsContainer.appendChild(card);

    });

    questionBlock.appendChild(attemptsContainer);

    container.appendChild(questionBlock);
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



// SHOWS ALL QUESTIONS AND BY YEAR ETC
// function groupQuestions(questions) {
//   const map = {};

//   questions.forEach(q => {

//     if (!map[q.year]) map[q.year] = {};
//     if (!map[q.year][q.step]) map[q.year][q.step] = [];

//     map[q.year][q.step].push(q);

//   });

//   return map;
// }

// // function renderOverview(grouped) {

// //   const container = document.getElementById("questionOverview");
// //   container.innerHTML = "";

// //   const years = Object.keys(grouped).sort((a,b)=>b-a);

// //   years.forEach(year => {

// //     const yearBlock = document.createElement("div");
// //     yearBlock.className = "year-block";

// //     yearBlock.innerHTML = `<h3>${year}</h3>`;

// //     [1,2,3].forEach(step => {

// //       if (!grouped[year][step]) return;

// //       const table = document.createElement("table");
// //       table.className = "overview-table";

// //       table.innerHTML = `
// //       <thead>
// //         <tr>
// //           <th>STEP ${step}</th>
// //           <th>Status</th>
// //           <th>Attempts</th>
// //           <th>Latest Time</th>
// //           <th>Last Solve</th>
// //         </tr>
// //       </thead>
// //       <tbody></tbody>
// //       `;

// //       const tbody = table.querySelector("tbody");

// //       grouped[year][step]
// //         .sort((a,b)=>a.question-b.question)
// //         .forEach(q => {

// //           const row = document.createElement("tr");

// //           row.innerHTML = `
// //             <td>Q${q.question}</td>
// //             <td>${q.status ?? "No data"}</td>
// //             <td>${q.records ?? "0-0-0-0"}</td>
// //             <td>${q.latestTime ?? "N/A"}</td>
// //             <td>${q.lastSolve ?? "N/A"}</td>
// //           `;

// //           tbody.appendChild(row);

// //         });

// //       yearBlock.appendChild(table);

// //     });

// //     container.appendChild(yearBlock);

// //   });
// // }