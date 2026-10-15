// CRM : pipeline, liste, fiche, formulaires, personnalisation (modèles par métier).
import { S, can, on, STAGES, STAGE, stageOf, TONES, SOURCES, OUTCOMES, OUTCOME, getProspect, addProspect, updateProspect, deleteProspect, logActivity, recordCall, update, uid, addPage } from '../store.js';
import { ic, esc, eur, num, register, sheet, sheetHead, closeSheet, toast, confirmSheet, avatar, stageChip, outcomeChip, when, ago, field, input, select, dateShort, initials, enableDnD, clearDraft } from '../ui.js';
import { SERVICES, SERVICE_IDS, CHANNELS, allSectors, getSector } from '../data/scripts.js';
import { pageHead, paywall } from './common.js';
import { QUALIF } from '../data/script-plus.js';
import { PRESETS, preset } from '../data/presets.js';
import { taskSheet, taskRow } from './tasks.js';
import { template } from '../data/templates.js';

const secName = (id) => getSector(id)?.name || 'Toute entreprise';
const showSector = (p) => on('prospecter') || (p.secteur && p.secteur !== 'toute');
const ownerName = (id) => S().crm.team.find((m) => m.id === id)?.name || '';
const searchKey = (p) => esc(`${p.entreprise} ${p.contact} ${p.ville} ${secName(p.secteur)} ${p.tel} ${p.email} ${(p.tags || []).join(' ')} ${ownerName(p.owner)} ${Object.values(p.cf || {}).join(' ')}`.toLowerCase());
const tagChips = (p, n = 9) => (p.tags || []).slice(0, n).map((t) => `<span class="tag-chip">${esc(t)}</span>`).join('');
export const noun = () => S().crm.noun || 'Clients';
// Singulier pour les phrases (« mon premier client », « mon premier candidat »…)
export const one = () => noun().toLowerCase().replace(/s$/, '');
const subLine = (p) => [showSector(p) ? secName(p.secteur) : p.contact, p.ville].filter(Boolean).map(esc).join(' · ');

// ---------- Pipeline / liste ----------
export function crmView(params, q) {
  const N = noun();
  if (!can('crm')) return { title: N, tab: 'crm', html: `${pageHead(N, { kicker: 'Pipeline et fiches clients' })}${paywall('crm')}${preview()}` };
  const s = S();
  const view = q.v === 'list' ? 'list' : 'board';
  const open = s.prospects.filter((p) => !['signe', 'perdu'].includes(p.stage));
  const openSum = open.reduce((n, p) => n + (Number(p.valeur) || 0), 0);
  const f = STAGE[q.f] ? q.f : '';
  const none = !s.prospects.length;
  const html = `
    ${pageHead(N, { kicker: none ? 'Vos fiches, étape par étape' : `${num(s.prospects.length)} fiche${s.prospects.length > 1 ? 's' : ''}${openSum ? ` · ${eur(openSum)} en cours` : ''}`, actions: `<a class="icon-btn" href="#/crm/personnaliser" aria-label="Personnaliser le CRM" title="Personnaliser">${ic('sliders')}</a><a class="icon-btn" href="#/outils/import" aria-label="Importer une liste" title="Importer">${ic('upload')}</a><button class="btn btn-primary fab-dup" data-act="prospect-new">${ic('plus')}<span>Fiche</span></button>` })}
    ${none ? `<section class="card onboard-empty rise">
        <span class="empty-ic">${ic('users')}</span>
        <h2>Ajoutez votre premier ${esc(one())}</h2>
        <p>Une fiche garde les coordonnées, l'historique des échanges et la prochaine relance. Elle avance d'étape en étape, de « ${esc(STAGES[0].label)} » à « ${esc(stageOf('signe').label)} » : plus aucun client oublié, plus aucune proposition sans suite.</p>
        <button class="btn btn-primary btn-lg" data-act="prospect-new">${ic('plus')}<span>Ajouter mon premier ${esc(one())}</span></button>
        <div class="oe-alt"><a class="btn btn-ghost" href="#/outils/import">${ic('upload')}<span>Importer une liste</span></a>${!s.crm.preset ? `<a class="btn btn-ghost" href="#/crm/personnaliser">${ic('sliders')}<span>Adapter à mon métier</span></a>` : ''}</div>
        <div class="demo-preview dp-board" aria-hidden="true">
          <span class="tag">Exemple</span>
          <div class="mk-board">${[[STAGES[0], [['Atelier Pivoine', 'Relance demain 10 h'], ['Kiné Flagey', 'Ixelles']]], [stageOf('rdv'), [['Maison Lemaire', 'Jeudi 14 h 30']]], [stageOf('signe'), [['Salon Céleste', '1 290 €']]]].map(([st, cards]) => `<div class="mk-col"><p><i class="dot t-${st.tone}"></i>${esc(st.label)}</p>${cards.map(([n, m]) => `<span class="mk-card"><b>${n}</b><em>${m}</em></span>`).join('')}</div>`).join('')}</div>
        </div>
        <p class="oe-foot">Vous voulez d'abord voir l'application remplie ? <button class="link" data-act="load-demo">Charger des données d'exemple</button>, effaçables en un geste.</p>
      </section>` : `
    <div class="crm-bar">
      <div class="search"><span class="search-ic">${ic('search')}</span><input class="inp" type="search" placeholder="Nom, ville, étiquette…" data-filter=".kcard, .rows .row" aria-label="Chercher une fiche"></div>
      <nav class="seg seg-sm" aria-label="Affichage"><a class="seg-i ${view === 'board' ? 'is-on' : ''}" href="#/crm">${ic('crm')}<span>Pipeline</span></a><a class="seg-i ${view === 'list' ? 'is-on' : ''}" href="#/crm?v=list">${ic('list')}<span>Liste</span></a></nav>
    </div>
    <p class="muted center filter-empty" hidden>Aucune fiche ne correspond à cette recherche.</p>
    ${view === 'board' ? board(s) : list(s, f, q)}`}`;
  return {
    title: N, tab: 'crm', fab: 'prospect-new', html,
    after(root) {
      if (q.new) setTimeout(() => prospectSheet(), 60);
      if (view === 'board' && !none) {
        return enableDnD(root.querySelector('.board'), {
          key: 'stage', onLong: moveSheet,
          onDrop: (id, stage) => { const p = getProspect(id); if (p && stage !== p.stage) { updateProspect(id, { stage }); toast(`${esc(p.entreprise)} → ${esc(stageOf(stage).label)}`); } },
        });
      }
    },
  };
}

