// Devis : un devis par client, suivi de « brouillon » à « accepté » ou « refusé ».
// Envoyé → une relance est prévue dans 3 jours. Accepté → la fiche passe en client signé
// et un projet est créé (voir updateProspect dans store.js).
import { S, update, can, uid, DAY, startOfDay, startOfMonth, getProspect, updateProspect, logActivity, addTask, getQuote, quoteTotals, QUOTE_STATUS } from '../store.js';
import { ic, esc, eur, eur2, num, register, toast, sheet, sheetHead, closeSheet, confirmSheet, field, input, select, dateShort, ago } from '../ui.js';
import { pageHead, paywall } from './common.js';

export const FOLLOW_DAYS = 3;
const ORDER = ['brouillon', 'envoye', 'accepte', 'refuse'];
const chip = (st) => `<span class="chip t-${QUOTE_STATUS[st]?.[1] || 'grey'}">${QUOTE_STATUS[st]?.[0] || ''}</span>`;
export const toFollow = (qt) => qt.status === 'envoye' && qt.sentAt && Date.now() - qt.sentAt > FOLLOW_DAYS * DAY;
const rr = () => window.dispatchEvent(new Event('ms:rerender'));

export function newQuote(pid = '') {
  const s = S(), p = pid && getProspect(pid);
  const seq = (s.quoteSeq || 0) + 1;
  const qt = {
    id: 'qt-' + uid(), num: `DEV-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`, prospectId: p ? p.id : null,
    client: p?.entreprise || '', contact: p?.contact || '', email: p?.email || '', adresse: [p?.adresse, p?.ville].filter(Boolean).join(', '),
    title: '', lines: [], remise: 0, tva: 21, acompte: 50, validite: 30, note: '', status: 'brouillon', createdAt: Date.now(), updatedAt: Date.now(),
  };
  update((x) => { x.quoteSeq = seq; x.quotes.unshift(qt); });
  return qt;
}

const DEMO = [['DEV-2026-014', 'Maison Lemaire', 'Site vitrine + précommandes', 2420, 'envoye', 'À relancer'], ['DEV-2026-013', 'Cabinet Delvaux', 'Mission de conseil, 4 jours', 3872, 'accepte', ''], ['DEV-2026-012', 'Studio Lumen', 'Shooting produits', 968, 'brouillon', '']];
const demoList = () => `<div class="demo-preview dp-qt" aria-hidden="true"><span class="tag">Exemple</span>${DEMO.map(([n, c, t, v, st, f]) => `<div class="dp-q"><span><b>${c}</b><em>${n} · ${t}</em></span><span class="dp-qv"><b>${eur(v)}</b>${chip(st)}${f ? `<span class="pill-alert">${f}</span>` : ''}</span></div>`).join('')}</div>`;

