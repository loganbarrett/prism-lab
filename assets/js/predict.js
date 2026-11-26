/* Module 5: melodic expectancy, pitch x timing (design after the lab's "Wrong Note, Wrong Time" study).
   The surprisal values come from a hand-written toy model, not from data. */
(function () {
  const cv = document.getElementById('pred-canvas'); if (!cv) return;
  const ctx = cv.getContext('2d'), info = document.getElementById('pred-info'), tb = document.querySelector('#pred-table tbody');
  const MEL = [64, 65, 67, 67, 65, 64, 62];                     // E F G G F E D: seven quarter notes in C major, then a rest, then the final note
  const BEAT = .5;                                              // 120 bpm
  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  // P(next pitch class | previous = D): hand-written to follow stepwise-resolution and tonal-stability tendencies
  const P = { 0: .45, 2: .14, 4: .22, 5: .05, 7: .04, 9: .02, 11: .02, 1: .008, 3: .006, 6: .005, 8: .005, 10: .006 };
  const tot = Object.values(P).reduce((a, b) => a + b, 0);
  const PITCH = [
    { m: 60, label: 'Good (tonic)', kind: 'Stable scale degree' }, { m: 64, label: 'Medium (mediant)', kind: 'In key, less stable' },
    { m: 59, label: 'Bad (leading tone)', kind: 'In key, unstable' }, { m: 61, label: 'Chromatic', kind: 'Out of key, small step' },
    { m: 68, label: 'Atonal (tritone)', kind: 'Out of key, tritone leap' }
  ].map(e => { const p = P[e.m % 12] / tot; return { ...e, p, s: -Math.log2(p) }; });
  const TIME = [[0, 'On the beat'], [-.05, 'Early 50 ms'], [.05, 'Late 50 ms'], [-.094, 'Early 94 ms'], [.094, 'Late 94 ms'], [-.125, 'Early 125 ms'], [.125, 'Late 125 ms'], [-.25, 'Early 250 ms'], [.25, 'Late 250 ms']];
  const SIGMA = .1;                                              // toy temporal-expectancy width (s)
  const tSur = d => d * d / (2 * SIGMA * SIGMA * Math.LN2);
  let pi = 0, ti = 0, actx = null, playIdx = -1, timers = [];
  function draw() {
    const W = cv.width, H = cv.height, L = 60, T = 18, B = 44, pw = W - L - 20, ph = H - T - B, lo = 56, hi = 71, beats = 9.5;
    ctx.clearRect(0, 0, W, H); ctx.font = '12px "IBM Plex Mono",monospace'; ctx.textAlign = 'right';
    const Y = m => T + ph * (1 - (m - lo) / (hi - lo)), Xb = b => L + (b / beats) * pw, hgt = ph / (hi - lo);
    for (let m = lo; m <= hi; m++) { const blk = [1, 3, 6, 8, 10].includes(m % 12); ctx.fillStyle = blk ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.09)'; ctx.fillRect(L, Y(m + .5), pw, hgt); if (!blk) { ctx.fillStyle = '#B4B8D6'; ctx.fillText(NAMES[m % 12] + (Math.floor(m / 12) - 1), L - 8, Y(m) + 4); } }
    for (let b = 0; b <= 9; b++) { ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(Xb(b), T); ctx.lineTo(Xb(b), T + ph); ctx.stroke(); }
    const e = PITCH[pi], d = TIME[ti][0], ps = e.s, ts = tSur(d), tot2 = ps + ts, sc = Math.min(1, tot2 / 8);
    const colorEnd = sc < .25 ? '#36CFC9' : sc < .6 ? '#F2C572' : '#EF78B3';
    const note = (b, m, c, glow, dur = .9) => { const x = Xb(b) + 3; ctx.fillStyle = c; if (glow) { ctx.shadowColor = c; ctx.shadowBlur = 18; } ctx.beginPath(); ctx.roundRect(x, Y(m) - 9, Xb(b + dur) - Xb(b) - 6, 18, 6); ctx.fill(); ctx.shadowBlur = 0; };
    MEL.forEach((m, i) => note(i, m, i === playIdx ? '#fff' : '#7155D9'));
    // rest marker at beat 7
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.textAlign = 'center'; ctx.fillText('rest', Xb(7.5), T + ph - 6);
    // expected position ghost
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.setLineDash([4, 4]); ctx.strokeRect(Xb(8) + 3, Y(e.m) - 9, Xb(8.9) - Xb(8) - 6, 18); ctx.setLineDash([]);
    note(8 + d / BEAT, e.m, playIdx === 7 ? '#fff' : colorEnd, true);
    ctx.fillStyle = '#B4B8D6'; ctx.fillText('Seven quarter notes at 120 bpm', Xb(3.5), H - 16); ctx.fillText('Final note', Xb(8.5), H - 16);
    cv.setAttribute('aria-label', `Piano roll of a seven-note C-major melody, a rest, and a final note: ${e.label}, ${TIME[ti][1]}. Toy-model surprisal ${tot2.toFixed(1)} bits.`);
  }
  function setInfo() {
    const e = PITCH[pi], d = TIME[ti][0], ts = tSur(d), tot2 = e.s + ts;
    info.innerHTML = ''; info.append(PRISM.el('h3', { text: `${e.label} · ${TIME[ti][1]}` }),
      PRISM.el('p', { class: 'kv', text: `Toy model: pitch surprisal ${e.s.toFixed(2)} bits (P = ${(e.p * 100).toFixed(1)}%) + timing surprisal ${ts.toFixed(2)} bits = ${tot2.toFixed(2)} bits. ${e.kind}.` }),
      PRISM.el('div', { class: 'bar', style: `width:${Math.max(4, Math.min(100, tot2 / 10 * 100))}%` }),
      PRISM.el('p', { class: 'kv', style: 'margin-top:.6rem', text: 'In the lab\'s rating study (175 adults, manuscript in preparation), pitch deviations substantially lowered fit ratings while timing shifts alone had a comparatively weak effect, and timing did not compound pitch errors. Here the two surprisals are simply added.' }));
    tb.textContent = ''; PITCH.forEach((x, i) => { const tr = PRISM.el('tr', i === pi ? { style: 'background:rgba(113,85,217,.25)' } : {}); tr.append(PRISM.el('td', { text: x.label }), PRISM.el('td', { text: (x.p * 100).toFixed(1) + '%' }), PRISM.el('td', { text: x.s.toFixed(2) })); tb.append(tr); });
  }
  function tone(m, t, dur) { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + .05); }
  function stop() { timers.forEach(clearTimeout); timers = []; playIdx = -1; draw(); }
  function play(list) {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); stop();
    let t = actx.currentTime + .1;
    list.forEach(k => {
      const d = TIME[ti][0], e = PITCH[k];
      MEL.forEach((m, i) => { tone(m, t + i * BEAT, BEAT * .95); timers.push(setTimeout(() => { playIdx = i; draw(); }, (t - actx.currentTime + i * BEAT) * 1000)); });
      tone(e.m, t + 8 * BEAT + d, 1.0);
      timers.push(setTimeout(() => { if (list.length > 1) { pi = k; setInfo(); } playIdx = 7; draw(); }, (t - actx.currentTime + 8 * BEAT + d) * 1000));
      timers.push(setTimeout(() => { playIdx = -1; draw(); }, (t - actx.currentTime + 8 * BEAT + d + .9) * 1000));
      t += 8 * BEAT + 1.8;
    });
  }
  PRISM.radios(document.getElementById('pred-end'), PITCH.map((e, i) => ({ label: e.label, value: i })), v => { pi = v; setInfo(); draw(); });
  PRISM.radios(document.getElementById('pred-time'), TIME.map((t, i) => ({ label: t[1], value: i })), v => { ti = v; setInfo(); draw(); });
  document.getElementById('pred-play').addEventListener('click', () => play([pi]));
  document.getElementById('pred-cmp').addEventListener('click', () => play([0, 1, 2, 3, 4]));
  setInfo(); draw();
})();
