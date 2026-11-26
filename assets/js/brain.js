/* Module 1: cortical model built from the ICBM152 MNI template surface, with AAL parcels (see tools/make_brain_mesh.py). */
(function () {
  const cv = document.getElementById('brain-canvas'); if (!cv) return;
  const host = document.getElementById('brain-regions'), info = document.getElementById('brain-info'), status = document.getElementById('brain-status');
  const AUD = '#4A90E2', MOT = '#36CFC9', PRO = '#EF78B3', INT = '#F2C572', SEQ = '#A794F0';
  // Curated groups of AAL parcels (odd = left, even = right). Function notes are summaries of the cited literature, not lab findings.
  const GROUPS = [
    { id: 'hg', name: "Heschl's gyrus (primary auditory cortex)", short: "Heschl's gyrus", c: AUD, l: [79, 80], deep: true,
      t: "Transverse temporal gyrus on the superior temporal plane, buried in the Sylvian fissure. Primary auditory cortex lies here, where cortical analysis of frequency and pitch-related information begins. Selecting it ghosts the surrounding cortex so the gyrus shows through." },
    { id: 'stg', name: 'Superior temporal gyrus (auditory association cortex)', short: 'Superior temporal gyrus', c: '#7DB2F0', l: [81, 82],
      t: 'Auditory association cortex, including the planum temporale behind Heschl\'s gyrus. Spectrotemporal, melodic, and voice-related processing extends along this gyrus and into the neighboring superior temporal sulcus.' },
    { id: 'ifg', name: "Inferior frontal gyrus (Broca's area and right homologue)", short: 'Inferior frontal gyrus', c: PRO, l: [11, 12, 13, 14],
      t: 'Pars opercularis and pars triangularis. Involved in sequencing and structure in language and music; source modeling of the early right anterior negativity (ERAN) to harmonic violations has pointed to bilateral inferior frontal cortex (Maess et al., 2001).' },
    { id: 'pre', name: 'Precentral gyrus (primary motor cortex)', short: 'Precentral gyrus', c: MOT, l: [1, 2],
      t: 'Primary motor cortex. Its ventral portion contains the laryngeal and articulator representations that command voicing and singing, and premotor cortex at its anterior border supports auditory-motor mapping.' },
    { id: 'rol', name: 'Rolandic operculum (ventral sensorimotor cortex)', short: 'Rolandic operculum', c: '#7FE3DE', l: [17, 18],
      t: 'Ventral sensorimotor cortex bordering the Sylvian fissure. Orofacial and laryngeal sensorimotor representations here contribute to phonation, articulation, and feedback-based vocal control.' },
    { id: 'post', name: 'Postcentral gyrus (somatosensory cortex)', short: 'Postcentral gyrus', c: '#9CEBE6', l: [57, 58],
      t: 'Primary somatosensory cortex. Provides orofacial and laryngeal somatosensory feedback during voicing, complementing auditory feedback.' },
    { id: 'smg', name: 'Supramarginal gyrus', short: 'Supramarginal gyrus', c: SEQ, l: [63, 64],
      t: 'Inferior parietal region adjacent to the Sylvian parieto-temporal area (Spt). Implicated in auditory-motor integration and in auditory working memory, including memory for pitch.' },
    { id: 'sma', name: 'Supplementary motor area', short: 'Supplementary motor area', c: '#C9BBFA', l: [19, 20],
      t: 'Medial premotor cortex. Contributes to sequencing, timing, internally generated rhythm, and the imagery of music and singing.' },
    { id: 'ins', name: 'Insula', short: 'Insula', c: INT, l: [29, 30], deep: true,
      t: 'Buried beneath the Sylvian fissure. Integrates auditory, interoceptive, and motor signals; implicated in vocal control and in the processing of emotional voice.' },
    { id: 'mpfc', name: 'Medial superior frontal gyrus (medial prefrontal cortex)', short: 'Medial prefrontal', c: '#F7DA9E', l: [23, 24],
      t: 'Midline frontal cortex linked to self-referential processing. A candidate region in studies of self-voice perception and identity. Visible from the front or with the sagittal cut.' },
    { id: 'cb', name: 'Cerebellum', short: 'Cerebellum', c: '#8FA0C8', l: Array.from({ length: 26 }, (_, i) => 91 + i),
      t: 'Contributes to fine timing and to error-based adaptation of movement, including the control of vocal pitch and timing.' },
    { id: 'thal', name: 'Thalamus (includes medial geniculate body)', short: 'Thalamus', c: '#6FA8F0', l: [77, 78], deepOnly: true,
      t: 'The medial geniculate body, the auditory relay between midbrain and cortex, is part of the thalamus. Shown inside the translucent cortex.' },
    { id: 'bg', name: 'Basal ganglia (caudate, putamen, pallidum)', short: 'Basal ganglia', c: '#F28FC0', l: [71, 72, 73, 74, 75, 76], deepOnly: true,
      t: 'Contribute to action selection, sequencing, and beat-based timing. Shown inside the translucent cortex.' }
  ];
  const label2g = new Map(); GROUPS.forEach((g, i) => g.l.forEach(k => label2g.set(k, i)));
  const SC = 0.0125;
  let sel = -1, dirty = true, spin = false, drag = null, moved = 0, rot = { x: .05, y: Math.PI / 2 }, tz = 3.7, opacity = 1, cut = -70;
  let T = null; // loaded THREE objects

  async function load() {
    const url = 'assets/data/brain.bin.gz';
    const r = await fetch(url); if (!r.ok) throw new Error('mesh ' + r.status);
    const buf = await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const dv = new DataView(buf), nV = dv.getUint32(0, true), nF = dv.getUint32(4, true), dV = dv.getUint32(8, true), dF = dv.getUint32(12, true);
    const c = [dv.getFloat32(16, true), dv.getFloat32(20, true), dv.getFloat32(24, true)], s = dv.getFloat32(28, true);
    let o = 32; const take = (Ctor, n) => { const a = new Ctor(buf, o, n); o += Math.ceil(a.byteLength / 4) * 4; return a; };
    const P = take(Int16Array, nV * 3), Lb = take(Uint8Array, nV), Fi = take(Uint32Array, nF * 3), DP = take(Int16Array, dV * 3), DL = take(Uint8Array, dV), DFi = take(Uint32Array, dF * 3);
    const toPos = q => { const a = new Float32Array(q.length); for (let i = 0; i < q.length; i += 3) { const x = q[i] * s, y = q[i + 1] * s, z = q[i + 2] * s; a[i] = x * SC; a[i + 1] = z * SC; a[i + 2] = -y * SC; } return a; };
    return { c, s, nV, nF, pos: toPos(P), lab: Lb, idx: Fi, dpos: toPos(DP), dlab: DL, didx: DFi };
  }

  function start(D) {
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.localClippingEnabled = true;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, 1, .1, 50); cam.position.z = tz;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3560, .75));
    const key = new THREE.DirectionalLight(0xffffff, .75); key.position.set(2, 3, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0x36CFC9, .35); rim.position.set(-4, 1, -3); scene.add(rim);
    const group = new THREE.Group(); scene.add(group);
    const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), wplane = new THREE.Plane();

    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(D.pos, 3)); geo.setIndex(new THREE.BufferAttribute(D.idx, 1)); geo.computeVertexNormals();
    const col = new Float32Array(D.nV * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 18, specular: 0x2a2a44, clippingPlanes: [wplane], side: THREE.FrontSide });
    const mesh = new THREE.Mesh(geo, mat); group.add(mesh);
    const cap = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xA89AAE, side: THREE.BackSide, clippingPlanes: [wplane] })); group.add(cap);

    const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(D.dpos, 3)); dgeo.setIndex(new THREE.BufferAttribute(D.didx, 1)); dgeo.computeVertexNormals();
    const dcol = new Float32Array(D.dlab.length * 3); dgeo.setAttribute('color', new THREE.BufferAttribute(dcol, 3));
    const dmesh = new THREE.Mesh(dgeo, new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 30, clippingPlanes: [wplane] })); group.add(dmesh);

    const patchGeo = new THREE.BufferGeometry(); patchGeo.setAttribute('position', new THREE.BufferAttribute(D.pos, 3));
    const patch = new THREE.Mesh(patchGeo, new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 20, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, clippingPlanes: [wplane] })); patch.visible = false; group.add(patch);
    function setPatch(g) {
      if (!g) { patch.visible = false; return; }
      const set = new Set(g.l), out = []; for (let f = 0; f < D.nF; f++) { const a = D.idx[f * 3], b = D.idx[f * 3 + 1], c = D.idx[f * 3 + 2]; if (set.has(D.lab[a]) || set.has(D.lab[b]) || set.has(D.lab[c])) out.push(a, b, c); }
      patchGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(out), 1)); patchGeo.computeVertexNormals(); patch.material.color.set(g.c); patch.visible = out.length > 0;
    }
    const base = new THREE.Color('#C9C0D4'), tmp = new THREE.Color();
    function paint() {
      const gc = GROUPS.map(g => new THREE.Color(g.c));
      for (let i = 0; i < D.nV; i++) {
        const g = label2g.get(D.lab[i]);
        if (g === undefined || GROUPS[g].deepOnly) tmp.copy(base).multiplyScalar(sel >= 0 ? .78 : 1);
        else { tmp.copy(gc[g]); if (sel >= 0) { if (sel === g) tmp.lerp(new THREE.Color('#fff'), .15); else tmp.copy(base).multiplyScalar(.7).lerp(gc[g], .18); } else tmp.lerp(base, .15); }
        col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
      }
      for (let i = 0; i < D.dlab.length; i++) {
        const g = label2g.get(D.dlab[i]); tmp.copy(gc[g]); if (sel >= 0 && sel !== g) tmp.multiplyScalar(.45); dcol[i * 3] = tmp.r; dcol[i * 3 + 1] = tmp.g; dcol[i * 3 + 2] = tmp.b;
      }
      geo.attributes.color.needsUpdate = dgeo.attributes.color.needsUpdate = true; dirty = true;
    }
    function size() { const w = cv.parentElement.clientWidth, h = Math.round(Math.min(520, Math.max(320, w * .78))); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false); cv.style.height = h + 'px'; cam.aspect = w / h; cam.updateProjectionMatrix(); dirty = true; }
    new ResizeObserver(size).observe(cv.parentElement); size();

    // interaction
    const clampX = v => Math.max(-1.5, Math.min(1.5, v));
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; moved = 0; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy); drag = { x: e.clientX, y: e.clientY }; rot.y += dx * .008; rot.x = clampX(rot.x + dy * .008); dirty = true; });
    cv.addEventListener('pointerup', e => { drag = null; if (moved < 5) pick(e); });
    cv.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY * .003); }, { passive: false });
    cv.addEventListener('keydown', e => {
      const k = { ArrowLeft: [0, -.15], ArrowRight: [0, .15], ArrowUp: [-.15, 0], ArrowDown: [.15, 0] }[e.key];
      if (k) { e.preventDefault(); rot.x = clampX(rot.x + k[0]); rot.y += k[1]; dirty = true; }
      if (e.key === '+' || e.key === '=') zoom(-.3); if (e.key === '-') zoom(.3);
    });
    function zoom(d) { tz = Math.max(2.4, Math.min(7, tz + d * 2)); dirty = true; }
    const $ = id => document.getElementById(id);
    $('brain-zin').onclick = () => zoom(-.2); $('brain-zout').onclick = () => zoom(.2);
    const VIEWS = { left: [.05, Math.PI / 2], right: [.05, -Math.PI / 2], top: [1.5, Math.PI / 2], front: [.05, Math.PI], back: [.05, 0] };
    document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { const v = VIEWS[b.dataset.view]; rot = { x: v[0], y: v[1] }; dirty = true; });
    $('brain-reset').onclick = () => { rot = { x: .05, y: Math.PI / 2 }; tz = 3.7; $('brain-opacity').value = 100; $('brain-cut').value = -70; setOpacity(1); setCut(-70); select(-1); };
    PRISM.pressed($('brain-spin'), v => { spin = v && !PRISM.reduced(); dirty = true; });
    function setOpacity(v) { opacity = v; mat.transparent = v < 1; mat.opacity = v; mat.depthWrite = v >= .98; cap.visible = v >= .98; mat.needsUpdate = true; $('brain-opacity-v').textContent = Math.round(v * 100) + '%'; dirty = true; }
    function setCut(mm) { cut = mm; $('brain-cut-v').textContent = mm <= -69 ? 'off' : 'x = ' + mm + ' mm'; dirty = true; }
    $('brain-opacity').addEventListener('input', e => setOpacity(+e.target.value / 100));
    $('brain-cut').addEventListener('input', e => setCut(+e.target.value));

    const ray = new THREE.Raycaster(), m2 = new THREE.Vector2();
    function pick(e) {
      const r = cv.getBoundingClientRect(); m2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(m2, cam); group.updateMatrixWorld(true);
      const test = (m, L, iface) => { const hs = ray.intersectObject(m).filter(h => wplane.distanceToPoint(h.point) >= 0); return hs.length ? { h: hs[0], L } : null; };
      let hit = opacity < .6 ? (test(dmesh, D.dlab) || test(mesh, D.lab)) : test(mesh, D.lab) || test(dmesh, D.dlab);
      if (!hit) return select(-1);
      const i = hit.h.face.a, g = label2g.get(hit.L[i]);
      const p = group.worldToLocal(hit.h.point.clone()); lastMNI = [Math.round(p.x / SC + D.c[0]), Math.round(-p.z / SC + D.c[1]), Math.round(p.y / SC + D.c[2])];
      const lbl = hit.L[i]; hemi = lbl % 2 ? 'left' : 'right';
      select(g === undefined ? -1 : g, true);
    }
    let lastMNI = null, hemi = '', isolate = false, userOpacity = null;
    PRISM.pressed($('brain-iso'), v => { isolate = v; if (sel >= 0) select(sel); });
    function select(k, fromPick) {
      sel = k; paint(); dmesh.visible = k < 0 || !!GROUPS[k].deepOnly;
      if (k < 0) { setPatch(null); if (userOpacity != null) { setOpacityUI(userOpacity); userOpacity = null; } }
      [...host.children].forEach((b, i) => b.setAttribute('aria-pressed', i === k));
      info.innerHTML = '';
      if (k < 0) { info.append(PRISM.el('h3', { text: 'Select a region' }), PRISM.el('p', { class: 'muted', text: 'Click the brain or use the list. Grey surface is cortex outside the curated auditory-vocal regions.' })); return; }
      const g = GROUPS[k];
      info.append(PRISM.el('h3', { text: g.name }), PRISM.el('p', { text: g.t }));
      const parts = ['AAL parcellation on ICBM152 MNI template'];
      if (fromPick && lastMNI) parts.unshift(`${hemi} hemisphere, MNI (${lastMNI.join(', ')}) mm`);
      info.append(PRISM.el('p', { class: 'kv', text: parts.join(' · ') }));
      const ghost = isolate || g.deep || g.deepOnly;
      if (ghost) { if (userOpacity == null) userOpacity = opacity; setOpacityUI(.18); setPatch(g.deepOnly ? null : g); }
      else { setPatch(null); if (userOpacity != null) { setOpacityUI(userOpacity); userOpacity = null; } }
    }
    function setOpacityUI(v) { $('brain-opacity').value = v * 100; setOpacity(v); }
    function setCutUI(v) { $('brain-cut').value = v; setCut(v); }
    GROUPS.forEach((g, i) => {
      const b = PRISM.el('button', { class: 'tog', type: 'button', 'aria-pressed': 'false' }, PRISM.el('span', { class: 'dot', style: '--c:' + g.c }), document.createTextNode(g.short));
      b.addEventListener('click', () => select(sel === i ? -1 : i)); host.append(b);
    });
    paint(); select(-1); setOpacity(1); setCut(-70);
    if (status) status.hidden = true;
    let vis = true; PRISM.visible(cv, v => { vis = v; dirty = true; });
    (function loop() {
      requestAnimationFrame(loop); if (!vis) return;
      if (spin && !PRISM.reduced()) { rot.y += .005; dirty = true; }
      if (!dirty) return; dirty = false;
      group.rotation.x += (rot.x - group.rotation.x) * .25; group.rotation.y += (rot.y - group.rotation.y) * .25;
      cam.position.z += (tz - cam.position.z) * .25;
      group.updateMatrixWorld(true);
      // sagittal cut plane in anatomical (local) coordinates: keep x >= cut
      plane.set(new THREE.Vector3(1, 0, 0), -((cut - D.c[0]) * SC)); wplane.copy(plane).applyMatrix4(group.matrixWorld);
      if (cut <= -69) wplane.constant = 1e3, wplane.normal.set(0, 0, 0);
      if (Math.abs(group.rotation.y - rot.y) > .002 || Math.abs(group.rotation.x - rot.x) > .002 || Math.abs(cam.position.z - tz) > .002) dirty = true;
      renderer.render(scene, cam);
    })();
    group.rotation.set(rot.x, rot.y, 0);
  }

  if (!PRISM.webgl() || typeof DecompressionStream === 'undefined') { document.documentElement.classList.add('no-webgl'); GROUPS.forEach(g => host.append(PRISM.el('p', { text: g.name + ': ' + g.t, class: 'muted' }))); return; }
  if (status) status.textContent = 'Loading cortical surface (2.7 MB)…';
  load().then(start).catch(err => { if (status) status.textContent = 'Could not load the 3D surface (' + err.message + '). Region descriptions are listed below.'; GROUPS.forEach(g => host.append(PRISM.el('p', { text: g.name + ': ' + g.t, class: 'muted' }))); });
})();
