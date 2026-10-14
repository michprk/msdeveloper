// CRM : pipeline, liste, fiche prospect, formulaires.
import { S, can, STAGES, STAGE, SOURCES, OUTCOMES, OUTCOME, getProspect, addProspect, updateProspect, deleteProspect, logActivity, recordCall, addTask, toggleTask, update } from '../store.js';
import { ic, esc, eur, num, register, sheet, sheetHead, closeSheet, toast, confirmSheet, avatar, stageChip, outcomeChip, when, ago, field, input, select, toLocalInput, fromLocalInput, dateShort } from '../ui.js';
import { SERVICES, SERVICE_IDS, CHANNELS, allSectors, getSector } from '../data/scripts.js';
import { pageHead, paywall } from './common.js';

const secName = (id) => getSector(id)?.name || 'Toute entreprise';
const searchKey = (p) => esc(`${p.entreprise} ${p.contact} ${p.ville} ${secName(p.secteur)} ${p.tel}`.toLowerCase());

// ---------- Pipeline / liste ----------
export function crmView(params, q) {
  if (!can('crm')) return { title: 'CRM', tab: 'crm', html: `${pageHead('CRM', { kicker: 'Pipeline et fiches clients' })}${paywall('crm')}${preview()}` };
  const s = S();
  const view = q.v === 'list' ? 'list' : 'board';
  const open = s.prospects.filter((p) => !['signe', 'perdu'].includes(p.stage));
  const openSum = open.reduce((n, p) => n + (Number(p.valeur) || 0), 0);
  const f = STAGE[q.f] ? q.f : '';
  const html = `
    ${pageHead('CRM', { kicker: `${num(s.prospects.length)} prospect${s.prospects.length > 1 ? 's' : ''} · ${eur(openSum)} en cours`, actions: `<a class="icon-btn" href="#/outils/import" aria-label="Importer une liste">${ic('upload')}</a><button class="btn btn-primary" data-act="prospect-new">${ic('plus')}<span>Prospect</span></button>` })}
    <div class="crm-bar">
      <div class="search"><span class="search-ic">${ic('search')}</span><input class="inp" type="search" placeholder="Chercher une entreprise, une ville…" data-filter=".kcard, .rows .row" aria-label="Chercher un prospect"></div>
      <nav class="seg seg-sm" aria-label="Affichage"><a class="seg-i ${view === 'board' ? 'is-on' : ''}" href="#/crm">${ic('crm')}<span>Pipeline</span></a><a class="seg-i ${view === 'list' ? 'is-on' : ''}" href="#/crm?v=list">${ic('list')}<span>Liste</span></a></nav>
    </div>
    ${view === 'board' ? board(s) : list(s, f)}`;
  return {
    title: 'CRM', tab: 'crm', html,
    after(root) {
      if (q.new) setTimeout(() => prospectSheet(), 60);
      if (view === 'board') return enableBoard(root);
    },
  };
}

function preview() {
  return `<div class="ghost-board" aria-hidden="true">${STAGES.slice(0, 4).map((st) => `<div class="kcol"><p class="kcol-h"><i class="dot t-${st.tone}"></i>${st.label}</p><div class="kcard"></div><div class="kcard"></div></div>`).join('')}</div>`;
}

const card = (p) => `<a class="kcard" href="#/fiche/${p.id}" draggable="false" data-id="${p.id}" data-name="${searchKey(p)}">
  <p class="kcard-t">${esc(p.entreprise)}</p>
  <p class="kcard-s">${ic(getSector(p.secteur)?.icon || 'building')}${esc(secName(p.secteur))}${p.ville ? ` · ${esc(p.ville)}` : ''}</p>
  <div class="kcard-f">${p.valeur ? `<b>${eur(p.valeur)}</b>` : `<span class="muted-s">${SERVICES[p.service]?.short || ''}</span>`}${p.next?.due ? `<span class="kcard-n ${p.next.due < Date.now() ? 'is-late' : ''}">${ic('clock')}${when(p.next.due)}</span>` : p.contact ? `<span class="muted-s">${esc(p.contact)}</span>` : ''}</div>
</a>`;

