window.addEventListener('load', () => {
  const canvas = document.getElementById('chaos-canvas');
  const ctx = canvas.getContext('2d');
  const splash = document.getElementById('splash-screen');

  // Set canvas size
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // --- Chaos Variables (Lorenz System) ---
  // Randomize start slightly so every refresh is unique
  let x = 0.1 + (Math.random() * 0.5); 
  let y = 0;
  let z = 0;

  // Standard constants
  const sigma = 10;
  const rho = 28;
  const beta = 8/3;

  // Time step (Adjust this: 0.005 is smooth, 0.01 is faster)
  const dt = 0.007;

  // Visuals
  let hue = Math.floor(Math.random() * 360); 
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const scale = 14; // Slightly zoomed in for lines

  // 1. Clear background initially (Pure Black)
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // --- The Animation Loop ---
  function drawChaos() {
    if (splash.classList.contains('hidden')) return;

    // 2. Setup the Line Style
    ctx.lineWidth = 1.5; // Thickness of the line
    ctx.lineCap = 'round'; // Smooth ends
    ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`; // Rainbow color
    
    // 3. Start the Path
    ctx.beginPath();
    
    // Move the "pen" to the current position BEFORE calculating new math
    // This ensures there are no gaps between frames
    let startX = cx + (x * scale);
    let startY = cy + (z * scale) - (25 * scale);
    ctx.moveTo(startX, startY);

    // 4. Calculate multiple steps per frame (Speed)
    for (let i = 0; i < 25; i++) {
      // Lorenz Equations
      const dx = (sigma * (y - x)) * dt;
      const dy = (x * (rho - z) - y) * dt;
      const dz = (x * y - beta * z) * dt;

      // Update 3D Point
      x += dx;
      y += dy;
      z += dz;

      // Calculate new 2D position
      let nextX = cx + (x * scale);
      let nextY = cy + (z * scale) - (25 * scale);

      // Draw line to this new point
      ctx.lineTo(nextX, nextY);
    }

    // 5. Render the line segment
    ctx.stroke();

    // Slowly shift color
    hue += 0.3;
    
    // Optional: Fade effect (Uncomment to make old lines slowly disappear)
    // ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    requestAnimationFrame(drawChaos);
  }

  // Start
  drawChaos();

  // --- Cleanup ---
  setTimeout(() => {
    splash.classList.add('hidden');
    setTimeout(() => { 
        splash.style.display = 'none'; 
    }, 1000);
  }, 4500); // 4.5 seconds total
});

// Handle Resize
window.addEventListener('resize', () => {
    const c = document.getElementById('chaos-canvas');
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    // Note: Resizing clears the canvas, so the old lines will vanish. 
    // This is normal behavior for canvas.
});