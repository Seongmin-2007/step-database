fetch("questions.json")
  .then(response => response.json())
  .then(questions => {
    const container = document.getElementById("questions");

    questions.forEach(({ year, paper, question }) => {
      const id = `${String(year % 100).padStart(2, "0")}-S${paper}-Q${question}`;

      const questionImg =
        `images/questions/${year}/step${paper}/q${question}.png`;

      const solutionImg =
        `images/solutions/${year}/step${paper}/q${question}.png`;

      const card = document.createElement("div");
      card.className = "question-card";

      card.innerHTML = `
        <h3>${id}</h3>
        <img src="${questionImg}" alt="Question ${id}">
        <button>Show solution</button>
        <div class="solution" style="display:none;">
          <img src="${solutionImg}" alt="Solution ${id}">
          <p class="no-solution" style="display:none;">
            Solution not available yet.
          </p>
        </div>
      `;

      const button = card.querySelector("button");
      const solutionDiv = card.querySelector(".solution");
      const solutionImage = solutionDiv.querySelector("img");
      const noSolutionText = solutionDiv.querySelector(".no-solution");

      solutionImage.onerror = () => {
        solutionImage.style.display = "none";
        noSolutionText.style.display = "block";
      };

      button.onclick = () => {
        solutionDiv.style.display =
          solutionDiv.style.display === "none" ? "block" : "none";
      };

      container.appendChild(card);
    });
  })
  .catch(err => {
    console.error("Failed to load questions.json", err);
  });
