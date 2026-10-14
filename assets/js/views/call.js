// Mode appel : le script étape par étape, le résultat enregistré en un geste.
import { S, can, getProspect, recordCall, addTask, OUTCOMES, DAY, startOfDay } from '../store.js';
import { ic, esc, register, sheet, sheetHead, closeSheet, toast, avatar, toLocalInput, fromLocalInput, when, copyText, num } from '../ui.js';
import { SERVICES, getSector, buildScript, fill, typo } from '../data/scripts.js';
import { scriptFromId, ctxFor, renderLine } from './scripts.js';
import { paywall, pageHead } from './common.js';

let ses = null;
let rerender = () => {};
export const setCallRerender = (fn) => { rerender = fn; };

function queueFrom(q) {
  const s = S();
  if (q.p) return [q.p];
  const t1 = startOfDay() + DAY;
  const rank = (p) => (p.stage === 'rappeler' ? (p.next?.due && p.next.due < t1 ? 0 : 2) : 1);
  return s.prospects.filter((p) => p.stage === 'rappeler' || p.stage === 'a_appeler')
    .sort((a, b) => rank(a) - rank(b) || (a.next?.due || 9e15) - (b.next?.due || 9e15) || a.createdAt - b.createdAt)
    .slice(0, 40).map((p) => p.id);
}

function startSession(q) {
  const key = location.hash;
  if (ses && ses.key === key) return ses;
  const practice = !!q.s && !q.p;
  ses = { key, practice, scriptId: q.s || null, queue: practice ? [] : queueFrom(q), idx: 0, step: 0, startedAt: Date.now(), callAt: null, results: [], done: false };
  return ses;
}

function currentScript() {
  if (ses.practice || (ses.scriptId && ses.queue.length === 1)) return scriptFromId(ses.scriptId || '') || null;
  const p = getProspect(ses.queue[ses.idx]);
  const svc = p?.service || S().profile.service || 'site';
  return buildScript(svc, 'appel', p?.secteur && getSector(p.secteur) ? p.secteur : 'toute');
}

const rdvDay = new Intl.DateTimeFormat('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' });
export const rdvText = (t) => { const d = new Date(t); return `${rdvDay.format(d)} à ${d.getHours()} h${d.getMinutes() ? ' ' + String(d.getMinutes()).padStart(2, '0') : ''}`; };
const mmss = (ms) => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

function summary() {
  const r = ses.results;
  const count = (id) => r.filter((x) => x.outcome === id).length;
  return `<div class="call call-end">
    <header class="call-h"><a class="icon-btn" href="#/" aria-label="Fermer">${ic('x')}</a><span>Session terminée</span><span class="call-timer">${mmss(Date.now() - ses.startedAt)}</span></header>
    <section class="end-b rise">
      <h1>${r.length ? `${num(r.length)} appel${r.length > 1 ? 's' : ''} enregistré${r.length > 1 ? 's' : ''}` : 'Aucun appel enregistré'}</h1>
      <p>${count('rdv') ? `${count('rdv')} rendez-vous fixé${count('rdv') > 1 ? 's' : ''}. Envoyez la confirmation par SMS maintenant.` : 'Chaque appel compte : vos chiffres se construisent session après session.'}</p>
      <ul class="end-stats">${OUTCOMES.map((o) => `<li><b>${count(o.id)}</b><span>${o.label}</span></li>`).join('')}</ul>
      <div class="end-a"><a class="btn btn-primary" href="#/agenda">${ic('calendar')}<span>Voir les relances</span></a><a class="btn btn-ghost" href="#/crm">${ic('crm')}<span>Ouvrir le CRM</span></a></div>
    </section>
  </div>`;
}

