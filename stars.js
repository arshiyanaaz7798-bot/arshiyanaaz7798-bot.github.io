/* Glowing, NASA-style star field: twinkling stars joined into constellation-like networks */
(function () {
  const cv = document.getElementById('starfield'); if (!cv) return;
  const g = cv.getContext('2d'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, S = [], dpr = Math.min(devicePixelRatio || 1, 2), mx = -999, my = -999;
  const tint = ['#ffffff', '#cfe6ff', '#9fd0ff', '#ffe9c8'];
  function build() {
    W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(150, W * H / 11000)); S = [];
    for (let i = 0; i < n; i++) {
      const big = Math.random() < 0.12;
      S.push({ x: Math.random() * W, y: Math.random() * H, r: big ? 1.6 + Math.random() : 0.5 + Math.random() * 0.8,
        vx: (Math.random() - .5) * .12, vy: (Math.random() - .5) * .12, p: Math.random() * 6.28, sp: .01 + Math.random() * .03,
        c: tint[Math.floor(Math.random() * tint.length)], big });
    }
  }
  function draw() {
    g.clearRect(0, 0, W, H);
    // faint milky-way haze
    const mw = g.createLinearGradient(0, H * .1, W, H * .9);
    mw.addColorStop(0, 'rgba(20,60,120,0)'); mw.addColorStop(.5, 'rgba(40,100,190,.07)'); mw.addColorStop(1, 'rgba(20,60,120,0)');
    g.fillStyle = mw; g.fillRect(0, 0, W, H);
    const D = 120;
    g.lineWidth = .7;
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
      const a = S[i], b = S[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < D) { g.strokeStyle = 'rgba(120,195,255,' + (.17 * (1 - d / D)) + ')'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    }
    for (const s of S) {
      const tw = .65 + .35 * Math.sin(s.p), glow = s.r * (s.big ? 9 : 5);
      const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, glow);
      gr.addColorStop(0, s.c); gr.addColorStop(.18, 'rgba(150,210,255,' + .5 * tw + ')'); gr.addColorStop(1, 'rgba(60,140,255,0)');
      g.globalAlpha = tw; g.fillStyle = gr; g.beginPath(); g.arc(s.x, s.y, glow, 0, 6.283); g.fill();
      g.globalAlpha = 1; g.fillStyle = s.c; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill();
      if (s.big) { g.strokeStyle = 'rgba(200,230,255,' + .35 * tw + ')'; g.lineWidth = .6; g.beginPath(); g.moveTo(s.x - glow, s.y); g.lineTo(s.x + glow, s.y); g.moveTo(s.x, s.y - glow); g.lineTo(s.x, s.y + glow); g.stroke(); g.lineWidth = .7; }
      if (!still) {
        s.x += s.vx; s.y += s.vy; s.p += s.sp;
        if (s.x < -20) s.x = W + 20; if (s.x > W + 20) s.x = -20; if (s.y < -20) s.y = H + 20; if (s.y > H + 20) s.y = -20;
      }
    }
    if (!still) requestAnimationFrame(draw);
  }
  addEventListener('resize', () => { build(); if (still) draw(); });
  build(); draw();
})();
