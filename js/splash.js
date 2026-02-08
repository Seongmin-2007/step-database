import { auth } from "./firebase.js";

// Global variables to control the engine
let animationId = null;
let isScreensaverActive = false;

// --- The Chaos Engine (Lorenz Attractor) ---
function startChaos(mode = "splash") {
  if (animationId) cancelAnimationFrame(animationId);

  const canvas = document.getElementById("chaos-canvas");
  const ctx = canvas.getContext("2d");
  const splash = document.getElementById("splash-screen");

  if (!canvas || !splash) return;

  // Show the container
  splash.style.display = "flex";
  splash.classList.remove("hidden");

  // --- Constants ---
  const LINE_COUNT = mode === "saver" ? 15 : 10;
  const ZOOM = Math.min(window.innerWidth, window.innerHeight) / 55;
  const SPEED = mode === "saver" ? 5 : 8;
  const LINE_WIDTH = 1.0;
  
  // Canvas Setup
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Lorenz Constants
  const sigma = 10;
  const rho = 28;
  const beta = 8/3;
  const dt = 0.008;

  // --- Initialize The Swarm ---
  let particles = [];
  let hue = Math.random() * 360; // Base color

  for (let i = 0; i < LINE_COUNT; i++) {
    let s = 20 * Math.random() + 80;
    let l = 30 * Math.random() + 40;

    particles.push({
      x: 0.1 + (Math.random() * 0.005), 
      y: 0,
      z: 25,
      h: hue, 
      s: s,
      l: l,
      color: `hsl(${hue}, ${s}%, ${l}%)`
    });
  }

  // Clear background initially
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // --- Animation Loop ---
  function drawChaos() {
    if (splash.classList.contains("hidden") && !isScreensaverActive) return;

    // Screensaver Fade Effect
    if (mode === "saver") {
      ctx.globalCompositeOperation = "source-over";
      // 3% chance of hard wipe, 97% soft fade
      ctx.fillStyle = Math.random() < 0.03 ? "rgba(0, 0, 0, 0.1)" : "rgba(0, 0, 0, 0.02)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter"; 
    }

    // Run Math Loop
    for (let s = 0; s < SPEED; s++) {
      particles.forEach(p => {
        ctx.beginPath();
        ctx.lineWidth = LINE_WIDTH;
        ctx.strokeStyle = p.color;
        
        let startX = cx + (p.x * ZOOM);
        let startY = cy + (p.z * ZOOM) - (25 * ZOOM);
        ctx.moveTo(startX, startY);

        // Lorenz Equation
        let dx = (sigma * (p.y - p.x)) * dt;
        let dy = (p.x * (rho - p.z) - p.y) * dt;
        let dz = (p.x * p.y - beta * p.z) * dt;

        p.x += dx;
        p.y += dy;
        p.z += dz;

        let nextX = cx + (p.x * ZOOM);
        let nextY = cy + (p.z * ZOOM) - (25 * ZOOM);
        
        ctx.lineTo(nextX, nextY);
        ctx.stroke();
      });
    }
    
    // Shift color over time (Screensaver only)
    if(mode === "saver") {
        particles.forEach(p => {
            p.h = p.h + 0.1;
            p.color = `hsl(${p.h}, ${p.s}%, ${p.l}%)`; 
        });
    }

    animationId = requestAnimationFrame(drawChaos);
  }

  drawChaos();

  // --- Exit Logic ---
  if (mode === "splash") {
    // Auto-exit after 4.5s
    setTimeout(() => {
      stopChaos();
    }, 4500);
  } else {
    // Click to exit screensaver
    splash.onclick = () => {
      stopChaos();
      splash.onclick = null;
    };
  }
}

function stopChaos() {
  const splash = document.getElementById("splash-screen");
  
  if (animationId) cancelAnimationFrame(animationId);
  isScreensaverActive = false;

  splash.classList.add("hidden");
  
  setTimeout(() => { 
      splash.style.display = "none"; 
  }, 1000);
}

// --- Event Listeners ---

// 1. Run Splash on Load (Only once per session)
// We use window.addEventListener because 'load' might have already fired 
// if the script is loaded via type="module", but it's safer to check.
if (document.readyState === "complete") {
    checkSplash();
} else {
    window.addEventListener("load", checkSplash);
}

function checkSplash() {
  const hasSeenSplash = sessionStorage.getItem("splash_seen");
  const splash = document.getElementById("splash-screen");

  if (!hasSeenSplash) {
    startChaos("splash");
    sessionStorage.setItem("splash_seen", "true");
  } else {
    if (splash) {
      splash.classList.add("hidden");
      splash.style.display = "none";
    }
  }
}

// 2. Easter Egg / Screensaver Trigger
// We wrap this in a check to ensure the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    const eggBtn = document.getElementById("easteregg");
    if(eggBtn) {
        eggBtn.onclick = () => {
            const isSuperUser = auth.currentUser && auth.currentUser.uid === "xc1CIaOlAzcF0PvouZpR8WxwaDG3";
            const mode = (isSuperUser && Math.random() > 0.8) ? "saver" : "splash";
            startChaos(mode);
        };
    }
});

// 3. Resize Handler
window.addEventListener("resize", () => {
    const c = document.getElementById("chaos-canvas");
    if (c) {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }
});