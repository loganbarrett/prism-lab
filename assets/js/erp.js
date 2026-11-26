/* Module 2: ERP explorer modeled on the lab's melodic-violation / attention EEG study (manuscript in preparation).
   Waveform SHAPES are synthetic (sums of Gaussian components + smoothed noise). Each measurement-window MEAN is solved
   so that the model reproduces the grand mean reported in the manuscript (Table 2, primary baseline, N = 16). */
(function () {
  const cv = document.getElementById('erp-canvas'); if (!cv) return;
  const ctx = cv.getContext('2d'), info = document.getElementById('erp-info');
  const T0 = -100, T1 = 800, DT = 2, N = (T1 - T0) / DT + 1;
  const COMP = { N1: [105, 14], P2: [200, 30], P3: [350, 80], LPC: [650, 120] };
  const WIN = { N1: [80, 130], P2: [150, 250], P3: [250, 500], LPC: [500, 800] };
  const gauss = (t, c) => Math.exp(-((t - COMP[c][0]) ** 2) / (2 * COMP[c][1] ** 2));
  const winMean = (c, w) => { let s = 0, n = 0; for (let t = WIN[w][0]; t <= WIN[w][1]; t += 2) { s += gauss(t, c); n++; } return s / n; };
  const CTX = [{ n: 'Active rating', c: '#EF78B3' }, { n: 'Silent film', c: '#4A90E2' }, { n: 'VR game', c: '#36CFC9' }];
  // Region specs. 'meas' = [window, free component, targets by context (Active, Film, VR) from Table 2], 'fixed' = other components (µV)
  const REGION = {
    fc: { label: 'Frontocentral', meas: [['N1', 'N1', [-1.88, .57, .96]], ['P2', 'P2', [3.31, 4.45, 3.70]]], fixed: { P3: 1.0, LPC: .5 },
      err: { N1: .22, P2: .21 }, p: { ctx: { N1: '< .001', P2: '.274' }, err: { N1: '.412', P2: '.530' }, con: { N1: '.104', P2: '.036' }, tim: { N1: '.038', P2: '.121' } },
      conDelta: { P2: [.88, -.46] }, timN1: { Early: .52, 'On-time': -.49, Late: -.38 } },
    lf: { label: 'Left frontal', meas: [['P2', 'P2', [2.60, 3.47, 2.89]]], fixed: { N1: -1.0, P3: .8, LPC: .5 },
      err: { P2: .43 }, p: { ctx: { P2: '.356' }, err: { P2: '.153' }, con: { P2: '.011' }, tim: { P2: '.252' } }, conDelta: { P2: [1.21, -.36] } },
    rf: { label: 'Right frontal', meas: [['P2', 'P2', [2.46, 3.76, 3.18]]], fixed: { N1: -1.0, P3: .8, LPC: .5 },
      err: { P2: .36 }, p: { ctx: { P2: '.121' }, err: { P2: '.203' }, con: { P2: '.037' }, tim: { P2: '.365' } }, conDelta: { P2: [1.01, -.28] } },
    cp: { label: 'Centroparietal', meas: [['P3', 'P3', [.95, .53, .74]]], fixed: { N1: -.8, P2: 1.8, LPC: .5 },
      err: { P3: .06 }, p: { ctx: { P3: '.764' }, err: { P3: '.797' }, con: { P3: '.264' }, tim: { P3: '.221' } } },
    post: { label: 'Posterior', meas: [['LPC', 'LPC', [2.97, .52, 1.29]]], fixed: { N1: -.5, P2: 1.2, P3: 1.0 },
      err: { LPC: .12 }, p: { ctx: { LPC: '.304' }, err: { LPC: '.680' }, con: { LPC: '.146' }, tim: { LPC: '.332' } } }
  };
  const NAMEW = { N1: 'N1 (80–130 ms)', P2: 'Positivity (150–250 ms)', P3: 'P300 (250–500 ms)', LPC: 'LPC (500–800 ms)' };
  const COLORS = { Good: '#36CFC9', Bad: '#EF78B3', 'Good · up': '#36CFC9', 'Bad · up': '#EF78B3', 'Good · down': '#7DB2F0', 'Bad · down': '#F2C572', Early: '#F2C572', 'On-time': '#36CFC9', Late: '#A794F0' };

  // amplitudes per region/context so that window means equal the targets (solve linear system by Gauss-Jordan)
  function amps(r, ci, delta) {            // delta: {window: extra mean to add}
    const R = REGION[r], free = R.meas.map(m => m[1]), a = {}; Object.assign(a, R.fixed);
    free.forEach(c => a[c] = 0);
    const mean = (w, amp) => Object.keys(amp).reduce((s, c) => s + amp[c] * winMean(c, w), 0);
    const M = free.map(c => free.map(c2 => winMean(c2, R.meas[free.indexOf(c)][0]))); // rows: windows, cols: free comps
    const rhs = R.meas.map(m => (m[2][ci] + ((delta || {})[m[0]] || 0)) - mean(m[0], R.fixed));
    const n = free.length; for (let i = 0; i < n; i++) { const p = M[i][i]; for (let j = 0; j < n; j++) M[i][j] /= p; rhs[i] /= p; for (let k = 0; k < n; k++) if (k !== i) { const f = M[k][i]; for (let j = 0; j < n; j++) M[k][j] -= f * M[i][j]; rhs[k] -= f * rhs[i]; } }
    free.forEach((c, i) => a[c] = rhs[i]); return a;
  }
  const shape = a => Array.from({ length: N }, (_, i) => { const t = T0 + i * DT; let v = 0; for (const c in a) v += a[c] * gauss(t, c); return v; });
  const noiseCache = {};
  function noise(key) {
    if (noiseCache[key]) return noiseCache[key];
    const r = PRISM.seeded([...key].reduce((s, c) => s * 31 + c.charCodeAt(0), 11)), raw = Array.from({ length: N + 30 }, () => PRISM.gauss(r));
    return noiseCache[key] = raw.slice(0, N).map((_, i) => { let s = 0; for (let k = 0; k < 10; k++) s += raw[i + k]; return s / 3.2; });
  }
  let cmp = 'ctx', reg = 'fc', negUp = false, diff = false, showWin = true, trials = 80, cursor = null;

  // series: [{name,color,clean:[...],opt}]
  function series() {
    const R = REGION[reg], out = []; const err = R.err;
    const avg = (delta, sign) => { // average of the three context waveforms; optional per-window delta
      const arrs = [0, 1, 2].map(ci => amps(reg, ci, delta)); const a = {}; for (const c of new Set(arrs.flatMap(x => Object.keys(x)))) a[c] = arrs.reduce((s, x) => s + (x[c] || 0), 0) / 3; return a;
    };
    const half = (m, k) => Object.fromEntries(Object.entries(m).map(([w, v]) => [w, v * k]));
    if (cmp === 'ctx') CTX.forEach((c, ci) => out.push({ name: c.n, color: c.c, a: amps(reg, ci) }));
    else if (cmp === 'err') { out.push({ name: 'Good (expected)', color: COLORS.Good, a: avg(half(err, -.5)) }); out.push({ name: 'Bad (violated)', color: COLORS.Bad, a: avg(half(err, .5)) }); }
    else if (cmp === 'con') {
      const cd = R.conDelta, dl = cd ? Object.fromEntries(Object.entries(cd).map(([w, [u, d]]) => [w, [u, d]])) : null;
      const mk = (k) => dl ? Object.fromEntries(Object.entries(dl).map(([w, v]) => [w, v[k]])) : err;
      const goodShift = dl ? Object.fromEntries(Object.entries(dl).map(([w, v]) => [w, -(v[0] + v[1]) / 4])) : half(err, -.5);
      const badU = dl ? Object.fromEntries(Object.entries(dl).map(([w, v]) => [w, v[0] + goodShift[w]])) : half(err, .5);
      const badD = dl ? Object.fromEntries(Object.entries(dl).map(([w, v]) => [w, v[1] + goodShift[w]])) : half(err, .5);
      out.push({ name: 'Good · up', color: COLORS['Good · up'], a: avg(goodShift) }, { name: 'Bad · up', color: COLORS['Bad · up'], a: avg(badU) },
        { name: 'Good · down', color: COLORS['Good · down'], a: avg(goodShift) }, { name: 'Bad · down', color: COLORS['Bad · down'], a: avg(badD) });
      out[2].dash = [6, 5]; out[3].dash = [6, 5];
    } else {
      ['Early', 'On-time', 'Late'].forEach(t => {
        let d = {}; if (R.timN1) { const base = (REGION.fc.timN1.Early + REGION.fc.timN1['On-time'] + REGION.fc.timN1.Late) / 3; d = { N1: R.timN1[t] - base }; }
        out.push({ name: t, color: COLORS[t], a: avg(d) });
      });
    }
    out.forEach(s => { s.clean = shape(s.a); });
    return out;
  }
  function draw() {
    const W = cv.width, H = cv.height, L = 62, Rr = 20, Tp = 30, B = 56, pw = W - L - Rr, ph = H - Tp - B, V = 8;
    const X = t => L + (t - T0) / (T1 - T0) * pw, Y = v => Tp + ph / 2 + (negUp ? 1 : -1) * v * (ph / 2) / V;
    ctx.clearRect(0, 0, W, H); ctx.font = '13px "IBM Plex Mono",monospace';
    const S = series(), ser = S.map(s => { const nz = noise(reg + cmp + s.name); const k = .5 * Math.sqrt(80 / trials); return { ...s, wave: s.clean.map((v, i) => v + nz[i] * k) }; });
    // windows
    const meas = REGION[reg].meas;
    if (showWin) meas.forEach(m => { const [a, b] = WIN[m[0]]; ctx.fillStyle = 'rgba(167,148,240,.14)'; ctx.fillRect(X(a), Tp, X(b) - X(a), ph); ctx.fillStyle = '#C9BBFA'; ctx.textAlign = 'center'; ctx.font = '600 12px "IBM Plex Mono",monospace'; ctx.fillText(m[0] === 'P2' && reg !== 'fc' ? '150–250 ms' : m[0] === 'P2' ? 'P2 150–250' : m[0] === 'N1' ? 'N1' : m[0] === 'P3' ? 'P300 250–500' : 'LPC 500–800', (X(a) + X(b)) / 2, Tp + 14); });
    ctx.font = '13px "IBM Plex Mono",monospace'; ctx.fillStyle = '#B4B8D6'; ctx.strokeStyle = 'rgba(247,248,252,.14)'; ctx.lineWidth = 1; ctx.textAlign = 'right';
    for (let v = -V; v <= V; v += 4) { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(W - Rr, Y(v)); ctx.stroke(); ctx.fillText((v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v), L - 8, Y(v) + 4); }
    ctx.save(); ctx.translate(14, Tp + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('µV (' + (negUp ? 'negative up' : 'positive up') + ')', 0, 0); ctx.restore();
    for (let t = 0; t <= T1; t += 100) { ctx.beginPath(); ctx.moveTo(X(t), Tp); ctx.lineTo(X(t), Tp + ph); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(t, X(t), H - B + 20); }
    ctx.fillText('Time from final-note onset (ms)', L + pw / 2, H - 12);
    ctx.strokeStyle = '#F7F8FC'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X(0), Tp); ctx.lineTo(X(0), Tp + ph); ctx.stroke(); ctx.beginPath(); ctx.moveTo(L, Y(0)); ctx.lineTo(W - Rr, Y(0)); ctx.stroke();
    const line = (arr, color, w, dash) => { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); arr.forEach((v, i) => i ? ctx.lineTo(X(T0 + i * DT), Y(v)) : ctx.moveTo(X(T0), Y(v))); ctx.stroke(); ctx.setLineDash([]); };
    ser.forEach(s => line(s.wave, s.color, 2.6, s.dash));
    let dw = null;
    if (diff && (cmp === 'err' || cmp === 'ctx')) {
      const g = cmp === 'err' ? ser[0].wave : null, b = cmp === 'err' ? ser[1].wave : null;
      if (g) { dw = b.map((v, i) => v - g[i]); line(dw, '#F7F8FC', 2.2, [7, 5]); }
    }
    // legend
    ctx.textAlign = 'left'; ctx.font = '600 13px "Space Grotesk",sans-serif';
    ser.forEach((s, i) => { const x = L + 12 + i * 150, y = H - B - 16 - 0; ctx.fillStyle = s.color; ctx.fillRect(x, Tp + ph - 22, 16, 4); ctx.fillStyle = '#F7F8FC'; ctx.fillText(s.name, x + 22, Tp + ph - 15); });
    if (cursor != null) {
      const i = Math.max(0, Math.min(N - 1, Math.round((cursor - T0) / DT)));
      ctx.strokeStyle = '#F2C572'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(T0 + i * DT), Tp); ctx.lineTo(X(T0 + i * DT), Tp + ph); ctx.stroke();
      readout = `${REGION[reg].label} at ${T0 + i * DT} ms: ` + ser.map(s => `${s.name} ${s.wave[i] >= 0 ? '+' : '−'}${Math.abs(s.wave[i]).toFixed(2)}`).join(' · ') + ' µV';
    } else readout = '';
    cv.setAttribute('aria-label', `Simulated ERP waveforms at the ${REGION[reg].label} region comparing ${ser.map(s => s.name).join(', ')}; ${negUp ? 'negative' : 'positive'} plotted upward.`);
    summary(ser);
  }
  let readout = '';
  const fmt = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);
  function summary(ser) {
    const R = REGION[reg], key = { ctx: 'ctx', err: 'err', con: 'con', tim: 'tim' }[cmp];
    // window means from the noise-free model
    const lines = [];
    R.meas.forEach(m => { const w = m[0]; const vals = ser.map(s => { let tot = 0, n = 0; for (let t = WIN[w][0]; t <= WIN[w][1]; t += DT) { tot += s.clean[Math.round((t - T0) / DT)]; n++; } return `${s.name} ${fmt(tot / n)}`; });
      lines.push(`${NAMEW[w]}: ${vals.join(' · ')} µV` + (R.p[key] ? `  [manuscript p = ${R.p[key][w]}]` : '')); });
    const heads = {
      ctx: 'Listening context. The frontocentral N1 was about 2.8 µV more negative when participants rated the endings than when they watched a silent film (recording-level estimate); the two incidental contexts did not differ. Other windows showed no reliable context effect.',
      err: 'Melodic violation. Listeners rated Bad endings lower, but Bad − Good differences in every prespecified window were small (≤ 0.43 µV) with confidence intervals including zero; the waveforms are nearly superimposed.',
      con: (reg === 'fc' || reg === 'lf' || reg === 'rf') ? 'Final-note contour × error. In the 150–250 ms windows the Bad − Good difference was positive for upward final notes and slightly negative for downward ones, but it changed with the baseline window and is the least stable result in the study.' : 'The contour × error interaction was not significant in this window, so up and down endings are drawn with the same Bad − Good difference.',
      tim: reg === 'fc' ? 'Final-note timing (Early / On-time / Late). Only the frontocentral N1 differed (nominal p = .038), and the effect changed with the baseline choice, so it is not read as a component-specific timing response.' : 'No reliable timing effect in this window under the primary baseline.'
    }[cmp];
    info.innerHTML = '';
    info.append(PRISM.el('h3', { text: R.label + ' · ' + { ctx: 'by listening context', err: 'Good vs Bad', con: 'contour × error', tim: 'by timing' }[cmp] }), PRISM.el('p', { text: heads }));
    lines.forEach(l => info.append(PRISM.el('p', { class: 'kv', text: l })));
    if (diff && cmp === 'err') info.append(PRISM.el('p', { class: 'kv', text: 'Dashed white line: Bad − Good difference wave.' }));
    info.append(PRISM.el('p', { class: 'kv', text: readout || 'Hover over (or press ← → on) the plot to read values. Shapes are synthetic; window means are the manuscript\'s grand means.' }));
  }
  PRISM.radios(document.getElementById('erp-cmp'), [{ label: 'Listening context', value: 'ctx' }, { label: 'Good vs Bad', value: 'err' }, { label: 'Contour × error', value: 'con' }, { label: 'Timing', value: 'tim' }], v => { cmp = v; cursor = null; draw(); });
  PRISM.radios(document.getElementById('erp-chan'), Object.entries(REGION).map(([k, r]) => ({ label: r.label, value: k })), v => { reg = v; cursor = null; draw(); });
  PRISM.pressed(document.getElementById('erp-pol'), v => { negUp = v; draw(); });
  PRISM.pressed(document.getElementById('erp-diff'), v => { diff = v; draw(); });
  PRISM.pressed(document.getElementById('erp-win'), v => { showWin = v; draw(); });
  const tv = document.getElementById('erp-noise-v');
  document.getElementById('erp-noise').addEventListener('input', e => { trials = +e.target.value; tv.textContent = trials; draw(); });
  cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * cv.width; const t = T0 + (x - 62) / (cv.width - 82) * (T1 - T0); cursor = t < T0 || t > T1 ? null : t; draw(); });
  cv.addEventListener('pointerleave', () => { cursor = null; draw(); });
  cv.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); cursor = Math.max(T0, Math.min(T1, (cursor == null ? 0 : cursor) + (e.key === 'ArrowRight' ? 10 : -10))); draw(); }
    if (e.key === 'Escape') { cursor = null; draw(); }
  });
  draw();
})();
