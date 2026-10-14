// Outils d'interface : échappement, formats, feuilles (dialogues), toasts, actions.
import { ic } from './icons.js';
import { S, STAGE, OUTCOME, access, trialActive, PLANS } from './store.js';
export { ic };

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const attr = esc;

// ---------- Formats ----------
const nf0 = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });
const nf2 = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });
const nb = (s) => s.replace(/ /g, ' ');
export const eur = (n) => nb((Number(n) % 1 ? nf2 : nf0).format(Number(n) || 0));
export const eur2 = (n) => nb(nf2.format(Number(n) || 0));
export const num = (n) => nb(new Intl.NumberFormat('fr-BE', { useGrouping: 'always' }).format(n));
const dfLong = new Intl.DateTimeFormat('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' });
const dfShort = new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short' });
const dfDay = new Intl.DateTimeFormat('fr-BE', { weekday: 'short', day: 'numeric', month: 'short' });
const tf = new Intl.DateTimeFormat('fr-BE', { hour: '2-digit', minute: '2-digit' });
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const dateLong = (t = Date.now()) => cap(dfLong.format(t));
export const dateShort = (t) => dfShort.format(t);
export const dateDay = (t) => cap(dfDay.format(t));
export const time = (t) => { const d = new Date(t); return `${d.getHours()} h${d.getMinutes() ? ' ' + String(d.getMinutes()).padStart(2, '0') : ''}`; };
export const hasTime = (t) => { const d = new Date(t); return d.getHours() || d.getMinutes(); };

export function when(t) {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const diff = Math.floor((t - d0.getTime()) / 864e5);
  const hh = hasTime(t) ? ` · ${time(t)}` : '';
  if (diff === 0) return `Aujourd'hui${hh}`;
  if (diff === 1) return `Demain${hh}`;
  if (diff === -1) return `Hier${hh}`;
  if (diff > 1 && diff < 7) return `${dateDay(t)}${hh}`;
  return `${dateShort(t)}${hh}`;
}
export function ago(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'à l\'instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'hier' : d < 30 ? `il y a ${d} jours` : dateShort(t);
}
export const plural = (n, one, many) => `${num(n)} ${n > 1 ? many : one}`;
export const initials = (s) => (s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const toLocalInput = (t) => { const d = new Date(t - new Date(t).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
export const fromLocalInput = (v) => (v ? new Date(v).getTime() : null);

// ---------- Petits composants ----------
export const stageChip = (id) => { const s = STAGE[id] || STAGE.a_appeler; return `<span class="chip t-${s.tone}"><i class="dot"></i>${s.label}</span>`; };
export const outcomeChip = (id) => { const o = OUTCOME[id]; return o ? `<span class="chip t-${o.tone}">${o.label}</span>` : ''; };
export const avatar = (name, cls = '') => `<span class="avatar ${cls}" aria-hidden="true">${esc(initials(name))}</span>`;
export function planBadge() {
  const a = access();
  if (trialActive() && !S().sub.demo && S().sub.plan === 'free') return '<span class="badge b-trial">Essai</span>';
  return a === 'free' ? '<span class="badge">Découverte</span>' : `<span class="badge b-${a}">${PLANS[a].name}</span>`;
}
export function empty(icon, title, text, action = '') {
  return `<div class="empty"><span class="empty-ic">${ic(icon)}</span><p class="empty-t">${title}</p><p class="empty-p">${text}</p>${action}</div>`;
}
export function ring(value, max, { size = 112, stroke = 9, cls = '' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, pct = max ? Math.min(1, value / max) : 0;
  return `<svg class="ring ${cls}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle class="ring-bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
    <circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" style="--c:${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}
export const bar = (value, max, cls = '') => `<span class="bar ${cls}"><i style="width:${max ? Math.min(100, (value / max) * 100) : 0}%"></i></span>`;

// ---------- Actions déléguées ----------
export const actions = {};
export const forms = {};
export const register = (a = {}, f = {}) => { Object.assign(actions, a); Object.assign(forms, f); };

// ---------- Feuilles (dialog) ----------
export function sheet(html, { cls = '', onClose } = {}) {
  closeSheet(null, true);
  const d = document.createElement('dialog');
  d.className = `sheet ${cls}`;
  d.innerHTML = `<div class="sheet-in" role="document"><span class="sheet-grab" aria-hidden="true"></span>${html}</div>`;
  document.body.append(d);
  d.showModal();
  requestAnimationFrame(() => d.classList.add('open'));
  d.addEventListener('click', (e) => { if (e.target === d) closeSheet(d); });
  d.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(d); });
  d.addEventListener('close', () => { d.remove(); onClose?.(); });
  const f = d.querySelector('[autofocus]');
  if (f && matchMedia('(pointer:fine)').matches) f.focus();
  return d;
}
export function closeSheet(d = document.querySelector('dialog.sheet[open]'), now = false) {
  if (!d) return;
  if (now) { d.close(); return; }
  d.classList.remove('open');
  setTimeout(() => d.open && d.close(), 220);
}
export const sheetHead = (title, sub = '') => `<header class="sheet-h"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button class="icon-btn" data-act="close-sheet" aria-label="Fermer">${ic('x')}</button></header>`;

export function confirmSheet({ title, text = '', ok = 'Confirmer', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const d = sheet(`${sheetHead(title)}<p class="sheet-p">${text}</p>
      <div class="sheet-actions"><button class="btn btn-ghost" data-r="0">Annuler</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-r="1">${ok}</button></div>`,
    { cls: 'sheet-sm', onClose: () => { if (!answered) resolve(false); } });
    d.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => { answered = true; resolve(b.dataset.r === '1'); closeSheet(d); }));
  });
}

// ---------- Toasts ----------
export function toast(msg, { action, onAction, ms = 2600 } = {}) {
  let host = document.querySelector('.toasts');
  if (!host) { host = document.createElement('div'); host.className = 'toasts'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.append(host); }
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>${msg}</span>${action ? `<button class="toast-btn">${action}</button>` : ''}`;
  host.append(t);
  requestAnimationFrame(() => t.classList.add('in'));
  const kill = () => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); };
  t.querySelector('.toast-btn')?.addEventListener('click', () => { onAction?.(); kill(); });
  setTimeout(kill, action ? ms + 2400 : ms);
}

export async function copyText(text, msg = 'Copié dans le presse-papiers') {
  try { await navigator.clipboard.writeText(text); toast(msg); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast(msg);
  }
}
export async function shareText(title, text) {
  if (navigator.share) { try { await navigator.share({ title, text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  copyText(text);
}

export function download(name, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// Champs de formulaire
export const field = (label, input, hint = '') => `<label class="field"><span class="field-l">${label}</span>${input}${hint ? `<span class="field-h">${hint}</span>` : ''}</label>`;
export const input = (name, value = '', attrs = '') => `<input class="inp" name="${name}" value="${esc(value)}" ${attrs}>`;
export const select = (name, options, value, attrs = '') => `<select class="inp" name="${name}" ${attrs}>${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