export function quotesView(params, q) {
  if (!can('quote')) return { title: 'Devis', tab: 'devis', html: `${pageHead('Devis', { kicker: 'Brouillon, envoyé, accepté : chaque devis suivi' })}${paywall('quote')}${demoList()}` };
  const s = S();
  const f = ORDER.includes(q.f) ? q.f : q.f === 'relancer' ? 'relancer' : '';
  const all = s.quotes;
  const list = all.filter((x) => (!f ? true : f === 'relancer' ? toFollow(x) : x.status === f)).sort((a, b) => b.updatedAt - a.updatedAt);
  const sum = (arr) => arr.reduce((n, x) => n + quoteTotals(x).ttc, 0);
  const pending = all.filter((x) => x.status === 'envoye');
  const won = all.filter((x) => x.status === 'accepte' && (x.decidedAt || 0) >= startOfMonth());
  const decided = all.filter((x) => ['accepte', 'refuse'].includes(x.status));
  const rate = decided.length ? Math.round((decided.filter((x) => x.status === 'accepte').length / decided.length) * 100) : null;
  const late = all.filter(toFollow).length;
  const html = `${pageHead('Devis', { kicker: all.length ? `${pending.length} en attente de réponse${late ? ` · ${late} à relancer` : ''}` : 'Un devis par client, suivi jusqu\'à la signature', actions: `<button class="btn btn-primary fab-dup" data-act="quote-new">${ic('plus')}<span>Devis</span></button>` })}
    ${all.length ? `<div class="qt-kpis">
        <div class="card qk"><span>En attente</span><b>${eur(sum(pending))}</b><em>${pending.length} devis envoyé${pending.length > 1 ? 's' : ''}</em></div>
        <div class="card qk"><span>Accepté ce mois</span><b>${eur(sum(won))}</b><em>${won.length} devis</em></div>
        <div class="card qk"><span>Taux d'acceptation</span><b>${rate === null ? '—' : `${rate} %`}</b><em>${decided.length ? `sur ${decided.length} réponse${decided.length > 1 ? 's' : ''}` : 'aucune réponse encore'}</em></div>
      </div>
      <nav class="chips-row" aria-label="Filtrer les devis">
        <a class="chip-btn ${!f ? 'is-on' : ''}" href="#/devis">Tous <b>${all.length}</b></a>
        ${late ? `<a class="chip-btn ${f === 'relancer' ? 'is-on' : ''}" href="#/devis?f=relancer">À relancer <b>${late}</b></a>` : ''}
        ${ORDER.map((k) => `<a class="chip-btn ${f === k ? 'is-on' : ''}" href="#/devis?f=${k}"><i class="dot t-${QUOTE_STATUS[k][1]}"></i>${QUOTE_STATUS[k][0]} <b>${all.filter((x) => x.status === k).length}</b></a>`).join('')}
      </nav>
      ${list.length ? `<section class="card rise"><ul class="rows qt-rows">${list.map((x) => {
        const t = quoteTotals(x);
        return `<li><a class="row qt-row" href="#/devis/${x.id}"><span class="menu-ic">${ic('invoice')}</span>
          <span class="row-b"><b>${esc(x.client || 'Client à préciser')}</b><span>${esc(x.num)}${x.title ? ` · ${esc(x.title)}` : ''} · ${x.status === 'brouillon' ? `modifié ${ago(x.updatedAt)}` : x.status === 'envoye' ? `envoyé ${ago(x.sentAt)}` : `${dateShort(x.decidedAt || x.updatedAt)}`}</span></span>
          <span class="qt-v"><b>${eur(t.ttc)}</b>${chip(x.status)}${toFollow(x) ? '<span class="pill-alert">À relancer</span>' : ''}</span></a></li>`;
      }).join('')}</ul></section>` : '<p class="muted pad">Aucun devis ici.</p>'}` : `
    <section class="card onboard-empty rise">
      <span class="empty-ic">${ic('invoice')}</span>
      <h2>Créez votre premier devis</h2>
      <p>Choisissez un client, ajoutez vos prestations : le total, la TVA et l'acompte se calculent tout seuls. Ensuite, suivez chaque devis — envoyé, accepté ou refusé — et l'application vous rappelle quand relancer.</p>
      <button class="btn btn-primary btn-lg" data-act="quote-new">${ic('plus')}<span>Créer mon premier devis</span></button>
      ${demoList()}
    </section>`}`;
  return { title: 'Devis', tab: 'devis', fab: 'quote-new', html };
}

const totDl = (qt) => {
  const t = quoteTotals(qt);
  return `<div><dt>Sous-total HTVA</dt><dd>${eur2(t.ht)}</dd></div>${t.remise ? `<div><dt>Remise ${esc(qt.remise)} %</dt><dd>− ${eur2(t.remise)}</dd></div>` : ''}<div><dt>TVA ${esc(qt.tva)} %</dt><dd>${eur2(t.tva)}</dd></div><div class="is-big"><dt>Total TVAC</dt><dd>${eur2(t.ttc)}</dd></div>${Number(qt.acompte) ? `<div><dt>Acompte ${esc(qt.acompte)} %</dt><dd>${eur2(t.acompte)}</dd></div>` : ''}`;
};

