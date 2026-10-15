// Graphiques SVG dessinés à la taille réelle du conteneur (texte net sur mobile).
// Barres empilées : ≤ 24 px, extrémité arrondie 4 px, base carrée, 2 px d'écart
// couleur de fond entre segments, info-bulle par colonne (survol, toucher, clavier).
const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.append(n);
  return n;
};
// Maximum « rond » divisible en 4 graduations entières (10, 20, 30, 40…).
function niceMax(v) {
  const raw = Math.max(1, v) / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 && p >= 10 ? 2.5 : n <= 5 ? 5 : 10) * p * 4;
}
// Rectangle à coins supérieurs arrondis (base carrée).
const topRounded = (x, y, w, h, r) => {
  r = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
};

export function stackedBars(host, { data, series, height = 190, highlight = -1, fmt = String }) {
  const draw = () => {
    const W = host.clientWidth;
    if (!W) return;
    host.querySelector('svg')?.remove();
    const m = { t: 22, r: 6, b: 26, l: 30 };
    const iw = W - m.l - m.r, ih = height - m.t - m.b;
    const totals = data.map((d) => d.values.reduce((a, b) => a + b, 0));
    const max = niceMax(Math.max(1, ...totals));
    const y = (v) => m.t + ih - (v / max) * ih;
    const svg = mk('svg', { width: W, height, viewBox: `0 0 ${W} ${height}`, role: 'img', 'aria-label': host.dataset.label || '' });
    // Grille horizontale, filets de 1 px
    const g = mk('g', { class: 'ch-grid' }, svg);
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i, yy = Math.round(y(v)) + 0.5;
      mk('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy }, g);
      const t = mk('text', { x: m.l - 8, y: yy + 3.5, 'text-anchor': 'end', class: 'ch-tick' }, g);
      t.textContent = fmt(v);
    }
    const band = iw / data.length, bw = Math.min(24, band * 0.56);
    data.forEach((d, i) => {
      const cx = m.l + band * i + band / 2, x = cx - bw / 2;
      const col = mk('g', { class: 'ch-col' + (i === highlight ? ' is-hl' : ''), tabindex: 0, 'data-i': i }, svg);
      mk('rect', { class: 'ch-hit', x: m.l + band * i, y: m.t - 10, width: band, height: ih + 10 }, col);
      let base = m.t + ih, first = true;
      const tot = totals[i];
      d.values.forEach((v, si) => {
        if (!v) return;
        let h = (v / max) * ih;
        if (!first) { h -= 2; base -= 2; }
        if (h <= 0.5) return;
        const isTop = d.values.slice(si + 1).every((x) => !x);
        const yTop = base - h;
        mk('path', { class: `ch-seg ${series[si].cls}`, d: isTop ? topRounded(x, yTop, bw, h, 4) : `M${x},${base}V${yTop}H${x + bw}V${base}Z` }, col);
        base = yTop; first = false;
      });
      const lab = mk('text', { x: cx, y: height - 8, 'text-anchor': 'middle', class: 'ch-x' + (i === highlight ? ' is-hl' : '') }, svg);
      lab.textContent = d.label;
      if (i === highlight && tot) {
        const vt = mk('text', { x: cx, y: y(tot) - 7, 'text-anchor': 'middle', class: 'ch-val' }, svg);
        vt.textContent = fmt(tot);
      }
    });
    host.prepend(svg);
    bindTips(host, svg, data, series, fmt, band, m);
  };
  draw();
  const ro = new ResizeObserver(() => draw());
  ro.observe(host);
  return () => ro.disconnect();
}

// ---------- Courbe miniature (cartes chiffres) ----------
// Décorative : le chiffre et l'évolution sont écrits à côté, en texte.
export function sparkline(values, cls = '') {
  const W = 120, H = 38, n = values.length;
  if (n < 2) return '';
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (n - 1)) * W, H - 4 - ((v - min) / span) * (H - 10)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const area = `${line}L${W},${H}L0,${H}Z`;
  const [lx, ly] = pts[n - 1];
  return `<svg class="spark ${cls}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="spark-a" d="${area}"/><path class="spark-l" d="${line}"/><circle class="spark-d" cx="${lx}" cy="${ly}" r="2.5"/></svg>`;
}

