/* Module 3: synthesized-voice spectrogram with playback, pitch contour and window-size control */
(function () {
  const cv = document.getElementById('spec-canvas'); if (!cv) return;
  const ctx = cv.getContext('2d'), info = document.getElementById('spec-info');
  const SR = 22050, FMAX = 5000;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // each example: duration, f0(t) in Hz, amplitude env(t), formant set
  const EX = [
    { id: 'scale', label: 'Sung scale', dur: 3.2, vowel: 'a', txt: 'Five sustained sung notes (C4 up to G4, equal tempered) on an “ah” vowel. Horizontal bands are harmonics; steps in the white contour are note changes.',
      f0: t => { const n = [60, 62, 64, 65, 67], i = Math.min(4, Math.floor(t / .62)), f = (t % .62); const prev = n[Math.max(0, i - 1)], g = i ? Math.min(1, f / .06) : 1; return hz(prev + (n[i] - prev) * g) * (1 + .004 * Math.sin(2 * Math.PI * 5.5 * t)); },
      env: t => { const f = t % .62; return Math.min(1, f / .03) * Math.min(1, (.62 - f) / .05) * (t < 3.1 ? 1 : 0); } },
    { id: 'vib', label: 'Vibrato', dur: 3, vowel: 'a', txt: 'One sustained note (A3, 220 Hz) with vibrato that grows in depth. Vibrato appears as a periodic wobble of the contour, about 5.5 cycles per second.',
      f0: t => 220 * Math.pow(2, (Math.min(1, t / 1.5) * .45 * Math.sin(2 * Math.PI * 5.5 * t)) / 12),
      env: t => Math.min(1, t / .08) * Math.min(1, (3 - t) / .15) },
    { id: 'glide', label: 'Glide', dur: 2.4, vowel: 'o', txt: 'A smooth glide (portamento) from G3 up to D4 on an “oh” vowel. Every harmonic rises in parallel, and the formant bands stay put.',
      f0: t => hz(55 + 7 * (.5 - .5 * Math.cos(Math.PI * Math.min(1, Math.max(0, (t - .3) / 1.6))))),
      env: t => Math.min(1, t / .06) * Math.min(1, (2.4 - t) / .15) },
    { id: 'speech', label: 'Speech-like', dur: 2.6, vowel: 'a', txt: 'A spoken-like contour at lower pitch: four syllables with a rising-falling intonation, rapid amplitude pulses, and drifting vowels. The contour does not hold steady the way sung notes do.',
      f0: t => 118 + 38 * Math.sin(Math.PI * Math.min(1, t / 2.3)) - 14 * (t / 2.6),
      env: t => { const s = (t * 4.1) % 1; return (s < .85 ? Math.sin(Math.PI * s / .85) ** .6 : 0) * Math.min(1, (2.6 - t) / .1); }, vow: t => (['a', 'e', 'o', 'a'][Math.min(3, Math.floor(t * 4.1 / 1))]) }
  ];
  const FORM = { a: [[700, 110, 1], [1220, 120, .6], [2600, 160, .35]], o: [[450, 90, 1], [800, 100, .5], [2500, 160, .25]], e: [[500, 90, 1], [1850, 130, .55], [2600, 160, .3]] };
  const gain = (f, v, fs) => FORM[v].reduce((s, [c, w, a]) => s + a * Math.exp(-((f - c * fs) ** 2) / (2 * (w * fs) ** 2)), .03);
  const cache = {};
  let ps = 0, fs = 1;
  const k = () => Math.pow(2, ps / 12);
  function synth(e, p = ps, f = fs) {
    const key = e.id + '|' + p + '|' + f; if (cache[key]) return cache[key];
    const pk = Math.pow(2, p / 12);
    const n = Math.floor(e.dur * SR), y = new Float32Array(n); let ph = 0; const r = PRISM.seeded(5);
    for (let i = 0; i < n; i++) {
      const t = i / SR, f0 = e.f0(t) * pk, env = e.env(t), v = e.vow ? e.vow(t) : e.vowel; ph += 2 * Math.PI * f0 / SR;
      let s = 0; for (let h = 1; h * f0 < FMAX + 1500; h++) s += gain(h * f0, v, f) / h * Math.sin(h * ph);
      y[i] = (s * env * .5 + (e.id === 'speech' ? (r() - .5) * .02 * env : 0));
    }
    return cache[key] = y;
  }
  function fft(re, im) {
    const n = re.length; for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const u = i + k, v = u + len / 2, xr = re[v] * cr - im[v] * ci, xi = re[v] * ci + im[v] * cr; re[v] = re[u] - xr; im[v] = im[u] - xi; re[u] += xr; im[u] += xi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
  }
  const WIN = [{ label: '256 (11.6 ms)', v: 256, note: 'Short window: sharp in time, blurry in frequency, so harmonics smear together.' }, { label: '1024 (46 ms)', v: 1024, note: 'Long window: sharp in frequency, so individual harmonics resolve, but timing is smeared.' }, { label: '512 (23 ms)', v: 512, note: 'Medium window: a compromise that resolves harmonics for low voices poorly and for higher voices well.' }];
  let ex = 0, win = 512, showFm = true, showF0 = true, logf = false, off = null, playing = false, actx = null, src = null, tStart = 0, raf = 0;
  function render() {
    const e = EX[ex], y = synth(e), hop = 128, nfr = Math.floor((y.length - win) / hop), nb = win / 2, db = new Float32Array(nfr * nb);
    const w = Float32Array.from({ length: win }, (_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / (win - 1))), re = new Float32Array(win), im = new Float32Array(win);
    let mx = -1e9;
    for (let f = 0; f < nfr; f++) { for (let i = 0; i < win; i++) { re[i] = y[f * hop + i] * w[i]; im[i] = 0; } fft(re, im); for (let k = 0; k < nb; k++) { const v = 10 * Math.log10(re[k] * re[k] + im[k] * im[k] + 1e-12); db[f * nb + k] = v; if (v > mx) mx = v; } }
    off = { db, nfr, nb, hop, mx }; paint();
    const f0s = Array.from({ length: 100 }, (_, i) => e.f0(i / 100 * e.dur) * k()).filter((_, i) => e.env(i / 100 * e.dur) > .2);
    info.innerHTML = ''; info.append(PRISM.el('h3', { text: e.label }), PRISM.el('p', { text: e.txt }), PRISM.el('p', { class: 'kv', text: `Duration ${e.dur.toFixed(1)} s · f0 ${Math.round(Math.min(...f0s))}–${Math.round(Math.max(...f0s))} Hz · pitch ${ps > 0 ? '+' : ''}${ps} st · formants ×${fs.toFixed(2)} · synthesized in your browser. Raising f0 spreads the harmonics; scaling formants moves the broad resonance bands without changing the pitch.` }));
  }
  const PAL = [[11, 13, 32], [60, 40, 140], [113, 85, 217], [239, 120, 179], [242, 197, 114], [255, 255, 255]];
  function col(v) { const p = Math.max(0, Math.min(.9999, v)) * (PAL.length - 1), i = Math.floor(p), f = p - i; return PAL[i].map((c, k) => c + (PAL[i + 1][k] - c) * f); }
  function paint(playT) {
    if (!off) return; const W = cv.width, H = cv.height, L = 64, R = 14, T = 16, B = 44, pw = W - L - R, ph = H - T - B, e = EX[ex];
    ctx.clearRect(0, 0, W, H); const img = ctx.createImageData(pw, ph), { db, nfr, nb, mx } = off;
    const fmin = 80, fy = y => { const frac = 1 - y / ph; return logf ? fmin * Math.pow(FMAX / fmin, frac) : frac * FMAX; };
    for (let py = 0; py < ph; py++) { const k = Math.min(nb - 1, Math.floor(fy(py) / (SR / 2) * nb)); for (let px = 0; px < pw; px++) { const f = Math.min(nfr - 1, Math.floor(px / pw * nfr)); const c = col((db[f * nb + k] - (mx - 70)) / 70), o = (py * pw + px) * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; } }
    ctx.putImageData(img, L, T);
    ctx.fillStyle = '#B4B8D6'; ctx.font = '13px "IBM Plex Mono",monospace'; ctx.textAlign = 'right'; ctx.strokeStyle = 'rgba(255,255,255,.18)';
    (logf ? [100, 200, 500, 1000, 2000, 5000] : [0, 1000, 2000, 3000, 4000, 5000]).forEach(f => { const frac = logf ? Math.log(f / fmin) / Math.log(FMAX / fmin) : f / FMAX, y = T + ph * (1 - frac); ctx.fillText(f + '', L - 8, y + 4); ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke(); });
    ctx.textAlign = 'center'; for (let t = 0; t <= e.dur; t += .5) ctx.fillText(t.toFixed(1), L + t / e.dur * pw, H - 24); ctx.fillText('Time (s)', L + pw / 2, H - 6);
    ctx.save(); ctx.translate(14, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Frequency (Hz)', 0, 0); ctx.restore();
    if (showFm) {
      const v = e.vow ? 'a' : e.vowel; ctx.textAlign = 'left'; ctx.font = '600 12px "IBM Plex Mono",monospace';
      FORM[v].forEach(([c, w], i) => { const lo = c * fs - w * fs, hi = c * fs + w * fs, f2y = f => T + ph * (1 - (logf ? Math.log(Math.max(f, fmin) / fmin) / Math.log(FMAX / fmin) : f / FMAX));
        if (c * fs > FMAX) return; ctx.fillStyle = 'rgba(54,207,201,.16)'; ctx.fillRect(L, f2y(hi), pw, f2y(lo) - f2y(hi)); ctx.fillStyle = '#36CFC9'; ctx.fillText('F' + (i + 1) + ' ' + Math.round(c * fs) + ' Hz', L + 6, f2y(c * fs) - 3); });
    }
    if (showF0) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); let pen = false;
      for (let i = 0; i <= 400; i++) { const t = i / 400 * e.dur; if (e.env(t) < .15) { pen = false; continue; } const f = e.f0(t) * k(), frac = logf ? Math.log(f / fmin) / Math.log(FMAX / fmin) : f / FMAX, x = L + t / e.dur * pw, y = T + ph * (1 - frac); pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; }
      ctx.stroke();
    }
    if (playT != null) { const x = L + playT / e.dur * pw; ctx.strokeStyle = '#36CFC9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + ph); ctx.stroke(); }
    cv.setAttribute('aria-label', `Spectrogram of the ${e.label} example, ${e.dur} seconds, with pitch contour ${showF0 ? 'shown' : 'hidden'}.`);
  }
  function stop() { playing = false; cancelAnimationFrame(raf); try { src && src.stop(); } catch (e) {} src = null; document.getElementById('spec-play').textContent = 'Play'; paint(); }
  function play() {
    if (playing) return stop();
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume();
    const y = synth(EX[ex]), buf = actx.createBuffer(1, y.length, SR); buf.copyToChannel(y, 0);
    src = actx.createBufferSource(); src.buffer = buf; const g = actx.createGain(); g.gain.value = .35; src.connect(g).connect(actx.destination); src.start(); tStart = actx.currentTime; playing = true;
    document.getElementById('spec-play').textContent = 'Pause';
    src.onended = () => { if (playing) stop(); };
    const tick = () => { if (!playing) return; paint(actx.currentTime - tStart); raf = requestAnimationFrame(tick); };
    PRISM.reduced() ? 0 : tick();
  }
  function playAB() {
    stop(); actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume();
    const e = EX[ex], mk = y => { const b = actx.createBuffer(1, y.length, SR); b.copyToChannel(y, 0); return b; };
    const a = synth(e, 0, 1), b = synth(e, ps, fs), t0 = actx.currentTime + .1, gap = .5;
    [[a, t0], [b, t0 + e.dur + gap]].forEach(([y, t]) => { const s = actx.createBufferSource(); s.buffer = mk(y); const g = actx.createGain(); g.gain.value = .35; s.connect(g).connect(actx.destination); s.start(t); });
    playing = true; tStart = t0 + e.dur + gap; const btn = document.getElementById('spec-play'); btn.textContent = 'Stop';
    const tick = () => { if (!playing) return; const t = actx.currentTime - tStart; if (t > e.dur + .1) return stop(); paint(t >= 0 ? t : null); raf = requestAnimationFrame(tick); }; tick();
  }
  const pv = document.getElementById('spec-pitch-v'), fv = document.getElementById('spec-form-v');
  document.getElementById('spec-pitch').addEventListener('input', ev => { stop(); ps = +ev.target.value; pv.textContent = (ps > 0 ? '+' : '') + ps + ' semitones'; render(); });
  document.getElementById('spec-form').addEventListener('input', ev => { stop(); fs = +ev.target.value / 100; fv.textContent = '×' + fs.toFixed(2); render(); });
  document.getElementById('spec-ab').addEventListener('click', playAB);
  PRISM.pressed(document.getElementById('spec-fm'), v => { showFm = v; paint(); });
  PRISM.radios(document.getElementById('spec-ex'), EX.map((e, i) => ({ label: e.label, value: i })), v => { stop(); ex = v; render(); });
  const wnote = document.getElementById('spec-win-note');
  PRISM.radios(document.getElementById('spec-win'), WIN.map(w => ({ label: w.label, value: w })), w => { win = w.v; wnote.textContent = w.note; render(); }, 2);
  document.getElementById('spec-play').addEventListener('click', play);
  document.getElementById('spec-stop').addEventListener('click', stop);
  PRISM.pressed(document.getElementById('spec-f0'), v => { showF0 = v; paint(); });
  PRISM.pressed(document.getElementById('spec-log'), v => { logf = v; paint(); });
  render();
})();
