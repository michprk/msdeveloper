// Outils : devis, messages, audit express, import.
import { S, can, update, getProspect, addProspect, logActivity, updateProspect, uid } from '../store.js';
import { ic, esc, eur, eur2, num, register, toast, copyText, shareText, field, input, select, sheet, sheetHead, closeSheet, dateShort, toLocalInput, fromLocalInput } from '../ui.js';
import { SERVICES, SERVICE_IDS, allSectors, getSector, buildScript, fill } from '../data/scripts.js';
import { pageHead, paywall } from './common.js';
import { ctxFor } from './scripts.js';
import { rdvText } from './call.js';

export const TOOLS = [
  { id: 'devis', f: 'quote', icon: 'invoice', name: 'Devis express', text: 'Un devis calculé et imprimable en PDF en deux minutes.' },
  { id: 'messages', f: 'messages', icon: 'message', name: 'Messages prêts à envoyer', text: 'Confirmation, relance, demande d\'avis : remplis avec la fiche.' },
  { id: 'audit', f: 'audit', icon: 'clipboard', name: 'Audit express', text: 'La présence en ligne d\'un prospect, notée sur 10, et quoi lui dire.' },
  { id: 'entrainement', f: 'training', icon: 'target', name: 'Entraînement', text: 'Des objections au hasard pour répondre du tac au tac.' },
  { id: 'stats', f: 'stats', icon: 'chart', name: 'Statistiques', text: 'Vos vrais taux, étape par étape, et le meilleur jour pour appeler.' },
  { id: 'import', f: 'import', icon: 'upload', name: 'Importer une liste', text: 'Collez des entreprises : elles deviennent des fiches à appeler.' },
  { id: 'mes-scripts', f: 'myScripts', icon: 'edit', name: 'Mes scripts & secteurs', text: 'Vos propres scripts, et vos secteurs avec tous les formats générés.' },
];
const PLAN_OF = { quote: 'Premium', training: 'Premium', stats: 'Premium', myScripts: 'Premium', messages: 'Pro', audit: 'Pro', import: 'Pro' };

export function hub() {
  const html = `${pageHead('Outils', { kicker: 'Pour préparer, convaincre et signer' })}
    <div class="tool-grid">${TOOLS.map((t, i) => `<a class="card tool rise" style="--i:${i}" href="#/outils/${t.id}">
      <span class="tool-ic">${ic(t.icon)}</span><b>${t.name}</b><span>${t.text}</span>
      ${can(t.f) ? '' : `<span class="badge b-${PLAN_OF[t.f] === 'Premium' ? 'premium' : 'pro'}">${PLAN_OF[t.f]}</span>`}</a>`).join('')}</div>`;
  return { title: 'Outils', tab: 'plus', html };
}

const prospectPicker = (cur, act, label = 'Prospect') => `<label class="fill-for">${ic('user')}<span>${label}</span><select class="inp" data-act-change="${act}">
  <option value="">Aucun</option>${S().prospects.map((x) => `<option value="${x.id}" ${cur === x.id ? 'selected' : ''}>${esc(x.entreprise)}</option>`).join('')}</select></label>`;

// ---------- Devis ----------
let quote = null;
function freshQuote(pid) {
  const p = pid && getProspect(pid);
  return { pid: pid || '', client: p?.entreprise || '', contact: p?.contact || '', adresse: [p?.adresse, p?.ville].filter(Boolean).join(', '), lines: [], remise: 0, tva: 21, acompte: 50, validite: 30, note: '' };
}
const totals = (qt) => {
  const ht = qt.lines.reduce((n, l) => n + (Number(l.price) || 0) * (Number(l.qty) || 0), 0);
  const remise = ht * (Number(qt.remise) || 0) / 100;
  const base = ht - remise, tva = base * (Number(qt.tva) || 0) / 100;
  return { ht, remise, base, tva, ttc: base + tva, acompte: (base + tva) * (Number(qt.acompte) || 0) / 100 };
};