// ---------- Courbe (une série) avec zone, repère au survol et info-bulle ----------
export function lineChart(host, { data, height = 240, fmt = String, tick = fmt }) {
  const draw = () => {
    const W = host.clientWidth;
    if (!W) return;
    host.querySelector('svg')?.remove();
    const m = { t: 26, r: 14, b: 28, l: 46 };
    const iw = W - m.l - m.r, ih = height - m.t - m.b;
    const ints = data.every((d) => Number.isInteger(d.value));
    const max = niceMax(Math.max(ints ? 4 : 1, ...data.map((d) => d.value)));
    const n = data.length;
    const x = (i) => m.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = (v) => m.t + ih - (v / max) * ih;
    const svg = mk('svg', { width: W, height, viewBox: `0 0 ${W} ${height}`, role: 'img', 'aria-label': host.dataset.label || '' });
    const g = mk('g', { class: 'ch-grid' }, svg);
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i, yy = Math.round(y(v)) + 0.5;
      mk('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy }, g);
      const t = mk('text', { x: m.l - 8, y: yy + 3.5, 'text-anchor': 'end', class: 'ch-tick' }, g);
      t.textContent = tick(v);
    }
    const pts = data.map((d, i) => [x(i), y(d.value)]);
    const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join('');
    mk('path', { class: 'ln-area', d: `${line}L${pts[n - 1][0]},${m.t + ih}L${pts[0][0]},${m.t + ih}Z` }, svg);
    mk('path', { class: 'ln-line', d: line }, svg);
    const every = Math.ceil(n / Math.max(4, Math.floor(iw / 58)));
    data.forEach((d, i) => {
      if ((i % every === 0 && n - 1 - i >= Math.ceil(every / 2)) || i === n - 1) { const t = mk('text', { x: x(i), y: height - 8, 'text-anchor': i === 0 && n > 8 ? 'start' : i === n - 1 && n > 8 ? 'end' : 'middle', class: 'ch-x' + (i === n - 1 ? ' is-hl' : '') }, svg); t.textContent = d.label; }
    });
    // Étiquettes choisies : la dernière valeur et la plus haute
    const iMax = data.reduce((b, d, i) => (d.value > data[b].value ? i : b), 0);
    [...new Set([iMax, n - 1])].forEach((i) => {
      if (!data[i].value && i !== n - 1) return;
      const t = mk('text', { x: Math.min(Math.max(x(i), m.l + 20), W - m.r - 20), y: y(data[i].value) - 10, 'text-anchor': 'middle', class: 'ch-val' }, svg);
      t.textContent = fmt(data[i].value);
    });
    const cross = mk('line', { class: 'ln-cross', x1: 0, x2: 0, y1: m.t, y2: m.t + ih }, svg);
    pts.forEach(([px, py], i) => mk('circle', { class: 'ln-pt' + (i === n - 1 ? ' is-last' : ''), cx: px, cy: py, r: 4, 'data-i': i }, svg));
    const band = n === 1 ? iw : iw / (n - 1);
    const hits = mk('g', {}, svg);
    data.forEach((d, i) => {
      const h = mk('rect', { class: 'ch-hit ln-hit', x: Math.max(m.l - 6, x(i) - band / 2), y: m.t - 10, width: band, height: ih + 10, tabindex: 0, 'data-i': i, 'aria-label': `${d.full || d.label} : ${fmt(d.value)}` }, hits);
      h.setAttribute('role', 'img');
    });
    host.prepend(svg);
    let tip = host.querySelector('.ch-tip');
    if (!tip) { tip = document.createElement('div'); tip.className = 'ch-tip'; tip.setAttribute('role', 'tooltip'); host.append(tip); }
    const show = (i) => {
      const d = data[i];
      tip.replaceChildren();
      const hd = document.createElement('p'); hd.className = 'ch-tip-h'; hd.textContent = d.full || d.label;
      const row = document.createElement('p'); row.className = 'ch-tip-r';
      const b = document.createElement('b'); b.textContent = fmt(d.value);
      const s = document.createElement('span'); s.textContent = host.dataset.series || '';
      row.append(b, s); tip.append(hd, row);
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.classList.add('on');
      svg.querySelectorAll('.ln-pt').forEach((c) => c.classList.toggle('is-hover', +c.dataset.i === i));
      tip.classList.add('on');
      const tw = tip.offsetWidth;
      tip.style.left = `${Math.max(0, Math.min(W - tw, x(i) - tw / 2))}px`;
      tip.style.top = `${Math.max(0, y(d.value) - 74)}px`;
    };
    const hide = () => { tip.classList.remove('on'); cross.classList.remove('on'); svg.querySelectorAll('.ln-pt').forEach((c) => c.classList.remove('is-hover')); };
    hits.querySelectorAll('.ln-hit').forEach((h) => {
      const i = +h.dataset.i;
      h.addEventListener('pointerenter', () => show(i)); h.addEventListener('pointerdown', () => show(i));
      h.addEventListener('focus', () => show(i)); h.addEventListener('blur', hide);
    });
    svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
  };
  draw();
  const ro = new ResizeObserver(() => draw());
  ro.observe(host);
  return () => ro.disconnect();
}

