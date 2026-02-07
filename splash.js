window.addEventListener('load', () => {
  const canvas = document.getElementById('chaos-canvas');
  const ctx = canvas.getContext('2d');
  const splash = document.getElementById('splash-screen');

  // --- Configuration ---
  const ZOOM = 20;          // Bigger number = Bigger shape
  const SPEED = 10;         // Higher number = Faster drawing
  const LINE_WIDTH = 1.5;   // Thickness of the line
  const PRE_WARM_STEPS = 200; // Skip the boring "center spin" part
  
  // Set canvas size
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // --- Chaos Variables ---
  // Start slightly off-center to ensure movement
  let x = 0.05 - Math.random() * 0.1; 
  let y = 0.05 - Math.random() * 0.1;
  let z = 0.05 - Math.random() * 0.1;

  // Lorenz Constants
  const sigma = 10;
  const rho = 28;
  const beta = 8/3;
  const dt = 0.007; // Time step

  // Visuals
  let hue = Math.floor(Math.random() * 360); 
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // 1. Clear background (Black)
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. PRE-WARM THE ENGINE (The Fix)
  // We run the math silently for 200 steps so x,y,z move out of the center
  for (let i = 0; i < PRE_WARM_STEPS; i++) {
    let dx = (sigma * (y - x)) * dt;
    let dy = (x * (rho - z) - y) * dt;
    let dz = (x * y - beta * z) * dt;
    x += dx; y += dy; z += dz;
  }

  // --- The Animation Loop ---
  function drawChaos() {
    if (splash.classList.contains('hidden')) return;

    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
    
    ctx.beginPath();
    
    // Move to where we currently are
    let startX = cx + (x * ZOOM);
    let startY = cy + (z * ZOOM) - (25 * ZOOM); // Shift up to center vertically
    ctx.moveTo(startX, startY);

    // Calculate multiple steps per frame
    for (let i = 0; i < SPEED; i++) {
      // The Math
      let dx = (sigma * (y - x)) * dt;
      let dy = (x * (rho - z) - y) * dt;
      let dz = (x * y - beta * z) * dt;

      x += dx;
      y += dy;
      z += dz;

      // The Draw
      let nextX = cx + (x * ZOOM);
      let nextY = cy + (z * ZOOM) - (25 * ZOOM);
      
      ctx.lineTo(nextX, nextY);
    }

    ctx.stroke();

    // Color Cycle
    hue += 0.01;

    requestAnimationFrame(drawChaos);
  }

  // Start animation
  drawChaos();

  // --- Cleanup (Fade out after 4.5s) ---
  setTimeout(() => {
    splash.classList.add('hidden');
    setTimeout(() => { 
        splash.style.display = 'none'; 
    }, 1000);
  }, 4500);
});

// Resize handler
window.addEventListener('resize', () => {
    const c = document.getElementById('chaos-canvas');
    c.width = window.innerWidth;
    c.height = window.innerHeight;
});