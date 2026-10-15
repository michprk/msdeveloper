// Tableau blanc : une feuille sans limite pour écrire, dessiner, schématiser, faire des graphiques
// et des frises d'évolution. Plusieurs tableaux, chacun enregistré au fil du dessin.
import { S, update, can, uid, canAddBoard, LIMITS } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, confirmSheet, field, input, select, ago, download } from '../ui.js';
import { pageHead, paywall } from './common.js';
import { mountCanvas, renderItem, itemsBox, exportSVG, exportPNG } from '../draw.js';

const BGS = [['dots', 'Points'], ['grid', 'Quadrillage'], ['lines', 'Lignes'], ['blank', 'Blanc']];
const id9 = () => 'd' + Math.random().toString(36).slice(2, 9);
// Modèles : de quoi démarrer en un geste
const TEMPLATES = {
  vierge: ['Tableau vierge', 'compose', () => []],
  carte: ['Carte mentale', 'layers', () => {
    const c = { id: id9(), t: 'ellipse', x: 380, y: 260, w2: 240, h: 110, c: '#155eef', w: 3, f: '#dbe4ff', txt: 'Sujet central', size: 22, font: 'serif', b: 1 };
    const pos = [[80, 80], [700, 80], [80, 460], [700, 460]];
    const ideas = pos.map(([x, y], i) => ({ id: id9(), t: 'rect', x, y, w2: 200, h: 80, c: ['#eb6834', '#1baf7a', '#eda100', '#e87ba4'][i], w: 2.5, f: '#ffffff', txt: `Idée ${i + 1}`, size: 18, font: 'sans' }));
    const links = pos.map(([x, y]) => ({ id: id9(), t: 'line', x1: 500, y1: 315, x2: x + 100, y2: y + 40, c: '#a8a39a', w: 2, arrow: 0, dash: 0 }));
    return [...links, c, ...ideas];
  }],
  frise: ['Frise chronologique', 'trend', () => [
    { id: id9(), t: 'text', x: 60, y: 40, w2: 600, h: 44, txt: 'Frise : la Révolution française', size: 30, font: 'serif', b: 1, c: '#0f1e3d' },
    { id: id9(), t: 'timeline', x: 60, y: 110, w2: 900, h: 120, c: '#155eef', steps: [{ l: 'États généraux', d: 'mai 1789' }, { l: 'Prise de la Bastille', d: '14 juillet 1789' }, { l: 'Fin de la monarchie', d: '1792' }, { l: 'Directoire', d: '1795' }, { l: 'Coup d\'État', d: '1799' }] },
  ]],
  graphique: ['Graphique et évolution', 'chart', () => [
    { id: id9(), t: 'text', x: 60, y: 30, w2: 600, h: 44, txt: 'Mes heures de révision', size: 28, font: 'serif', b: 1, c: '#0f1e3d' },
    { id: id9(), t: 'chart', x: 60, y: 100, w2: 460, h: 280, kind: 'bar', title: 'Heures par jour', data: [{ l: 'Lun', v: 2 }, { l: 'Mar', v: 3 }, { l: 'Mer', v: 1.5 }, { l: 'Jeu', v: 4 }, { l: 'Ven', v: 3.5 }] },
    { id: id9(), t: 'chart', x: 560, y: 100, w2: 460, h: 280, kind: 'line', title: 'Mes notes', data: [{ l: 'Sept', v: 11 }, { l: 'Oct', v: 12.5 }, { l: 'Nov', v: 12 }, { l: 'Déc', v: 14 }] },
  ]],
  idees: ['Brainstorming', 'sticky', () => ['Idée', 'Question', 'À vérifier', 'Prochaine étape', 'Inspiration', 'Décision'].map((t, i) => ({ id: id9(), t: 'sticky', x: 60 + (i % 3) * 250, y: 60 + Math.floor(i / 3) * 220, w2: 210, h: 170, f: ['#fff3bf', '#d3f9d8', '#dbe4ff', '#ffe3e3', '#fff3bf', '#d3f9d8'][i], txt: t, size: 20, font: 'hand', c: '#131a2a' }))],
  cours: ['Schéma de cours', 'book', () => [
    { id: id9(), t: 'text', x: 60, y: 40, w2: 700, h: 44, txt: 'Chapitre 3 — la cellule', size: 30, font: 'serif', b: 1, c: '#0f1e3d' },
    { id: id9(), t: 'ellipse', x: 120, y: 140, w2: 320, h: 220, c: '#2f9e44', w: 3, f: '#d3f9d8', txt: '', size: 18 },
    { id: id9(), t: 'ellipse', x: 230, y: 210, w2: 90, h: 70, c: '#7048e8', w: 2.5, f: '#e5dbff', txt: 'Noyau', size: 16 },
    { id: id9(), t: 'line', x1: 330, y1: 245, x2: 560, y2: 180, c: '#131a2a', w: 2, arrow: 1, dash: 0 },
    { id: id9(), t: 'text', x: 570, y: 160, w2: 280, h: 60, txt: 'Contient l\'ADN', size: 20, font: 'hand', c: '#131a2a', bg: '#ffe066' },
    { id: id9(), t: 'check', x: 570, y: 280, s: 26, c: '#1baf7a', done: 0, txt: 'Savoir le schéma par cœur', w2: 300, size: 18 },
  ]],
};

