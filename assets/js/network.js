/* Module 6: conceptual auditory-vocal network (SVG, keyboard accessible) */
(function () {
  const svg = document.getElementById('net-svg'); if (!svg) return;
  const info = document.getElementById('net-info'), NS = 'http://www.w3.org/2000/svg';
  const PATH = { perc: { label: 'Auditory perception', c: '#4A90E2' }, prod: { label: 'Vocal production', c: '#36CFC9' }, fb: { label: 'Feedback and control', c: '#EF78B3' }, self: { label: 'Voice and self', c: '#F2C572' } };
  const N = {
    coch: ['Cochlea', 60, 450, 'Converts sound into neural signals, organized by frequency.'], bs: ['Brainstem and midbrain', 190, 450, 'Cochlear nuclei and inferior colliculus: early auditory processing, including timing and localization cues.'],
    mgb: ['Thalamus (MGB)', 320, 450, 'Medial geniculate body relays auditory information to cortex.'], a1: ['Primary auditory cortex', 440, 390, 'First cortical stage for the auditory signal, with a frequency (tonotopic) organization.'],
    stg: ['Auditory association cortex', 570, 330, 'Superior temporal regions that integrate spectrotemporal features such as pitch contour and timbre.'], sts: ['STS voice regions', 710, 410, 'Regions responsive to vocal sounds, associated with voice identity.'],
    mpfc: ['Medial prefrontal cortex', 810, 270, 'Self-referential processing; one candidate region for self-voice and identity evaluation.'], ins: ['Insula', 320, 300, 'Integrates interoceptive, affective, and auditory-motor signals; implicated in vocal control and emotional voice processing.'],
    spt: ['Auditory–motor interface (Spt)', 560, 200, 'Posterior Sylvian region proposed to translate auditory targets into motor plans.'], ifg: ['Inferior frontal gyrus', 410, 110, 'Sequencing and selection; implicated in musical and linguistic structure.'],
    pmc: ['Premotor cortex', 570, 65, 'Plans and sequences movements; active during rhythm, imitation, and singing.'], m1: ['Motor cortex (larynx area)', 710, 110, 'Commands laryngeal and articulatory muscles.'],
    bsm: ['Brainstem motor nuclei', 810, 170, 'Cranial motor nuclei (for example nucleus ambiguus) that drive the muscles of the larynx.'], voc: ['Larynx and vocal tract', 830, 60, 'The effector: produces the sound that is then heard by the speaker and others.'],
    bg: ['Basal ganglia', 190, 160, 'Contribute to action selection, sequencing, and beat-based timing.'], cb: ['Cerebellum', 150, 290, 'Fine timing and error-based adaptation of movement, including vocal control.']
  };
  const E = [['coch', 'bs', 'perc'], ['bs', 'mgb', 'perc'], ['mgb', 'a1', 'perc'], ['a1', 'stg', 'perc'], ['stg', 'sts', 'perc'],
    ['ifg', 'pmc', 'prod'], ['pmc', 'm1', 'prod'], ['m1', 'bsm', 'prod'], ['bsm', 'voc', 'prod'], ['bg', 'pmc', 'prod'],
    ['stg', 'spt', 'fb'], ['spt', 'pmc', 'fb'], ['spt', 'ifg', 'fb'], ['voc', 'coch', 'fb'], ['cb', 'm1', 'fb'], ['cb', 'spt', 'fb'], ['ins', 'm1', 'fb'],
    ['sts', 'mpfc', 'self'], ['ins', 'mpfc', 'self'], ['stg', 'ins', 'self']];
  const on = { perc: true, prod: true, fb: true, self: true }; let sel = null;
  const mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const edgeEls = E.map(([a, b, t]) => {
    const [, x1, y1] = N[a], [, x2, y2] = N[b], mx = (x1 + x2) / 2, my = (y1 + y2) / 2, cx = mx + (y2 - y1) * .12, cy = my - (x2 - x1) * .12;
    const p = mk('path', { d: `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`, fill: 'none', stroke: PATH[t].c, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'marker-end': 'url(#arr-' + t + ')', 'stroke-dasharray': t === 'fb' ? '6 5' : t === 'self' ? '2 6' : '' });
    svg.append(p); return p;
  });
  const defs = mk('defs', {}); Object.keys(PATH).forEach(t => { const m = mk('marker', { id: 'arr-' + t, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }); m.append(mk('path', { d: 'M0,0L10,5L0,10z', fill: PATH[t].c })); defs.append(m); }); svg.prepend(defs);
  const nodeEls = {};
  Object.entries(N).forEach(([id, [name, x, y]]) => {
    const g = mk('g', { tabindex: 0, role: 'button', 'aria-label': name, 'aria-pressed': 'false', style: 'cursor:pointer;outline:none' });
    const c = mk('circle', { cx: x, cy: y, r: 19, fill: '#171a3a', stroke: '#F7F8FC', 'stroke-width': 2 });
    const t = mk('text', { x, y: y + 36, 'text-anchor': 'middle', fill: '#F7F8FC', 'font-size': 13, 'font-family': 'Inter,sans-serif', 'paint-order': 'stroke', stroke: '#0b0d20', 'stroke-width': 4 }); t.textContent = name;
    g.append(c, t); svg.append(g); nodeEls[id] = g;
    g.addEventListener('click', () => select(sel === id ? null : id));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(sel === id ? null : id); } });
    g.addEventListener('focus', () => c.setAttribute('stroke', '#F2C572')); g.addEventListener('blur', () => c.setAttribute('stroke', '#F7F8FC'));
  });
  function update() {
    E.forEach(([a, b, t], i) => { const vis = on[t], hot = sel && (a === sel || b === sel); edgeEls[i].style.display = vis ? '' : 'none'; edgeEls[i].style.opacity = sel ? (hot ? 1 : .12) : .85; edgeEls[i].setAttribute('stroke-width', hot ? 4 : 2.5); });
    Object.entries(nodeEls).forEach(([id, g]) => {
      const nb = new Set(); E.forEach(([a, b, t]) => { if (on[t]) { if (a === sel) nb.add(b); if (b === sel) nb.add(a); } });
      g.style.opacity = !sel || id === sel || nb.has(id) ? 1 : .3; g.setAttribute('aria-pressed', id === sel);
      g.firstChild.setAttribute('fill', id === sel ? '#7155D9' : '#171a3a');
    });
    info.innerHTML = '';
    if (!sel) { info.append(PRISM.el('h3', { text: 'Select a node' }), PRISM.el('p', { class: 'muted', text: 'Tab to move between nodes; press Enter to select.' })); return; }
    const out = [], inn = []; E.forEach(([a, b, t]) => { if (!on[t]) return; if (a === sel) out.push([N[b][0], t]); if (b === sel) inn.push([N[a][0], t]); });
    info.append(PRISM.el('h3', { text: N[sel][0] }), PRISM.el('p', { text: N[sel][3] }));
    const list = (h, arr) => { if (!arr.length) return; info.append(PRISM.el('p', { class: 'kv', text: h + ': ' + arr.map(x => `${x[0]} (${PATH[x[1]].label.toLowerCase()})`).join('; ') })); };
    list('Sends to', out); list('Receives from', inn);
    info.append(PRISM.el('p', { class: 'kv', text: 'Conceptual simplification. Real connectivity is far denser and bidirectional.' }));
  }
  function select(id) { sel = id; update(); }
  const host = document.getElementById('net-paths');
  Object.entries(PATH).forEach(([k, v]) => {
    const b = PRISM.el('button', { class: 'tog', type: 'button', 'aria-pressed': 'true' }, PRISM.el('span', { class: 'dot', style: '--c:' + v.c }), document.createTextNode(v.label));
    PRISM.pressed(b, s => { on[k] = s; update(); }); host.append(b);
  });
  update();
})();
