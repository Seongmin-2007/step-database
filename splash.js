// Global variables to control the engine
let animationId = null;
let isScreensaverActive = false;

// --- The Chaos Engine ---
function startChaos(mode = "splash") {
  if (animationId) cancelAnimationFrame(animationId);

  const canvas = document.getElementById("chaos-canvas");
  const ctx = canvas.getContext("2d");
  const splash = document.getElementById("splash-screen");

  // Show the container
  splash.style.display = "flex";
  splash.classList.remove("hidden");

  // --- Constants ---
  const LINE_COUNT = mode === "saver" ? 15 : 10; // More lines for screensaver
  const ZOOM = 13;
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
      // Start slightly different for butterfly effect
      x: 0.1 + (Math.random() * i * 0.005), 
      y: 0,
      z: 0,
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
    // Stop if we shouldn"t be running
    if (splash.classList.contains("hidden") && !isScreensaverActive) return;

    // --- The "Delete Itself" Logic (Screensaver Mode Only) ---
    // Instead of clearing the screen, we draw a semi-transparent black box.
    // This makes old lines slowly fade away, preventing clutter.
    if (mode === "saver") {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0, 0, 0, 0.03)"; // 3% opacity black per frame
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter"; // Makes overlapping lines glow
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
    
    // Screensaver: Slowly shift color over time
    if(mode === "saver") {
        particles.forEach((p, index) => {
            p.h = p.h + 0.1;
            // We add (index * 5) so each line is a slightly different color 
            // creating a "rainbow ribbon" effect rather than one solid block of color
            p.color = `hsl(${p.h}, ${p.s}%, ${p.l}%)`; 
        });
    }

    animationId = requestAnimationFrame(drawChaos);
  }

  drawChaos();

  // --- Exit Logic ---
  if (mode === "splash") {
    // Auto-exit after 5.5s
    setTimeout(() => {
      stopChaos();
    }, 5500);
  } else {
    // Click to exit screensaver
    splash.onclick = () => {
      stopChaos();
      splash.onclick = null; // Clean up listener
    };
  }
}

function stopChaos() {
  const splash = document.getElementById("splash-screen");
  
  // Stop animation loop
  if (animationId) cancelAnimationFrame(animationId);
  isScreensaverActive = false;

  // Fade out
  splash.classList.add("hidden");
  
  // Hide completely after fade
  setTimeout(() => { 
      splash.style.display = "none"; 
  }, 1000);
}

// --- Event Listeners ---

// 1. Run Splash on Load
window.addEventListener("load", () => {
  startChaos("splash");
});

// 2. Button Click
document.getElementById("easteregg").onclick = () => {
  startChaos("saver");
};

// 3. Resize Handler
window.addEventListener("resize", () => {
    const c = document.getElementById("chaos-canvas");
    c.width = window.innerWidth;
    c.height = window.innerHeight;
});