function statusBar(qt) {
  const st = qt.status;
  const steps = [['brouillon', 'Brouillon'], ['envoye', 'Envoyé'], [st === 'refuse' ? 'refuse' : 'accepte', st === 'refuse' ? 'Refusé' : 'Accepté']];
  const idx = st === 'brouillon' ? 0 : st === 'envoye' ? 1 : 2;
  const acts = {
    brouillon: `<button class="btn btn-primary" data-act="quote-status" data-st="envoye" ${qt.lines.length ? '' : 'disabled'}>${ic('send')}<span>Marquer comme envoyé</span></button>${qt.lines.length ? '' : '<span class="field-h">Ajoutez au moins une prestation.</span>'}`,
    envoye: `<button class="btn btn-olive" data-act="quote-status" data-st="accepte">${ic('check')}<span>Accepté</span></button><button class="btn btn-ghost" data-act="quote-status" data-st="refuse">${ic('x')}<span>Refusé</span></button>`,
    accepte: qt.prospectId ? `<a class="btn btn-ghost" href="#/fiche/${qt.prospectId}">${ic('user')}<span>Fiche client</span></a>${S().projects.some((p) => p.prospectId === qt.prospectId) ? `<a class="btn btn-ghost" href="#/projet/${S().projects.find((p) => p.prospectId === qt.prospectId).id}">${ic('folder')}<span>Projet</span></a>` : ''}` : '',
    refuse: '',
  }[st];
  const info = st === 'envoye' ? (toFollow(qt) ? `<p class="qt-info is-late">${ic('bell')}Envoyé ${ago(qt.sentAt)} sans réponse : c'est le moment de relancer.</p>` : `<p class="qt-info">${ic('clock')}Envoyé ${ago(qt.sentAt)}. Relance prévue le ${dateShort(qt.sentAt + FOLLOW_DAYS * DAY)}.</p>`)
    : st === 'accepte' ? `<p class="qt-info is-ok">${ic('check')}Accepté le ${dateShort(qt.decidedAt)}${qt.prospectId ? ' · la fiche est passée en client' : ''}.</p>`
    : st === 'refuse' ? `<p class="qt-info">${ic('x')}Refusé le ${dateShort(qt.decidedAt)}.</p>` : '';
  return `<section class="card qt-status rise">
    <ol class="qt-steps">${steps.map(([k, l], i) => `<li class="${i < idx ? 'is-past' : i === idx ? `is-cur ${k === 'refuse' ? 'is-ko' : k === 'accepte' ? 'is-ok' : ''}` : ''}" ${i === idx ? 'aria-current="step"' : ''}><i></i><span>${l}</span></li>`).join('')}</ol>
    ${info}
    <div class="qt-acts">${acts}${st !== 'brouillon' ? '<button class="link" data-act="quote-status" data-st="brouillon">Revenir en brouillon</button>' : ''}</div>
  </section>`;
}