export function devis(params, q) {
  if (!can('quote')) return { title: 'Devis', tab: 'plus', html: `${pageHead('Devis express', { back: '#/outils' })}${paywall('quote')}` };
  if (!quote || (q.p && q.p !== quote.pid)) quote = freshQuote(q.p);
  const s = S(), t = totals(quote);
  const html = `${pageHead('Devis express', { back: '#/outils', kicker: 'Calculé en direct, imprimable en PDF' })}
    <div class="tool-2">
      <div>
        ${prospectPicker(quote.pid, 'quote-prospect', 'Client')}
        <form class="card form rise" data-form="quote-meta" data-live>
          <div class="form-2">${field('Client', input('client', quote.client, 'placeholder="Nom de l\'entreprise"'))}${field('Contact', input('contact', quote.contact))}</div>
          ${field('Adresse', input('adresse', quote.adresse))}
        </form>
        <section class="card rise">
          <header class="card-h"><div><h2>Prestations</h2><p>Touchez pour ajouter depuis votre catalogue</p></div></header>
          <div class="chips-wrap">${s.catalogue.map((c) => `<button class="chip-btn" data-act="quote-add" data-id="${c.id}">${ic('plus')}${esc(c.label)} <b>${eur(c.price)}${c.monthly ? '/mois' : ''}</b></button>`).join('')}<button class="chip-btn" data-act="quote-add" data-id="">${ic('plus')}Ligne libre</button></div>
          ${quote.lines.length ? `<ul class="qlines">${quote.lines.map((l, i) => `<li class="qline" data-i="${i}">
            <input class="inp" aria-label="Désignation" value="${esc(l.label)}" data-act-input="quote-line" data-k="label" data-i="${i}">
            <input class="inp qty" aria-label="Quantité" type="number" min="0" step="1" value="${l.qty}" data-act-input="quote-line" data-k="qty" data-i="${i}">
            <input class="inp price" aria-label="Prix unitaire" type="number" min="0" step="1" value="${l.price}" data-act-input="quote-line" data-k="price" data-i="${i}">
            <button class="icon-btn sm" data-act="quote-del" data-i="${i}" aria-label="Retirer">${ic('x')}</button></li>`).join('')}</ul>` : '<p class="muted pad">Aucune prestation pour l\'instant.</p>'}
          <a class="link" href="#/reglages?s=catalogue">Modifier le catalogue</a>
        </section>
        <form class="card form rise" data-form="quote-meta" data-live>
          <div class="form-2">${field('Remise (%)', input('remise', quote.remise, 'type="number" min="0" max="100"'))}${field('TVA', select('tva', [[21, '21 %'], [6, '6 %'], [0, '0 % — franchise de taxe']], quote.tva))}</div>
          <div class="form-2">${field('Acompte (%)', input('acompte', quote.acompte, 'type="number" min="0" max="100"'))}${field('Validité (jours)', input('validite', quote.validite, 'type="number" min="1"'))}</div>
          ${field('Conditions et remarques', `<textarea class="inp" name="note" rows="3" placeholder="Délai, nombre de retouches, ce qui est inclus…">${esc(quote.note)}</textarea>`)}
        </form>
      </div>
      <aside class="card qtot rise">
        <h2>Total</h2>
        <dl class="dl dl-tot">
          <div><dt>Sous-total HTVA</dt><dd>${eur2(t.ht)}</dd></div>
          ${t.remise ? `<div><dt>Remise ${quote.remise} %</dt><dd>− ${eur2(t.remise)}</dd></div>` : ''}
          <div><dt>TVA ${quote.tva} %</dt><dd>${eur2(t.tva)}</dd></div>
          <div class="is-big"><dt>Total TVAC</dt><dd>${eur2(t.ttc)}</dd></div>
          ${quote.acompte ? `<div><dt>Acompte ${quote.acompte} %</dt><dd>${eur2(t.acompte)}</dd></div>` : ''}
        </dl>
        <button class="btn btn-primary btn-block" data-act="quote-print" ${quote.lines.length ? '' : 'disabled'}>${ic('download')}<span>Aperçu et PDF</span></button>
        ${quote.pid ? `<button class="btn btn-ghost btn-block" data-act="quote-log" ${quote.lines.length ? '' : 'disabled'}>${ic('check')}<span>Marquer comme envoyé</span></button>` : ''}
        <button class="link center" data-act="quote-reset">Nouveau devis</button>
        ${!s.profile.societe ? `<p class="field-h">Ajoutez vos coordonnées (société, TVA, IBAN) dans les <a href="#/reglages">réglages</a> : elles apparaissent sur le devis.</p>` : ''}
      </aside>
    </div>`;
  return { title: 'Devis', tab: 'plus', html };
}

