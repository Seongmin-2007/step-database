/**
 * @file splash.js
 * @description Lorenz-attractor splash screen and screensaver.
 *
 *   - Shows once per browser session on first load ("splash" mode)
 *   - Can be triggered manually via the easter-egg button ("saver" mode)
 *   - Super-users get screensaver mode on the easter-egg button
 */

import { auth }         from "../core/config.js";
import {
  SPLASH_DURATION_MS,
  LORENZ_SIGMA,
  LORENZ_RHO,
  LORENZ_BETA,
  LORENZ_DT,
  SUPER_USER_UIDS
} from "../core/constants.js";

// ─── State ────────────────────────────────────────────────────────────────────

let animationId = null;
let isScreensaverActive = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start the chaos animation.
 * @param {"splash"|"saver"} mode
 */
export function startChaos(mode = "splash") {
  if (animationId) cancelAnimationFrame(animationId);

  const canvas = document.getElementById("chaos-canvas");
  const ctx    = canvas.getContext("2d");
  const splash = document.getElementById("splash-screen");

  splash.style.display = "flex";
  splash.classList.remove("hidden");
  isScreensaverActive = mode === "saver";

  // ── Canvas setup ──
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;

  // ── Lorenz parameters ──
  const ZOOM       = Math.min(canvas.width, canvas.height) / 55;
  const LINE_COUNT = mode === "saver" ? 15 : 10;
  const SPEED      = mode === "saver" ? 5  : 8;

  // ── Initialise particle swarm ──
  let hue = Math.random() * 360;
  const particles = Array.from({ length: LINE_COUNT }, () => {
    const s = 20 * Math.random() + 80;
    const l = 30 * Math.random() + 40;
    return {
      x: 0.1 + Math.random() * 0.005,
      y: 0,
      z: 25,
      h: hue,
      s,
      l,
      color: `hsl(${hue}, ${s}%, ${l}%)`
    };
  });

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── Animation loop ──
  function draw() {
    if (splash.classList.contains("hidden") && !isScreensaverActive) return;

    if (mode === "saver") {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = Math.random() < 0.03
        ? "rgba(0,0,0,0.1)"   // occasional hard wipe
        : "rgba(0,0,0,0.02)"; // continuous soft fade
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";
    }

    for (let step = 0; step < SPEED; step++) {
      particles.forEach(p => {
        ctx.beginPath();
        ctx.lineWidth   = 1.0;
        ctx.strokeStyle = p.color;
        ctx.moveTo(cx + p.x * ZOOM, cy + p.z * ZOOM - 25 * ZOOM);

        // Lorenz equations
        const dx = LORENZ_SIGMA * (p.y - p.x)            * LORENZ_DT;
        const dy = (p.x * (LORENZ_RHO - p.z) - p.y)      * LORENZ_DT;
        const dz = (p.x * p.y - LORENZ_BETA * p.z)        * LORENZ_DT;

        p.x += dx; p.y += dy; p.z += dz;

        ctx.lineTo(cx + p.x * ZOOM, cy + p.z * ZOOM - 25 * ZOOM);
        ctx.stroke();
      });
    }

    if (mode === "saver") {
      particles.forEach(p => {
        p.h += 0.1;
        p.color = `hsl(${p.h}, ${p.s}%, ${p.l}%)`;
      });
    }

    animationId = requestAnimationFrame(draw);
  }

  draw();

  // ── Exit logic ──
  if (mode === "splash") {
    setTimeout(stopChaos, SPLASH_DURATION_MS);
  } else {
    splash.addEventListener("click", _onSaverClick);
  }
}

export function stopChaos() {
  const splash = document.getElementById("splash-screen");
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  isScreensaverActive = false;
  splash?.classList.add("hidden");
  splash?.removeEventListener("click", _onSaverClick);
  setTimeout(() => { if (splash) splash.style.display = "none"; }, 1000);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _onSaverClick() {
  stopChaos();
}

// ─── Event listeners ─────────────────────────────────────────────────────────

// 1. Show once per session on load
window.addEventListener("load", () => {
  if (!sessionStorage.getItem("splash_seen")) {
    startChaos("splash");
    sessionStorage.setItem("splash_seen", "true");
  } else {
    const splash = document.getElementById("splash-screen");
    if (splash) { splash.classList.add("hidden"); splash.style.display = "none"; }
  }
});

// 2. Easter-egg button
document.getElementById("easteregg")?.addEventListener("click", () => {
  const uid          = auth.currentUser?.uid;
  const isSuperUser  = uid && SUPER_USER_UIDS.has(uid);
  const mode         = (isSuperUser && Math.random() > 0.2) ? "splash" : "saver";
  startChaos(mode);
});

// 3. Resize
window.addEventListener("resize", () => {
  const canvas = document.getElementById("chaos-canvas");
  if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
});