export function quoteView([id]) {
  if (!can('quote')) return quotesView([], {});
  const qt = getQuote(id);
  if (!qt) return { title: 'Devis', tab: 'devis', html: `${pageHead('Devis introuvable', { back: '#/devis' })}<div class="empty"><span class="empty-ic">${ic('invoice')}</span><p class="empty-t">Ce devis n'existe plus</p><a class="btn btn-ghost" href="#/devis">Tous les devis</a></div>` };
  const s = S();
  const lock = qt.status !== 'brouillon';
  const ro = lock ? 'readonly' : '';
  const fi = (name, label, attrs = '') => field(label, input(name, qt[name], `data-act-input="qt-field" ${ro} ${attrs}`));
  const html = `${pageHead(esc(qt.num), { back: '#/devis', kicker: `${esc(qt.client || 'Client à préciser')} · ${QUOTE_STATUS[qt.status][0]}`, actions: `<button class="icon-btn" data-act="quote-menu" aria-label="Plus d'actions">${ic('more')}</button>` })}
    ${statusBar(qt)}
    <div class="tool-2">
      <div>
        <section class="card form rise">
          <header class="card-h"><div><h2>Client</h2><p>${qt.prospectId ? 'Lié à la fiche' : 'Choisissez une fiche ou saisissez le nom'}</p></div>${qt.prospectId ? `<a class="link" href="#/fiche/${qt.prospectId}">Fiche</a>` : ''}</header>
          ${s.prospects.length ? `<label class="field"><span class="field-l">Fiche</span><select class="inp" data-act-change="qt-client" ${lock ? 'disabled' : ''}><option value="">Aucune fiche</option>${s.prospects.map((x) => `<option value="${x.id}" ${x.id === qt.prospectId ? 'selected' : ''}>${esc(x.entreprise)}${x.type === 'client' ? ' · client' : ''}</option>`).join('')}</select></label>` : ''}
          <div class="form-2">${fi('client', 'Entreprise ou nom', 'maxlength="80" placeholder="Nom du client"')}${fi('contact', 'Contact', 'maxlength="60"')}</div>
          <div class="form-2">${fi('email', 'E-mail', 'type="email" maxlength="80"')}${fi('adresse', 'Adresse', 'maxlength="120"')}</div>
          ${fi('title', 'Objet du devis', 'maxlength="80" placeholder="Site vitrine, cours particuliers, mission…"')}
        </section>
        <section class="card form rise">
          <header class="card-h"><div><h2>Prestations</h2><p>${qt.lines.length ? `${qt.lines.length} ligne${qt.lines.length > 1 ? 's' : ''}` : 'Depuis votre catalogue ou en ligne libre'}</p></div></header>
          ${lock ? '' : `<div class="chips-wrap">${s.catalogue.map((c) => `<button class="chip-btn" data-act="qt-add" data-id="${c.id}">${ic('plus')}${esc(c.label)} <b>${eur(c.price)}${c.monthly ? '/mois' : ''}</b></button>`).join('')}<button class="chip-btn" data-act="qt-add" data-id="">${ic('plus')}Ligne libre</button></div>`}
          ${qt.lines.length ? `<div class="qline qline-h" aria-hidden="true"><span>Désignation</span><span>Qté</span><span>Prix HTVA</span><span></span></div><ul class="qlines">${qt.lines.map((l, i) => `<li class="qline">
            <input class="inp" aria-label="Désignation" value="${esc(l.label)}" data-act-input="qt-line" data-k="label" data-i="${i}" maxlength="120" ${ro}>
            <input class="inp qty" aria-label="Quantité" type="number" inputmode="decimal" min="0" step="any" value="${esc(l.qty)}" data-act-input="qt-line" data-k="qty" data-i="${i}" ${ro}>
            <input class="inp price" aria-label="Prix unitaire hors TVA" type="number" inputmode="decimal" min="0" step="any" value="${esc(l.price)}" data-act-input="qt-line" data-k="price" data-i="${i}" ${ro}>
            ${lock ? '<span></span>' : `<button class="icon-btn sm" data-act="qt-del" data-i="${i}" aria-label="Retirer la ligne">${ic('x')}</button>`}</li>`).join('')}</ul>` : '<p class="muted pad">Aucune prestation pour l\'instant.</p>'}
        </section>
        <section class="card form rise">
          <div class="form-2">${fi('remise', 'Remise (%)', 'type="number" min="0" max="100" inputmode="decimal"')}${field('TVA', select('tva', [[21, '21 %'], [12, '12 %'], [6, '6 %'], [0, '0 % — franchise ou exonération']], qt.tva, `data-act-input="qt-field" ${lock ? 'disabled' : ''}`))}</div>
          <div class="form-2">${fi('acompte', 'Acompte (%)', 'type="number" min="0" max="100" inputmode="decimal"')}${fi('validite', 'Validité (jours)', 'type="number" min="1" max="365" inputmode="numeric"')}</div>
          ${field('Conditions et remarques', `<textarea class="inp" name="note" rows="3" maxlength="800" data-act-input="qt-field" ${ro} placeholder="Délai, ce qui est inclus, nombre de retouches…">${esc(qt.note)}</textarea>`)}
        </section>
        ${lock ? '<p class="field-h center">Un devis envoyé ne se modifie plus : revenez en brouillon pour le corriger, ou dupliquez-le.</p>' : ''}
      </div>
      <aside class="card qtot rise">
        <header class="card-h"><div><h2>Total</h2><p>Calculé en direct</p></div></header>
        <dl class="dl dl-tot">${totDl(qt)}</dl>
        <button class="btn btn-primary btn-block" data-act="qt-print" ${qt.lines.length ? '' : 'disabled'}>${ic('download')}<span>Aperçu et PDF</span></button>
        ${!s.profile.societe ? '<p class="field-h">Ajoutez vos coordonnées (société, TVA, IBAN) dans <a href="#/compte">Compte</a> : elles apparaissent sur le devis.</p>' : ''}
      </aside>
    </div>`;
  return { title: qt.num, tab: 'devis', html };
}

