// Outils d'interface : échappement, formats, feuilles (dialogues), toasts, actions.
import { ic, logoMark } from './icons.js';
import { S, stageOf, OUTCOME, access, trialActive, PLANS } from './store.js';
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
export const dateShort = (t) => (Number.isFinite(t) ? dfShort.format(t) : '');
export const dateDay = (t) => cap(dfDay.format(t));
export const time = (t) => { const d = new Date(t); return `${d.getHours()} h${d.getMinutes() ? ' ' + String(d.getMinutes()).padStart(2, '0') : ''}`; };
export const hasTime = (t) => { const d = new Date(t); return d.getHours() || d.getMinutes(); };

export function when(t) {
  if (!Number.isFinite(t)) return '';
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
export const stageChip = (id) => { const s = stageOf(id); return `<span class="chip t-${s.tone}"><i class="dot"></i>${s.label}</span>`; };
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
  document.querySelectorAll('dialog.sheet').forEach((x) => closeSheet(x, true));
  const d = document.createElement('dialog');
  d.className = `sheet ${cls}`;
  d.innerHTML = `<div class="sheet-in" role="document"><span class="sheet-grab" aria-hidden="true"></span>${html}</div>`;
  document.body.append(d);
  d.showModal();
  requestAnimationFrame(() => d.classList.add('open'));
  d.addEventListener('click', (e) => { if (e.target === d) closeSheet(d); });
  d.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(d); });
  let ended = false;
  d._finish = () => { if (ended) return; ended = true; d.remove(); onClose?.(); };
  d.addEventListener('close', d._finish);
  d.querySelectorAll('form[data-draft]').forEach(restoreDraft);
  const f = d.querySelector('[autofocus]');
  if (f && matchMedia('(pointer:fine)').matches) f.focus();
  return d;
}
export function closeSheet(d = null, now = false) {
  d = d || document.querySelector('dialog.sheet[open]');
  if (!d) return;
  if (now) { if (d.open) d.close(); d._finish?.(); return; }
  d.classList.remove('open');
  setTimeout(() => { if (d.open) d.close(); d._finish?.(); }, 220);
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
// Bannière façon notification Apple : en haut sur iPhone, en haut à droite sur ordinateur.
export function toast(msg, { title = '', action, onAction, ms = 2800 } = {}) {
  let host = document.querySelector('.toasts');
  if (!host) { host = document.createElement('div'); host.className = 'toasts'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.append(host); }
  while (host.children.length > 2) host.firstElementChild.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="toast-ic">${logoMark('sm')}</span><div class="toast-b"><p class="toast-h"><span>MindView</span><span>maintenant</span></p>${title ? `<p class="toast-t">${title}</p>` : ''}<p class="toast-m">${msg}</p></div>${action ? `<button class="toast-btn">${action}</button>` : ''}`;
  host.append(t);
  requestAnimationFrame(() => t.classList.add('in'));
  const kill = () => { t.classList.remove('in'); t.classList.add('out'); setTimeout(() => t.remove(), 350); };
  t.querySelector('.toast-btn')?.addEventListener('click', (e) => { e.stopPropagation(); onAction?.(); kill(); });
  t.addEventListener('click', kill);
  let y0 = null;
  t.addEventListener('pointerdown', (e) => { y0 = e.clientY; });
  t.addEventListener('pointerup', (e) => { if (y0 !== null && y0 - e.clientY > 20) kill(); y0 = null; });
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

// ---------- Validation des formulaires ----------
// Règles : required, type="email", data-rule="tel" | "url". Messages en clair, sous le champ.
const RULES = {
  tel: (v) => (!v || v.replace(/\D/g, '').length >= 8 ? '' : 'Numéro incomplet : il faut au moins 8 chiffres.'),
  url: (v) => (!v || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(v) ? '' : 'Adresse web invalide, par exemple : exemple.be'),
  iban: (v) => (!v || /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v.replace(/\s+/g, '').toUpperCase()) ? '' : 'IBAN incomplet, par exemple : BE68 5390 0754 7034'),
  tva: (v) => { const x = v.replace(/[\s.]/g, '').toUpperCase(); return !v || !x.startsWith('BE') || /^BE[01]\d{9}$/.test(x) ? '' : 'Numéro belge : BE suivi de 10 chiffres, par exemple BE0123.456.789'; },
};
export function fieldError(el) {
  const v = (el.value || '').trim();
  if (el.required && !v) return 'Ce champ est obligatoire.';
  if (el.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Adresse e-mail invalide, par exemple : nom@domaine.be';
  const r = RULES[el.dataset.rule];
  return r ? r(v) : '';
}
export function setFieldError(el, msg) {
  const wrap = el.closest('.field') || el.parentElement;
  let e = wrap.querySelector('.field-err');
  if (!msg) { e?.remove(); el.removeAttribute('aria-invalid'); return; }
  if (!e) { e = document.createElement('span'); e.className = 'field-err'; e.setAttribute('role', 'alert'); wrap.append(e); }
  e.textContent = msg;
  el.setAttribute('aria-invalid', 'true');
}
export function validateForm(form) {
  let first = null;
  form.querySelectorAll('input:not([type=hidden]):not([type=file]), select, textarea').forEach((el) => {
    const msg = fieldError(el);
    setFieldError(el, msg);
    if (msg && !first) first = el;
  });
  first?.focus();
  return !first;
}
// Boutons qui exigent un champ rempli : data-needs="nom_du_champ"
export function refreshNeeds(form) {
  const outside = form.id ? [...document.querySelectorAll(`[form="${form.id}"][data-needs]`)] : [];
  [...form.querySelectorAll('[data-needs]'), ...outside].forEach((b) => { b.disabled = !(form.elements[b.dataset.needs]?.value || '').trim(); });
}

// ---------- Chargement ----------
export async function busy(btn, label, fn) {
  if (!btn) return fn();
  const html = btn.innerHTML;
  btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
  if (btn.tagName === 'BUTTON') btn.disabled = true;
  btn.innerHTML = `<span class="spin" aria-hidden="true"></span><span>${label}</span>`;
  try { return await fn(); } finally { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); if (btn.tagName === 'BUTTON') btn.disabled = false; btn.innerHTML = html; }
}
export const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Glisser-déposer (pipeline, tableau des tâches) ----------
// Souris : on glisse la carte d'une colonne à l'autre. Toucher : appui long → onLong (menu « Déplacer vers »).
export function enableDnD(boardEl, { onDrop, onLong, key = 'stage' }) {
  if (!boardEl) return null;
  let suppress = false;
  const onClick = (e) => { if (suppress) { e.preventDefault(); e.stopPropagation(); suppress = false; } };
  boardEl.addEventListener('click', onClick, true);
  const onDown = (e) => {
    const cardEl = e.target.closest('.kcard');
    if (!cardEl || e.button > 0 || e.target.closest('button:not(.kcard)')) return;
    const id = cardEl.dataset.id;
    const sx = e.clientX, sy = e.clientY;
    if (e.pointerType !== 'mouse') {
      const t = setTimeout(() => { suppress = true; navigator.vibrate?.(12); onLong?.(id); }, 450);
      const cancel = () => { clearTimeout(t); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', cancel); window.removeEventListener('pointercancel', cancel); };
      const mv = (ev) => { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) cancel(); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', cancel); window.addEventListener('pointercancel', cancel);
      return;
    }
    let ghost = null, over = null, ox = 0, oy = 0, raf = 0, lastX = sx;
    const move = (ev) => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        const r = cardEl.getBoundingClientRect();
        ox = sx - r.left; oy = sy - r.top;
        ghost = cardEl.cloneNode(true); ghost.classList.add('kcard-ghost'); ghost.style.width = `${r.width}px`;
        document.body.append(ghost); cardEl.classList.add('is-dragging'); document.body.classList.add('is-dragging');
      }
      ev.preventDefault();
      lastX = ev.clientX;
      ghost.style.transform = `translate(${ev.clientX - ox}px, ${ev.clientY - oy}px) rotate(1.5deg)`;
      ghost.hidden = true;
      const col = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.kcol');
      ghost.hidden = false;
      if (col !== over) { over?.classList.remove('is-over'); over = col; over?.classList.add('is-over'); }
      if (!raf) {
        const scroll = () => {
          const br = boardEl.getBoundingClientRect();
          const dx = lastX < br.left + 60 ? -12 : lastX > br.right - 60 ? 12 : 0;
          if (dx && ghost) { boardEl.scrollLeft += dx; raf = requestAnimationFrame(scroll); } else raf = 0;
        };
        raf = requestAnimationFrame(scroll);
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      cancelAnimationFrame(raf); raf = 0;
      if (!ghost) return;
      suppress = true;
      ghost.remove(); cardEl.classList.remove('is-dragging'); document.body.classList.remove('is-dragging');
      over?.classList.remove('is-over');
      const value = over?.dataset[key];
      if (value) onDrop(id, value);
      setTimeout(() => { suppress = false; }, 50);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointercancel', up, { once: true });
    window.addEventListener('pointerup', up);
  };
  boardEl.addEventListener('pointerdown', onDown);
  boardEl.addEventListener('dragstart', (e) => e.preventDefault());
  const noMenu = (e) => { if (e.target.closest('.kcard') && !matchMedia('(pointer:fine)').matches) e.preventDefault(); };
  boardEl.addEventListener('contextmenu', noMenu);
  return () => { boardEl.removeEventListener('pointerdown', onDown); boardEl.removeEventListener('click', onClick, true); boardEl.removeEventListener('contextmenu', noMenu); };
}

// ---------- Brouillons ----------
// Un formulaire avec data-draft="clé" garde sa saisie si on ferme la feuille ou change d'écran.
const DRAFT = 'msdev:draft:';
export function saveDraft(form) {
  const k = form.dataset.draft; if (!k) return;
  const data = {};
  for (const el of form.elements) if (el.name && el.type !== 'file' && el.type !== 'hidden') data[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  try { sessionStorage.setItem(DRAFT + k, JSON.stringify(data)); } catch (e) { /* rien */ }
}
export function clearDraft(k) { try { sessionStorage.removeItem(DRAFT + k); } catch (e) { /* rien */ } }
export function restoreDraft(form) {
  const k = form.dataset.draft; if (!k) return false;
  let data = null;
  try { data = JSON.parse(sessionStorage.getItem(DRAFT + k) || 'null'); } catch (e) { /* rien */ }
  if (!data || !Object.values(data).some((v) => v && v !== true)) return false;
  for (const el of form.elements) {
    if (!el.name || !(el.name in data)) continue;
    if (el.type === 'checkbox') el.checked = !!data[el.name];
    else if (el.type === 'radio') el.checked = el.value === data[el.name];
    else el.value = data[el.name];
  }
  const note = document.createElement('p');
  note.className = 'draft-note';
  note.innerHTML = `${ic('refresh')}<span>Brouillon restauré.</span><button type="button" class="link">Effacer</button>`;
  note.querySelector('button').addEventListener('click', () => { clearDraft(k); form.reset(); note.remove(); refreshNeeds(form); });
  form.prepend(note);
  refreshNeeds(form);
  return true;
}

// Champs de formulaire
export const field = (label, input, hint = '') => `<label class="field"><span class="field-l">${label}</span>${input}${hint ? `<span class="field-h">${hint}</span>` : ''}</label>`;
export const input = (name, value = '', attrs = '') => `<input class="inp" name="${name}" value="${esc(value)}" ${attrs}>`;
export const select = (name, options, value, attrs = '') => `<select class="inp" name="${name}" ${attrs}>${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