function quoteDoc() {
  const s = S(), p = s.profile, t = totals(quote);
  const num = `DEV-${new Date().getFullYear()}-${String((s.quoteSeq || 0) + 1).padStart(3, '0')}`;
  const today = Date.now();
  return `<article class="doc" id="print-doc">
    <header class="doc-h"><div><p class="doc-co">${esc(p.societe || 'Votre société')}</p><p>${esc(p.prenom)}</p><p>${esc(p.adresse || '')}</p><p>${esc(p.tel || '')}${p.email ? ' · ' + esc(p.email) : ''}</p>${p.tva ? `<p>TVA ${esc(p.tva)}</p>` : ''}</div>
      <div class="doc-r"><h1>Devis</h1><p>N° ${num}</p><p>Date : ${dateShort(today)}</p><p>Valable ${quote.validite} jours</p></div></header>
    <section class="doc-to"><p class="doc-k">Pour</p><p><b>${esc(quote.client || '—')}</b></p>${quote.contact ? `<p>${esc(quote.contact)}</p>` : ''}${quote.adresse ? `<p>${esc(quote.adresse)}</p>` : ''}</section>
    <table class="doc-t"><thead><tr><th>Désignation</th><th>Qté</th><th>Prix unitaire</th><th>Total HTVA</th></tr></thead>
      <tbody>${quote.lines.map((l) => `<tr><td>${esc(l.label)}</td><td>${num_(l.qty)}</td><td>${eur2(l.price)}</td><td>${eur2(l.price * l.qty)}</td></tr>`).join('')}</tbody></table>
    <dl class="doc-tot"><div><dt>Sous-total HTVA</dt><dd>${eur2(t.ht)}</dd></div>${t.remise ? `<div><dt>Remise ${quote.remise} %</dt><dd>− ${eur2(t.remise)}</dd></div>` : ''}
      <div><dt>TVA ${quote.tva} %</dt><dd>${eur2(t.tva)}</dd></div><div class="is-big"><dt>Total TVAC</dt><dd>${eur2(t.ttc)}</dd></div>
      ${quote.acompte ? `<div><dt>Acompte à la signature (${quote.acompte} %)</dt><dd>${eur2(t.acompte)}</dd></div>` : ''}</dl>
    ${quote.tva === 0 || quote.tva === '0' ? '<p class="doc-n">Régime particulier de franchise des petites entreprises — TVA non applicable.</p>' : ''}
    ${quote.note ? `<p class="doc-n">${esc(quote.note).replace(/\n/g, '<br>')}</p>` : ''}
    <footer class="doc-f"><div><p class="doc-k">Bon pour accord</p><p>Date et signature du client</p><div class="doc-sign"></div></div>${p.iban ? `<p>Paiement : IBAN ${esc(p.iban)}</p>` : ''}</footer>
  </article>`;
}
const num_ = (n) => num(Number(n) || 0);

