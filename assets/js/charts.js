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