export function callView(params, q) {
  if (!can('callMode')) return { title: 'Mode appel', tab: 'accueil', html: `${pageHead('Session d\'appels', { back: '#/' })}${paywall('callMode')}` };
  startSession(q);
  if (!ses.practice && !ses.queue.length) {
    return { title: 'Session d\'appels', tab: 'accueil', html: `${pageHead('Session d\'appels', { back: '#/' })}
      <div class="empty"><span class="empty-ic">${ic('headset')}</span><p class="empty-t">Personne à appeler</p><p class="empty-p">Ajoutez des prospects « À appeler » — un par un ou en collant une liste.</p>
      <div class="end-a"><a class="btn btn-primary" href="#/crm?new=1">${ic('plus')}<span>Ajouter un prospect</span></a><a class="btn btn-ghost" href="#/outils/import">${ic('upload')}<span>Importer une liste</span></a></div></div>` };
  }
  if (ses.done || (!ses.practice && ses.idx >= ses.queue.length)) return { title: 'Session terminée', full: true, html: summary() };

  const sc = currentScript();
  const p = ses.practice ? null : getProspect(ses.queue[ses.idx]);
  if (!ses.practice && !p) { ses.idx++; return callView(params, q); }
  const sec = getSector(p?.secteur || sc.sector);
  const ctx = ctxFor(sc.service, p);
  const steps = sc.steps;
  const step = steps[Math.min(ses.step, steps.length - 1)];
  const tel = p?.tel ? p.tel.replace(/[^\d+]/g, '') : '';

  const html = `<div class="call">
    <header class="call-h">
      <a class="icon-btn" href="${ses.practice ? `#/script/${sc.id}` : '#/'}" data-act="call-quit" aria-label="Quitter">${ic('x')}</a>
      <span>${ses.practice ? 'Entraînement' : `Appel ${ses.idx + 1} sur ${ses.queue.length}`}</span>
      <span class="call-timer" data-since="${ses.callAt || ses.startedAt}">${mmss(Date.now() - (ses.callAt || ses.startedAt))}</span>
    </header>
    ${p ? `<section class="call-p">
      ${avatar(p.entreprise, 'lg')}
      <div class="call-p-b"><h1>${esc(p.entreprise)}</h1><p>${esc(sec?.name || '')}${p.ville ? ` · ${esc(p.ville)}` : ''}${p.contact ? ` · ${esc(p.contact)}` : ''}</p>
        ${p.next?.label ? `<p class="call-p-n">${ic('flag')}${esc(p.next.label)}</p>` : ''}${p.attempts ? `<p class="call-p-n">${ic('phone')}${p.attempts} tentative${p.attempts > 1 ? 's' : ''}</p>` : ''}</div>
      ${tel ? `<a class="call-dial ${p.demo ? 'is-demo' : ''}" href="${p.demo ? '#' : `tel:${tel}`}" data-act="dial" aria-label="Appeler ${esc(p.entreprise)}">${ic('phone')}<span>${esc(p.tel)}</span></a>` : `<a class="call-dial is-off" href="#/fiche/${p.id}">${ic('plus')}<span>Ajouter le numéro</span></a>`}
    </section>` : `<section class="call-p is-practice"><div class="call-p-b"><h1>${esc(sc.title)}</h1><p>${esc(sc.sub)}</p></div></section>`}
    <nav class="call-steps" aria-label="Étapes du script">${steps.map((st, i) => `<button class="call-pill ${i === ses.step ? 'is-on' : ''} ${i < ses.step ? 'is-past' : ''}" data-act="call-step" data-i="${i}">${esc(typo(st.t))}</button>`).join('')}</nav>
    <section class="call-card" aria-live="polite">
      <p class="call-k">Étape ${ses.step + 1} sur ${steps.length}${step.opt ? ' · si besoin' : ''}</p>
      <h2>${esc(typo(step.t))}</h2>
      <div class="call-lines">${step.l.map((l) => renderLine(l, ctx)).join('')}</div>
      ${step.tip ? `<p class="step-tip">${ic('target')}<span>${esc(typo(step.tip))}</span></p>` : ''}
    </section>
    <div class="call-nav">
      <button class="btn btn-ghost" data-act="call-prev" ${ses.step === 0 ? 'disabled' : ''} aria-label="Étape précédente">${ic('chevL')}</button>
      ${sc.objections.length ? `<button class="btn btn-soft" data-act="call-obj">${ic('shield')}<span>Objection</span></button>` : '<span></span>'}
      <button class="btn btn-ghost" data-act="call-next" ${ses.step >= steps.length - 1 ? 'disabled' : ''} aria-label="Étape suivante">${ic('chevR')}</button>
    </div>
    ${p ? `<footer class="call-out">
      <input class="inp call-note" placeholder="Note rapide (facultatif)" aria-label="Note sur l'appel" value="">
      <div class="out-grid">${OUTCOMES.map((o) => `<button class="out out-${o.tone}" data-act="call-out" data-o="${o.id}">${o.label}</button>`).join('')}</div>
      <button class="link center" data-act="call-skip">Passer sans enregistrer</button>
    </footer>` : `<footer class="call-out"><a class="btn btn-primary btn-block" href="#/script/${sc.id}">Terminer l'entraînement</a></footer>`}
  </div>`;

  return {
    title: 'Mode appel', full: true, html,
    after(root) {
      const t = root.querySelector('.call-timer');
      const iv = setInterval(() => { if (t) t.textContent = mmss(Date.now() - Number(t.dataset.since)); }, 1000);
      const key = (e) => {
        if (e.target.closest('input, textarea, select') || document.querySelector('dialog[open]')) return;
        if (e.key === 'ArrowRight') actions.next(); else if (e.key === 'ArrowLeft') actions.prev();
      };
      document.addEventListener('keydown', key);
      return () => { clearInterval(iv); document.removeEventListener('keydown', key); };
    },
  };
}

const actions = {
  next: () => { const sc = currentScript(); if (ses.step < sc.steps.length - 1) { ses.step++; rerender(); } },
  prev: () => { if (ses.step > 0) { ses.step--; rerender(); } },
};

function advance(msg, quiet = false) {
  ses.idx++; ses.step = 0; ses.callAt = null;
  const n = getProspect(ses.queue[ses.idx]);
  closeSheet();
  if (!quiet) toast(n ? `${msg} — suivant : ${esc(n.entreprise)}` : msg);
  rerender();
  document.querySelector('.main')?.scrollTo?.(0, 0); window.scrollTo(0, 0);
}

function nextSlot(daysAhead, h, m = 0) {
  const d = new Date(startOfDay() + daysAhead * DAY);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function save(outcome, extra = {}) {
  const pid = ses.queue[ses.idx];
  const p = getProspect(pid);
  const note = extra.note ?? document.querySelector('.call-note')?.value.trim() ?? '';
  recordCall(pid, outcome, note);
  ses.results.push({ pid, outcome });
  if (extra.task) addTask({ ...extra.task, prospectId: pid });
  advance(`${esc(p.entreprise)} : ${OUTCOMES.find((o) => o.id === outcome).label.toLowerCase()}`, extra.quiet);
}

function whenSheet(outcome) {
  const p = getProspect(ses.queue[ses.idx]);
  const isRdv = outcome === 'rdv';
  const presets = isRdv
    ? [['Demain 11 h', nextSlot(1, 11)], ['Dans 2 jours 14 h 30', nextSlot(2, 14, 30)], ['Dans 3 jours 10 h', nextSlot(3, 10)]]
    : [['Demain 9 h 30', nextSlot(1, 9, 30)], ['Demain 14 h', nextSlot(1, 14)], ['Dans 3 jours', nextSlot(3, 10)], ['Dans une semaine', nextSlot(7, 10)]];
  const d = sheet(`${sheetHead(isRdv ? 'Rendez-vous fixé' : 'À rappeler', esc(p.entreprise))}
    <form class="sheet-body" data-form="call-when" data-o="${outcome}">
      <div class="chips-wrap">${presets.map(([l, t]) => `<button type="button" class="chip-btn" data-act="pick-when" data-t="${t}">${l}</button>`).join('')}</div>
      <label class="field"><span class="field-l">${isRdv ? 'Date et heure du rendez-vous' : 'Quand rappeler'}</span><input class="inp" type="datetime-local" name="due" required value="${toLocalInput(presets[0][1])}"></label>
      <label class="field"><span class="field-l">Note</span><input class="inp" name="note" value="${esc(document.querySelector('.call-note')?.value || '')}" placeholder="${isRdv ? 'Ce qui compte pour la personne' : 'Pourquoi rappeler, à qui demander'}"></label>
      <button class="btn btn-primary btn-block" type="submit">${isRdv ? 'Enregistrer le rendez-vous' : 'Programmer le rappel'}</button>
    </form>`, { cls: 'sheet-sm' });
  return d;
}

register({
  'call-step': (b) => { ses.step = +b.dataset.i; rerender(); },
  'call-next': () => actions.next(),
  'call-prev': () => actions.prev(),
  'call-skip': () => advance('Passé'),
  'call-quit': () => { ses = null; },
  dial: (a, e) => {
    if (a.classList.contains('is-demo')) { e.preventDefault(); toast('Numéro d\'exemple : ajoutez vos vrais prospects pour appeler.'); return; }
    ses.callAt = Date.now();
    location.href = a.getAttribute('href');
    const t = document.querySelector('.call-timer'); if (t) t.dataset.since = ses.callAt;
  },
  'call-obj': () => {
    const sc = currentScript();
    const p = ses.practice ? null : getProspect(ses.queue[ses.idx]);
    const ctx = ctxFor(sc.service, p);
    sheet(`${sheetHead('Objections', 'Touchez une objection pour voir la réponse')}<div class="sheet-body objs">${sc.objections.map((o) => `<details class="obj"><summary><span>« ${esc(typo(o.q))} »</span>${ic('chevD', 'chev')}</summary><p>${fill(o.a, ctx)}</p></details>`).join('')}</div>`, { cls: 'sheet-tall' });
  },
  'call-out': (b) => {
    const o = b.dataset.o;
    if (o === 'rappeler' || o === 'rdv') { whenSheet(o); return; }
    if (o === 'interesse') {
      const p = getProspect(ses.queue[ses.idx]);
      save(o, { task: { title: `Envoyer les infos à ${p.entreprise}`, kind: 'relance', due: nextSlot(0, 17) > Date.now() ? nextSlot(0, 17) : nextSlot(1, 10) } });
      return;
    }
    save(o);
  },
  'pick-when': (b) => {
    const f = b.closest('form'); f.querySelector('[name=due]').value = toLocalInput(+b.dataset.t);
    f.querySelectorAll('.chip-btn').forEach((x) => x.classList.toggle('is-on', x === b));
  },
}, {
  'call-when': (data, f) => {
    const o = f.dataset.o;
    const due = fromLocalInput(data.due);
    const p = getProspect(ses.queue[ses.idx]);
    const task = o === 'rdv' ? { title: `Rendez-vous — ${p.entreprise}`, kind: 'rdv', due } : { title: `Rappeler ${p.entreprise}`, kind: 'appel', due };
    if (o === 'rdv') {
      const sc = buildScript(p.service || 'site', 'sms', p.secteur || 'toute');
      const ctx = { ...ctxFor(p.service || 'site', p), jour: rdvText(due) };
      const sms = fill(sc.steps[2].l[0][1], ctx, false);
      save(o, { note: data.note, task, quiet: true });
      toast('Rendez-vous enregistré', { action: 'Copier le SMS de confirmation', onAction: () => copyText(sms, 'SMS de confirmation copié') });
      return;
    }
    save(o, { note: data.note, task });
  },
});

export const resetCall = () => { ses = null; };
export { SERVICES };