// ---------- Messages ----------
const MSG = [
  { id: 'sans-reponse', label: 'Après un appel sans réponse', from: ['sms', 0] },
  { id: 'apres-appel', label: 'Après un bon appel', from: ['sms', 1], jour: true },
  { id: 'confirmation', label: 'Confirmation de rendez-vous', from: ['sms', 2], jour: true },
  { id: 'veille', label: 'Rappel la veille', from: ['sms', 3], jour: true },
  { id: 'email-promis', label: 'L\'e-mail promis au téléphone', from: ['relance', 1] },
  { id: 'apres-rdv', label: 'Après le rendez-vous', from: ['relance', 2] },
  { id: 'relance-devis', label: 'Relance du devis', from: ['relance', 3] },
  { id: 'cloture', label: 'Dernière relance (clôture)', from: ['relance', 4] },
  { id: 'prospection', label: 'E-mail de prospection', from: ['email', 1] },
  { id: 'bienvenue', label: 'Bienvenue après signature', text: 'Bonjour {contact},\n\nMerci pour votre confiance, et bienvenue chez {societe} ! Pour démarrer, j\'ai besoin de votre logo, de vos photos, de vos textes et des accès à votre nom de domaine si vous en avez un.\n\nJe vous envoie le planning dans la journée.\n\n{prenom}' },
  { id: 'avis', label: 'Demande d\'avis au client', text: 'Bonjour {contact},\n\nMerci encore pour votre confiance. Si vous êtes satisfait du travail, un avis Google nous aiderait énormément : il suffit de deux phrases. [lien vers votre fiche]\n\nMerci beaucoup !\n{prenom}, {societe}' },
  { id: 'recommandation', label: 'Demande de recommandation', text: 'Bonjour {contact},\n\nÃa me fait plaisir que le projet vous plaise. Connaissez-vous un ou deux commerçants autour de vous à qui ça pourrait aussi rendre service ? Je les contacterai de votre part, sans insister.\n\nMerci !\n{prenom}' },
];
const msgState = { type: 'confirmation', pid: '', due: null };

export function messages(params, q) {
  if (!can('messages')) return { title: 'Messages', tab: 'plus', html: `${pageHead('Messages', { back: '#/outils' })}${paywall('messages')}` };
  if (q.p) msgState.pid = q.p;
  const p = msgState.pid && getProspect(msgState.pid);
  const m = MSG.find((x) => x.id === msgState.type) || MSG[0];
  const svc = p?.service || S().profile.service || 'site';
  const raw = m.text || buildScript(svc, m.from[0], p?.secteur || 'toute').steps[m.from[1]].l[0][1];
  const ctx = { ...ctxFor(svc, p), jour: msgState.due ? rdvText(msgState.due) : '' };
  const text = fill(raw, ctx, false);
  const tel = p?.tel?.replace(/[^\d+]/g, '');
  const html = `${pageHead('Messages prêts à envoyer', { back: '#/outils' })}
    ${prospectPicker(msgState.pid, 'msg-prospect', 'Pour')}
    <div class="chips-wrap rise">${MSG.map((x) => `<button class="chip-btn ${x.id === m.id ? 'is-on' : ''}" data-act="msg-type" data-id="${x.id}">${x.label}</button>`).join('')}</div>
    ${m.jour ? `<label class="field rise"><span class="field-l">Jour et heure du rendez-vous</span><input class="inp" type="datetime-local" data-act-change="msg-due" value="${msgState.due ? toLocalInput(msgState.due) : ''}"></label>` : ''}
    <section class="card rise">
      <textarea class="inp msg-out" rows="10" aria-label="Message">${esc(text)}</textarea>
      <p class="field-h">Les éléments entre crochets sont à compléter. Le texte reste modifiable avant l'envoi.</p>
      <div class="act-row">
        <button class="btn btn-primary" data-act="msg-copy">${ic('copy')}<span>Copier</span></button>
        <button class="btn btn-ghost" data-act="msg-share">${ic('share')}<span>Partager</span></button>
        ${tel && !p.demo ? `<a class="btn btn-ghost" data-act="msg-sms" href="sms:${tel}">${ic('message')}<span>SMS</span></a>` : ''}
        ${p?.email ? `<a class="btn btn-ghost" data-act="msg-mail" href="mailto:${esc(p.email)}">${ic('mail')}<span>E-mail</span></a>` : ''}
      </div>
    </section>`;
  return { title: 'Messages', tab: 'plus', html };
}

