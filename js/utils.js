export function formatTime(seconds) {
  if (!seconds) return "00min 00sec";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}min ${String(s).padStart(2, "0")}sec`;
}

export function formatQuestionTitle(id) {
  if (!id) return "Unknown Question";
  return id.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function makeId({ year, paper, question }) {
  return `${String(year % 100).padStart(2, "0")}-S${paper}-Q${question}`;
}