export function boardsView() {
  const s = S();
  const list = [...s.boards].sort((a, b) => b.updatedAt - a.updatedAt);
  const thumb = (b) => { const items = b.items || []; if (!items.length) return `<div class="bd-th is-empty">${ic('compose')}</div>`; const bx = itemsBox(items), m = 30; return `<svg class="bd-th" viewBox="${bx.x - m} ${bx.y - m} ${bx.w + m * 2} ${bx.h + m * 2}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${items.slice(0, 120).map(renderItem).join('')}</svg>`; };
  const html = `${pageHead('Tableau blanc', { kicker: list.length ? `${list.length} tableau${list.length > 1 ? 'x' : ''}${can('boardsUnlimited') ? '' : ` · ${LIMITS.freeBoards} en version gratuite`}` : 'Écrivez, dessinez, schématisez', actions: `<button class="btn btn-primary fab-dup" data-act="board-new" data-tpl="vierge">${ic('plus')}<span>Tableau</span></button>` })}
    ${list.length ? `<div class="bd-grid">${list.map((b) => `<a class="card bd-card rise" href="#/tableau/${b.id}">${thumb(b)}<span class="bd-b"><b>${esc(b.title || 'Sans titre')}</b><span>${(b.items || []).length} élément${(b.items || []).length > 1 ? 's' : ''} · ${ago(b.updatedAt)}</span></span></a>`).join('')}</div>`
      : `<section class="card onboard-empty rise"><span class="empty-ic">${ic('compose')}</span><h2>Une feuille blanche, sans limite</h2>
        <p>Écrivez où vous voulez, dessinez au stylo, surlignez, soulignez en rouge, ajoutez des cases à cocher, des bulles, des post-it, des graphiques et des frises d'évolution. Au doigt, au stylet ou à la souris.</p>
        <button class="btn btn-primary btn-lg" data-act="board-new" data-tpl="vierge">${ic('plus')}<span>Créer mon premier tableau</span></button>
        <div class="demo-preview" aria-hidden="true"><span class="tag">Exemple</span><svg viewBox="40 20 1000 380" class="bd-demo">${TEMPLATES.graphique[2]().map(renderItem).join('')}</svg></div></section>`}
    <h2 class="sec-title">Partir d'un modèle</h2>
    <div class="tpl-grid">${Object.entries(TEMPLATES).map(([k, [name, icon]]) => `<button class="tpl" data-act="board-new" data-tpl="${k}"><span class="tpl-ic">${ic(icon)}</span><b>${esc(name)}</b><span>${{ vierge: 'Une feuille à points, rien d\'autre', carte: 'Un sujet, quatre idées reliées', frise: 'Les grandes dates, dans l\'ordre', graphique: 'Barres et courbe, modifiables', idees: 'Six post-it de couleur', cours: 'Schéma annoté et à cocher' }[k]}</span></button>`).join('')}</div>`;
  return { title: 'Tableau blanc', tab: 'tableaux', fab: 'board-new', html };
}

