import { auth, db, doc, collection, addDoc, deleteDoc, query, where, orderBy, getDocs, serverTimestamp } from "./firebase.js";
import { notify } from "./notification.js";
import { formatTime } from "./utils.js";
import { createAttemptCard } from "./components.js";

const viewer = document.getElementById("viewer");

export async function selectQuestion(q, li, questionTags) {
  // Highlight UI
  document.querySelectorAll("#questionList li").forEach(x => x.classList.remove("active"));
  if(li) li.classList.add("active");

  const questionID = `${q.year}-step${q.paper}-q${q.question}`;
  const qImg = `images/questions/${q.year}/step${q.paper}/q${q.question}.png`;
  const tags = questionTags[qImg] || [];

  // Update URL without reload
  const url = new URL(window.location);
  url.searchParams.set("id", questionID);
  window.history.pushState({}, "", url);

  // Render HTML
  viewer.innerHTML = `
    <h2>${questionID}</h2>
    <div style="margin:10px 0; color:#555; font-size:0.9em;">
      <strong>Tags:</strong> ${tags.length ? tags.join(", ") : "None"}
    </div>
    
    <div class="question-layout">
      <div class="question-main">
        <img src="${qImg}" alt="${questionID}">
        
        <div class="progress-panel">
          <div>
            <label>Status</label>
            <select id="status">
              <option value="not_started">Not started</option>
              <option value="attempted">Attempted</option>
              <option value="completed">Completed</option>
              <option value="revision">Needs revision</option>
            </select>
          </div>
          <div class="time-control">
             <button id="startTimer">Start</button>
             <button id="stopTimer" disabled>Stop</button>
             <span id="timeDisplay">00min 00sec</span>
          </div>
          <div>
            <label>Difficulty</label>
            <div id="stars" class="stars">
              <span data-star="1">☆</span><span data-star="2">☆</span><span data-star="3">☆</span><span data-star="4">☆</span><span data-star="5">☆</span>
            </div>
          </div>
          <div>
            <label>Notes</label>
            <textarea id="notes" rows="3"></textarea>
          </div>
          <button id="commitAttempt" disabled>Save Completed Attempt</button>
        </div>

        <button id="toggle">Show Solution</button>
        <div class="solution" id="solution-container" style="display:none;"></div>
      </div>
      
      <aside class="question-sidebar">
        <h3>History</h3>
        <ul id="pastNotesList"></ul>
      </aside>
    </div>
  `;

  // Logic Handlers
  setupInputs(questionID);
  setupSolution(q);
  loadHistory(questionID);
}

function setupInputs(qID) {
  const statusEl = document.getElementById("status");
  const noteEl = document.getElementById("notes");
  const starsEl = document.getElementById("stars");
  const commitBtn = document.getElementById("commitAttempt");
  let difficulty = 0;
  let elapsed = 0;
  let timer = null;

  // Star Rating
  starsEl.onclick = (e) => {
    if(!e.target.dataset.star) return;
    difficulty = Number(e.target.dataset.star);
    [...starsEl.children].forEach(s => {
      s.textContent = Number(s.dataset.star) <= difficulty ? "★" : "☆";
      s.classList.toggle("active", Number(s.dataset.star) <= difficulty);
    });
    checkCommit();
  };

  // Timer
  const timeDisplay = document.getElementById("timeDisplay");
  document.getElementById("startTimer").onclick = function() {
    this.disabled = true;
    document.getElementById("stopTimer").disabled = false;
    timer = setInterval(() => {
      elapsed++;
      timeDisplay.textContent = formatTime(elapsed);
    }, 1000);
  };
  document.getElementById("stopTimer").onclick = function() {
    clearInterval(timer);
    document.getElementById("startTimer").disabled = false;
    this.disabled = true;
  };

  function checkCommit() {
    commitBtn.disabled = !(statusEl.value === "completed" && difficulty > 0);
  }
  statusEl.onchange = checkCommit;

  // Save
  commitBtn.onclick = async () => {
    const user = auth.currentUser;
    if(!user) return notify({ message: "Please log in", type: "warning" });

    await addDoc(collection(db, "users", user.uid, "questions", qID, "attempts"), {
      createdAt: serverTimestamp(),
      userID: user.uid,
      questionID: qID,
      status: "completed",
      time: elapsed,
      difficulty: difficulty,
      notes: noteEl.value
    });
    
    notify({ message: "Saved!", type: "success", timeout: 2000 });
    loadHistory(qID);
  };
}

async function setupSolution(q) {
  const container = document.getElementById("solution-container");
  document.getElementById("toggle").onclick = () => {
    container.style.display = container.style.display === "none" ? "block" : "none";
  };
  
  // Try loading solution images 1-5
  for(let i=1; i<=5; i++) {
    const imgPath = `images/solutions/${q.year}/step${q.paper}/q${q.question}-${i}.jpg`;
    try {
      const res = await fetch(imgPath, { method: "HEAD" });
      if(!res.ok) break;
      const img = document.createElement("img");
      img.src = imgPath;
      container.appendChild(img);
    } catch(e) { break; }
  }
}

async function loadHistory(qID) {
  const user = auth.currentUser;
  if(!user) return;

  const q = query(collection(db, "users", user.uid, "questions", qID, "attempts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const list = document.getElementById("pastNotesList");
  list.innerHTML = "";

  snap.docs.forEach(doc => {
    const li = document.createElement("li");
    li.innerHTML = createAttemptCard({ data: doc.data(), showDelete: true, showTitle: false });
    
    // Delete Logic
    const del = li.querySelector(".delete-attempt");
    if(del) {
      del.onclick = async () => {
        if(del.classList.contains("confirm")) {
          await deleteDoc(doc.ref);
          li.remove();
        } else {
          del.classList.add("confirm");
          setTimeout(()=>del.classList.remove("confirm"), 2000);
        }
      };
    }
    list.appendChild(li);
  });
}