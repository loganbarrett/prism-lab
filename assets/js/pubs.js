(function () {
  const pubs = JSON.parse(document.getElementById('pubs-data').textContent);
  const areas = JSON.parse(document.getElementById('areas-data').textContent);
  const q = document.getElementById('pf-q'), y = document.getElementById('pf-year'), t = document.getElementById('pf-type'), a = document.getElementById('pf-area');
  const list = document.getElementById('pf-list'), count = document.getElementById('pf-count'), empty = document.getElementById('pf-empty');
  function render() {
    const s = q.value.toLowerCase();
    const r = pubs.filter(p => (!y.value || String(p.year || 'Unpublished') === y.value) && (!t.value || (p.type || 'Article') === t.value) &&
      (!a.value || (p.areas || []).includes(a.value)) &&
      (!s || [p.title, (p.authors || []).join(' '), p.venue, (p.keywords || []).join(' ')].join(' ').toLowerCase().includes(s)))
      .sort((m, n) => (n.year || 9999) - (m.year || 9999));
    list.textContent = '';
    r.forEach(p => {
      const d = document.createElement('article'); d.className = 'pub';
      const h = document.createElement('h3'); h.style.fontSize = '1.05rem';
      h.textContent = p.title;
      const m = document.createElement('p'); m.className = 'muted'; m.style.margin = '0';
      m.textContent = [(p.authors || []).join(', '), p.venue, p.year || ''].filter(Boolean).join(' · ');
      d.append(h, m);
      (p.areas || []).forEach(id => { const c = document.createElement('span'); c.className = 'chip'; c.textContent = areas[id] || id; d.append(c); });
      if (p.status) { const c = document.createElement('span'); c.className = 'badge-synth'; c.style.marginRight = '.4rem'; c.textContent = p.status; h.prepend(c); }
      (p.links || []).forEach(k => { if (!k.url) return; const l = document.createElement('a'); l.href = k.url; l.className = 'chip'; l.textContent = k.label; d.append(l); });
      if (p.file) { const l = document.createElement('a'); l.href = p.file; l.className = 'chip'; l.setAttribute('download', ''); l.textContent = 'Download ' + (p.status === 'Published' ? '' : 'draft ') + p.file.split('.').pop().toUpperCase(); d.append(l); }
      if (p.open_url) { const l = document.createElement('a'); l.href = p.open_url; l.textContent = 'Open materials'; l.className = 'chip'; d.append(l); }
      list.append(d);
    });
    empty.hidden = pubs.length > 0;
    count.textContent = pubs.length ? `${r.length} of ${pubs.length} publications` : '';
  }
  [q, y, t, a].forEach(e => e.addEventListener('input', render)); render();
})();
