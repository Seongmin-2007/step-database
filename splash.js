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
      // Start slightly different for butterfly effect
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
    // Stop if we shouldn"t be running
    if (splash.classList.contains("hidden") && !isScreensaverActive) return;

    // --- The "Delete Itself" Logic (Screensaver Mode Only) ---
    // Instead of clearing the screen, we draw a semi-transparent black box.
    // This makes old lines slowly fade away, preventing clutter.
    if (mode === "saver") {
      ctx.globalCompositeOperation = "source-over";
      if (Math.random() < 0.03) { 
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; // Hard wipe 10% of the time
      } else {
        ctx.fillStyle = "rgba(0, 0, 0, 0.02)"; // Soft fade 90% of the time
      }
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





// // Global variables
// let animationId = null;
// let isScreensaverActive = false;

// // --- The Chaos Engine ---
// function startChaos(mode = "splash") {
//   if (animationId) cancelAnimationFrame(animationId);

//   const canvas = document.getElementById("chaos-canvas");
//   const ctx = canvas.getContext("2d");
//   const splash = document.getElementById("splash-screen");

//   splash.style.display = "flex";
//   splash.classList.remove("hidden");

//   // --- Dynamic Configuration ---
//   // 1. Calculate ZOOM based on screen size so it fits perfectly on Mobile OR Desktop
//   // Divide smallest screen dimension by 60 to ensure the attractor fits
//   const minDim = Math.min(window.innerWidth, window.innerHeight);
//   const ZOOM = minDim / 55; 
  
//   const LINE_COUNT = mode === "saver" ? 20 : 10;
//   const SPEED = mode === "saver" ? 5 : 8;
//   const LINE_WIDTH = 1.5; // Slightly thicker for visibility

//   // Canvas Setup
//   canvas.width = window.innerWidth;
//   canvas.height = window.innerHeight;
  
//   // 2. We need cx/cy to be updating variables, not constants
//   let cx = canvas.width / 2;
//   let cy = canvas.height / 2;

//   // Lorenz Constants
//   const sigma = 10;
//   const rho = 28;
//   const beta = 8/3;
//   const dt = 0.008;

//   // --- Initialize The Swarm ---
//   let particles = [];
//   let hue = Math.random() * 360;

//   for (let i = 0; i < LINE_COUNT; i++) {
//     let s = 20 * Math.random() + 80;
//     let l = 30 * Math.random() + 40;

//     particles.push({
//       x: 0.1 + (i * 0.01), 
//       y: 0,
//       // 3. Start Z at 25 so it explodes from the CENTER, not the top
//       z: 25, 
//       h: hue, 
//       s: s, l: l,
//       color: `hsl(${hue}, ${s}%, ${l}%)`
//     });
//   }

//   // Clear background
//   ctx.fillStyle = "#000";
//   ctx.fillRect(0, 0, canvas.width, canvas.height);

//   // --- Animation Loop ---
//   function drawChaos() {
//     if (splash.classList.contains("hidden") && !isScreensaverActive) return;

//     // Fade Logic
//     if (mode === "saver") {
//       ctx.globalCompositeOperation = "source-over";
//       // Use slightly stronger fade (0.06) to prevent "gray smear" buildup
//       ctx.fillStyle = "rgba(0, 0, 0, 0.06)"; 
//       ctx.fillRect(0, 0, canvas.width, canvas.height);
//       ctx.globalCompositeOperation = "lighter"; 
//     }

//     for (let s = 0; s < SPEED; s++) {
//       particles.forEach(p => {
//         ctx.beginPath();
//         ctx.lineWidth = LINE_WIDTH;
//         ctx.strokeStyle = p.color;
        
//         // Draw using current cx/cy and dynamic ZOOM
//         let startX = cx + (p.x * ZOOM);
//         let startY = cy + (p.z * ZOOM) - (25 * ZOOM);
//         ctx.moveTo(startX, startY);

//         // Math
//         let dx = (sigma * (p.y - p.x)) * dt;
//         let dy = (p.x * (rho - p.z) - p.y) * dt;
//         let dz = (p.x * p.y - beta * p.z) * dt;

//         p.x += dx; p.y += dy; p.z += dz;

//         let nextX = cx + (p.x * ZOOM);
//         let nextY = cy + (p.z * ZOOM) - (25 * ZOOM);
        
//         ctx.lineTo(nextX, nextY);
//         ctx.stroke();
//       });
//     }
    
//     // Color Shift
//     if(mode === "saver") {
//         particles.forEach((p, index) => {
//             p.h = p.h + 0.1;
//             p.color = `hsl(${p.h + (index*5)}, ${p.s}%, ${p.l}%)`; 
//         });
//     }

//     animationId = requestAnimationFrame(drawChaos);
//   }

//   drawChaos();

//   // --- Exit Logic ---
//   if (mode === "splash") {
//     setTimeout(() => stopChaos(), 5500);
//   } else {
//     // Small delay before enabling click-to-exit
//     setTimeout(() => {
//         splash.onclick = () => {
//             stopChaos();
//             splash.onclick = null;
//         };
//     }, 500);
//   }

//   // --- 4. The Fixed Resize Handler ---
//   // This needs to be defined INSIDE startChaos to access 'cx' and 'cy' variables
//   // OR we simply update the canvas and the loop picks up the new dimensions
//   window.onresize = () => {
//       canvas.width = window.innerWidth;
//       canvas.height = window.innerHeight;
//       cx = canvas.width / 2;
//       cy = canvas.height / 2;
//       // Re-fill black to prevent white flash
//       ctx.fillStyle = "#000";
//       ctx.fillRect(0, 0, canvas.width, canvas.height);
//   };
// }

// function stopChaos() {
//   const splash = document.getElementById("splash-screen");
//   if (animationId) cancelAnimationFrame(animationId);
//   isScreensaverActive = false;
//   splash.classList.add("hidden");
//   window.onresize = null; // Clean up resize listener
//   setTimeout(() => { splash.style.display = "none"; }, 1000);
// }

// // Event Listeners
// window.addEventListener("load", () => startChaos("splash"));
// document.getElementById("easteregg").onclick = () => startChaos("saver");