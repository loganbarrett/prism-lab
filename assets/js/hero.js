/* Hero: waveform -> prism -> five pathways (canvas 2D, ~60fps, pauses off-screen) */
(function () {
  const cv = document.getElementById('hero-canvas'); if (!cv) return;
  const ctx = cv.getContext('2d');
  const COL = ['#EF78B3', '#4A90E2', '#36CFC9', '#F2C572', '#A794F0'];
  const NAME = ['Music cognition', 'Auditory neuroscience', 'Singing & vocal production', 'Voice & identity', 'Computational modeling'];
  let W, H, dpr, t = 0, run = true, raf;
  function size() { dpr = Math.min(devicePixelRatio || 1, 2); const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const cy = H / 2, px = W * .42, ph = Math.min(H * .78, 340), pw = ph * .9;
    const tri = [[px, cy - ph / 2], [px - pw / 2, cy + ph / 2 - 20], [px + pw / 2, cy + ph / 2 - 20]];
    // incoming waveform (composite: several partials so it looks like a "complex" sound)
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#F7F8FC'; ctx.beginPath();
    const x0 = 0, x1 = px - pw * .22;
    for (let x = x0; x <= x1; x += 2) {
      const env = Math.min(1, x / 80) * 0.9 + .1;
      const k = x * .045 - t * 3;
      const y = cy + (Math.sin(k) * 26 + Math.sin(k * 2.7 + 1) * 12 + Math.sin(k * .5) * 10) * env;
      x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    // prism glass
    const g = ctx.createLinearGradient(tri[1][0], tri[1][1], tri[2][0], tri[0][1]);
    g.addColorStop(0, 'rgba(239,120,179,.25)'); g.addColorStop(.5, 'rgba(113,85,217,.22)'); g.addColorStop(1, 'rgba(54,207,201,.28)');
    ctx.beginPath(); ctx.moveTo(...tri[0]); ctx.lineTo(...tri[1]); ctx.lineTo(...tri[2]); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    const sg = ctx.createLinearGradient(tri[1][0], 0, tri[2][0], 0);
    COL.forEach((c, i) => sg.addColorStop(i / 4, c)); ctx.strokeStyle = sg; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke();
    // five beams
    ctx.font = '600 14px "Space Grotesk",system-ui';
    const lw = W > 640 ? Math.max(...NAME.map(n => ctx.measureText(n).width)) + 30 : 14;
    const sx = px + pw * .08, sy = cy + 4, ex = W - lw + 142 - 12;
    COL.forEach((c, i) => {
      const ty = cy + (i - 2) * (H * .17);
      ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath();
      const startX = sx;
      for (let x = startX; x <= ex - 150; x += 3) {
        const u = (x - startX) / (ex - 150 - startX), e = u * u * (3 - 2 * u);
        const base = sy + (ty - sy) * e;
        // each pathway carries a different "feature" of the signal
        const amp = 3 + 12 * e, f = [0.05, 0.035, 0.08, 0.025, 0.06][i];
        const y = base + Math.sin(x * f * 2 - t * (2 + i * .35) + i) * amp * (i === 4 ? Math.sin(x * .02 + t) : 1);
        x === startX ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.globalAlpha = .95; ctx.stroke(); ctx.globalAlpha = 1;
      // node + label
      const nx = ex - 142, ny = ty;
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(nx, ny, 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#F7F8FC'; ctx.font = '600 14px "Space Grotesk",system-ui'; ctx.textBaseline = 'middle';
      if (W > 640) ctx.fillText(NAME[i], nx + 14, ny);
      // pulses travelling to the node
      const p = ((t * .35 + i * .21) % 1);
      const px2 = startX + p * (nx - startX);
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px2, sy + (ty - sy) * ((p * p) * (3 - 2 * p)), 3.5, 0, 7); ctx.fill();
    });
    // neural-ish scatter behind outputs
    ctx.globalAlpha = .35;
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399, r = 30 + (i * 37 % 120);
      const nx = W * .78 + Math.cos(a + t * .08) * r * 1.5, ny = cy + Math.sin(a + t * .1) * r * .8;
      ctx.fillStyle = COL[i % 5]; ctx.beginPath(); ctx.arc(nx, ny, 2, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function loop(ts) { t = ts / 1000; draw(); if (run && !PRISM.reduced()) raf = requestAnimationFrame(loop); }
  function start() { cancelAnimationFrame(raf); if (PRISM.reduced()) { t = 1.2; draw(); } else if (run) raf = requestAnimationFrame(loop); }
  size(); start();
  addEventListener('resize', () => { size(); start(); });
  PRISM.onMotion(start);
  PRISM.visible(cv, v => { run = v; start(); });
})();
