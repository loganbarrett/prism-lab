/* shared: nav toggle, reduced-motion preference, tiny helpers */
(function () {
  const root = document.documentElement;
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = [];
  const P = window.PRISM = {
    reduced() { return root.classList.contains('reduce-motion') || mq.matches; },
    onMotion(fn) { listeners.push(fn); },
    seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); },
    gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); },
    el(tag, attrs, ...kids) {
      const e = document.createElement(tag);
      for (const k in (attrs || {})) k === 'text' ? e.textContent = attrs[k] : e.setAttribute(k, attrs[k]);
      kids.forEach(k => e.append(k)); return e;
    },
    // radio-like toggle group; returns {set(i)}; onPick(value,i)
    radios(host, items, onPick, start = 0) {
      const btns = items.map((it, i) => {
        const b = P.el('button', { class: 'tog', type: 'button', role: 'radio', 'aria-checked': 'false' });
        if (it.color) b.append(P.el('span', { class: 'dot', style: '--c:' + it.color }));
        b.append(document.createTextNode(it.label)); host.append(b);
        b.addEventListener('click', () => set(i));
        b.addEventListener('keydown', e => {
          if (['ArrowRight', 'ArrowDown'].includes(e.key)) { e.preventDefault(); set((cur + 1) % items.length, true); }
          if (['ArrowLeft', 'ArrowUp'].includes(e.key)) { e.preventDefault(); set((cur + items.length - 1) % items.length, true); }
        });
        return b;
      });
      let cur = -1;
      function set(i, focus) {
        cur = i; btns.forEach((b, j) => { b.setAttribute('aria-checked', j === i); b.tabIndex = j === i ? 0 : -1; });
        if (focus) btns[i].focus(); onPick(items[i].value ?? items[i], i);
      }
      set(start); return { set };
    },
    pressed(btn, fn) {
      btn.addEventListener('click', () => { const v = btn.getAttribute('aria-pressed') !== 'true'; btn.setAttribute('aria-pressed', v); fn(v); });
    },
    // run fn only while element is on screen
    visible(el, cb) { new IntersectionObserver(es => cb(es[0].isIntersecting), { threshold: .05 }).observe(el); },
    webgl() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; } }
  };
  mq.addEventListener && mq.addEventListener('change', () => listeners.forEach(f => f()));

  const mb = document.querySelector('.menu-btn'), nl = document.getElementById('nav-list');
  mb && mb.addEventListener('click', () => { const o = nl.classList.toggle('open'); mb.setAttribute('aria-expanded', o); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nl && nl.classList.contains('open')) { nl.classList.remove('open'); mb.setAttribute('aria-expanded', false); mb.focus(); } });

  const mt = document.getElementById('motion-toggle');
  if (mt) {
    const sync = () => { mt.setAttribute('aria-pressed', root.classList.contains('reduce-motion')); mt.textContent = root.classList.contains('reduce-motion') ? 'Motion: off' : 'Reduce motion'; };
    sync();
    mt.addEventListener('click', () => {
      root.classList.toggle('reduce-motion');
      try { localStorage.setItem('prism-reduce', root.classList.contains('reduce-motion') ? '1' : '0'); } catch (e) {}
      sync(); listeners.forEach(f => f());
    });
  }
  if (!P.webgl()) root.classList.add('no-webgl');
})();