export function quoteDoc(qt) {
  const p = S().profile, t = quoteTotals(qt);
  const n = (x) => num(Number(x) || 0);
  return `<article class="doc" id="print-doc">
    <header class="doc-h"><div><p class="doc-co">${esc(p.societe || 'Votre société')}</p><p>${esc(p.prenom || '')}</p><p>${esc(p.adresse || '')}</p><p>${esc(p.tel || '')}${p.email ? ' · ' + esc(p.email) : ''}</p>${p.tva ? `<p>TVA ${esc(p.tva)}</p>` : ''}</div>
      <div class="doc-r"><h1>Devis</h1><p>N° ${esc(qt.num)}</p><p>Date : ${dateShort(qt.sentAt || qt.createdAt)}</p><p>Valable ${esc(qt.validite)} jours</p></div></header>
    <section class="doc-to"><p class="doc-k">Pour</p><p><b>${esc(qt.client || '—')}</b></p>${qt.contact ? `<p>${esc(qt.contact)}</p>` : ''}${qt.adresse ? `<p>${esc(qt.adresse)}</p>` : ''}${qt.email ? `<p>${esc(qt.email)}</p>` : ''}</section>
    ${qt.title ? `<p class="doc-obj"><b>Objet :</b> ${esc(qt.title)}</p>` : ''}
    <table class="doc-t"><thead><tr><th>Désignation</th><th>Qté</th><th>Prix unitaire</th><th>Total HTVA</th></tr></thead>
      <tbody>${qt.lines.map((l) => `<tr><td>${esc(l.label)}</td><td>${n(l.qty)}</td><td>${eur2(l.price)}</td><td>${eur2((Number(l.price) || 0) * (Number(l.qty) || 0))}</td></tr>`).join('')}</tbody></table>
    <dl class="doc-tot">${totDl(qt).replace('Acompte ', 'Acompte à la signature ')}</dl>
    ${Number(qt.tva) === 0 ? '<p class="doc-n">Régime particulier de franchise des petites entreprises — TVA non applicable.</p>' : ''}
    ${qt.note ? `<p class="doc-n">${esc(qt.note).replace(/\n/g, '<br>')}</p>` : ''}
    <footer class="doc-f"><div><p class="doc-k">Bon pour accord</p><p>Date et signature du client</p><div class="doc-sign"></div></div>${p.iban ? `<p>Paiement : IBAN ${esc(p.iban)}</p>` : ''}</footer>
  </article>`;
}

