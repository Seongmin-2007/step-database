/**
 * @file charts.js
 * @description Canvas-based line chart renderer for the dashboard.
 *              Stateless — just call drawLineChart() with a canvas and data.
 */

// ─── Core renderer ────────────────────────────────────────────────────────────

/**
 * Draw a simple line chart onto a canvas element.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number[]}          values
 * @param {string}            color   CSS colour string
 */
export function drawLineChart(canvas, values, color) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (values.length < 2) return;

  const max   = Math.max(...values);
  const min   = Math.min(...values);
  const range = max - min || 1;
  const pad   = 10;

  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.beginPath();

  values.forEach((v, i) => {
    const x = (i / (values.length - 1)) * canvas.width;
    const y = canvas.height - ((v - min) / range) * (canvas.height - pad * 2) - pad;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.stroke();
}

// ─── Convenience renderers ────────────────────────────────────────────────────

/**
 * Render the time-per-attempt line chart.
 * @param {{ time: number, createdAt: Object }[]} attempts
 */
export function renderTimeChart(attempts) {
  const values = attempts
    .filter(a => typeof a.time === "number")
    .sort((a, b) => a.createdAt.seconds - b.createdAt.seconds)
    .map(a => a.time / 60);

  drawLineChart(document.getElementById("timeChart"), values, "#2563eb");
}

/**
 * Render the difficulty-over-time line chart.
 * @param {{ difficulty: number, createdAt: Object }[]} attempts
 */
export function renderDifficultyChart(attempts) {
  const values = attempts
    .filter(a => a.difficulty)
    .sort((a, b) => a.createdAt.seconds - b.createdAt.seconds)
    .map(a => a.difficulty);

  drawLineChart(document.getElementById("difficultyChart"), values, "#dc2626");
}