function board(s) {
  return `<div class="board" role="list">${STAGES.map((st) => {
    const items = s.prospects.filter((p) => p.stage === st.id).sort((a, b) => (a.next?.due || 9e15) - (b.next?.due || 9e15) || b.updatedAt - a.updatedAt);
    const sum = items.reduce((n, p) => n + (Number(p.valeur) || 0), 0);
    return `<section class="kcol" data-stage="${st.id}" role="listitem" aria-label="${st.label}">
      <header class="kcol-h"><i class="dot t-${st.tone}"></i><span>${st.label}</span><b>${items.length}</b>${sum ? `<span class="kcol-sum">${eur(sum)}</span>` : ''}</header>
      <div class="kcol-b">${items.map(card).join('') || '<p class="kcol-empty">Glissez une fiche ici</p>'}</div>
    </section>`;
  }).join('')}</div>
  <p class="hint">${matchMedia('(pointer:fine)').matches ? 'Glissez les fiches d\'une colonne à l\'autre.' : 'Appui long sur une fiche pour la déplacer.'}</p>`;
}

function list(s, f) {
  const items = s.prospects.filter((p) => !f || p.stage === f).sort((a, b) => b.updatedAt - a.updatedAt);
  return `<nav class="chips-row" aria-label="Filtrer par étape">
      <a class="chip-btn ${!f ? 'is-on' : ''}" href="#/crm?v=list">Tous <b>${s.prospects.length}</b></a>
      ${STAGES.map((st) => `<a class="chip-btn ${f === st.id ? 'is-on' : ''}" href="#/crm?v=list&f=${st.id}"><i class="dot t-${st.tone}"></i>${st.label} <b>${s.prospects.filter((p) => p.stage === st.id).length}</b></a>`).join('')}
    </nav>
    ${items.length ? `<ul class="rows card">${items.map((p) => `<li><a class="row" href="#/fiche/${p.id}" data-name="${searchKey(p)}">${avatar(p.entreprise)}
      <span class="row-b"><b>${esc(p.entreprise)}</b><span>${esc(secName(p.secteur))}${p.ville ? ' · ' + esc(p.ville) : ''}${p.next?.due ? ` · ${when(p.next.due)}` : ''}</span></span>
      <span class="row-e">${stageChip(p.stage)}${p.valeur ? `<b class="muted-s">${eur(p.valeur)}</b>` : ''}</span></a></li>`).join('')}</ul>`
    : `<div class="empty"><span class="empty-ic">${ic('users')}</span><p class="empty-t">Aucun prospect ici</p><p class="empty-p">Ajoutez votre premier prospect, ou collez une liste d'entreprises.</p><div class="end-a"><button class="btn btn-primary" data-act="prospect-new">${ic('plus')}<span>Ajouter</span></button><a class="btn btn-ghost" href="#/outils/import">${ic('upload')}<span>Importer</span></a></div></div>`}`;
}