// ---------- Audit express ----------
const AUDIT = [
  ['site', 'Le site existe et s\'affiche bien sur téléphone', 'Le site ne s\'affiche pas bien sur téléphone, alors que c\'est là que la plupart des clients cherchent.'],
  ['site', 'Le site s\'ouvre en moins de trois secondes', 'Le site est lent à s\'ouvrir : chaque seconde d\'attente fait partir des visiteurs.'],
  ['site', 'Le site est sécurisé (cadenas, https)', 'Le site n\'est pas sécurisé : certains navigateurs affichent « non sécurisé ».'],
  ['site', 'Un bouton d\'appel ou de réservation est visible tout de suite', 'Il faut chercher pour appeler ou réserver : un bouton visible ferait gagner des contacts.'],
  ['seo', 'La fiche Google est complète (horaires, photos, catégorie)', 'La fiche Google est incomplète : horaires, photos ou catégorie à compléter.'],
  ['seo', 'Plus de 20 avis Google, avec une note d\'au moins 4,3', 'Peu d\'avis Google : une méthode simple pour en obtenir changerait la donne.'],
  ['seo', 'Le gérant répond aux avis', 'Les avis restent sans réponse : répondre montre le sérieux et aide le référencement local.'],
  ['seo', 'L\'entreprise sort dans les trois premiers sur « métier + commune »', 'L\'entreprise n\'apparaît pas dans les trois premiers résultats de la carte sur sa recherche principale.'],
  ['auto', 'Instagram ou Facebook actif (publication de moins d\'un mois)', 'Les réseaux sont peu actifs : un rythme simple, même mensuel, suffit à rassurer.'],
  ['auto', 'Prise de rendez-vous, commande ou devis possible en ligne', 'Impossible de réserver, commander ou demander un devis en ligne : des demandes partent ailleurs le soir et le week-end.'],
];
let auditState = { pid: '', ans: {} };

