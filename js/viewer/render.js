export function renderQuestion({ q, tags, li }) {
    const viewer = document.getElementById("viewer");
    const questionID = `${q.year}-S${q.paper}-Q${q.question}`;
    const questionImage = `images/questions/${q.year}/S${q.paper}/Q${q.question}.png`;

    // Highlight active question
    document.querySelectorAll("#questionList li")
        .forEach(x => x.classList.remove("active"));
    li.classList.add("active");

    viewer.innerHTML = `
    <section class="question-header">
        <div class="question-title">
        <h2>${questionID}</h2>
        <div class="question-tags">
            ${tags.length
            ? tags.map(t => `<span class="tag-chip">${t}</span>`).join("")
            : `<span class="tag-muted">No tags</span>`
            }
        </div>
        </div>
    </section>

    <div class="question-layout">

        <!-- LEFT: Question + tools -->
        <div class="question-main">

        <!-- Question content -->
        <div class="question-content">
            <img src="${questionImage}" alt="Question ${questionID}">
        </div>

        <!-- Attempt panel -->
        <section class="attempt-panel">

            <div class="attempt-row">
            <div class="attempt-field">
                <label>Status</label>
                <select id="status">
                <option value="not-started">Not started</option>
                <option value="attempted">Attempted</option>
                <option value="completed">Completed</option>
                <option value="revision">Needs revision</option>
                </select>
            </div>

            <div class="attempt-field time-control">
                <label>Timer</label>
                <div class="timer-controls">
                <button id="start-timer">Start</button>
                <button id="stop-timer" disabled>Stop</button>
                <span id="time-display">00min 00sec</span>
                </div>
            </div>
            </div>

            <div class="attempt-row">
            <div class="attempt-field">
                <label>Difficulty</label>
                <div id="stars" class="stars">
                <span data-star="1">☆</span>
                <span data-star="2">☆</span>
                <span data-star="3">☆</span>
                <span data-star="4">☆</span>
                <span data-star="5">☆</span>
                </div>
            </div>
            </div>

            <div class="attempt-row">
            <div class="attempt-field full">
                <label>Notes</label>
                <textarea id="notes" rows="3" placeholder="Key ideas, mistakes, insights…"></textarea>
            </div>
            </div>

            <div class="attempt-actions">
            <div id="save-status" class="save-status"></div>
            <button id="commit-attempt" class="primary">
                Mark as completed
            </button>
            </div>

        </section>

        <!-- Solution -->
        <div class="solution-section">
            <button id="solution-toggle" class="secondary">
            Show solution
            </button>

            <div id="solution-container" class="solution hidden">
            <p class="placeholder hidden">
                Solution not available yet.
            </p>
            </div>
        </div>

        </div>

        <!-- RIGHT: Sidebar -->
        <aside class="question-sidebar">
        <h3>Previous completions</h3>
        <ul id="past-notes-list"></ul>
        </aside>

    </div>

    <div class="question-nav">
        <button id="prev-question">← Previous</button>
        <button id="next-question">Next →</button>
    </div>
    `;


    return { questionID };
}

export async function loadSolutions(q, questionID) {
    const container = document.getElementById("solution-container");
    const placeholder = container.querySelector(".placeholder");

    let i = 1;
    let found = false;

    while (true) {
        const path = `images/solutions/${q.year}/S${q.paper}/Q${q.question}-${i}.jpg`;
        try {
            const res = await fetch(path, { method: "HEAD" });
            if (!res.ok) break;

            const img = document.createElement("img");
            img.src = path;
            img.alt = `Solution ${questionID} (${i})`;
            container.appendChild(img);

            found = true;
            i++;
        } catch {
            break;
        }
    }

    if (!found) placeholder.style.display = "block";
}