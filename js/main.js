import { initAuthUI } from "./auth-ui.js";
import { selectQuestion } from "./viewer.js";
import { makeId } from "./utils.js";
import "./splash.js"; 

initAuthUI();

// Build Info
fetch("build.json").then(r=>r.json()).then(b=>{
  const d = document.createElement("div");
  d.textContent = `Ver: ${b.commit.slice(0,7)}`;
  d.style.cssText = "position:fixed;bottom:5px;right:5px;font-size:10px;opacity:0.5;";
  document.body.appendChild(d);
});

let QUESTIONS = [];
let TAGS = {};
const listEl = document.getElementById("questionList");

// Load Data
Promise.all([
  fetch("questions.json").then(r => r.json()),
  fetch("question_tags.json").then(r => r.json())
]).then(([qData, tData]) => {
  QUESTIONS = qData;
  TAGS = tData;
  renderList("");
  
  // Check URL params for deep link (e.g. ?id=2019-step2-q1)
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if(id) {
    const [year, step, qNum] = id.split("-"); // 2019, step2, q1
    const found = QUESTIONS.find(q => 
      q.year == year && 
      `step${q.paper}` == step && 
      `q${q.question}` == qNum
    );
    if(found) selectQuestion(found, null, TAGS);
  }
});

// Search
document.getElementById("search").addEventListener("input", (e) => renderList(e.target.value.toLowerCase()));

function renderList(filter) {
  listEl.innerHTML = "";
  QUESTIONS.filter(q => {
    const id = makeId(q).toLowerCase(); // 19-s2-q1
    const path = `images/questions/${q.year}/step${q.paper}/q${q.question}.png`;
    const t = (TAGS[path] || []).map(x => x.toLowerCase());
    return id.includes(filter) || t.some(tag => tag.includes(filter));
  }).forEach(q => {
    const li = document.createElement("li");
    li.textContent = makeId(q);
    
    // Tags
    const path = `images/questions/${q.year}/step${q.paper}/q${q.question}.png`;
    if(TAGS[path]) {
      const div = document.createElement("div");
      div.className = "tag-container";
      TAGS[path].forEach(tag => {
        const s = document.createElement("span");
        s.className = "tag-chip";
        s.textContent = tag;
        s.onclick = (e) => { e.stopPropagation(); document.getElementById("search").value = tag; renderList(tag.toLowerCase()); };
        div.appendChild(s);
      });
      li.appendChild(div);
    }
    
    li.onclick = () => selectQuestion(q, li, TAGS);
    listEl.appendChild(li);
  });
}