function preview() {
  return `<div class="ghost-board" aria-hidden="true">${STAGES.slice(0, 4).map((st) => `<div class="kcol"><p class="kcol-h"><i class="dot t-${st.tone}"></i>${esc(st.label)}</p><div class="kcard"></div><div class="kcard"></div></div>`).join('')}</div>`;
}

const card = (p) => `<a class="kcard" href="#/fiche/${p.id}" draggable="false" data-id="${p.id}" data-name="${searchKey(p)}">
  <p class="kcard-t">${esc(p.entreprise)}${p.demo ? '<span class="tag">Exemple</span>' : ''}${p.owner && ownerName(p.owner) ? `<span class="owner" title="${esc(ownerName(p.owner))}">${esc(initials(ownerName(p.owner)))}</span>` : ''}</p>
  ${subLine(p) ? `<p class="kcard-s">${showSector(p) ? ic(getSector(p.secteur)?.icon || 'building') : ''}${subLine(p)}</p>` : ''}
  ${p.tags?.length ? `<p class="kcard-tags">${tagChips(p, 3)}</p>` : ''}
  <div class="kcard-f">${p.valeur ? `<b>${eur(p.valeur)}</b>` : `<span class="muted-s">${on('prospecter') ? SERVICES[p.service]?.short || '' : ''}</span>`}${p.next?.due ? `<span class="kcard-n ${p.next.due < Date.now() ? 'is-late' : ''}">${ic('clock')}${when(p.next.due)}</span>` : p.contact && showSector(p) ? `<span class="muted-s">${esc(p.contact)}</span>` : ''}</div>
</a>`;

function board(s) {
  return `<div class="board" role="list">${STAGES.map((st) => {
    const items = s.prospects.filter((p) => p.stage === st.id).sort((a, b) => (a.next?.due || 9e15) - (b.next?.due || 9e15) || b.updatedAt - a.updatedAt);
    const sum = items.reduce((n, p) => n + (Number(p.valeur) || 0), 0);
    return `<section class="kcol" data-stage="${st.id}" role="listitem" aria-label="${esc(st.label)}">
      <header class="kcol-h"><i class="dot t-${st.tone}"></i><span>${esc(st.label)}</span><b>${items.length}</b>${sum ? `<span class="kcol-sum">${eur(sum)}</span>` : ''}</header>
      <div class="kcol-b">${items.map(card).join('') || '<p class="kcol-empty">Glissez une fiche ici</p>'}</div>
    </section>`;
  }).join('')}</div>
  <p class="hint">${matchMedia('(pointer:fine)').matches ? 'Glissez les fiches d\'une colonne à l\'autre.' : 'Appui long sur une fiche pour la déplacer.'}</p>`;
}

function list(s, f, q) {
  const team = s.crm.team;
  const tags = [...new Set(s.prospects.flatMap((p) => p.tags || []))].sort();
  const o = q.o || '', t = q.t || '';
  const items = s.prospects.filter((p) => (!f || p.stage === f) && (!o || p.owner === o) && (!t || (p.tags || []).includes(t))).sort((a, b) => b.updatedAt - a.updatedAt);
  const href = (patch) => { const p = new URLSearchParams({ v: 'list', ...(f ? { f } : {}), ...(o ? { o } : {}), ...(t ? { t } : {}), ...patch }); for (const [k, v] of [...p]) if (!v) p.delete(k); return `#/crm?${p}`; };
  return `<nav class="chips-row" aria-label="Filtrer par étape">
      <a class="chip-btn ${!f ? 'is-on' : ''}" href="${href({ f: '' })}">Toutes <b>${s.prospects.length}</b></a>
      ${STAGES.map((st) => `<a class="chip-btn ${f === st.id ? 'is-on' : ''}" href="${href({ f: st.id })}"><i class="dot t-${st.tone}"></i>${esc(st.label)} <b>${s.prospects.filter((p) => p.stage === st.id).length}</b></a>`).join('')}
    </nav>
    ${team.length || tags.length ? `<nav class="chips-row chips-row-2" aria-label="Filtrer par responsable ou étiquette">
      ${team.map((m) => `<a class="chip-btn ${o === m.id ? 'is-on' : ''}" href="${href({ o: o === m.id ? '' : m.id })}">${ic('user')}${esc(m.name)}</a>`).join('')}
      ${tags.map((x) => `<a class="chip-btn ${t === x ? 'is-on' : ''}" href="${href({ t: t === x ? '' : x })}">#${esc(x)}</a>`).join('')}
    </nav>` : ''}
    ${items.length ? `<ul class="rows card">${items.map((p) => `<li><a class="row" href="#/fiche/${p.id}" data-name="${searchKey(p)}">${avatar(p.entreprise)}
      <span class="row-b"><b>${esc(p.entreprise)}</b><span>${subLine(p)}${p.owner && ownerName(p.owner) ? ' · ' + esc(ownerName(p.owner)) : ''}${p.next?.due ? ` · ${when(p.next.due)}` : ''}</span></span>
      <span class="row-e">${stageChip(p.stage)}${p.valeur ? `<b class="muted-s">${eur(p.valeur)}</b>` : ''}</span></a></li>`).join('')}</ul>`
    : `<div class="empty"><span class="empty-ic">${ic('filter')}</span><p class="empty-t">Aucune fiche avec ces filtres</p><p class="empty-p">Changez d'étape ou retirez un filtre.</p><a class="btn btn-ghost" href="#/crm?v=list">Tout afficher</a></div>`}`;
}

