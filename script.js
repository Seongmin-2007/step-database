fetch("questions.json")
  .then(res => res.json())
  .then(questions => {
    const container = document.getElementById("questions");

    questions.forEach(q => {
      const card = document.createElement("div");
      card.className = "question-card";

      card.innerHTML = `
        <h3>${q.paper} – ${q.year} Q${q.question}</h3>
        <img src="${q.image}" alt="Question image">
        <p><strong>Topics:</strong> ${q.topic.join(", ")}</p>
        <button>Show solution</button>
        <div class="solution" style="display:none;"></div>
      `;

      const btn = card.querySelector("button");
      const solDiv = card.querySelector(".solution");

      btn.onclick = () => {
        if (solDiv.innerHTML === "") {
          fetch(q.solution)
            .then(r => r.text())
            .then(text => {
              solDiv.innerHTML = `<pre>${text}</pre>`;
            });
        }
        solDiv.style.display =
          solDiv.style.display === "none" ? "block" : "none";
      };

      container.appendChild(card);
    });
  });
