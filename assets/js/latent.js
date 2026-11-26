/* Module 4: synthetic 8-D embeddings -> PCA -> 3D scatter (three.js, 2D canvas fallback).
   Both embeddings are generated; they illustrate structure described in the lab's manuscripts, they are not the lab's data. */
(function () {
  const cv = document.getElementById('lat-canvas'); if (!cv) return;
  const info = document.getElementById('lat-info'), D = 8, PER = 60;
  const unit = v => { const m = Math.hypot(...v); return v.map(x => x / m); };
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const sub = (a, b) => a.map((x, i) => x - b[i]), add = (a, b) => a.map((x, i) => x + b[i]), mul = (a, k) => a.map(x => x * k);
  const orth = (v, basis) => unit(basis.reduce((u, b) => sub(u, mul(b, dot(u, b))), v));
  function auc(pos, neg) { let s = 0; pos.forEach(p => neg.forEach(n => s += p > n ? 1 : p === n ? .5 : 0)); return s / (pos.length * neg.length); }

  const SETS = [
    { id: 'voice', label: 'Voice descriptions: speaking vs singing',
      par: { label: 'Modality-specific vocabulary', fmt: v => `${v}%` , def: 20 },
      groups: [{ n: 'Speaking · feminine', c: '#EF78B3' }, { n: 'Speaking · masculine', c: '#4A90E2' }, { n: 'Singing · feminine', c: '#F7B6D6' }, { n: 'Singing · masculine', c: '#36CFC9' }],
      txt: 'Each point is a synthetic sentence embedding of a free-text description of a feminine or masculine voice. A shared feminine–masculine direction runs through both modalities; the slider rotates the singing direction away from the speaking one. In the lab\'s preprint the two directions were nearly parallel (cosine ≈ .97).',
      build(par, r) {
        const g = unit(Array.from({ length: D }, () => PRISM.gauss(r))), m = orth(Array.from({ length: D }, () => PRISM.gauss(r)), [g]), o = orth(Array.from({ length: D }, () => PRISM.gauss(r)), [g, m]);
        const th = par / 100 * Math.PI / 2, gs = add(mul(g, Math.cos(th)), mul(o, Math.sin(th))), A = 2.4, B = 1.6;
        return [add(mul(g, A), mul(m, -B)), add(mul(g, -A), mul(m, -B)), add(mul(gs, A), mul(m, B)), add(mul(gs, -A), mul(m, B))];
      },
      metrics(P, lab) {
        const mean = k => { const m = P.filter((_, i) => lab[i] === k); return Array.from({ length: D }, (_, d) => m.reduce((s, p) => s + p[d], 0) / m.length); };
        const ds = sub(mean(0), mean(1)), dg = sub(mean(2), mean(3)), cosv = dot(ds, dg) / Math.hypot(...ds) / Math.hypot(...dg), w = unit(ds);
        const sc = P.map(p => dot(p, w)), a = auc(sc.filter((_, i) => lab[i] === 2), sc.filter((_, i) => lab[i] === 3));
        return `Speaking vs singing direction cosine ${cosv.toFixed(2)} · classifier trained on speaking, tested on singing: AUC ${a.toFixed(2)}`;
      } },
    { id: 'fach', label: 'Singer acoustics: voice class vs Fach',
      par: { label: 'Fach separation within a voice class', fmt: v => `${v}%`, def: 15 },
      groups: [{ n: 'Soprano', c: '#EF78B3' }, { n: 'Mezzo', c: '#F2C572' }, { n: 'Tenor · lyric', c: '#36CFC9' }, { n: 'Tenor · dramatic', c: '#4A90E2' }, { n: 'Baritone', c: '#A794F0' }, { n: 'Bass', c: '#7155D9' }],
      txt: 'Synthetic singer-level acoustic summaries. Coarse voice classes sit far apart along a tessitura axis; the two tenor Fächer differ only by a small offset, so they overlap unless you widen the separation. This mirrors the lab\'s result that voice class is recoverable but Fach within a class is not.',
      build(par, r) {
        const t = unit(Array.from({ length: D }, () => PRISM.gauss(r))), c = orth(Array.from({ length: D }, () => PRISM.gauss(r)), [t]), f = orth(Array.from({ length: D }, () => PRISM.gauss(r)), [t, c]);
        const at = (p, q, s = 0) => add(add(mul(t, p), mul(c, q)), mul(f, s));
        const sep = par / 100 * 2.4;
        return [at(3, 1.6), at(1.6, 1.8), at(-.3, -1.8, -sep / 2), at(-.3, -1.8, sep / 2), at(-1.8, -1.2), at(-3, -1.5)];
      },
      metrics(P, lab, k) {
        const cen = Array.from({ length: k }, (_, c) => { const m = P.filter((p, i) => lab[i] === c && i % 2 === 0); return Array.from({ length: D }, (_, d) => m.reduce((s, p) => s + p[d], 0) / m.length); });
        const near = (p, set) => set.reduce((b, c, i) => (Math.hypot(...sub(p, cen[c])) < Math.hypot(...sub(p, cen[b])) ? c : b), set[0]);
        const cls = [[0], [1], [2, 3], [4], [5]], cof = c => cls.findIndex(x => x.includes(c));
        let ok = 0, n = 0; P.forEach((p, i) => { if (i % 2) { const pr = near(p, [0, 1, 2, 3, 4, 5]); ok += cof(pr) === cof(lab[i]); n++; } });
        let ok2 = 0, n2 = 0; P.forEach((p, i) => { if (i % 2 && (lab[i] === 2 || lab[i] === 3)) { ok2 += near(p, [2, 3]) === lab[i]; n2++; } });
        return `Held-out voice-class accuracy ${(ok / n * 100).toFixed(0)}% · tenor Fach (lyric vs dramatic) ${(ok2 / n2 * 100).toFixed(0)}% (chance 50%)`;
      } }
  ];
  let si = 0, par = SETS[0].par.def, noise = .35, flat = 1, hull = true, spin = true, only = -1, pts = [], cent = [], rot = { x: .35, y: .6 }, dirty = true, ev = [], metric = '';
  function gen() {
    const S = SETS[si], r = PRISM.seeded(31), K = S.groups.length, cs = S.build(par, r), raw = [], lab = [], rr = PRISM.seeded(77);
    cs.forEach((c, k) => { for (let i = 0; i < PER; i++) { raw.push(c.map(x => x + PRISM.gauss(rr) * (.6 + noise * 1.8))); lab.push(k); } });
    const n = raw.length, mean = Array.from({ length: D }, (_, d) => raw.reduce((s, p) => s + p[d], 0) / n);
    const X = raw.map(p => p.map((v, d) => v - mean[d])), C = Array.from({ length: D }, (_, a) => Array.from({ length: D }, (_, b) => X.reduce((s, p) => s + p[a] * p[b], 0) / n)), cov = C.map(r => r.slice());
    const comps = [];
    for (let c = 0; c < 3; c++) { let v = Array.from({ length: D }, (_, i) => 1 + i * .1); for (let it = 0; it < 150; it++) { const w = C.map(row => row.reduce((s, x, j) => s + x * v[j], 0)), m = Math.hypot(...w); v = w.map(x => x / m); } const lam = C.map(row => row.reduce((s, x, j) => s + x * v[j], 0)).reduce((s, x, j) => s + x * v[j], 0); comps.push({ v, lam }); for (let a = 0; a < D; a++) for (let b = 0; b < D; b++) C[a][b] -= lam * v[a] * v[b]; }
    const tot = cov.reduce((s, r, i) => s + r[i], 0), P = X.map(p => comps.map(c => p.reduce((s, x, d) => s + x * c.v[d], 0)));
    const sc = 1 / Math.max(...P.flat().map(Math.abs)); P.forEach(p => { p[0] *= sc; p[1] *= sc; p[2] *= sc; });
    pts = P.map((p, i) => ({ p, k: lab[i] })); cent = S.groups.map((_, k) => { const m = pts.filter(q => q.k === k); return [0, 1, 2].map(a => m.reduce((s, q) => s + q.p[a], 0) / m.length); });
    ev = comps.map(c => c.lam / tot); metric = S.metrics(raw, lab, K);
  }
  const legend = document.getElementById('lat-cl');
  function setInfo() {
    const S = SETS[si]; info.innerHTML = '';
    info.append(PRISM.el('h3', { text: S.label }), PRISM.el('p', { text: S.txt }),
      PRISM.el('p', { class: 'kv', text: metric }),
      PRISM.el('p', { class: 'kv', text: `PC1–3 carry ${(ev.reduce((a, b) => a + b, 0) * 100).toFixed(0)}% of variance (${ev.map(v => (v * 100).toFixed(0) + '%').join(' / ')}) · ${pts.length} synthetic points in 8-D` + (flat < .99 ? ` · depth ${(flat * 100).toFixed(0)}%` : '') }));
  }
  function legendBuild() {
    legend.textContent = '';
    SETS[si].groups.forEach((g, k) => { const b = PRISM.el('button', { class: 'tog', type: 'button', 'aria-pressed': only === k }, PRISM.el('span', { class: 'dot', style: '--c:' + g.c }), document.createTextNode(g.n)); b.onclick = () => { only = only === k ? -1 : k; legendBuild(); update3d(); draw2d(); }; legend.append(b); });
  }
  let renderer, scene, cam, cloud, centers, group, drag = null; const use3d = PRISM.webgl();
  function build3d() {
    if (!use3d) return;
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(40, 1, .1, 20); cam.position.z = 4;
    group = new THREE.Group(); scene.add(group); scene.add(new THREE.AmbientLight(0xffffff, .9));
    group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]].map(a => new THREE.Vector3(...a))), new THREE.LineBasicMaterial({ color: 0x555a88 })));
    const g = new THREE.BufferGeometry(); const n = PER * 6; g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    cloud = new THREE.Points(g, new THREE.PointsMaterial({ size: .07, vertexColors: true, sizeAttenuation: true })); group.add(cloud);
    centers = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(.08), new THREE.MeshBasicMaterial({ color: 0xffffff })); group.add(m); return m; });
  }
  function update3d() {
    if (!use3d || !cloud) return; const S = SETS[si], pa = cloud.geometry.attributes.position, ca = cloud.geometry.attributes.color, c = new THREE.Color();
    cloud.geometry.setDrawRange(0, pts.length);
    pts.forEach((q, i) => { pa.setXYZ(i, q.p[0], q.p[1], q.p[2] * flat); c.set(S.groups[q.k].c); if (only >= 0 && only !== q.k) c.multiplyScalar(.15); ca.setXYZ(i, c.r, c.g, c.b); });
    pa.needsUpdate = ca.needsUpdate = true;
    centers.forEach((m, k) => { const g = S.groups[k]; m.visible = !!g && hull && (only < 0 || only === k); if (g) { m.material.color.set(g.c); m.position.set(cent[k][0], cent[k][1], cent[k][2] * flat); } });
    dirty = true;
  }
  function size() { const w = cv.parentElement.clientWidth, h = Math.round(Math.min(460, Math.max(300, w * .7))); if (use3d) { renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); } cv.style.height = h + 'px'; dirty = true; }
  function draw2d() {
    if (use3d) return; const c = document.getElementById('lat-canvas2d'), x = c.getContext('2d'), S = SETS[si]; x.clearRect(0, 0, c.width, c.height); x.fillStyle = '#0b0d20'; x.fillRect(0, 0, c.width, c.height);
    pts.forEach(q => { x.globalAlpha = only >= 0 && only !== q.k ? .12 : .9; x.fillStyle = S.groups[q.k].c; x.beginPath(); x.arc(c.width / 2 + q.p[0] * 360, c.height / 2 - q.p[1] * 190, 4, 0, 7); x.fill(); }); x.globalAlpha = 1;
  }
  const parRange = document.getElementById('lat-par'), parV = document.getElementById('lat-par-v'), parL = document.getElementById('lat-par-label');
  function refresh() { gen(); setInfo(); update3d(); draw2d(); }
  function setSet(i) { si = i; only = -1; const S = SETS[i]; par = S.par.def; parRange.value = par; parL.textContent = S.par.label; parV.textContent = S.par.fmt(par); legendBuild(); refresh(); }
  PRISM.radios(document.getElementById('lat-rep'), SETS.map((s, i) => ({ label: s.label, value: i })), v => setSet(v), 0);
  parRange.addEventListener('input', e => { par = +e.target.value; parV.textContent = SETS[si].par.fmt(par); refresh(); });
  document.getElementById('lat-noise').addEventListener('input', e => { noise = +e.target.value / 100; refresh(); });
  const dimV = document.getElementById('lat-dim-v');
  document.getElementById('lat-dim').addEventListener('input', e => { flat = +e.target.value / 100; dimV.textContent = flat > .98 ? '3D' : flat < .02 ? '2D (flattened)' : Math.round(flat * 100) + '% depth'; setInfo(); update3d(); });
  PRISM.pressed(document.getElementById('lat-hull'), v => { hull = v; update3d(); });
  PRISM.pressed(document.getElementById('lat-spin'), v => { spin = v; dirty = true; });
  build3d(); setSet(si);
  if (use3d) {
    new ResizeObserver(size).observe(cv.parentElement); size();
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); spin = false; document.getElementById('lat-spin').setAttribute('aria-pressed', false); });
    cv.addEventListener('pointermove', e => { if (!drag) return; rot.y += (e.clientX - drag.x) * .01; rot.x += (e.clientY - drag.y) * .01; drag = { x: e.clientX, y: e.clientY }; dirty = true; });
    cv.addEventListener('pointerup', () => drag = null);
    cv.addEventListener('keydown', e => { const k = { ArrowLeft: [0, -.15], ArrowRight: [0, .15], ArrowUp: [-.15, 0], ArrowDown: [.15, 0] }[e.key]; if (k) { e.preventDefault(); rot.x += k[0]; rot.y += k[1]; dirty = true; } });
    let vis = true; PRISM.visible(cv, v => vis = v);
    (function loop() { requestAnimationFrame(loop); if (!vis) return; if (spin && !PRISM.reduced()) { rot.y += .004; dirty = true; } if (!dirty) return; dirty = false; group.rotation.set(rot.x, rot.y, 0); renderer.render(scene, cam); })();
  }
})();