function moveSheet(id) {
  const p = getProspect(id);
  sheet(`${sheetHead('Déplacer vers', esc(p.entreprise))}<div class="sheet-body stage-pick">${STAGES.map((st) => `<button class="stage-opt ${st.id === p.stage ? 'is-on' : ''}" data-act="set-stage" data-id="${id}" data-stage="${st.id}"><i class="dot t-${st.tone}"></i>${esc(st.label)}${st.id === p.stage ? ic('check') : ''}</button>`).join('')}</div>`, { cls: 'sheet-sm' });
}

// ---------- Fiche ----------
const ACT_ICON = { appel: 'phone', etape: 'arrowR', note: 'note', email: 'mail', sms: 'message', visite: 'store', rdv: 'calendar', devis: 'invoice', audit: 'clipboard' };
const ACT_LABEL = { appel: 'Appel', note: 'Note', email: 'E-mail envoyé', sms: 'SMS envoyé', visite: 'Visite', rdv: 'Rendez-vous', devis: 'Devis envoyé', audit: 'Audit express' };

function timeline(acts) {
  if (!acts.length) return '<p class="muted pad">Aucun échange pour l\'instant.</p>';
  return `<ol class="tl">${acts.map((a) => `<li class="tl-i"><span class="tl-ic">${ic(ACT_ICON[a.type] || 'note')}</span><div class="tl-b">
    <p class="tl-t">${a.type === 'etape' ? `Étape : ${esc(stageOf(a.from).label || '—')} → <b>${esc(stageOf(a.to).label || '')}</b>` : `<b>${ACT_LABEL[a.type] || 'Activité'}</b>${a.outcome ? ' ' + outcomeChip(a.outcome) : ''}`}</p>
    ${a.note ? `<p class="tl-n">${esc(a.note)}</p>` : ''}<p class="tl-d">${ago(a.at)} · ${dateShort(a.at)}</p></div>
    ${a.type !== 'etape' ? `<button class="icon-btn sm" data-act="act-del" data-id="${a.id}" aria-label="Supprimer">${ic('trash')}</button>` : ''}</li>`).join('')}</ol>`;
}

