import { auth, db, collectionGroup, query, where, orderBy, getDocs } from "./firebase.js";
import { createAttemptCard } from "./components.js";
import { formatTime } from "./utils.js";

auth.onAuthStateChanged(user => {
  if (user) loadDashboard();
  else window.location.href = "index.html";
});

async function loadDashboard() {
  const user = auth.currentUser;
  const q = query(collectionGroup(db, "attempts"), where("userID", "==", user.uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const attempts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderStats(attempts);
  renderRecentList(attempts);
  renderHeatmap(attempts);
  renderCharts(attempts);
}

function renderStats(attempts) {
  const attempted = new Set(attempts.map(a => a.questionID));
  const completed = new Set(attempts.filter(a => a.status === "completed").map(a => a.questionID));
  const times = attempts.filter(a => a.time).map(a => a.time);
  const diffs = attempts.filter(a => a.difficulty).map(a => a.difficulty);
  
  const avgTime = times.length ? Math.round(times.reduce((a,b)=>a+b,0) / times.length / 60) : 0;
  const avgDiff = diffs.length ? (diffs.reduce((a,b)=>a+b,0) / diffs.length).toFixed(1) : "-";

  document.getElementById("stat-attempted").innerHTML = `<div class="stat-value">${attempted.size}</div><div class="stat-label">Attempted</div>`;
  document.getElementById("stat-completed").innerHTML = `<div class="stat-value">${completed.size}</div><div class="stat-label">Completed</div>`;
  document.getElementById("stat-avg-time").innerHTML = `<div class="stat-value">${avgTime}m</div><div class="stat-label">Avg Time</div>`;
  document.getElementById("stat-avg-difficulty").innerHTML = `<div class="stat-value">${avgDiff}</div><div class="stat-label">Avg Diff</div>`;
}

function renderRecentList(attempts) {
  const container = document.getElementById("recentList");
  container.innerHTML = "";
  
  const recent = [];
  const seen = new Set();
  
  for (const a of attempts) {
    if (!seen.has(a.questionID)) {
      seen.add(a.questionID);
      recent.push(a);
    }
    if (recent.length >= 5) break;
  }

  if(!recent.length) {
    container.innerHTML = `<p style="color:var(--muted)">No activity yet.</p>`;
    return;
  }

  recent.forEach(item => {
    // Uses the SHARED COMPONENT
    container.innerHTML += createAttemptCard({ data: item, showTitle: true, showDelete: false });
  });
}

function renderHeatmap(attempts) {
  const container = document.getElementById("heatmap");
  container.innerHTML = "";
  const counts = {};
  attempts.forEach(a => {
    const d = a.createdAt.toDate().toISOString().split('T')[0];
    counts[d] = (counts[d] || 0) + 1;
  });

  const today = new Date();
  for(let i=120; i>=0; i--) {
    const d = new Date(); d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const val = counts[key] || 0;
    const div = document.createElement("div");
    div.className = `heat-day heat-${Math.min(val, 4)}`;
    div.title = `${key}: ${val}`;
    container.appendChild(div);
  }
}

function renderCharts(attempts) {
  // Simple helper to draw charts (simplified for brevity)
  const ctxT = document.getElementById("timeChart");
  const ctxD = document.getElementById("difficultyChart");
  
  // You can use Chart.js here if loaded in HTML, or your custom canvas logic
  // For now, let's assume you want your custom canvas logic back:
  // ... [Insert your drawLineChart function from previous files if you want that custom look] ...
}