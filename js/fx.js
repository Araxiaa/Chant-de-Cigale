// Particules d'ambiance : lucioles dorées au soleil, flocons pendant la mauvaise saison.
(function () {
  const cv = document.getElementById('fx'), cx = cv.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, P = [], t = 0;

  const snow = () => document.documentElement.dataset.season === 'snow';
  function size() {
    const d = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * d; cv.height = H * d;
    cx.setTransform(d, 0, 0, d, 0, 0);
  }
  function mk(s, top) {
    return s
      ? { x: Math.random() * W, y: top ? -10 : Math.random() * H, r: 1 + Math.random() * 2.4, vy: .35 + Math.random() * .9, ph: Math.random() * 6.28 }
      : { x: Math.random() * W, y: Math.random() * H, r: 1.4 + Math.random() * 2.8, vy: -.08 - Math.random() * .22, ph: Math.random() * 6.28 };
  }
  function seed() { const s = snow(); P = Array.from({ length: s ? 130 : 44 }, () => mk(s)); }
  function frame() {
    t += .016;
    cx.clearRect(0, 0, W, H);
    const s = snow();
    for (const p of P) {
      p.y += p.vy;
      if (s) {
        p.x += Math.sin(t * .8 + p.ph) * .5 + .25;
        cx.fillStyle = 'rgba(255,255,255,.8)';
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill();
        if (p.y > H + 10) Object.assign(p, mk(true, true));
        if (p.x > W + 10) p.x = -10;
      } else {
        p.x += Math.sin(t * .6 + p.ph) * .35;
        const a = .12 + .38 * Math.abs(Math.sin(t * .9 + p.ph));
        const g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(232,226,70,${a})`);
        g.addColorStop(.35, `rgba(190,215,60,${a * .35})`);
        g.addColorStop(1, 'rgba(190,215,60,0)');
        cx.fillStyle = g;
        cx.beginPath(); cx.arc(p.x, p.y, p.r * 6, 0, 6.283); cx.fill();
        if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
      }
    }
    if (!still) requestAnimationFrame(frame);
  }
  addEventListener('resize', size);
  size(); seed(); frame();
  window.fxReseed = () => { seed(); if (still) frame(); };
})();