export function audit(params, q) {
  if (!can('audit')) return { title: 'Audit', tab: 'plus', html: `${pageHead('Audit express', { back: '#/outils' })}${paywall('audit')}` };
  if (q.p && q.p !== auditState.pid) { const p = getProspect(q.p); auditState = { pid: q.p, ans: { ...(p?.audit?.ans || {}) } }; }
  const p = auditState.pid && getProspect(auditState.pid);
  const yes = Object.values(auditState.ans).filter((v) => v === 'y').length;
  const answered = Object.keys(auditState.ans).length;
  const issues = AUDIT.map((a, i) => ({ a, i })).filter(({ i }) => auditState.ans[i] === 'n');
  const weight = { site: 0, seo: 0, auto: 0 };
  issues.forEach(({ a }) => { weight[a[0]]++; });
  const best = Object.entries(weight).sort((a, b) => b[1] - a[1])[0];
  const query = p ? encodeURIComponent(`${p.entreprise} ${p.ville || ''}`) : '';
  const siteUrl = p?.site ? (/^https?:/.test(p.site) ? p.site : `https://${p.site}`) : '';
  const html = `${pageHead('Audit express', { back: '#/outils', kicker: 'Deux minutes avant d\'appeler' })}
    ${prospectPicker(auditState.pid, 'audit-prospect')}
    ${p ? `<div class="chips-wrap rise"><a class="chip-btn" href="https://www.google.com/search?q=${query}" target="_blank" rel="noopener">${ic('search')}Google</a><a class="chip-btn" href="https://www.google.com/maps/search/?api=1&query=${query}" target="_blank" rel="noopener">${ic('pin')}Google Maps</a>${siteUrl ? `<a class="chip-btn" href="${esc(siteUrl)}" target="_blank" rel="noopener">${ic('globe')}Site</a><a class="chip-btn" href="https://pagespeed.web.dev/analysis?url=${encodeURIComponent(siteUrl)}" target="_blank" rel="noopener">${ic('clock')}Vitesse</a>` : ''}</div>` : ''}
    <div class="tool-2">
      <ol class="audit card rise">${AUDIT.map(([k, label], i) => `<li class="audit-i"><p>${label}</p><div class="yn" role="group" aria-label="${esc(label)}">
        <button class="${auditState.ans[i] === 'y' ? 'is-y' : ''}" data-act="audit-ans" data-i="${i}" data-v="y" aria-pressed="${auditState.ans[i] === 'y'}">Oui</button>
        <button class="${auditState.ans[i] === 'n' ? 'is-n' : ''}" data-act="audit-ans" data-i="${i}" data-v="n" aria-pressed="${auditState.ans[i] === 'n'}">Non</button></div></li>`).join('')}</ol>
      <aside class="card audit-res rise">
        <p class="audit-score"><b>${yes}</b><span>/ 10</span></p>
        <div class="audit-mini">${'<i class="on"></i>'.repeat(yes)}${'<i></i>'.repeat(10 - yes)}</div>
        <p class="muted-s">${answered < 10 ? `${10 - answered} question${10 - answered > 1 ? 's' : ''} sans réponse` : yes >= 8 ? 'Présence en ligne solide : visez l\'optimisation.' : yes >= 5 ? 'Des bases, et plusieurs leviers simples.' : 'Beaucoup de potentiel : votre offre a de vrais arguments.'}</p>
        ${issues.length ? `<h3>Points à aborder</h3><ul class="bul">${issues.map(({ a }) => `<li>${a[2]}</li>`).join('')}</ul>
          <p class="audit-svc">Service à proposer en premier : <b>${SERVICES[best[0]].label}</b></p>` : ''}
        <div class="act-row">${p ? `<button class="btn btn-primary" data-act="audit-save" ${answered ? '' : 'disabled'}>${ic('check')}<span>Enregistrer dans la fiche</span></button>` : ''}<button class="btn btn-ghost" data-act="audit-copy" ${issues.length ? '' : 'disabled'}>${ic('copy')}<span>Copier</span></button></div>
        <button class="link center" data-act="audit-reset">Recommencer</button>
      </aside>
    </div>`;
  return { title: 'Audit express', tab: 'plus', html };
}
const auditSummary = () => {
  const yes = Object.values(auditState.ans).filter((v) => v === 'y').length;
  const issues = AUDIT.filter((a, i) => auditState.ans[i] === 'n').map((a) => `• ${a[2]}`);
  return `Audit express : ${yes}/10\n${issues.join('\n')}`;
};

// ---------- Import ----------
function matchSector(txt) {
  const t = (txt || '').toLowerCase().trim();
  if (!t) return null;
  return allSectors().find((s) => [s.id, s.name, s.plural, s.search].some((w) => w && (t.includes(w.toLowerCase()) || w.toLowerCase().includes(t))))?.id || null;
}
function parseList(raw) {
  return raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/\s*[;\t|]\s*|\s*,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((x) => x.replace(/^"|"$/g, '').trim());
    const tel = parts.find((x) => /^[+\d][\d\s./-]{6,}$/.test(x)) || '';
    const rest = parts.filter((x) => x !== tel);
    return { entreprise: rest[0] || '', tel, ville: rest[1] || '', secteurTxt: rest[2] || '' };
  }).filter((x) => x.entreprise && !/^(nom|entreprise|name)$/i.test(x.entreprise));
}