const cur = () => getQuote((location.hash.match(/^#\/devis\/([\w-]+)/) || [])[1]);
const refreshTot = (qt) => { const dl = document.querySelector('.dl-tot'); if (dl) dl.innerHTML = totDl(qt); const pb = document.querySelector('[data-act="qt-print"]'); if (pb) pb.disabled = !qt.lines.length; };

function setStatus(qt, st) {
  const now = Date.now();
  const t = quoteTotals(qt);
  const p = qt.prospectId && getProspect(qt.prospectId);
  update((s) => {
    const x = s.quotes.find((y) => y.id === qt.id);
    x.status = st; x.updatedAt = now;
    if (st === 'envoye') { x.sentAt = now; x.decidedAt = null; }
    if (st === 'accepte' || st === 'refuse') x.decidedAt = now;
    if (st === 'brouillon') { x.sentAt = null; x.decidedAt = null; }
    // La relance prévue est cochée dès que le client a répondu (ou retirée si on revient en brouillon)
    if (x.followTaskId && st !== 'envoye') {
      const ft = s.tasks.find((y) => y.id === x.followTaskId);
      if (ft && !ft.done) { if (st === 'brouillon') s.tasks = s.tasks.filter((y) => y.id !== ft.id); else { ft.done = true; ft.doneAt = now; ft.status = 'done'; } }
      if (st === 'brouillon') x.followTaskId = null;
    }
  });
  if (st === 'envoye') {
    const ft = addTask({ title: `Relancer le devis ${qt.num}${qt.client ? ` — ${qt.client}` : ''}`, due: startOfDay() + FOLLOW_DAYS * DAY + 10 * 3600e3, kind: 'relance', prospectId: qt.prospectId || null, prio: 1, quoteId: qt.id });
    update((s) => { s.quotes.find((y) => y.id === qt.id).followTaskId = ft.id; }, { silent: true });
    if (p) {
      logActivity({ prospectId: p.id, type: 'devis', note: `Devis ${qt.num} envoyé — ${eur2(t.ttc)} TVAC` });
      if (!['signe', 'devis'].includes(p.stage)) updateProspect(p.id, { stage: 'devis', valeur: Math.round(t.base) });
      else updateProspect(p.id, { valeur: Math.round(t.base) }, { log: false });
    }
    toast(`Relance prévue le ${dateShort(ft.due)}, dans vos tâches.`, { title: 'Devis envoyé' });
  } else if (st === 'accepte') {
    if (p) {
      logActivity({ prospectId: p.id, type: 'devis', note: `Devis ${qt.num} accepté — ${eur2(t.ttc)} TVAC` });
      updateProspect(p.id, { stage: 'signe', valeur: Math.round(t.base), type: 'client' });
      const pr = S().projects.find((x) => x.prospectId === p.id);
      toast(pr ? 'La fiche passe en client signé et son projet est prêt.' : 'La fiche passe en client signé.', { title: 'Devis accepté', action: pr ? 'Ouvrir le projet' : '', onAction: pr ? () => { location.hash = `#/projet/${pr.id}`; } : undefined, ms: 4200 });
    } else toast('Bravo ! Liez le devis à une fiche pour suivre le client.', { title: 'Devis accepté' });
  } else if (st === 'refuse') {
    if (p) logActivity({ prospectId: p.id, type: 'devis', note: `Devis ${qt.num} refusé` });
    toast('Noté. Vous pouvez le dupliquer pour proposer une autre version.', { title: 'Devis refusé' });
  } else toast('Le devis est de nouveau modifiable.', { title: 'Retour en brouillon' });
}

function printQuote(qt) {
  let host = document.querySelector('.print-host');
  if (!host) { host = document.createElement('div'); host.className = 'print-host'; document.body.append(host); }
  host.innerHTML = quoteDoc(qt);
  sheet(`${sheetHead('Aperçu du devis', 'Imprimez ou enregistrez en PDF')}<div class="sheet-body"><div class="doc-prev">${quoteDoc(qt)}</div>
    <button class="btn btn-primary btn-block" data-act="qt-do-print">${ic('download')}<span>Imprimer ou enregistrer en PDF</span></button>
    <p class="sheet-note">Dans la fenêtre d'impression, choisissez « Enregistrer au format PDF ».</p></div>`, { cls: 'sheet-tall sheet-doc' });
}

register({
  'quote-new': (b) => {
    if (!can('quote')) { sheet(`${sheetHead('Devis')}<div class="sheet-body">${paywall('quote', { compact: true })}</div>`, { cls: 'sheet-sm' }); return; }
    const qt = newQuote(b?.dataset?.pid || '');
    location.hash = `#/devis/${qt.id}`;
  },
  'qt-client': (el) => {
    const p = getProspect(el.value);
    update((s) => { const x = s.quotes.find((y) => y.id === cur().id); Object.assign(x, { prospectId: p ? p.id : null, updatedAt: Date.now() }, p ? { client: p.entreprise, contact: p.contact || '', email: p.email || '', adresse: [p.adresse, p.ville].filter(Boolean).join(', ') } : {}); });
  },
  'qt-field': (el) => {
    const qt = cur(); if (!qt || qt.status !== 'brouillon') return;
    const numeric = ['remise', 'tva', 'acompte', 'validite'].includes(el.name);
    let v = el.value;
    if (numeric) v = Math.max(0, Math.min(el.name === 'validite' ? 365 : 100, Number(v) || 0));
    update((s) => { const x = s.quotes.find((y) => y.id === qt.id); x[el.name] = v; x.updatedAt = Date.now(); }, { silent: true });
    refreshTot(getQuote(qt.id));
  },
  'qt-line': (el) => {
    const qt = cur(); if (!qt || qt.status !== 'brouillon') return;
    update((s) => { const l = s.quotes.find((y) => y.id === qt.id).lines[+el.dataset.i]; if (l) l[el.dataset.k] = el.dataset.k === 'label' ? el.value : Math.max(0, Number(el.value) || 0); }, { silent: true });
    refreshTot(getQuote(qt.id));
  },
  'qt-add': (b) => {
    const c = S().catalogue.find((x) => x.id === b.dataset.id);
    update((s) => { const x = s.quotes.find((y) => y.id === cur().id); x.lines.push(c ? { label: c.label + (c.monthly ? ' (par mois)' : ''), qty: 1, price: c.price } : { label: 'Prestation', qty: 1, price: 0 }); x.updatedAt = Date.now(); });
    requestAnimationFrame(() => { const ins = document.querySelectorAll('.qline [data-k="label"]'); if (!c) ins[ins.length - 1]?.select(); });
  },
  'qt-del': (b) => update((s) => { s.quotes.find((y) => y.id === cur().id).lines.splice(+b.dataset.i, 1); }),
  'quote-status': async (b) => {
    const qt = cur(); if (!qt) return;
    const st = b.dataset.st;
    if (st === 'accepte' && qt.prospectId) {
      if (!await confirmSheet({ title: 'Le client a accepté ?', text: `La fiche « ${esc(qt.client)} » passe en client signé, pour ${eur(quoteTotals(qt).base)} HTVA, et un projet est créé pour suivre le travail.`, ok: 'Oui, accepté' })) return;
    }
    setStatus(qt, st);
  },
  'qt-print': () => { const qt = cur(); if (qt) printQuote(qt); },
  'qt-do-print': () => window.print(),
  'quote-menu': () => {
    const qt = cur();
    sheet(`${sheetHead(esc(qt.num))}<div class="sheet-body"><div class="btn-list">
      <button class="btn btn-ghost" data-act="qt-dup">${ic('copy')}<span>Dupliquer le devis</span></button>
      <button class="btn btn-ghost" data-act="qt-print">${ic('download')}<span>Aperçu et PDF</span></button>
      <button class="btn btn-danger-ghost" data-act="qt-del-all">${ic('trash')}<span>Supprimer le devis</span></button></div></div>`, { cls: 'sheet-sm' });
  },
  'qt-dup': () => {
    const src = cur();
    const qt = newQuote(src.prospectId || '');
    update((s) => { Object.assign(s.quotes.find((y) => y.id === qt.id), { client: src.client, contact: src.contact, email: src.email, adresse: src.adresse, title: src.title, lines: JSON.parse(JSON.stringify(src.lines)), remise: src.remise, tva: src.tva, acompte: src.acompte, validite: src.validite, note: src.note }); });
    closeSheet(); location.hash = `#/devis/${qt.id}`; toast(`Copie créée : ${qt.num}`);
  },
  'qt-del-all': async () => {
    const qt = cur();
    if (!await confirmSheet({ title: `Supprimer le devis ${esc(qt.num)} ?`, text: 'Il disparaît de la liste et de la fiche client. Cette action est définitive.', ok: 'Supprimer', danger: true })) return;
    update((s) => { s.quotes = s.quotes.filter((y) => y.id !== qt.id); s.tasks = s.tasks.filter((t) => !(t.id === qt.followTaskId && !t.done)); });
    location.hash = '#/devis'; toast('Devis supprimé');
  },
});