// ---------- Anneau de répartition ----------
// Tranches séparées par 2 px couleur de fond, légende avec pourcentages (étiquettes directes).
export function donut(host, { data, fmt = String }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const S = 172, R = S / 2, T = 28, r = R - T;
  const svg = mk('svg', { viewBox: `0 0 ${S} ${S}`, width: S, height: S, role: 'img', 'aria-label': host.dataset.label || '' });
  let a0 = -Math.PI / 2;
  const arc = (a1, a2) => {
    const big = a2 - a1 > Math.PI ? 1 : 0;
    const p = (rad, a) => `${R + rad * Math.cos(a)},${R + rad * Math.sin(a)}`;
    return `M${p(R, a1)}A${R},${R} 0 ${big} 1 ${p(R, a2)}L${p(r, a2)}A${r},${r} 0 ${big} 0 ${p(r, a1)}Z`;
  };
  const slices = data.filter((d) => d.value > 0);
  slices.forEach((d) => {
    const a1 = a0 + (d.value / total) * Math.PI * 2;
    const path = mk('path', { d: arc(a0, Math.min(a1, a0 + Math.PI * 2 - 0.0005)), class: `dn-s ${d.cls}` }, svg);
    path.setAttribute('tabindex', '0');
    path.setAttribute('aria-label', `${d.name} : ${fmt(d.value)}, ${Math.round((d.value / total) * 100)} %`);
    path.dataset.name = d.name;
    a0 = a1;
  });
  host.prepend(svg);
  let tip = host.querySelector('.ch-tip');
  if (!tip) { tip = document.createElement('div'); tip.className = 'ch-tip'; tip.setAttribute('role', 'tooltip'); host.append(tip); }
  const show = (el) => {
    const d = slices.find((x) => x.name === el.dataset.name);
    tip.replaceChildren();
    const hd = document.createElement('p'); hd.className = 'ch-tip-h'; hd.textContent = d.name;
    const row = document.createElement('p'); row.className = 'ch-tip-r';
    const key = document.createElement('i'); key.className = `ch-key ${d.cls}`;
    const b = document.createElement('b'); b.textContent = fmt(d.value);
    const s = document.createElement('span'); s.textContent = `${Math.round((d.value / total) * 100)} %`;
    row.append(key, b, s); tip.append(hd, row);
    svg.querySelectorAll('.dn-s').forEach((p) => p.classList.toggle('is-dim', p !== el));
    tip.classList.add('on'); tip.style.left = '0px'; tip.style.top = '0px';
  };
  const hide = () => { tip.classList.remove('on'); svg.querySelectorAll('.dn-s').forEach((p) => p.classList.remove('is-dim')); };
  svg.querySelectorAll('.dn-s').forEach((p) => {
    p.addEventListener('pointerenter', () => show(p)); p.addEventListener('pointerdown', () => show(p));
    p.addEventListener('focus', () => show(p)); p.addEventListener('blur', hide);
  });
  svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
  return () => {};
}

function bindTips(host, svg, data, series, fmt) {
  let tip = host.querySelector('.ch-tip');
  if (!tip) { tip = document.createElement('div'); tip.className = 'ch-tip'; tip.setAttribute('role', 'tooltip'); host.append(tip); }
  const show = (col) => {
    const i = +col.dataset.i, d = data[i];
    tip.replaceChildren();
    const h = document.createElement('p'); h.className = 'ch-tip-h'; h.textContent = d.full || d.label; tip.append(h);
    [...series].reverse().forEach((s, ri) => {
      const si = series.length - 1 - ri;
      const row = document.createElement('p'); row.className = 'ch-tip-r';
      const key = document.createElement('i'); key.className = `ch-key ${s.cls}`;
      const b = document.createElement('b'); b.textContent = fmt(d.values[si]);
      const n = document.createElement('span'); n.textContent = s.name;
      row.append(key, b, n); tip.append(row);
    });
    if (series.length > 1) {
      const row = document.createElement('p'); row.className = 'ch-tip-r ch-tip-t';
      const b = document.createElement('b'); b.textContent = fmt(d.values.reduce((a, c) => a + c, 0));
      const n = document.createElement('span'); n.textContent = 'au total';
      row.append(b, n); tip.append(row);
    }
    svg.querySelectorAll('.ch-col').forEach((c) => c.classList.toggle('is-hover', c === col));
    const hr = host.getBoundingClientRect(), cr = col.getBoundingClientRect();
    tip.classList.add('on');
    const tw = tip.offsetWidth;
    let left = cr.left - hr.left + cr.width / 2 - tw / 2;
    left = Math.max(0, Math.min(hr.width - tw, left));
    tip.style.left = `${left}px`;
    tip.style.top = '0px';
  };
  const hide = () => { tip.classList.remove('on'); svg.querySelectorAll('.ch-col').forEach((c) => c.classList.remove('is-hover')); };
  svg.querySelectorAll('.ch-col').forEach((col) => {
    col.addEventListener('pointerenter', () => show(col));
    col.addEventListener('pointerdown', () => show(col));
    col.addEventListener('focus', () => show(col));
    col.addEventListener('blur', hide);
  });
  svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
}