export function importView() {
  if (!can('import')) return { title: 'Importer', tab: 'plus', html: `${pageHead('Importer une liste', { back: '#/outils' })}${paywall('import')}` };
  const s = S();
  const html = `${pageHead('Importer une liste', { back: '#/outils', kicker: 'Une entreprise par ligne' })}
    <form class="card form rise" data-form="import">
      ${field('Collez votre liste', '<textarea class="inp mono" name="raw" rows="9" data-act-input="import-preview" placeholder="Atelier Pivoine ; +32 2 123 45 67 ; Ixelles ; fleuriste&#10;Garage du Parc ; 0470 12 34 56 ; Forest"></textarea>', 'Format : Nom ; Téléphone ; Commune ; Secteur (facultatif). Les séparateurs ; , tabulation et | sont acceptés — un copier-coller depuis un tableur fonctionne.')}
      <label class="file-btn">${ic('upload')}<span>Ou choisir un fichier CSV</span><input type="file" accept=".csv,.txt,text/csv,text/plain" data-act-change="import-file"></label>
      <div class="form-2">${field('Secteur par défaut', select('secteur', allSectors().map((x) => [x.id, x.name]), 'toute'))}${field('Service à proposer', select('service', SERVICE_IDS.map((id) => [id, SERVICES[id].label]), s.profile.service))}</div>
      <p class="import-prev muted-s" aria-live="polite"></p>
      <button class="btn btn-primary btn-block" type="submit" disabled>${ic('upload')}<span>Importer</span></button>
    </form>`;
  return { title: 'Importer', tab: 'plus', html };
}

