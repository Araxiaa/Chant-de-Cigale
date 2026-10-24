// Particules d'ambiance : lucioles dorées au soleil, flocons pendant la mauvaise saison.
// Léger : sprites pré-rendus (drawImage), canvas en résolution 1x, pause quand l'onglet est caché.
(function () {
  const cv = document.getElementById('fx'), cx = cv.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, P = [], t = 0, raf = 0;

  const sprite = draw => { const c = document.createElement('canvas'); c.width = c.height = 64; draw(c.getContext('2d')); return c; };
  const glow = sprite(g => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(232,226,70,1)'); r.addColorStop(.3, 'rgba(190,215,60,.4)'); r.addColorStop(1, 'rgba(190,215,60,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  });
  const flake = sprite(g => { g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 32, 28, 0, 6.283); g.fill(); });

  const snow = () => document.documentElement.dataset.season === 'snow';
  function size() { W = innerWidth; H = innerHeight; cv.width = W; cv.height = H; }
  function mk(s, top) {
    return s
      ? { x: Math.random() * W, y: top ? -10 : Math.random() * H, r: 1 + Math.random() * 2.4, vy: .35 + Math.random() * .9, ph: Math.random() * 6.28 }
      : { x: Math.random() * W, y: Math.random() * H, r: 1.4 + Math.random() * 2.8, vy: -.08 - Math.random() * .22, ph: Math.random() * 6.28 };
  }
  function seed() { const s = snow(); P = Array.from({ length: s ? 80 : 28 }, () => mk(s)); }
  function frame() {
    t += .016;
    cx.clearRect(0, 0, W, H);
    const s = snow();
    for (const p of P) {
      p.y += p.vy;
      if (s) {
        p.x += Math.sin(t * .8 + p.ph) * .5 + .25;
        cx.globalAlpha = .8;
        cx.drawImage(flake, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        if (p.y > H + 10) Object.assign(p, mk(true, true));
        if (p.x > W + 10) p.x = -10;
      } else {
        p.x += Math.sin(t * .6 + p.ph) * .35;
        cx.globalAlpha = .15 + .45 * Math.abs(Math.sin(t * .9 + p.ph));
        const d = p.r * 8;
        cx.drawImage(glow, p.x - d / 2, p.y - d / 2, d, d);
        if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
      }
    }
    cx.globalAlpha = 1;
    if (!still) raf = requestAnimationFrame(frame);
  }
  addEventListener('resize', size);
  size(); seed(); frame();
  window.fxReseed = () => { seed(); if (still) frame(); };
})();