export function fiche([id]) {
  if (!can('crm')) return { title: 'Fiche', tab: 'crm', html: `${pageHead('Fiche', { back: '#/crm' })}${paywall('crm')}` };
  const s = S();
  const p = getProspect(id);
  if (!p) return { title: 'Fiche', tab: 'crm', html: `${pageHead('Fiche introuvable', { back: '#/crm' })}<div class="empty"><span class="empty-ic">${ic('users')}</span><p class="empty-t">Cette fiche n'existe plus</p><p class="empty-p">Elle a peut-être été supprimée ou fusionnée.</p><a class="btn btn-ghost" href="#/crm">Retour aux fiches</a></div>` };
  const sec = getSector(p.secteur) || getSector('toute');
  const svc = p.service || 'site';
  const pro = on('prospecter');
  const acts = s.activities.filter((a) => a.prospectId === id).sort((a, b) => b.at - a.at);
  const tasks = s.tasks.filter((t) => t.prospectId === id && !t.done).sort((a, b) => (a.due || 9e15) - (b.due || 9e15));
  const pages = s.pages.filter((x) => x.prospectId === id);
  const tel = (p.tel || '').replace(/[^\d+]/g, '');
  const demo = p.demo;
  const url = p.site ? (/^https?:\/\//.test(p.site) ? p.site : `https://${p.site}`) : '';
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.entreprise, p.adresse, p.ville].filter(Boolean).join(' '))}`;
  const audit = p.audit;
  const html = `
    ${pageHead('', { back: '#/crm' })}
    <section class="fiche-h rise">
      ${avatar(p.entreprise, 'xl')}
      <div><h1 class="ph-t">${esc(p.entreprise)}</h1><p class="fiche-s">${showSector(p) ? ic(sec.icon) : ''}<span>${subLine(p) || esc(stageOf(p.stage).label)}</span>${p.demo ? '<span class="tag">Exemple</span>' : ''}</p></div>
      <button class="icon-btn" data-act="prospect-edit" data-id="${id}" aria-label="Modifier la fiche">${ic('edit')}</button>
    </section>
    <nav class="stage-row rise" aria-label="Étape">${STAGES.map((st) => `<button class="stage-b t-${st.tone} ${st.id === p.stage ? 'is-on' : ''}" data-act="set-stage" data-id="${id}" data-stage="${st.id}" aria-pressed="${st.id === p.stage}"><i class="dot"></i>${esc(st.label)}</button>`).join('')}</nav>
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
          ${tasks.length ? `<ul class="tasks">${tasks.map((t) => taskRow(t)).join('')}</ul>`
            : '<p class="muted pad">Rien de prévu. Une relance datée évite qu\'une fiche ne refroidisse.</p>'}
        </section>
        ${pro ? `<section class="card rise">
          <header class="card-h"><div><h2>Scripts pour ${esc(p.entreprise)}</h2><p>${esc(sec.name)} · ${SERVICES[svc]?.label || ''}</p></div></header>
          <div class="act-row"><a class="btn btn-primary" href="#/appel?p=${id}">${ic('headset')}<span>Mode appel</span></a><a class="btn btn-ghost" href="#/script/${svc}.appel.${sec.id}?p=${id}">${ic('script')}<span>Lire le script</span></a></div>
          <div class="chips-wrap">${CHANNELS.filter((c) => c.id !== 'appel').map((c) => `<a class="chip-btn" href="#/script/${svc}.${c.id}.${sec.id}?p=${id}">${ic(c.icon)}${c.short}</a>`).join('')}</div>
        </section>` : ''}
        <section class="card rise">
          <header class="card-h"><div><h2>Historique</h2><p>${acts.length} échange${acts.length > 1 ? 's' : ''}</p></div><button class="link" data-act="act-new" data-pid="${id}">${ic('plus')}Ajouter</button></header>
          ${timeline(acts)}
        </section>
      </div>
      <div class="fiche-col">
        <section class="card rise">
          <header class="card-h"><div><h2>Informations</h2></div></header>
          <dl class="dl">
            ${[['Contact', p.contact], ['Téléphone', p.tel], ['E-mail', p.email], ['Adresse', [p.adresse, p.ville].filter(Boolean).join(', ')], ['Site', p.site], ['Instagram', p.instagram], ...(pro ? [['Service', SERVICES[svc]?.label]] : []), ['Valeur estimée', p.valeur ? eur(p.valeur) : ''], ['Source', p.source], ...(s.crm.team.length ? [['Responsable', ownerName(p.owner)]] : []), ...s.crm.fields.map((f) => [f.label, p.cf?.[f.id] || '', f.type]), ['Créée', dateShort(p.createdAt)]]
              .map(([k, v, t]) => `<div><dt>${esc(k)}</dt><dd>${!v ? '<span class="muted">—</span>' : t === 'url' ? `<a class="link" href="${esc(/^https?:/.test(v) ? v : 'https://' + v)}" target="_blank" rel="noopener">${esc(v.replace(/^https?:\/\//, '').slice(0, 40))}</a>` : t === 'date' ? esc(dateShort(new Date(v).getTime())) : esc(v)}</dd></div>`).join('')}
          </dl>
          ${p.tags?.length ? `<p class="fiche-tags">${tagChips(p)}</p>` : ''}
        </section>
        <section class="card rise">
          <header class="card-h"><div><h2>Notes</h2><p>Enregistrées automatiquement</p></div></header>
          <textarea class="inp notes" rows="5" data-act-input="notes" data-id="${id}" placeholder="Prénom de la personne, horaires, ce qui compte pour elle…">${esc(p.notes)}</textarea>
        </section>
        ${on('organiser') ? `<section class="card rise">
          <header class="card-h"><div><h2>Pages liées</h2><p>${pages.length ? `${pages.length} page${pages.length > 1 ? 's' : ''}` : 'Comptes rendus, idées, documents'}</p></div><button class="link" data-act="page-for" data-pid="${id}">${ic('plus')}Compte rendu</button></header>
          ${pages.length ? `<ul class="rows">${pages.map((x) => `<li><a class="row" href="#/note/${x.id}"><span class="menu-ic">${ic(x.icon || 'page')}</span><span class="row-b"><b>${esc(x.title || 'Sans titre')}</b><span>Modifiée ${ago(x.updatedAt)}</span></span>${ic('chevR', 'chev')}</a></li>`).join('')}</ul>` : ''}
        </section>` : ''}
        <section class="card rise">
          <header class="card-h"><div><h2>Qualification</h2><p>${QUALIF.filter((x) => p.qualif?.[x.k]).length} / 4 · avant de faire une proposition</p></div></header>
          <ul class="checklist">${QUALIF.map((x) => `<li><button class="ck ${p.qualif?.[x.k] ? 'is-on' : ''}" data-act="qualif" data-id="${id}" data-k="${x.k}" aria-pressed="${!!p.qualif?.[x.k]}"><span class="tick ${p.qualif?.[x.k] ? 'is-done' : ''}"></span><span><b>${x.label}</b><em>« ${esc(x.q)} »</em></span></button></li>`).join('')}</ul>
        </section>
        ${pro ? `<section class="card rise">
          <header class="card-h"><div><h2>Audit express</h2><p>${audit ? `${audit.score} / 10 · ${dateShort(audit.at)}` : 'Présence en ligne de cette entreprise'}</p></div><a class="link" href="#/outils/audit?p=${id}">${audit ? 'Refaire' : 'Lancer'}</a></header>
          ${audit ? `<div class="audit-mini">${'<i class="on"></i>'.repeat(audit.score)}${'<i></i>'.repeat(10 - audit.score)}</div>` : ''}
        </section>` : ''}
        <button class="btn btn-danger-ghost btn-block" data-act="prospect-del" data-id="${id}">${ic('trash')}<span>Supprimer la fiche</span></button>
      </div>
    </div>`;
  return { title: p.entreprise, tab: 'crm', html };
}

// ---------- Formulaires ----------
export function prospectSheet(p = null) {
  const s = S();
  const pro = on('prospecter');
  const v = p || { stage: STAGES[0].id, service: s.profile.service || 'site', secteur: 'toute', source: pro ? 'Appel' : 'Recommandation', ville: '' };
  const sectors = allSectors().map((x) => [x.id, x.name]);
  sheet(`${sheetHead(p ? 'Modifier la fiche' : 'Nouvelle fiche', p ? '' : esc(noun()))}
    <form class="sheet-body form" data-form="prospect" data-id="${p?.id || ''}" ${p ? '' : 'data-draft="prospect-new"'} data-validate novalidate>
      ${field('Nom', input('entreprise', v.entreprise, 'required autofocus autocomplete="organization" placeholder="Entreprise ou personne"'))}
      ${pro ? `<div class="form-2">${field('Secteur', select('secteur', sectors, v.secteur))}${field('Service à proposer', select('service', SERVICE_IDS.map((id) => [id, SERVICES[id].label]), v.service))}</div>` : ''}
      <div class="form-2">${field('Contact', input('contact', v.contact, 'placeholder="Prénom, nom"'))}${field('Téléphone', input('tel', v.tel, 'type="tel" inputmode="tel" data-rule="tel" placeholder="+32 …"'))}</div>
      <div class="form-2">${field('E-mail', input('email', v.email, 'type="email" inputmode="email"'))}${field('Commune', input('ville', v.ville, 'placeholder="Ixelles"'))}</div>
      ${field('Adresse', input('adresse', v.adresse))}
      <div class="form-2">${field('Site web', input('site', v.site, 'inputmode="url" data-rule="url" placeholder="exemple.be"'))}${field('Instagram', input('instagram', v.instagram, 'placeholder="@compte"'))}</div>
      <div class="form-2">${field('Étape', select('stage', STAGES.map((x) => [x.id, x.label]), v.stage))}${field('Valeur estimée (€)', input('valeur', v.valeur || '', 'type="number" min="0" step="10" inputmode="decimal"'))}</div>
      <div class="form-2">${field('Source', select('source', SOURCES.map((x) => [x, x]), v.source))}${s.crm.team.length ? field('Responsable', select('owner', [['', 'Personne'], ...s.crm.team.map((m) => [m.id, m.name])], v.owner || '')) : ''}</div>
      ${field('Étiquettes', input('tags', (v.tags || []).join(', '), 'placeholder="vip, Flagey, salon 2026"'), 'Séparées par des virgules. Elles servent à filtrer la liste.')}
      ${s.crm.fields.map((f) => field(esc(f.label), f.type === 'select' ? select(`cf.${f.id}`, [['', '—'], ...(f.options || []).map((o) => [o, o])], v.cf?.[f.id] || '') : input(`cf.${f.id}`, v.cf?.[f.id] || '', f.type === 'number' ? 'type="number" inputmode="decimal"' : f.type === 'date' ? 'type="date"' : f.type === 'url' ? 'inputmode="url" data-rule="url"' : ''))).join('')}
      ${p ? '' : field('Notes', `<textarea class="inp" name="notes" rows="3">${esc(v.notes || '')}</textarea>`)}
      <button class="btn btn-primary btn-block" type="submit" data-needs="entreprise" ${v.entreprise ? '' : 'disabled'}>${p ? 'Enregistrer' : 'Ajouter la fiche'}</button>
    </form>`, { cls: 'sheet-tall' });
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
  'prospect-new': () => { if (can('crm')) prospectSheet(); else location.hash = '#/crm'; },
  'prospect-edit': (b) => prospectSheet(getProspect(b.dataset.id)),
  'prospect-del': async (b) => {
    const p = getProspect(b.dataset.id);
    if (!await confirmSheet({ title: 'Supprimer cette fiche ?', text: `${esc(p.entreprise)}, son historique et ses tâches seront supprimés de cet appareil.`, ok: 'Supprimer', danger: true })) return;
    deleteProspect(p.id); location.hash = '#/crm'; toast('Fiche supprimée');
  },
  'set-stage': (b) => {
    const p = getProspect(b.dataset.id);
    if (p.stage !== b.dataset.stage) { updateProspect(p.id, { stage: b.dataset.stage }); toast(`${esc(p.entreprise)} → ${esc(stageOf(b.dataset.stage).label)}`); }
    closeSheet();
  },
  'act-new': (b) => activitySheet(b.dataset.pid),
  'act-del': async (b) => {
    if (!await confirmSheet({ title: 'Supprimer cet échange ?', ok: 'Supprimer', danger: true })) return;
    update((s) => { s.activities = s.activities.filter((a) => a.id !== b.dataset.id); });
  },
  'qa-off': (a, e) => { e.preventDefault(); toast(getProspect(location.hash.split('/')[2])?.demo ? 'Numéro d\'exemple : rien à composer.' : 'Ajoutez cette information dans la fiche.'); },
  'qa-log': (a) => { location.href = a.getAttribute('href'); setTimeout(() => activitySheetAfterCall(a.dataset.id), 800); },
  notes: (el) => {
    clearTimeout(notesTimer);
    notesTimer = setTimeout(() => update((s) => { const p = s.prospects.find((x) => x.id === el.dataset.id); if (p) p.notes = el.value; }, { silent: true }), 400);
  },
  'page-for': (b) => {
    const p = getProspect(b.dataset.pid);
    const tpl = template('rdv');
    const page = addPage({ title: `${tpl.title}${p.entreprise}`, icon: tpl.icon, prospectId: p.id, blocks: tpl.blocks.map(([t, x, a]) => ({ id: 'b' + Math.random().toString(36).slice(2, 9), t, x: x || '', ...(t === 'qa' ? { a: a || '' } : {}) })) });
    location.hash = `#/note/${page.id}`;
  },
}, {
  prospect: (data, f) => {
    data.valeur = Number(data.valeur) || 0;
    data.entreprise = (data.entreprise || '').trim();
    if (!data.entreprise) return;
    data.tags = (data.tags || '').split(',').map((x) => x.trim().replace(/^#/, '')).filter(Boolean).slice(0, 12);
    const cf = {};
    for (const k of Object.keys(data)) if (k.startsWith('cf.')) { if (data[k] !== '') cf[k.slice(3)] = data[k]; delete data[k]; }
    data.cf = cf;
    if (f.dataset.id) { updateProspect(f.dataset.id, data); closeSheet(); toast('Fiche enregistrée'); return; }
    const p = addProspect(data);
    clearDraft('prospect-new');
    closeSheet(); toast(`${esc(p.entreprise)} ajouté`, { title: 'Fiche créée', action: 'Ouvrir', onAction: () => { location.hash = `#/fiche/${p.id}`; } });
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

// ---------- Modèle par métier ----------
export function applyPreset(id) {
  const p = preset(id);
  if (!p) return;
  update((s) => {
    s.crm.preset = id; s.crm.noun = p.noun; s.crm.labels = { ...p.labels };
    const extra = s.crm.extra.filter((x) => s.prospects.some((pr) => pr.stage === x.id));
    for (const x of p.extra) {
      if (extra.some((y) => y.label.toLowerCase() === x.label.toLowerCase())) continue;
      const after = x.after.startsWith('st:') ? (extra.find((y) => y.label === x.after.slice(3))?.id || 'signe') : x.after;
      extra.push({ id: 'st-' + uid(), label: x.label, after, tone: x.tone || 'sky' });
    }
    s.crm.extra = extra.slice(0, 5);
    for (const [label, type, options] of p.fields) if (!s.crm.fields.some((f) => f.label.toLowerCase() === label.toLowerCase())) s.crm.fields.push({ id: 'f-' + uid(), label, type, options: options || [] });
    if (p.service) s.profile.service = p.service;
  });
}

// ---------- CRM personnalisé : modèle, étapes, champs, équipe ----------
const FIELD_TYPES = [['text', 'Texte'], ['number', 'Nombre'], ['date', 'Date'], ['url', 'Lien'], ['select', 'Liste de choix']];
const STAGE_IDEAS = ['Maquette prête', 'En production', 'En ligne', 'En cours', 'Livré', 'Client fidèle'];
const FIELD_IDEAS = [['Lien de la maquette', 'url'], ['N° de TVA', 'text'], ['Mensualité (€)', 'number'], ['Date de livraison', 'date'], ['Anniversaire', 'date']];
const NOUNS = ['Clients', 'Prospects', 'Contacts', 'Candidats', 'Partenaires', 'Patients', 'Élèves'];

export function crmSettings() {
  if (!can('crm')) return { title: 'Personnaliser', tab: 'crm', html: `${pageHead('Personnaliser le CRM', { back: '#/crm' })}${paywall('crm')}` };
  const s = S();
  const count = (id) => s.prospects.filter((p) => p.stage === id).length;
  const cur = s.crm.preset;
  const html = `${pageHead('Personnaliser le CRM', { back: '#/crm', kicker: 'Votre métier, vos étapes, vos champs, votre équipe' })}
    <section class="card rise">
      <header class="card-h"><div><h2>Votre métier</h2><p>Un modèle prêt à l'emploi : noms des étapes et champs utiles</p></div></header>
      <div class="preset-grid">${PRESETS.map((x) => `<button class="preset ${cur === x.id ? 'is-on' : ''}" data-act="preset" data-id="${x.id}" aria-pressed="${cur === x.id}"><span class="preset-ic">${ic(x.icon)}</span><span class="preset-b"><b>${esc(x.label)}</b><em>${esc(x.desc)}</em></span>${cur === x.id ? ic('check', 'preset-ck') : ''}</button>`).join('')}</div>
      <label class="field"><span class="field-l">Vos fiches s'appellent</span>${select('noun', NOUNS.map((n) => [n, n]), s.crm.noun || 'Clients', 'data-act-change="crm-noun"')}<span class="field-h">C'est aussi le nom de l'onglet.</span></label>
    </section>
    <section class="card rise">
      <header class="card-h"><div><h2>Étapes du pipeline</h2><p>Renommez-les, ajoutez les vôtres</p></div></header>
      <ul class="cfg">${STAGES.map((st) => `<li>
        <i class="dot t-${st.tone}"></i>
        <input class="inp" value="${esc(st.label)}" maxlength="28" aria-label="Nom de l'étape" data-act-change="stage-label" data-id="${st.id}">
        <span class="muted-s cfg-n">${count(st.id)} fiche${count(st.id) > 1 ? 's' : ''}</span>
        ${st.custom ? `<button class="icon-btn sm" data-act="stage-del" data-id="${st.id}" aria-label="Supprimer l'étape ${esc(st.label)}">${ic('trash')}</button>` : `<span class="cfg-lock" title="Étape de base : renommable, pas supprimable">${ic('lock')}</span>`}
      </li>`).join('')}</ul>
      <form class="cfg-add" data-form="stage-add" data-validate novalidate>
        <input class="inp" name="label" required maxlength="28" placeholder="Nouvelle étape, ex. En cours" aria-label="Nom de la nouvelle étape">
        ${select('after', STAGES.filter((x) => x.id !== 'perdu').map((x) => [x.id, `après « ${x.label} »`]), 'rdv', 'aria-label="Position"')}
        ${select('tone', TONES.map((t) => [t, { grey: 'Gris', sky: 'Bleu clair', blue: 'Bleu', navy: 'Bleu nuit', sand: 'Sable', olive: 'Olive', rose: 'Rose' }[t]]), 'sky', 'aria-label="Couleur"')}
        <button class="btn btn-primary" type="submit" data-needs="label" disabled>${ic('plus')}<span>Ajouter</span></button>
      </form>
      <div class="chips-wrap">${STAGE_IDEAS.filter((x) => !STAGES.some((st) => st.label === x)).slice(0, 4).map((x) => `<button class="chip-btn" data-act="stage-idea" data-label="${esc(x)}">${ic('plus')}${esc(x)}</button>`).join('')}</div>
      <p class="field-h">Les étapes avec un cadenas servent aux statistiques et au mode appel : vous pouvez les renommer, pas les supprimer.</p>
    </section>
    <section class="card rise">
      <header class="card-h"><div><h2>Champs personnalisés</h2><p>Ils apparaissent dans chaque fiche et dans le formulaire</p></div></header>
      ${s.crm.fields.length ? `<ul class="cfg">${s.crm.fields.map((f) => `<li><span class="cfg-ic">${ic(f.type === 'url' ? 'globe' : f.type === 'date' ? 'calendar' : f.type === 'number' ? 'euro' : f.type === 'select' ? 'list' : 'note')}</span><span class="cfg-l"><b>${esc(f.label)}</b><em>${FIELD_TYPES.find((t) => t[0] === f.type)?.[1] || 'Texte'}${f.options?.length ? ' : ' + esc(f.options.join(', ')) : ''}</em></span><button class="icon-btn sm" data-act="field-del" data-id="${f.id}" aria-label="Supprimer le champ ${esc(f.label)}">${ic('trash')}</button></li>`).join('')}</ul>`
        : '<p class="muted pad">Aucun champ pour l\'instant : ajoutez ce que vous notez toujours sur une fiche.</p>'}
      <form class="cfg-add" data-form="field-add" data-validate novalidate>
        <input class="inp" name="label" required maxlength="32" placeholder="Nom du champ, ex. Budget" aria-label="Nom du champ">
        ${select('type', FIELD_TYPES, 'text', 'aria-label="Type de champ"')}
        <input class="inp" name="options" placeholder="Choix séparés par des virgules (liste)" aria-label="Choix possibles">
        <button class="btn btn-primary" type="submit" data-needs="label" disabled>${ic('plus')}<span>Ajouter</span></button>
      </form>
      <div class="chips-wrap">${FIELD_IDEAS.filter(([l]) => !s.crm.fields.some((f) => f.label === l)).slice(0, 4).map(([l, t]) => `<button class="chip-btn" data-act="field-idea" data-label="${esc(l)}" data-type="${t}">${ic('plus')}${esc(l)}</button>`).join('')}</div>
    </section>
    <section class="card rise">
      <header class="card-h"><div><h2>Équipe</h2><p>Attribuez chaque fiche à une personne</p></div></header>
      ${s.crm.team.length ? `<ul class="cfg">${s.crm.team.map((m) => `<li>${avatar(m.name)}<span class="cfg-l"><b>${esc(m.name)}</b><em>${s.prospects.filter((p) => p.owner === m.id).length} fiche(s)</em></span><button class="icon-btn sm" data-act="team-del" data-id="${m.id}" aria-label="Retirer ${esc(m.name)}">${ic('trash')}</button></li>`).join('')}</ul>`
        : '<p class="muted pad">Vous travaillez à plusieurs ? Ajoutez vos associés : chaque fiche pourra avoir un responsable, et la liste se filtrer par personne.</p>'}
      <form class="cfg-add" data-form="team-add" data-validate novalidate>
        <input class="inp" name="name" required maxlength="30" placeholder="Prénom" aria-label="Prénom du membre">
        <button class="btn btn-primary" type="submit" data-needs="name" disabled>${ic('plus')}<span>Ajouter</span></button>
      </form>
      <p class="field-h">Pour l'instant, chaque appareil garde ses propres données : le partage en temps réel entre associés arrivera avec les comptes en ligne.</p>
    </section>
    <section class="card rise">
      <header class="card-h"><div><h2>Vos données existantes</h2><p>Un fichier préparé, une sauvegarde, un tableur</p></div></header>
      <div class="btn-list">
        <label class="btn btn-ghost">${ic('upload')}<span>Importer un fichier de données (.json)</span><input type="file" accept="application/json,.json" hidden data-act-change="import-merge"></label>
        <a class="btn btn-ghost" href="#/outils/import">${ic('list')}<span>Coller une liste (tableur, CSV)</span></a>
      </div>
      <p class="field-h">L'import ajoute les fiches, étapes, champs et l'équipe du fichier sans rien effacer. Les noms déjà présents sont ignorés.</p>
    </section>`;
  return { title: 'Personnaliser le CRM', tab: 'crm', html };
}

register({
  preset: async (b) => {
    const p = preset(b.dataset.id);
    const s = S();
    if (s.prospects.length && !await confirmSheet({ title: `Appliquer le modèle « ${esc(p.label)} » ?`, text: 'Les étapes sont renommées et les champs utiles ajoutés. Vos fiches, leurs étapes et vos champs actuels sont conservés.', ok: 'Appliquer' })) return;
    applyPreset(p.id);
    toast(`Étapes et champs adaptés. Vos fiches s'appellent maintenant « ${esc(p.noun)} ».`, { title: p.label });
  },
  'crm-noun': (el) => { update((s) => { s.crm.noun = el.value; }); toast(`Vos fiches s'appellent « ${esc(el.value)} »`, { ms: 1500 }); },
  'stage-label': (el) => {
    const label = el.value.trim();
    if (!label) { toast('Le nom de l\'étape ne peut pas être vide.', { title: 'Nom manquant' }); el.value = stageOf(el.dataset.id).label; return; }
    update((s) => {
      const x = s.crm.extra.find((e) => e.id === el.dataset.id);
      if (x) x.label = label; else s.crm.labels[el.dataset.id] = label;
    });
    toast(`Étape renommée : ${esc(label)}`, { ms: 1400 });
  },
  'stage-idea': (b) => addStage(b.dataset.label, 'rdv', 'sky'),
  'stage-del': async (b) => {
    const st = stageOf(b.dataset.id);
    const n = S().prospects.filter((p) => p.stage === st.id).length;
    const prev = STAGES[Math.max(0, STAGES.findIndex((x) => x.id === st.id) - 1)];
    if (!await confirmSheet({ title: `Supprimer « ${esc(st.label)} » ?`, text: n ? `${n} fiche${n > 1 ? 's' : ''} passeront dans « ${esc(prev.label)} ».` : 'Aucune fiche n\'est dans cette étape.', ok: 'Supprimer', danger: true })) return;
    update((s) => { s.crm.extra = s.crm.extra.filter((x) => x.id !== st.id); s.prospects.forEach((p) => { if (p.stage === st.id) p.stage = prev.id; }); });
    toast('Étape supprimée');
  },
  'field-idea': (b) => addField(b.dataset.label, b.dataset.type, ''),
  'field-del': async (b) => {
    const f = S().crm.fields.find((x) => x.id === b.dataset.id);
    if (!await confirmSheet({ title: `Supprimer le champ « ${esc(f.label)} » ?`, text: 'Les valeurs saisies dans les fiches seront effacées.', ok: 'Supprimer', danger: true })) return;
    update((s) => { s.crm.fields = s.crm.fields.filter((x) => x.id !== f.id); s.prospects.forEach((p) => { if (p.cf) delete p.cf[f.id]; }); });
    toast('Champ supprimé');
  },
  'team-del': async (b) => {
    const m = S().crm.team.find((x) => x.id === b.dataset.id);
    if (!await confirmSheet({ title: `Retirer ${esc(m.name)} de l'équipe ?`, text: 'Ses fiches resteront, sans responsable.', ok: 'Retirer', danger: true })) return;
    update((s) => { s.crm.team = s.crm.team.filter((x) => x.id !== m.id); s.prospects.forEach((p) => { if (p.owner === m.id) p.owner = ''; }); });
  },
}, {
  'stage-add': (d) => addStage(d.label, d.after, d.tone),
  'field-add': (d) => addField(d.label, d.type, d.options),
  'team-add': (d) => {
    const name = (d.name || '').trim();
    if (!name) return;
    if (S().crm.team.some((m) => m.name.toLowerCase() === name.toLowerCase())) { toast(`${esc(name)} fait déjà partie de l'équipe.`); return; }
    update((s) => { s.crm.team.push({ id: 'm-' + uid(), name }); });
    toast(`${esc(name)} ajouté à l'équipe`);
  },
});

function addStage(label, after, tone) {
  label = (label || '').trim();
  if (!label) return;
  if (STAGES.some((st) => st.label.toLowerCase() === label.toLowerCase())) { toast(`L'étape « ${esc(label)} » existe déjà.`, { title: 'Déjà présente' }); return; }
  if (S().crm.extra.length >= 5) { toast('Cinq étapes personnalisées au maximum, pour garder un pipeline lisible.', { title: 'Limite atteinte' }); return; }
  update((s) => { s.crm.extra.push({ id: 'st-' + uid(), label, after: after || 'rdv', tone: TONES.includes(tone) ? tone : 'sky' }); });
  toast(`Étape « ${esc(label)} » ajoutée`);
}
function addField(label, type, options) {
  label = (label || '').trim();
  if (!label) return;
  if (S().crm.fields.some((f) => f.label.toLowerCase() === label.toLowerCase())) { toast(`Le champ « ${esc(label)} » existe déjà.`, { title: 'Déjà présent' }); return; }
  const opts = type === 'select' ? String(options || '').split(',').map((x) => x.trim()).filter(Boolean) : [];
  if (type === 'select' && !opts.length) { toast('Indiquez au moins un choix, séparé par des virgules.', { title: 'Liste vide' }); return; }
  update((s) => { s.crm.fields.push({ id: 'f-' + uid(), label, type: type || 'text', options: opts }); });
  toast(`Champ « ${esc(label)} » ajouté`);
}
export { taskSheet };
