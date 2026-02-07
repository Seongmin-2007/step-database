window.addEventListener('load', () => {
  const canvas = document.getElementById('chaos-canvas');
  const ctx = canvas.getContext('2d');
  const splash = document.getElementById('splash-screen');

  // Set canvas size
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // --- Chaos Variables (Lorenz System) ---
  // We randomize 'x' slightly so it starts in a different spot every time
  let x = 0.1 + (Math.random() * 0.5); 
  let y = 0;
  let z = 0;

  // Standard constants for the Lorenz Attractor
  const sigma = 10;
  const rho = 28;
  const beta = 8/3;

  // Time step
  const dt = 0.01;

  // Visuals
  // Random starting color (0-360 hue)
  let hue = Math.floor(Math.random() * 360); 
  
  // Center of the screen
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const scale = 12; // Zoom level

  // Clear background initially
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // --- The Animation Loop ---
  function drawChaos() {
    // If splash is hidden, stop calculating to save battery
    if (splash.classList.contains('hidden')) return;

    // Draw multiple steps per frame to speed it up
    for (let i = 0; i < 20; i++) {
      // 1. Calculate the differentials
      const dx = (sigma * (y - x)) * dt;
      const dy = (x * (rho - z) - y) * dt;
      const dz = (x * y - beta * z) * dt;

      // 2. Update Position
      x += dx;
      y += dy;
      z += dz;

      // 3. Draw the Point
      ctx.beginPath();
      // We draw from the previous point, but for chaos, 
      // drawing tiny dots creates a cool "particle dust" effect
      
      // Project 3D (x,y,z) onto 2D screen
      // We use 'x' and 'z' for the view to get the classic butterfly shape
      const plotX = cx + (x * scale);
      const plotY = cy + (z * scale) - (25 * scale); // Shift up slightly

      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fillRect(plotX, plotY, 1.5, 1.5); // Draw a 1.5px dot
    }

    // Slowly shift color over time for a rainbow effect
    hue += 0.1;
    
    // Fade out old trails slightly to create depth (optional)
    // ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    requestAnimationFrame(drawChaos);
  }

  // Start the chaos
  drawChaos();

  // --- Cleanup ---
  // Wait 4 seconds, then fade out
  setTimeout(() => {
    splash.classList.add('hidden');
    // Stop the loop after transition ends
    setTimeout(() => { 
        splash.style.display = 'none'; 
    }, 1000);
  }, 4000);
});

// Resize handler
window.addEventListener('resize', () => {
    const c = document.getElementById('chaos-canvas');
    c.width = window.innerWidth;
    c.height = window.innerHeight;
});