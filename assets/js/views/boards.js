// Tableau blanc : une feuille sans limite pour écrire (au clavier ou à la main), dessiner, schématiser,
// faire des graphiques et des frises d'évolution. Plusieurs tableaux, chacun enregistré au fil du dessin.
// Inclus dans Pro et Premium (et pendant l'essai) ; sans abonnement, les tableaux restent lisibles.
import { S, update, can, uid, canAddBoard } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, confirmSheet, field, input, select, ago, download } from '../ui.js';
import { pageHead, paywall } from './common.js';
import { mountCanvas, renderItem, itemsBox, exportSVGFull, exportPNG, exportSVG, settle, FONTS, HAND_FONTS, HAND_NICK } from '../draw.js';

const BGS = [['dots', 'Points'], ['grid', 'Quadrillage'], ['seyes', 'Cahier (Seyès)'], ['lines', 'Lignes'], ['blank', 'Blanc']];
const id9 = () => 'd' + Math.random().toString(36).slice(2, 9);
// Modèles : de quoi démarrer en un geste
const TEMPLATES = {
  vierge: ['Tableau vierge', 'compose', 'Une feuille à points, rien d\'autre', () => []],
  cahier: ['Page de cahier', 'book', 'Lignes Seyès, un titre, prêt à écrire', () => [
    { id: id9(), t: 'text', x: 64, y: 40, w2: 640, h: 56, txt: 'Leçon du jour', size: 40, font: 'cursive', c: '#155eef' },
    { id: id9(), t: 'pen', pts: [[64, 104], [420, 104]], c: '#d92d20', w: 3 },
  ], 'seyes'],
  cornell: ['Prise de notes Cornell', 'page', 'Mots-clés, notes, résumé : la méthode des étudiants', () => [
    { id: id9(), t: 'text', x: 40, y: 20, w2: 760, h: 52, txt: 'Titre du cours', size: 34, font: 'serif', b: 1, c: '#0f1e3d' },
    { id: id9(), t: 'line', x1: 40, y1: 86, x2: 980, y2: 86, c: '#155eef', w: 2.5, arrow: 0, dash: 0 },
    { id: id9(), t: 'line', x1: 290, y1: 86, x2: 290, y2: 620, c: '#d92d20', w: 2, arrow: 0, dash: 0 },
    { id: id9(), t: 'line', x1: 40, y1: 620, x2: 980, y2: 620, c: '#155eef', w: 2.5, arrow: 0, dash: 0 },
    { id: id9(), t: 'text', x: 52, y: 100, w2: 220, h: 34, txt: 'Mots-clés, questions', size: 20, font: 'sans', b: 1, c: '#868e96' },
    { id: id9(), t: 'text', x: 310, y: 100, w2: 400, h: 34, txt: 'Notes', size: 20, font: 'sans', b: 1, c: '#868e96' },
    { id: id9(), t: 'text', x: 52, y: 636, w2: 400, h: 34, txt: 'Résumé en trois phrases', size: 20, font: 'sans', b: 1, c: '#868e96' },
  ], 'lines'],
  kanban: ['Tableau des tâches', 'board', 'À faire, en cours, fait : en post-it', () => [
    ...[['À faire', '#dbe4ff'], ['En cours', '#fff3bf'], ['Fait', '#d3f9d8']].flatMap(([t, f], i) => [
      { id: id9(), t: 'rect', x: 40 + i * 330, y: 40, w2: 300, h: 560, c: '#e3ddd1', w: 1.5, f: '#fffdf8', round: 22, txt: '', size: 18 },
      { id: id9(), t: 'text', x: 64 + i * 330, y: 58, w2: 250, h: 40, txt: t, size: 26, font: 'serif', b: 1, c: '#0f1e3d' },
      { id: id9(), t: 'sticky', x: 70 + i * 330, y: 120, w2: 240, h: 120, f, txt: ['Réviser le chapitre 4', 'Exposé d\'histoire', 'Fiche de vocabulaire'][i], size: 22, font: 'hand', c: '#131a2a' },
    ]),
  ]],
  swot: ['Analyse SWOT', 'grid', 'Forces, faiblesses, opportunités, menaces', () => [
    { id: id9(), t: 'text', x: 60, y: 20, w2: 700, h: 52, txt: 'Mon projet : analyse SWOT', size: 32, font: 'serif', b: 1, c: '#0f1e3d' },
    ...[['Forces', '#d3f9d8', '#2f9e44'], ['Faiblesses', '#ffe3e3', '#d92d20'], ['Opportunités', '#dbe4ff', '#155eef'], ['Menaces', '#fff3bf', '#f08c00']].flatMap(([t, f, c], i) => [
      { id: id9(), t: 'rect', x: 60 + (i % 2) * 450, y: 100 + Math.floor(i / 2) * 290, w2: 430, h: 270, c, w: 2.5, f, round: 22, txt: '', size: 18 },
      { id: id9(), t: 'text', x: 84 + (i % 2) * 450, y: 118 + Math.floor(i / 2) * 290, w2: 380, h: 40, txt: t, size: 26, font: 'hand', b: 1, c },
    ]),
  ]],
  carte: ['Carte mentale', 'layers', 'Un sujet, quatre idées reliées', () => {
    const c = { id: id9(), t: 'ellipse', x: 380, y: 260, w2: 240, h: 110, c: '#155eef', w: 3, f: '#dbe4ff', txt: 'Sujet central', size: 22, font: 'serif', b: 1 };
    const pos = [[80, 80], [700, 80], [80, 460], [700, 460]];
    const ideas = pos.map(([x, y], i) => ({ id: id9(), t: 'rect', x, y, w2: 200, h: 80, c: ['#eb6834', '#1baf7a', '#eda100', '#e87ba4'][i], w: 2.5, f: '#ffffff', txt: `Idée ${i + 1}`, size: 18, font: 'sans' }));
    const links = pos.map(([x, y], i) => ({ id: id9(), t: 'line', x1: 500, y1: 315, x2: x + 100, y2: y + 40, c: '#a8a39a', w: 2, arrow: 1, dash: 0, a1: c.id, a2: ideas[i].id, bend: i % 2 ? -30 : 30 }));
    return [...links, c, ...ideas];
  }],
  frise: ['Frise chronologique', 'trend', 'Les grandes dates, dans l\'ordre', () => [
    { id: id9(), t: 'text', x: 60, y: 40, w2: 600, h: 44, txt: 'Frise : la Révolution française', size: 30, font: 'serif', b: 1, c: '#0f1e3d' },
    { id: id9(), t: 'timeline', x: 60, y: 110, w2: 900, h: 120, c: '#155eef', steps: [{ l: 'États généraux', d: 'mai 1789' }, { l: 'Prise de la Bastille', d: '14 juillet 1789' }, { l: 'Fin de la monarchie', d: '1792' }, { l: 'Directoire', d: '1795' }, { l: 'Coup d\'État', d: '1799' }] },
  ]],
  graphique: ['Graphique et évolution', 'chart', 'Barres et courbe, modifiables', () => [
    { id: id9(), t: 'text', x: 60, y: 30, w2: 600, h: 44, txt: 'Mes heures de révision', size: 28, font: 'serif', b: 1, c: '#0f1e3d' },
    { id: id9(), t: 'chart', x: 60, y: 100, w2: 460, h: 280, kind: 'bar', title: 'Heures par jour', data: [{ l: 'Lun', v: 2 }, { l: 'Mar', v: 3 }, { l: 'Mer', v: 1.5 }, { l: 'Jeu', v: 4 }, { l: 'Ven', v: 3.5 }] },
    { id: id9(), t: 'chart', x: 560, y: 100, w2: 460, h: 280, kind: 'line', title: 'Mes notes', data: [{ l: 'Sept', v: 11 }, { l: 'Oct', v: 12.5 }, { l: 'Nov', v: 12 }, { l: 'Déc', v: 14 }] },
  ]],
  idees: ['Brainstorming', 'sticky', 'Six post-it de couleur', () => ['Idée', 'Question', 'À vérifier', 'Prochaine étape', 'Inspiration', 'Décision'].map((t, i) => ({ id: id9(), t: 'sticky', x: 60 + (i % 3) * 250, y: 60 + Math.floor(i / 3) * 220, w2: 210, h: 170, f: ['#fff3bf', '#d3f9d8', '#dbe4ff', '#ffe3e3', '#fff3bf', '#d3f9d8'][i], txt: t, size: 22, font: 'hand', c: '#131a2a' }))],
  cours: ['Schéma de cours', 'listCheck', 'Formes, flèches accrochées, surligné, à cocher', () => {
    const cell = { id: id9(), t: 'ellipse', x: 120, y: 140, w2: 320, h: 220, c: '#2f9e44', w: 3, f: '#d3f9d8', txt: '', size: 18 };
    const noy = { id: id9(), t: 'ellipse', x: 230, y: 210, w2: 90, h: 70, c: '#7048e8', w: 2.5, f: '#e5dbff', txt: 'Noyau', size: 16 };
    const adn = { id: id9(), t: 'text', x: 570, y: 160, w2: 210, h: 40, txt: 'Contient l\'ADN', size: 28, font: 'hand', c: '#131a2a', bg: '#ffe066' };
    const mem = { id: id9(), t: 'text', x: 520, y: 380, w2: 240, h: 40, txt: 'Membrane', size: 28, font: 'hand', c: '#2f9e44' };
    return [
      { id: id9(), t: 'text', x: 60, y: 40, w2: 700, h: 44, txt: 'Chapitre 3 — la cellule', size: 30, font: 'serif', b: 1, c: '#0f1e3d' },
      cell, noy, adn, mem,
      { id: id9(), t: 'line', x1: 330, y1: 245, x2: 560, y2: 180, c: '#131a2a', w: 2, arrow: 1, dash: 0, a1: noy.id, a2: adn.id, bend: -24 },
      { id: id9(), t: 'line', x1: 430, y1: 320, x2: 520, y2: 400, c: '#2f9e44', w: 2, arrow: 1, dash: 0, a1: cell.id, a2: mem.id },
      { id: id9(), t: 'list', x: 840, y: 160, w2: 340, c: '#1baf7a', size: 20, font: 'sans', rows: [{ t: 'Savoir le schéma par cœur', d: 0 }, { t: 'Refaire l\'exercice 4', d: 1 }, { t: 'Définition de la membrane', d: 0 }] },
    ];
  }],
};

