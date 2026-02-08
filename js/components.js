import { formatTime, formatQuestionTitle } from "./utils.js";

export function createAttemptCard({ data, showDelete = false, showTitle = false }) {
  const date = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  
  const headerHtml = showTitle 
    ? `<div style="display:flex; justify-content:space-between; margin-bottom:6px; font-weight:600;">
         <span style="color:var(--text)">${formatQuestionTitle(data.questionID)}</span>
         <span style="font-size:0.75em; color:var(--muted); font-weight:400;">${dateStr}</span>
       </div>`
    : `<div class="past-meta" style="margin-bottom:4px;">Date: ${dateStr}</div>`;

  return `
    <div class="past-attempt" ${showTitle ? `onclick="window.location.href='index.html?id=${data.questionID}'"` : ""} style="cursor:pointer; position:relative;">
      ${showDelete ? `<div class="delete-attempt" title="Delete">×</div>` : ""}
      
      ${headerHtml}

      <div class="past-meta">
        <span>Time: ${formatTime(data.time)}</span>
        <span>Diff: ${"★".repeat(data.difficulty || 0)}</span>
      </div>
      
      ${data.notes ? `<div class="past-notes">${data.notes}</div>` : ""}
    </div>
  `;
}