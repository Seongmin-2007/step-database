export function renderQuestion({ q, tags, li }) {
    const viewer = document.getElementById("viewer");
    const questionID = `${q.year}-S${q.paper}-Q${q.question}`;
    const questionImage = `images/questions/${q.year}/S${q.paper}/Q${q.question}.png`;

    // Highlight active question
    document.querySelectorAll("#questionList li")
        .forEach(x => x.classList.remove("active"));
    li.classList.add("active");

    viewer.innerHTML = `
        <h2>${questionID}</h2>

        <div style="margin-top:10px;font-size:0.9em;color:#555;">
            <strong>Tags:</strong> ${tags.length ? tags.join(", ") : "No tags available"}
        </div>

        <div class="question-layout">

            <!-- LEFT: main -->
            <div class="question-main">
                <img src="${questionImage}" alt="Question ${questionID}">

                <div class="progress-panel">
                    <div>
                        <label>Status:</label>
                        <select id="status">
                            <option value="not-started">Not started</option>
                            <option value="attempted">Attempted</option>
                            <option value="completed">Completed</option>
                            <option value="revision">Needs revision</option>
                        </select>
                    </div>

                    <div class="time-control">
                        <button id="start-timer">Start</button>
                        <button id="stop-timer" disabled>Stop</button>
                        <span id="time-display">00min 00sec</span>
                    </div>

                    <div>
                        <label>Difficulty:</label>
                        <div id="stars" class="stars">
                            <span data-star="1">☆</span>
                            <span data-star="2">☆</span>
                            <span data-star="3">☆</span>
                            <span data-star="4">☆</span>
                            <span data-star="5">☆</span>
                        </div>
                    </div>

                    <div>
                        <label>Notes:</label>
                        <textarea id="notes" rows="3"></textarea>
                    </div>

                    <!-- REQUIRED for compatibility -->
                    <div id="save-status" class="save-status"></div>

                    <button id="commit-attempt">
                        Save as completed attempt
                    </button>
                </div>

                <button id="solution-toggle">Show solution</button>

                <div id="solution-container" class="solution" style="display:none;">
                    <p class="placeholder" style="display:none">
                        Solution not available yet.
                    </p>
                </div>
            </div>

            <!-- RIGHT: sidebar -->
            <aside class="question-sidebar">
                <h3>Previous completions</h3>
                <ul id="past-notes-list"></ul>
            </aside>

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