register({
  'quote-prospect': (el) => { quote = freshQuote(el.value); window.dispatchEvent(new Event('ms:rerender')); },
  'quote-add': (b) => {
    const c = S().catalogue.find((x) => x.id === b.dataset.id);
    quote.lines.push(c ? { label: c.label + (c.monthly ? ' (par mois)' : ''), qty: 1, price: c.price } : { label: 'Prestation', qty: 1, price: 0 });
    window.dispatchEvent(new Event('ms:rerender'));
  },
  'quote-del': (b) => { quote.lines.splice(+b.dataset.i, 1); window.dispatchEvent(new Event('ms:rerender')); },
  'quote-line': (el) => {
    const l = quote.lines[+el.dataset.i];
    l[el.dataset.k] = el.dataset.k === 'label' ? el.value : Number(el.value) || 0;
    if (el.dataset.k !== 'label') refreshTotals();
  },
  'quote-reset': () => { quote = freshQuote(''); window.dispatchEvent(new Event('ms:rerender')); },
  'quote-print': () => {
    let host = document.querySelector('.print-host');
    if (!host) { host = document.createElement('div'); host.className = 'print-host'; document.body.append(host); }
    host.innerHTML = quoteDoc();
    sheet(`${sheetHead('Aperçu du devis', 'Imprimez ou enregistrez en PDF')}<div class="sheet-body"><div class="doc-prev">${quoteDoc()}</div>
      <button class="btn btn-primary btn-block" data-act="do-print">${ic('download')}<span>Imprimer / PDF</span></button></div>`, { cls: 'sheet-tall sheet-doc' });
  },
  'do-print': () => { update((s) => { s.quoteSeq = (s.quoteSeq || 0) + 1; }, { silent: true }); window.print(); },
  'quote-log': () => {
    const t = totals(quote);
    logActivity({ prospectId: quote.pid, type: 'devis', note: `Devis de ${eur2(t.ttc)} TVAC — ${quote.lines.map((l) => l.label).join(', ')}` });
    const p = getProspect(quote.pid);
    if (p && !['signe', 'devis'].includes(p.stage)) updateProspect(p.id, { stage: 'devis', valeur: Math.round(t.base) });
    else if (p) updateProspect(p.id, { valeur: Math.round(t.base) }, { log: false });
    toast('Devis noté dans la fiche', { action: 'Ouvrir', onAction: () => { location.hash = `#/fiche/${quote.pid}`; } });
  },
  'msg-prospect': (el) => { msgState.pid = el.value; window.dispatchEvent(new Event('ms:rerender')); },
  'msg-type': (b) => { msgState.type = b.dataset.id; window.dispatchEvent(new Event('ms:rerender')); },
  'msg-due': (el) => { msgState.due = fromLocalInput(el.value); window.dispatchEvent(new Event('ms:rerender')); },
  'msg-copy': () => copyText(document.querySelector('.msg-out').value, 'Message copié'),
  'msg-share': () => shareText('Message', document.querySelector('.msg-out').value),
  'msg-sms': (a) => { const body = encodeURIComponent(document.querySelector('.msg-out').value); location.href = `${a.getAttribute('href')}?&body=${body}`; },
  'msg-mail': (a) => { const body = encodeURIComponent(document.querySelector('.msg-out').value); location.href = `${a.getAttribute('href')}?body=${body}`; },
  'audit-prospect': (el) => { const p = getProspect(el.value); auditState = { pid: el.value, ans: { ...(p?.audit?.ans || {}) } }; window.dispatchEvent(new Event('ms:rerender')); },
  'audit-ans': (b) => { const i = b.dataset.i; auditState.ans[i] = auditState.ans[i] === b.dataset.v ? undefined : b.dataset.v; if (!auditState.ans[i]) delete auditState.ans[i]; window.dispatchEvent(new Event('ms:rerender')); },
  'audit-reset': () => { auditState.ans = {}; window.dispatchEvent(new Event('ms:rerender')); },
  'audit-copy': () => copyText(auditSummary(), 'Points copiés'),
  'audit-save': () => {
    const score = Object.values(auditState.ans).filter((v) => v === 'y').length;
    update((s) => { const p = s.prospects.find((x) => x.id === auditState.pid); if (p) p.audit = { score, at: Date.now(), ans: { ...auditState.ans } }; }, { silent: true });
    logActivity({ prospectId: auditState.pid, type: 'audit', note: auditSummary() });
    toast('Audit enregistré dans la fiche', { action: 'Ouvrir', onAction: () => { location.hash = `#/fiche/${auditState.pid}`; } });
  },
  'import-file': async (el) => {
    const f = el.files?.[0]; if (!f) return;
    const txt = await f.text();
    const ta = el.closest('form').querySelector('[name=raw]'); ta.value = txt; ta.dispatchEvent(new Event('input', { bubbles: true }));
  },
  'import-preview': (el) => {
    const n = parseList(el.value).length;
    const form = el.closest('form');
    form.querySelector('.import-prev').textContent = n ? `${n} entreprise${n > 1 ? 's' : ''} détectée${n > 1 ? 's' : ''}, prête${n > 1 ? 's' : ''} à importer.` : el.value.trim() ? 'Aucune ligne reconnue : une entreprise par ligne, le nom en premier.' : '';
    form.querySelector('[type=submit]').disabled = !n;
  },
}, {
  'quote-meta': (data) => { Object.assign(quote, data); refreshTotals(); },
  import: (data) => {
    const rows = parseList(data.raw || '');
    if (!rows.length) { toast('Aucune entreprise détectée'); return; }
    rows.forEach((r) => addProspect({ entreprise: r.entreprise, tel: r.tel, ville: r.ville, secteur: matchSector(r.secteurTxt) || data.secteur, service: data.service, source: 'Import' }));
    toast(`${rows.length} prospect${rows.length > 1 ? 's' : ''} importé${rows.length > 1 ? 's' : ''}`);
    location.hash = '#/crm?v=list&f=a_appeler';
  },
});

function refreshTotals() {
  const t = totals(quote);
  const dl = document.querySelector('.dl-tot'); if (!dl) return;
  dl.innerHTML = `<div><dt>Sous-total HTVA</dt><dd>${eur2(t.ht)}</dd></div>${t.remise ? `<div><dt>Remise ${quote.remise} %</dt><dd>− ${eur2(t.remise)}</dd></div>` : ''}<div><dt>TVA ${quote.tva} %</dt><dd>${eur2(t.tva)}</dd></div><div class="is-big"><dt>Total TVAC</dt><dd>${eur2(t.ttc)}</dd></div>${Number(quote.acompte) ? `<div><dt>Acompte ${quote.acompte} %</dt><dd>${eur2(t.acompte)}</dd></div>` : ''}`;
}
export const quoteLive = (form) => { const data = Object.fromEntries(new FormData(form)); Object.assign(quote, data); refreshTotals(); };
export { uid };
