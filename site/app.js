// =============================================
// AI ENGRAM — Neural particle background
// Subtle synaptic connections in deep space
// =============================================

(function () {
  const canvas = document.getElementById('neurons');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width, height, particles, mouse;
  const PARTICLE_COUNT = 60;
  const CONNECTION_DIST = 140;
  const MOUSE_DIST = 180;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function init() {
    resize();
    mouse = { x: -1000, y: -1000 };
    particles = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        brightness: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Update & draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Drift
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.01;

      // Wrap
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;

      // Subtle mouse repulsion
      const mdx = p.x - mouse.x;
      const mdy = p.y - mouse.y;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mdist < MOUSE_DIST) {
        const force = (1 - mdist / MOUSE_DIST) * 0.02;
        p.vx += (mdx / mdist) * force;
        p.vy += (mdy / mdist) * force;
      }

      // Damping
      p.vx *= 0.999;
      p.vy *= 0.999;

      // Pulse glow
      const glow = p.brightness + Math.sin(p.pulse) * 0.15;

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212, 160, 83, ${glow})`;
      ctx.fill();

      // Connections to nearby particles
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONNECTION_DIST) {
          const alpha = (1 - dist / CONNECTION_DIST) * 0.12;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(212, 160, 83, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  // Mouse tracking
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('resize', resize);

  // Intersection Observer for scroll animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.problem-grid, .arch-card, .try-content').forEach((el) => {
    observer.observe(el);
  });

  init();
  draw();
})();