// Glisser-déposer à la souris ; appui long au toucher → menu « Déplacer vers ».
function enableBoard(root) {
  const boardEl = root.querySelector('.board');
  if (!boardEl) return;
  let suppress = false;
  const onClick = (e) => { if (suppress) { e.preventDefault(); e.stopPropagation(); suppress = false; } };
  boardEl.addEventListener('click', onClick, true);
  const onDown = (e) => {
    const cardEl = e.target.closest('.kcard');
    if (!cardEl || e.button > 0) return;
    const id = cardEl.dataset.id;
    const sx = e.clientX, sy = e.clientY;
    if (e.pointerType !== 'mouse') {
      const t = setTimeout(() => { suppress = true; navigator.vibrate?.(12); moveSheet(id); }, 450);
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
      const stage = over?.dataset.stage;
      const p = getProspect(id);
      if (stage && p && stage !== p.stage) { updateProspect(id, { stage }); toast(`${esc(p.entreprise)} → ${STAGE[stage].label}`); }
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
  return () => { boardEl.removeEventListener('pointerdown', onDown); boardEl.removeEventListener('click', onClick, true); };
}

function moveSheet(id) {
  const p = getProspect(id);
  sheet(`${sheetHead('Déplacer vers', esc(p.entreprise))}<div class="sheet-body stage-pick">${STAGES.map((st) => `<button class="stage-opt ${st.id === p.stage ? 'is-on' : ''}" data-act="set-stage" data-id="${id}" data-stage="${st.id}"><i class="dot t-${st.tone}"></i>${st.label}${st.id === p.stage ? ic('check') : ''}</button>`).join('')}</div>`, { cls: 'sheet-sm' });
}

// ---------- Fiche ----------
const ACT_ICON = { appel: 'phone', etape: 'arrowR', note: 'note', email: 'mail', sms: 'message', visite: 'store', rdv: 'calendar', devis: 'invoice', audit: 'clipboard' };
const ACT_LABEL = { appel: 'Appel', note: 'Note', email: 'E-mail envoyé', sms: 'SMS envoyé', visite: 'Visite', rdv: 'Rendez-vous', devis: 'Devis envoyé', audit: 'Audit express' };

function timeline(acts) {
  if (!acts.length) return '<p class="muted pad">Aucun échange pour l\'instant.</p>';
  return `<ol class="tl">${acts.map((a) => `<li class="tl-i"><span class="tl-ic">${ic(ACT_ICON[a.type] || 'note')}</span><div class="tl-b">
    <p class="tl-t">${a.type === 'etape' ? `Étape : ${STAGE[a.from]?.label || '—'} → <b>${STAGE[a.to]?.label || ''}</b>` : `<b>${ACT_LABEL[a.type] || 'Activité'}</b>${a.outcome ? ' ' + outcomeChip(a.outcome) : ''}`}</p>
    ${a.note ? `<p class="tl-n">${esc(a.note)}</p>` : ''}<p class="tl-d">${ago(a.at)} · ${dateShort(a.at)}</p></div>
    ${a.type !== 'etape' ? `<button class="icon-btn sm" data-act="act-del" data-id="${a.id}" aria-label="Supprimer">${ic('trash')}</button>` : ''}</li>`).join('')}</ol>`;
}

export function fiche([id]) {
  if (!can('crm')) return { title: 'Fiche', tab: 'crm', html: `${pageHead('Fiche client', { back: '#/crm' })}${paywall('crm')}` };
  const s = S();
  const p = getProspect(id);
  if (!p) return { title: 'Fiche', tab: 'crm', html: `${pageHead('Fiche introuvable', { back: '#/crm' })}<p class="muted">Cette fiche a été supprimée.</p>` };
  const sec = getSector(p.secteur) || getSector('toute');
  const svc = p.service || 'site';
  const acts = s.activities.filter((a) => a.prospectId === id).sort((a, b) => b.at - a.at);
  const tasks = s.tasks.filter((t) => t.prospectId === id && !t.done).sort((a, b) => (a.due || 9e15) - (b.due || 9e15));
  const tel = (p.tel || '').replace(/[^\d+]/g, '');
  const demo = p.demo;
  const url = p.site ? (/^https?:\/\//.test(p.site) ? p.site : `https://${p.site}`) : '';
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.entreprise, p.adresse, p.ville].filter(Boolean).join(' '))}`;
  const audit = p.audit;
  const html = `
    ${pageHead('', { back: '#/crm' })}
    <section class="fiche-h rise">
      ${avatar(p.entreprise, 'xl')}
      <div><h1 class="ph-t">${esc(p.entreprise)}</h1><p class="fiche-s">${ic(sec.icon)}<span>${esc(sec.name)}${p.ville ? ` · ${esc(p.ville)}` : ''}</span>${p.demo ? '<span class="tag">Exemple</span>' : ''}</p></div>
      <button class="icon-btn" data-act="prospect-edit" data-id="${id}" aria-label="Modifier la fiche">${ic('edit')}</button>
    </section>
    <nav class="stage-row rise" aria-label="Étape">${STAGES.map((st) => `<button class="stage-b t-${st.tone} ${st.id === p.stage ? 'is-on' : ''}" data-act="set-stage" data-id="${id}" data-stage="${st.id}" aria-pressed="${st.id === p.stage}"><i class="dot"></i>${st.label}</button>`).join('')}</nav>
    <div class="quick-acts rise">
      <a class="qa ${tel ? '' : 'is-off'}" href="${tel && !demo ? `tel:${tel}` : '#'}" data-act="${tel && !demo ? 'qa-log' : 'qa-off'}" data-type="appel" data-id="${id}">${ic('phone')}<span>Appeler</span></a>
      <a class="qa ${tel ? '' : 'is-off'}" href="${tel && !demo ? `sms:${tel}` : '#'}" data-act="${tel && !demo ? '' : 'qa-off'}">${ic('message')}<span>SMS</span></a>
      <a class="qa ${p.email ? '' : 'is-off'}" href="${p.email ? `mailto:${esc(p.email)}` : '#'}" data-act="${p.email ? '' : 'qa-off'}">${ic('mail')}<span>E-mail</span></a>
      <a class="qa" href="${maps}" target="_blank" rel="noopener">${ic('pin')}<span>Itinéraire</span></a>
      ${url ? `<a class="qa" href="${esc(url)}" target="_blank" rel="noopener">${ic('globe')}<span>Site</span></a>` : ''}
    </div>
    <div class="fiche-grid">
      <div class="fiche-col">
        <section class="card rise">
          <header class="card-h"><div><h2>Prochaine action</h2></div><button class="link" data-act="task-new" data-pid="${id}">${ic('plus')}Ajouter</button></header>
          ${tasks.length ? `<ul class="tasks">${tasks.map((t) => `<li class="task"><button class="tick" data-act="task-toggle" data-id="${t.id}" aria-label="Marquer comme fait"></button><div class="task-b"><p class="task-t">${esc(t.title)}</p><p class="task-m ${t.due && t.due < Date.now() ? 'is-late' : ''}">${t.due ? when(t.due) : 'Sans date'}</p></div></li>`).join('')}</ul>`
            : `<p class="muted pad">Rien de prévu. Une relance datée évite qu'un prospect ne refroidisse.</p>`}
        </section>
        <section class="card rise">
          <header class="card-h"><div><h2>Scripts pour ${esc(p.entreprise)}</h2><p>${esc(sec.name)} · ${SERVICES[svc].label}</p></div></header>
          <div class="act-row"><a class="btn btn-primary" href="#/appel?p=${id}">${ic('headset')}<span>Mode appel</span></a><a class="btn btn-ghost" href="#/script/${svc}.appel.${sec.id}?p=${id}">${ic('script')}<span>Lire le script</span></a></div>
          <div class="chips-wrap">${CHANNELS.filter((c) => c.id !== 'appel').map((c) => `<a class="chip-btn" href="#/script/${svc}.${c.id}.${sec.id}?p=${id}">${ic(c.icon)}${c.short}</a>`).join('')}</div>
        </section>
        <section class="card rise">
          <header class="card-h"><div><h2>Historique</h2><p>${acts.length} échange${acts.length > 1 ? 's' : ''}</p></div><button class="link" data-act="act-new" data-pid="${id}">${ic('plus')}Ajouter</button></header>
          ${timeline(acts)}
        </section>
      </div>
      <div class="fiche-col">
        <section class="card rise">
          <header class="card-h"><div><h2>Informations</h2></div></header>
          <dl class="dl">
            ${[['Contact', p.contact], ['Téléphone', p.tel], ['E-mail', p.email], ['Adresse', [p.adresse, p.ville].filter(Boolean).join(', ')], ['Site', p.site], ['Instagram', p.instagram], ['Service', SERVICES[svc]?.label], ['Valeur estimée', p.valeur ? eur(p.valeur) : ''], ['Source', p.source], ['Créée', dateShort(p.createdAt)]]
              .map(([k, v]) => `<div><dt>${k}</dt><dd>${v ? esc(v) : '<span class="muted">—</span>'}</dd></div>`).join('')}
          </dl>
        </section>
        <section class="card rise">
          <header class="card-h"><div><h2>Notes</h2><p>Enregistrées automatiquement</p></div></header>
          <textarea class="inp notes" rows="5" data-act-input="notes" data-id="${id}" placeholder="Prénom du gérant, horaires, ce qui compte pour lui…">${esc(p.notes)}</textarea>
        </section>
        <section class="card rise">
          <header class="card-h"><div><h2>Audit express</h2><p>${audit ? `${audit.score} / 10 · ${dateShort(audit.at)}` : 'Présence en ligne du prospect'}</p></div><a class="link" href="#/outils/audit?p=${id}">${audit ? 'Refaire' : 'Lancer'}</a></header>
          ${audit ? `<div class="audit-mini">${'<i class="on"></i>'.repeat(audit.score)}${'<i></i>'.repeat(10 - audit.score)}</div>` : ''}
        </section>
        <button class="btn btn-danger-ghost btn-block" data-act="prospect-del" data-id="${id}">${ic('trash')}<span>Supprimer la fiche</span></button>
      </div>
    </div>`;
  return { title: p.entreprise, tab: 'crm', html };
}

// ---------- Formulaires ----------
export function prospectSheet(p = null) {
  const s = S();
  const v = p || { stage: 'a_appeler', service: s.profile.service || 'site', secteur: 'toute', source: 'Appel', ville: '' };
  const sectors = allSectors().map((x) => [x.id, x.name]);
  sheet(`${sheetHead(p ? 'Modifier la fiche' : 'Nouveau prospect')}
    <form class="sheet-body form" data-form="prospect" data-id="${p?.id || ''}">
      ${field('Entreprise', input('entreprise', v.entreprise, 'required autofocus autocomplete="organization" placeholder="Nom de l\'entreprise"'))}
      <div class="form-2">${field('Secteur', select('secteur', sectors, v.secteur))}${field('Service à proposer', select('service', SERVICE_IDS.map((id) => [id, SERVICES[id].label]), v.service))}</div>
      <div class="form-2">${field('Contact', input('contact', v.contact, 'placeholder="Prénom, nom"'))}${field('Téléphone', input('tel', v.tel, 'type="tel" inputmode="tel" placeholder="+32 …"'))}</div>
      <div class="form-2">${field('E-mail', input('email', v.email, 'type="email" inputmode="email"'))}${field('Commune', input('ville', v.ville, 'placeholder="Ixelles"'))}</div>
      ${field('Adresse', input('adresse', v.adresse))}
      <div class="form-2">${field('Site web', input('site', v.site, 'inputmode="url" placeholder="exemple.be"'))}${field('Instagram', input('instagram', v.instagram, 'placeholder="@compte"'))}</div>
      <div class="form-2">${field('Étape', select('stage', STAGES.map((x) => [x.id, x.label]), v.stage))}${field('Valeur estimée (€)', input('valeur', v.valeur || '', 'type="number" min="0" step="10" inputmode="decimal"'))}</div>
      ${field('Source', select('source', SOURCES.map((x) => [x, x]), v.source))}
      ${p ? '' : field('Notes', `<textarea class="inp" name="notes" rows="3">${esc(v.notes || '')}</textarea>`)}
      <button class="btn btn-primary btn-block" type="submit">${p ? 'Enregistrer' : 'Ajouter le prospect'}</button>
    </form>`, { cls: 'sheet-tall' });
}

export function taskSheet({ pid = '', task = null } = {}) {
  const s = S();
  const t = task || { title: pid ? `Rappeler ${getProspect(pid)?.entreprise || ''}` : '', kind: pid ? 'appel' : 'tache', due: null, prospectId: pid };
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0);
  sheet(`${sheetHead(task ? 'Modifier la tâche' : 'Nouvelle tâche')}
    <form class="sheet-body form" data-form="task" data-id="${task?.id || ''}">
      ${field('Intitulé', input('title', t.title, 'required autofocus'))}
      <div class="form-2">${field('Type', select('kind', [['appel', 'Appel'], ['relance', 'Relance'], ['rdv', 'Rendez-vous'], ['tache', 'Tâche']], t.kind))}${field('Échéance', `<input class="inp" type="datetime-local" name="due" value="${toLocalInput(t.due || d.getTime())}">`)}</div>
      ${field('Prospect', select('prospectId', [['', 'Aucun'], ...s.prospects.map((x) => [x.id, x.entreprise])], t.prospectId || ''))}
      <button class="btn btn-primary btn-block" type="submit">Enregistrer</button>
      ${task ? `<button type="button" class="btn btn-danger-ghost btn-block" data-act="task-del" data-id="${task.id}">${ic('trash')}<span>Supprimer la tâche</span></button>` : ''}
    </form>`, { cls: 'sheet-sm' });
}

function activitySheet(pid) {
  sheet(`${sheetHead('Ajouter à l\'historique')}
    <form class="sheet-body form" data-form="activity" data-pid="${pid}">
      <div class="seg seg-sm seg-radio">${[['appel', 'Appel'], ['note', 'Note'], ['email', 'E-mail'], ['visite', 'Visite'], ['devis', 'Devis']].map(([v, l], i) => `<label class="seg-i"><input type="radio" name="type" value="${v}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
      ${field('Résultat (pour un appel)', select('outcome', [['', '—'], ...OUTCOMES.map((o) => [o.id, o.label])], ''))}
      ${field('Note', '<textarea class="inp" name="note" rows="3" autofocus></textarea>')}
      <button class="btn btn-primary btn-block" type="submit">Ajouter</button>
    </form>`, { cls: 'sheet-sm' });
}

let notesTimer;
register({
  'prospect-new': () => prospectSheet(),
  'prospect-edit': (b) => prospectSheet(getProspect(b.dataset.id)),
  'prospect-del': async (b) => {
    const p = getProspect(b.dataset.id);
    if (!await confirmSheet({ title: 'Supprimer cette fiche ?', text: `${esc(p.entreprise)}, son historique et ses tâches seront supprimés de cet appareil.`, ok: 'Supprimer', danger: true })) return;
    deleteProspect(p.id); location.hash = '#/crm'; toast('Fiche supprimée');
  },
  'set-stage': (b) => {
    const p = getProspect(b.dataset.id);
    if (p.stage !== b.dataset.stage) { updateProspect(p.id, { stage: b.dataset.stage }); toast(`${esc(p.entreprise)} → ${STAGE[b.dataset.stage].label}`); }
    closeSheet();
  },
  'task-new': (b) => taskSheet({ pid: b.dataset.pid || '' }),
  'task-toggle': (b) => { b.classList.toggle('is-done'); setTimeout(() => toggleTask(b.dataset.id), 260); },
  'task-del': (b) => {
    update((s) => { s.tasks = s.tasks.filter((t) => t.id !== b.dataset.id); s.prospects.forEach((p) => { if (p.next?.taskId === b.dataset.id) p.next = null; }); });
    closeSheet(); toast('Tâche supprimée');
  },
  'act-new': (b) => activitySheet(b.dataset.pid),
  'act-del': async (b) => {
    if (!await confirmSheet({ title: 'Supprimer cet échange ?', ok: 'Supprimer', danger: true })) return;
    update((s) => { s.activities = s.activities.filter((a) => a.id !== b.dataset.id); });
  },
  'qa-off': (a, e) => { e.preventDefault(); toast(a.closest('.quick-acts') && getProspect(location.hash.split('/')[2])?.demo ? 'Numéro d\'exemple : rien à composer.' : 'Ajoutez cette information dans la fiche.'); },
  'qa-log': (a) => { location.href = a.getAttribute('href'); setTimeout(() => activitySheetAfterCall(a.dataset.id), 800); },
  notes: (el) => {
    clearTimeout(notesTimer);
    notesTimer = setTimeout(() => update((s) => { const p = s.prospects.find((x) => x.id === el.dataset.id); if (p) p.notes = el.value; }, { silent: true }), 400);
  },
}, {
  prospect: (data, f) => {
    data.valeur = Number(data.valeur) || 0;
    if (!data.entreprise?.trim()) return;
    if (f.dataset.id) { updateProspect(f.dataset.id, data); closeSheet(); toast('Fiche enregistrée'); return; }
    const p = addProspect(data);
    closeSheet(); toast(`${esc(p.entreprise)} ajouté`, { action: 'Ouvrir', onAction: () => { location.hash = `#/fiche/${p.id}`; } });
  },
  task: (data, f) => {
    const patch = { title: data.title.trim(), kind: data.kind, due: fromLocalInput(data.due), prospectId: data.prospectId || null };
    if (f.dataset.id) update((s) => { Object.assign(s.tasks.find((t) => t.id === f.dataset.id), patch); });
    else addTask(patch);
    closeSheet(); toast('Tâche enregistrée');
  },
  activity: (data, f) => {
    const pid = f.dataset.pid;
    if (data.type === 'appel' && data.outcome) recordCall(pid, data.outcome, data.note.trim());
    else logActivity({ prospectId: pid, type: data.type, note: data.note.trim(), outcome: data.type === 'appel' ? data.outcome || null : null });
    closeSheet(); toast('Ajouté à l\'historique');
  },
});

function activitySheetAfterCall(pid) {
  const p = getProspect(pid);
  if (!p) return;
  sheet(`${sheetHead('Comment s\'est passé l\'appel ?', esc(p.entreprise))}<div class="sheet-body"><div class="out-grid">${OUTCOMES.map((o) => `<button class="out out-${o.tone}" data-act="quick-out" data-id="${pid}" data-o="${o.id}">${o.label}</button>`).join('')}</div></div>`, { cls: 'sheet-sm' });
}
register({ 'quick-out': (b) => { recordCall(b.dataset.id, b.dataset.o); closeSheet(); toast(`Appel enregistré : ${OUTCOME[b.dataset.o].label.toLowerCase()}`); } });