let canvas = null;
export function boardView([id]) {
  const b = S().boards.find((x) => x.id === id);
  if (!b) return { title: 'Tableau', tab: 'tableaux', html: `${pageHead('Tableau introuvable', { back: '#/tableaux' })}<div class="empty"><span class="empty-ic">${ic('compose')}</span><p class="empty-t">Ce tableau n'existe plus</p><a class="btn btn-ghost" href="#/tableaux">Tous les tableaux</a></div>` };
  const html = `<div class="bd-ed">
    <header class="bd-top">
      <a class="icon-btn" href="#/tableaux" aria-label="Tous les tableaux">${ic('chevL')}</a>
      <input class="bd-title" value="${esc(b.title || '')}" placeholder="Sans titre" aria-label="Titre du tableau" maxlength="80" data-act-input="board-title" data-id="${id}">
      <span class="bd-saved">Enregistré</span>
      <label class="bd-sel">${select('bg', BGS, b.bg || 'dots', `data-act-change="board-bg" data-id="${id}" aria-label="Fond"`)}</label>
      <button class="icon-btn" data-act="board-export" data-id="${id}" aria-label="Exporter en image" title="Exporter">${ic('download')}</button>
      <button class="icon-btn" data-act="board-menu" data-id="${id}" aria-label="Options du tableau">${ic('more')}</button>
    </header>
    <div class="dw-props bd-props" role="toolbar" aria-label="Réglages de l'outil"></div>
    <div class="bd-body"><div class="dw-tools bd-tools" role="toolbar" aria-label="Outils de dessin"></div><div class="bd-stage"></div></div>
  </div>`;
  return {
    title: b.title || 'Tableau blanc', tab: 'tableaux', full: 'board', html,
    after(root) {
      const saved = root.querySelector('.bd-saved');
      let t = 0;
      canvas = mountCanvas({
        stage: root.querySelector('.bd-stage'), tools: root.querySelector('.bd-tools'), props: root.querySelector('.bd-props'),
        mode: 'board', items: b.items || [], cam: b.cam || { x: 0, y: 0, z: 1 }, bg: b.bg || 'dots',
        onChange(items, cam) {
          saved.textContent = 'Enregistrement…';
          update((s) => { const x = s.boards.find((y) => y.id === id); if (!x) return; x.items = items; x.cam = cam; x.updatedAt = Date.now(); }, { silent: true });
          clearTimeout(t); t = setTimeout(() => { saved.textContent = 'Enregistré'; }, 400);
        },
        onEditData: (it, done) => dataSheet(it, done),
      });
      if (!(b.items || []).length && !b.cam) canvas.setTool('pen');
      else if (!b.cam && (b.items || []).length) canvas.fitAll();
      return () => { canvas?.destroy(); canvas = null; };
    },
  };
}

// Données d'un graphique ou d'une frise
function dataSheet(it, done) {
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

register({
  'board-new': (b) => {
    if (!canAddBoard()) { sheet(`${sheetHead(`${LIMITS.freeBoards} tableau blanc en version gratuite`)}<div class="sheet-body">${paywall('boardsUnlimited', { compact: true })}</div>`, { cls: 'sheet-sm' }); return; }
    const tpl = TEMPLATES[b?.dataset?.tpl] || TEMPLATES.vierge;
    const board = { id: 'bd-' + uid(), title: tpl === TEMPLATES.vierge ? '' : tpl[0], items: tpl[2](), bg: 'dots', createdAt: Date.now(), updatedAt: Date.now() };
    update((s) => { s.boards.unshift(board); });
    location.hash = `#/tableau/${board.id}`;
  },
  'board-title': (el) => update((s) => { const x = s.boards.find((y) => y.id === el.dataset.id); if (x) { x.title = el.value; x.updatedAt = Date.now(); } }, { silent: true }),
  'board-bg': (el) => { update((s) => { const x = s.boards.find((y) => y.id === el.dataset.id); if (x) x.bg = el.value; }, { silent: true }); canvas?.setBg(el.value); },
  'board-export': async (b) => {
    const x = S().boards.find((y) => y.id === b.dataset.id);
    const items = canvas ? canvas.items() : x.items || [];
    if (!items.length) { toast('Le tableau est vide.'); return; }
    const name = (x.title || 'tableau').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60);
    if (!can('exportsPro')) { download(`${name}.svg`, exportSVG(items), 'image/svg+xml'); toast('Image vectorielle (.svg) téléchargée. L\'export en PNG haute définition est inclus dans Premium.', { title: 'Tableau exporté', ms: 4200 }); return; }
    try { const blob = await exportPNG(items, 2); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}.png`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('Image PNG téléchargée.', { title: 'Tableau exporté' }); }
    catch (e) { download(`${name}.svg`, exportSVG(items), 'image/svg+xml'); toast('Ce navigateur ne permet pas le PNG : image vectorielle (.svg) téléchargée à la place.', { title: 'Tableau exporté' }); }
  },
  'board-menu': (b) => {
    const x = S().boards.find((y) => y.id === b.dataset.id);
    sheet(`${sheetHead('Tableau', esc(x.title || 'Sans titre'))}<div class="sheet-body"><div class="btn-list">
      <button class="btn btn-ghost" data-act="board-fit">${ic('fit')}<span>Tout afficher</span></button>
      <button class="btn btn-ghost" data-act="board-dup" data-id="${x.id}">${ic('copy')}<span>Dupliquer</span></button>
      <button class="btn btn-danger-ghost" data-act="board-del" data-id="${x.id}">${ic('trash')}<span>Supprimer le tableau</span></button>
    </div><p class="sheet-note">Raccourcis : V sélection, P stylo, M surligneur, U souligner, E gomme, R carré, O cercle, A flèche, T texte, N post-it, B bulle, C case à cocher, G graphique, J frise. Ctrl Z annuler, Suppr effacer, espace + glisser pour se déplacer, Ctrl + molette pour zoomer.</p></div>`, { cls: 'sheet-sm' });
  },
  'board-fit': () => { closeSheet(); canvas?.fitAll(); },
  'board-dup': (b) => {
    if (!canAddBoard()) { closeSheet(); toast('Un seul tableau en version gratuite.'); return; }
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