const thumb = (b) => { const items = b.items || []; if (!items.length) return `<div class="bd-th is-empty">${ic('compose')}</div>`; const bx = itemsBox(items), m = 30; return `<svg class="bd-th" viewBox="${bx.x - m} ${bx.y - m} ${bx.w + m * 2} ${bx.h + m * 2}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${settle(JSON.parse(JSON.stringify(items.slice(0, 160)))).map(renderItem).join('')}</svg>`; };

export function boardsView() {
  const s = S();
  const list = [...s.boards].sort((a, b) => b.updatedAt - a.updatedAt);
  const allowed = can('boards');
  const demo = `<div class="demo-preview bd-hero" aria-hidden="true"><span class="tag">Exemple</span><svg viewBox="40 20 1160 460" class="bd-demo">${settle(TEMPLATES.cours[3]()).map(renderItem).join('')}</svg></div>`;
  const html = `${pageHead('Tableau blanc', { kicker: list.length ? `${list.length} tableau${list.length > 1 ? 'x' : ''}` : 'Écrire, dessiner, schématiser', actions: allowed ? `<button class="btn btn-primary fab-dup" data-act="board-new" data-tpl="vierge">${ic('plus')}<span>Tableau</span></button>` : '' })}
    ${allowed ? '' : `<div class="bd-lock rise">${paywall('boards')}${demo}</div>`}
    ${list.length ? `<div class="bd-grid">${list.map((b) => `<a class="card bd-card rise" href="#/tableau/${b.id}">${thumb(b)}<span class="bd-b"><b>${esc(b.title || 'Sans titre')}</b><span>${(b.items || []).length} élément${(b.items || []).length > 1 ? 's' : ''} · ${ago(b.updatedAt)}</span></span></a>`).join('')}</div>`
      : allowed ? `<section class="card onboard-empty rise"><span class="empty-ic">${ic('signature')}</span><h2>Une feuille blanche, sans limite</h2>
        <p>Écrivez avec le doigt : votre écriture devient un beau texte. Tracez une forme et gardez le doigt appuyé : elle devient parfaite. Surlignez de toutes les couleurs, cochez, ajoutez des volumes, des graphiques et des frises. Puis imprimez.</p>
        <button class="btn btn-primary btn-lg" data-act="board-new" data-tpl="vierge">${ic('plus')}<span>Créer mon premier tableau</span></button>${demo}</section>` : ''}
    ${allowed ? `<h2 class="sec-title">Partir d'un modèle</h2>
    <div class="tpl-grid">${Object.entries(TEMPLATES).map(([k, [name, icon, sub]]) => `<button class="tpl" data-act="board-new" data-tpl="${k}"><span class="tpl-ic">${ic(icon)}</span><b>${esc(name)}</b><span>${esc(sub)}</span></button>`).join('')}</div>` : ''}`;
  return { title: 'Tableau blanc', tab: 'tableaux', fab: allowed ? 'board-new' : '', html };
}

