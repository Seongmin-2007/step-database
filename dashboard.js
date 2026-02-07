import {
  collectionGroup,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db } from "./firebase.js";

async function loadDashboard() {
  const user = auth.currentUser;
  if (!user) return;

  const snap = await getDocs(
    collectionGroup(db, "attempts")
  );

  let attempted = new Set();
  let completed = new Set();
  let totalTime = 0;
  let timeCount = 0;
  let tagDifficulty = {};

  snap.docs.forEach(d => {
    const a = d.data();
    const questionId = d.ref.parent.parent.id;

    attempted.add(questionId);

    if (a.status === "completed") {
      completed.add(questionId);
    }

    if (a.timeSeconds) {
      totalTime += a.timeSeconds;
      timeCount++;
    }

    if (a.tags && a.difficulty) {
      a.tags.forEach(t => {
        tagDifficulty[t] ??= [];
        tagDifficulty[t].push(a.difficulty);
      });
    }
  });

  renderDashboard({
    attempted: attempted.size,
    completed: completed.size,
    avgTime: timeCount ? Math.round(totalTime / timeCount / 60) : 0,
    hardestTag: computeHardestTag(tagDifficulty)
  });
}

function computeHardestTag(map) {
  let worst = null;
  let max = 0;

  for (const tag in map) {
    const avg =
      map[tag].reduce((a, b) => a + b, 0) / map[tag].length;

    if (avg > max) {
      max = avg;
      worst = tag;
    }
  }

  return worst ?? "—";
}


function renderDashboard(data) {
  document.getElementById("card-attempted").innerHTML = `
    <h3>Questions attempted</h3>
    <div class="value">${data.attempted}</div>
  `;

  document.getElementById("card-completed").innerHTML = `
    <h3>Questions completed</h3>
    <div class="value">${data.completed}</div>
  `;

  document.getElementById("card-avg-time").innerHTML = `
    <h3>Average time</h3>
    <div class="value">${data.avgTime} min</div>
  `;

  document.getElementById("card-hardest").innerHTML = `
    <h3>Hardest topic</h3>
    <div class="value">${data.hardestTag}</div>
  `;
}

loadDashboard();