// Vocabulaire de l'utilisateur : la lecture de l'écriture le reconnaît en priorité
function myWords() {
  const s = S(), out = new Set(s.hwrWords || []);
  const add = (t) => { for (const w of String(t || '').toLowerCase().match(/[a-zàâäçéèêëîïôöùûüÿœæ'-]{3,24}/g) || []) { out.add(w.replace(/^['-]+|['-]+$/g, '')); if (out.size > 3000) return; } };
  (s.subjects || []).forEach((x) => add(x.name));
  (s.projects || []).forEach((x) => add(x.name));
  (s.tasks || []).slice(0, 400).forEach((x) => add(x.title));
  (s.pages || []).slice(0, 200).forEach((p) => { add(p.title); (p.blocks || []).slice(0, 80).forEach((b) => add(b.x)); });
  (s.boards || []).forEach((b) => (b.items || []).forEach((it) => add(it.txt)));
  return [...out];
}
function learn(text) {
  const ws = String(text || '').toLowerCase().match(/[a-zàâäçéèêëîïôöùûüÿœæ'-]{3,24}/g) || [];
  if (!ws.length) return;
  update((s) => { const set = new Set([...(s.hwrWords || []), ...ws]); s.hwrWords = [...set].slice(-600); }, { silent: true });
}

let canvas = null;
export function boardView([id]) {
  const b = S().boards.find((x) => x.id === id);
  if (!b) return { title: 'Tableau', tab: 'tableaux', html: `${pageHead('Tableau introuvable', { back: '#/tableaux' })}<div class="empty"><span class="empty-ic">${ic('compose')}</span><p class="empty-t">Ce tableau n'existe plus</p><a class="btn btn-ghost" href="#/tableaux">Tous les tableaux</a></div>` };
  const allowed = can('boards');
  let coach = true;
  try { coach = !localStorage.getItem('msdev:wb-coach'); } catch (e) { coach = true; }
  const html = `<div class="bd-ed ${allowed ? '' : 'is-readonly'}">
    <header class="bd-top">
      <a class="icon-btn" href="#/tableaux" aria-label="Tous les tableaux">${ic('chevL')}</a>
      <input class="bd-title" value="${esc(b.title || '')}" placeholder="Sans titre" aria-label="Titre du tableau" maxlength="80" data-act-input="board-title" data-id="${id}" ${allowed ? '' : 'readonly'}>
      <span class="bd-saved">Enregistré</span>
      ${allowed ? `<button class="icon-btn" data-act="board-switch" data-id="${id}" aria-label="Mes tableaux" title="Mes tableaux">${ic('layers')}</button><button class="icon-btn bd-new" data-act="board-pick" aria-label="Nouveau tableau" title="Nouveau tableau">${ic('plus')}</button>` : ''}
      ${allowed ? `<span class="bd-hist"><button class="icon-btn" data-act="board-cmd" data-c="undo" aria-label="Annuler" title="Annuler (Ctrl Z)" disabled>${ic('undo')}</button><button class="icon-btn" data-act="board-cmd" data-c="redo" aria-label="Rétablir" title="Rétablir (Ctrl Y)" disabled>${ic('redo')}</button></span>` : ''}
      <button class="icon-btn bd-wide" data-act="board-print" data-id="${id}" aria-label="Imprimer" title="Imprimer ou enregistrer en PDF">${ic('print')}</button>
      <button class="icon-btn bd-wide" data-act="board-export" data-id="${id}" aria-label="Exporter en image" title="Exporter en image">${ic('download')}</button>
      <button class="icon-btn" data-act="board-menu" data-id="${id}" aria-label="Options du tableau">${ic('more')}</button>
    </header>
    <div class="bd-stage"></div>
    ${allowed ? `<div class="bd-bottom"><div class="dw-props bd-tray" role="toolbar" aria-label="Réglages de l'outil" hidden></div><div class="dw-tools bd-dock" role="toolbar" aria-label="Outils"></div></div>` : ''}
  </div>`;
  return {
    title: b.title || 'Tableau blanc', tab: 'tableaux', full: 'board', html,
    after(root) {
      const saved = root.querySelector('.bd-saved');
      const undoB = root.querySelector('[data-c="undo"]'), redoB = root.querySelector('[data-c="redo"]');
      let t = 0;
      canvas = mountCanvas({
        stage: root.querySelector('.bd-stage'), tools: root.querySelector('.bd-dock'), props: root.querySelector('.bd-tray'),
        mode: 'board', items: b.items || [], cam: b.cam || { x: 0, y: 0, z: 1 }, bg: b.bg || 'dots',
        onChange(items, cam) {
          if (!allowed) return;
          saved.textContent = 'Enregistrement…';
          update((s) => { const x = s.boards.find((y) => y.id === id); if (!x) return; x.items = items; x.cam = cam; x.updatedAt = Date.now(); }, { silent: true });
          clearTimeout(t); t = setTimeout(() => { saved.textContent = 'Enregistré'; }, 400);
        },
        onHistory: ({ undo, redo }) => { if (undoB) undoB.disabled = !undo; if (redoB) redoB.disabled = !redo; },
        onEditData: (it, done) => dataSheet(it, done),
        words: myWords, onLearn: learn,
      });
      const stage = root.querySelector('.bd-stage');
      if (allowed && coach) stage.insertAdjacentHTML('beforeend', coachHtml());
      if (!allowed) { canvas.setActive(false); stage.insertAdjacentHTML('beforeend', `<div class="bd-ro">${ic('lock')}<span>Lecture seule : le tableau blanc est inclus dans Pro et Premium.</span><a class="btn btn-primary btn-sm" href="#/abonnement">Voir les formules</a></div>`); }
      if (!(b.items || []).length && !b.cam) { if (allowed) canvas.setTool('pen'); }
      else if (!b.cam && (b.items || []).length) canvas.fitAll();
      root.querySelector('.bd-coach')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-coach]'); if (!btn) return;
        try { localStorage.setItem('msdev:wb-coach', '1'); } catch (err) { /* préférence locale seulement */ }
        root.querySelector('.bd-coach').remove();
        if (btn.dataset.coach === 'write') canvas.setTool('write');
      });
      return () => { canvas?.destroy(); canvas = null; };
    },
  };
}
// Premier passage : trois gestes à connaître, en images
function coachHtml() {
  const card = (title, text, svg) => `<li><svg viewBox="0 0 120 70" aria-hidden="true">${svg}</svg><b>${title}</b><span>${text}</span></li>`;
  return `<div class="bd-coach" role="dialog" aria-label="Bienvenue sur le tableau blanc"><div class="bd-coach-in">
    <h2>Votre tableau blanc</h2>
    <ul>
      ${card('Écrivez à la main', 'Avec l\'outil Écriture, votre écriture devient un beau texte au bout d\'une seconde.', `<path d="M10 44c6-1 8-12 11-20 2-6 5-6 4 2-1 6-3 14 1 12 4-2 5-9 8-9s0 8 3 8 4-6 7-6" fill="none" stroke="#131a2a" stroke-width="2.4" stroke-linecap="round"/><path d="M60 35h10m-4-4 4 4-4 4" fill="none" stroke="#155eef" stroke-width="2" stroke-linecap="round"/><text x="76" y="42" font-family="Caveat, cursive" font-size="20" fill="#131a2a">bonjour</text>`)}
      ${card('Formes parfaites', 'Tracez un rond ou un carré au stylo et gardez le doigt appuyé : il devient parfait.', `<path d="M20 36c0-12 9-20 18-19s16 9 15 19-9 17-18 16-15-6-15-16z" fill="none" stroke="#868e96" stroke-width="2" stroke-dasharray="3 3"/><path d="M60 35h10m-4-4 4 4-4 4" fill="none" stroke="#155eef" stroke-width="2" stroke-linecap="round"/><circle cx="95" cy="35" r="17" fill="#dbe4ff" stroke="#155eef" stroke-width="2.4"/>`)}
      ${card('Deux doigts pour la vue', 'Pincez pour zoomer, glissez à deux doigts pour vous déplacer. Un doigt dessine.', `<circle cx="45" cy="30" r="7" fill="#ffe066"/><circle cx="72" cy="40" r="7" fill="#ffe066"/><path d="M37 22l-8-8m51 34 8 8" stroke="#131a2a" stroke-width="2.2" stroke-linecap="round"/><path d="M26 14h4v4M90 56h-4v-4" fill="none" stroke="#131a2a" stroke-width="2.2" stroke-linecap="round"/>`)}
    </ul>
    <div class="bd-coach-a"><button class="btn btn-primary" data-coach="write">${ic('signature')}<span>Essayer l'écriture</span></button><button class="btn btn-ghost" data-coach="ok">C'est parti</button></div>
  </div></div>`;
}

// Données d'un graphique ou d'une frise
export function dataSheet(it, done) {
  const isChart = it.t === 'chart';
  const rows = isChart ? it.data || [] : it.steps || [];
  const row = (r, i) => `<li class="dt-row"><input class="inp" name="l.${i}" value="${esc(r.l || '')}" placeholder="${isChart ? 'Libellé' : 'Étape'}" aria-label="${isChart ? 'Libellé' : 'Étape'}" maxlength="30"><input class="inp" name="v.${i}" value="${esc(isChart ? r.v ?? '' : r.d || '')}" ${isChart ? 'type="number" step="any" inputmode="decimal" placeholder="Valeur"' : 'placeholder="Date"'} aria-label="${isChart ? 'Valeur' : 'Date'}" maxlength="20"><button type="button" class="icon-btn sm" data-act="dt-del" aria-label="Retirer">${ic('x')}</button></li>`;
  sheet(`${sheetHead(isChart ? 'Données du graphique' : 'Étapes de la frise')}
    <form class="sheet-body form" data-form="board-data">
      ${isChart ? `<div class="form-2">${field('Titre', input('title', it.title || '', 'maxlength="40"'))}${field('Type', select('kind', [['bar', 'Barres'], ['line', 'Courbe (évolution)'], ['pie', 'Secteurs (parts)']], it.kind || 'bar'))}</div>` : ''}
      <ul class="dt-list">${rows.map(row).join('')}</ul>
      <button type="button" class="link" data-act="dt-add" data-chart="${isChart ? 1 : 0}">${ic('plus')}${isChart ? 'Ajouter une valeur' : 'Ajouter une étape'}</button>
      ${isChart ? `<label class="check-row"><input type="checkbox" name="multi" ${it.multi ? 'checked' : ''}><span>Une couleur par barre</span></label>` : ''}
      <button class="btn btn-primary btn-block" type="submit">Appliquer</button>
    </form>`, { cls: 'sheet-sm' });
  dataSheet.done = done; dataSheet.chart = isChart;
}

// Impression : le tableau entier sur une page (ou « Enregistrer en PDF » dans la fenêtre d'impression)
function printBoard(items, title) {
  const b = itemsBox(items);
  const land = b.w > b.h * 1.1;
  const st = document.createElement('style'); st.textContent = `@page { size: A4 ${land ? 'landscape' : 'portrait'}; margin: 12mm; }`;
  const box = document.createElement('div'); box.className = 'print-sheet';
  box.innerHTML = `${title ? `<h1>${esc(title)}</h1>` : ''}${exportSVG(items, { bg: '#ffffff' })}`;
  document.head.append(st); document.body.append(box); document.body.classList.add('is-printing');
  const done = () => { box.remove(); st.remove(); document.body.classList.remove('is-printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => { window.print(); setTimeout(() => { if (document.body.classList.contains('is-printing') && !matchMedia('print').matches) done(); }, 1500); }, 60);
}

register({
  'board-new': (b) => {
    if (!canAddBoard()) { sheet(`${sheetHead('Tableau blanc')}<div class="sheet-body">${paywall('boards', { compact: true })}</div>`, { cls: 'sheet-sm' }); return; }
    const tpl = TEMPLATES[b?.dataset?.tpl] || TEMPLATES.vierge;
    closeSheet();
    const board = { id: 'bd-' + uid(), title: tpl === TEMPLATES.vierge ? '' : tpl[0], items: tpl[3](), bg: tpl[4] || 'dots', createdAt: Date.now(), updatedAt: Date.now() };
    update((s) => { s.boards.unshift(board); });
    location.hash = `#/tableau/${board.id}`;
  },
  // Plusieurs tableaux : passer de l'un à l'autre, ou en commencer un nouveau, sans quitter l'écran
  'board-switch': (b) => {
    canvas?.flush();
    const list = [...S().boards].sort((a, c) => c.updatedAt - a.updatedAt);
    sheet(`${sheetHead('Mes tableaux', `${list.length} tableau${list.length > 1 ? 'x' : ''}`)}<div class="sheet-body">
      <button class="btn btn-primary btn-block" data-act="board-pick">${ic('plus')}<span>Nouveau tableau</span></button>
      <div class="bd-switch">${list.map((x) => `<a class="bd-sw-i ${x.id === b.dataset.id ? 'is-on' : ''}" href="#/tableau/${x.id}" data-act="close-sheet-go" data-h="#/tableau/${x.id}">${thumb(x)}<span><b>${esc(x.title || 'Sans titre')}</b><em>${ago(x.updatedAt)}</em></span></a>`).join('')}</div>
    </div>`, { cls: 'sheet-sm' });
  },
  'board-pick': () => {
    sheet(`${sheetHead('Nouveau tableau', 'Une feuille blanche ou un modèle')}<div class="sheet-body"><div class="tpl-grid is-sheet">${Object.entries(TEMPLATES).map(([k, [name, icon, sub]]) => `<button class="tpl" data-act="board-new" data-tpl="${k}"><span class="tpl-ic">${ic(icon)}</span><b>${esc(name)}</b><span>${esc(sub)}</span></button>`).join('')}</div></div>`);
  },
  'board-title': (el) => update((s) => { const x = s.boards.find((y) => y.id === el.dataset.id); if (x) { x.title = el.value; x.updatedAt = Date.now(); } }, { silent: true }),
  'board-cmd': (b) => canvas?.command(b.dataset.c),
  'board-bg': (b) => { const v = b.dataset.v; update((s) => { const x = s.boards.find((y) => y.id === b.dataset.id); if (x) x.bg = v; }, { silent: true }); canvas?.setBg(v); closeSheet(); },
  'board-print': (b) => {
    canvas?.flush();
    const x = S().boards.find((y) => y.id === b.dataset.id);
    const items = canvas ? canvas.items() : x.items || [];
    if (!items.length) { toast('Le tableau est vide.'); return; }
    printBoard(items, x.title);
  },
  'board-export': async (b) => {
    canvas?.flush();
    const x = S().boards.find((y) => y.id === b.dataset.id);
    const items = canvas ? canvas.items() : x.items || [];
    if (!items.length) { toast('Le tableau est vide.'); return; }
    const name = (x.title || 'tableau').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60);
    if (!can('exportsPro')) { download(`${name}.svg`, await exportSVGFull(items), 'image/svg+xml'); toast('Image vectorielle (.svg) téléchargée. L\'export en PNG haute définition est inclus dans Premium.', { title: 'Tableau exporté', ms: 4200 }); return; }
    try { const blob = await exportPNG(items, 2); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}.png`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('Image PNG téléchargée.', { title: 'Tableau exporté' }); }
    catch (e) { download(`${name}.svg`, await exportSVGFull(items), 'image/svg+xml'); toast('Ce navigateur ne permet pas le PNG : image vectorielle (.svg) téléchargée à la place.', { title: 'Tableau exporté' }); }
  },
  'board-menu': (b) => {
    const x = S().boards.find((y) => y.id === b.dataset.id);
    const allowed = can('boards');
    sheet(`${sheetHead('Tableau', esc(x.title || 'Sans titre'))}<div class="sheet-body">
      ${allowed ? `<p class="field-l">Fond de la feuille</p><div class="bd-bgs">${BGS.map(([k, n]) => `<button class="bd-bg ${(x.bg || 'dots') === k ? 'is-on' : ''}" data-act="board-bg" data-id="${x.id}" data-v="${k}"><i class="bg-${k}"></i><span>${n}</span></button>`).join('')}</div>` : ''}
      <div class="btn-list">
      <button class="btn btn-ghost" data-act="board-fit">${ic('fit')}<span>Tout afficher</span></button>
      <button class="btn btn-ghost" data-act="board-print" data-id="${x.id}">${ic('print')}<span>Imprimer ou enregistrer en PDF</span></button>
      <button class="btn btn-ghost" data-act="board-export" data-id="${x.id}">${ic('download')}<span>Exporter en image</span></button>
      ${allowed ? `<button class="btn btn-ghost" data-act="board-dup" data-id="${x.id}">${ic('copy')}<span>Dupliquer</span></button>
      <button class="btn btn-ghost" data-act="board-help">${ic('signature')}<span>Gestes et raccourcis</span></button>
      <button class="btn btn-danger-ghost" data-act="board-del" data-id="${x.id}">${ic('trash')}<span>Supprimer le tableau</span></button>` : ''}
    </div></div>`, { cls: 'sheet-sm' });
  },
  'board-help': () => sheet(`${sheetHead('Gestes et raccourcis')}<div class="sheet-body bd-help">
    <h3>Au doigt ou au stylet</h3>
    <ul><li><b>Écriture</b> : écrivez, levez le doigt, le texte apparaît (écritures ${HAND_FONTS.map((k) => HAND_NICK[k]).join(', ')}, et ${Object.keys(FONTS).length - 3} autres polices au choix). La première fois, la lecture précise s'installe sur l'appareil (environ 90 Mo). Touchez-le avec Choisir pour voir les autres lectures, corriger ou retrouver votre écriture.</li>
    <li><b>Forme parfaite</b> : au stylo ou au surligneur, gardez le doigt appuyé une demi-seconde à la fin du trait.</li>
    <li><b>Deux doigts</b> : pincer pour zoomer, glisser pour se déplacer. Au stylet, la paume posée est ignorée.</li>
    <li><b>Cases</b> : un toucher sur la case la coche ou la décoche.</li>
    <li><b>Texte</b> : tirez sur les poignées des côtés pour élargir le cadre ; la poignée du coin agrandit le texte.</li></ul>
    <h3>Au clavier</h3>
    <p>V choisir · P stylo · W écriture · M surligneur · E gomme · R formes · T texte · C cases · N post-it · B bulle · U souligner · K tampon · G graphique · J frise · H déplacer. Ctrl Z annuler, Ctrl Y rétablir, Ctrl D dupliquer, Suppr effacer, flèches pour ajuster au pixel près, Maj pour garder les proportions, espace + glisser pour se déplacer, Ctrl + molette pour zoomer.</p>
  </div>`, { cls: 'sheet-sm' }),
  'board-fit': () => { closeSheet(); canvas?.fitAll(); },
  'board-dup': (b) => {
    if (!canAddBoard()) { closeSheet(); return; }
    const x = S().boards.find((y) => y.id === b.dataset.id);
    const c = { ...JSON.parse(JSON.stringify(x)), id: 'bd-' + uid(), title: `${x.title || 'Sans titre'} (copie)`, createdAt: Date.now(), updatedAt: Date.now() };
    update((s) => { s.boards.unshift(c); }); closeSheet(); location.hash = `#/tableau/${c.id}`;
  },
  'board-del': async (b) => {
    const x = S().boards.find((y) => y.id === b.dataset.id);
    closeSheet(null, true);
    if (!await confirmSheet({ title: `Supprimer « ${esc(x.title || 'Sans titre')} » ?`, text: 'Le tableau et tout ce qu\'il contient sont effacés.', ok: 'Supprimer', danger: true })) return;
    canvas?.destroy(); canvas = null;
    update((s) => { s.boards = s.boards.filter((y) => y.id !== x.id); });
    location.hash = '#/tableaux'; toast('Tableau supprimé', { action: 'Annuler', onAction: () => update((s) => { s.boards.unshift(x); }) });
  },
  'dt-add': (b) => {
    const ul = b.closest('form').querySelector('.dt-list'); const i = Date.now() % 1e6; const chart = b.dataset.chart === '1';
    ul.insertAdjacentHTML('beforeend', `<li class="dt-row"><input class="inp" name="l.${i}" placeholder="${chart ? 'Libellé' : 'Étape'}" maxlength="30"><input class="inp" name="v.${i}" ${chart ? 'type="number" step="any" inputmode="decimal" placeholder="Valeur"' : 'placeholder="Date"'} maxlength="20"><button type="button" class="icon-btn sm" data-act="dt-del" aria-label="Retirer">${ic('x')}</button></li>`);
    ul.lastElementChild.querySelector('.inp').focus();
  },
  'dt-del': (b) => b.closest('.dt-row').remove(),
}, {
  'board-data': (d) => {
    const keys = Object.keys(d).filter((k) => k.startsWith('l.')).map((k) => k.slice(2));
    const rows = keys.map((k) => ({ l: (d[`l.${k}`] || '').trim(), v: (d[`v.${k}`] || '').trim() })).filter((r) => r.l || r.v).slice(0, 24);
    const patch = dataSheet.chart ? { title: (d.title || '').trim(), kind: d.kind || 'bar', multi: d.multi === 'on' ? 1 : 0, data: rows.map((r) => ({ l: r.l, v: Number(r.v.replace(',', '.')) || 0 })) } : { steps: rows.map((r) => ({ l: r.l, d: r.v })) };
    dataSheet.done?.(patch);
    closeSheet();
  },
});
