// Quiz : questions à choix multiple avec explication, quiz du jour, cartes de révision
// tirées des notes (blocs Question / réponse et Définition), et les anciens quiz personnels.
// Les quiz de commerce n'apparaissent qu'avec le module Entrepreneur.
import { S, update, can, on, uid, getPage, saveQuizResult, quizStreak, startOfDay, DAY } from '../store.js';
import { ic, esc, register, toast, confirmSheet, ring, bar, field, input, num } from '../ui.js';
import { typo } from '../data/scripts.js';
import { pageHead, paywall } from './common.js';
import { QUIZZES, getQuiz } from '../data/quizzes.js';
import { qaCards } from './notes.js';
import { t as tr } from '../strings.js';

const T = (s) => esc(typo(String(s || '')));
const rr = () => window.dispatchEvent(new Event('ms:rerender'));
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
// Quiz visibles : ceux des modules actifs (organiser et apprendre pour tous, commerce avec Entrepreneur)
export const visibleQuizzes = () => QUIZZES.filter((q) => on(q.mod));
// Quiz du jour : un quiz différent chaque jour, parmi les quiz visibles
export function dailyQuiz() {
  const pool = visibleQuizzes();
  const n = Math.floor(startOfDay() / DAY);
  return pool[n % pool.length];
}
const result = (id) => S().quiz.results[id];

// Source unifiée : intégré, personnel ou cartes d'une page
function source(id) {
  if (id.startsWith('mq-')) {
    const m = S().quiz.mine.find((x) => x.id === id);
    return m && { id, title: m.title, icon: 'edit', mine: true, items: m.questions.map((q) => ({ q: q.q, opts: q.a, ok: q.ok, why: q.why })) };
  }
  const q = getQuiz(id);
  return q && { id, title: q.title, icon: q.icon, items: q.qs.map(([qq, opts, ok, why]) => ({ q: qq, opts, ok, why })) };
}

// ---------- Accueil ----------
// « Nouveau » seulement pour un quiz ajouté il y a moins de 14 jours (date `added`)
const isNew = (q) => !!q.added && Date.now() - Date.parse(q.added) < 14 * DAY;
export function quizHome() {
  const s = S();
  const list = visibleQuizzes();
  const daily = dailyQuiz();
  const dr = result(daily.id);
  const doneToday = dr && dr.at >= startOfDay();
  const passed = list.filter((q) => (result(q.id)?.best || 0) >= 80).length;
  const streak = quizStreak();
  const notePages = s.pages.filter((p) => qaCards(p).length);
  const tile = (q, i) => {
    const r = result(q.id);
    return `<a class="card qz-tile rise" style="--i:${i}" href="#/quiz/${q.id}?restart=1">
      <span class="qz-ic">${ic(q.icon)}</span>
      <b>${T(q.title)}</b><span class="qz-d">${T(q.desc)}</span>
      <span class="qz-f"><span class="muted-s">${q.qs.length} questions</span>${r ? `<span class="chip ${r.best >= 80 ? 't-olive' : 't-sky'}">${r.best >= 80 ? ic('check') : ''}${r.best} %</span>` : isNew(q) ? '<span class="chip">Nouveau</span>' : ''}</span>
    </a>`;
  };
  const html = `
    ${pageHead('Quiz', { kicker: tr('quiz.kicker') })}
    <section class="card qz-daily rise">
      <div class="qz-daily-t"><p class="hero-k">Quiz du jour</p><h2>${T(daily.title)}</h2><p>${doneToday ? `Fait aujourd'hui : ${dr.last} %. Un nouveau quiz demain.` : `${daily.qs.length} questions, environ ${Math.ceil(daily.qs.length * 0.4)} minutes.`}</p></div>
      <a class="btn btn-sky btn-lg" href="#/quiz/${daily.id}?restart=1">${ic(doneToday ? 'repeat' : 'play')}<span>${doneToday ? 'Refaire' : 'Commencer'}</span></a>
    </section>
    <h2 class="sec-title">${tr('quiz.mineTitle')}</h2>
    <section class="card rise">${notePages.length ? `<ul class="rows">${notePages.map((p) => `<li><a class="row" href="#/quiz/note/${p.id}?restart=1"><span class="menu-ic">${ic('cards')}</span><span class="row-b"><b>${esc(p.title || 'Sans titre')}</b><span>${qaCards(p).length} carte${qaCards(p).length > 1 ? 's' : ''}${result('note:' + p.id) ? ` · ${result('note:' + p.id).last} % la dernière fois` : ''}</span></span>${ic('chevR', 'chev')}</a></li>`).join('')}</ul>
      <div class="act-row"><button class="btn btn-ghost" data-act="page-new" data-tpl="revision">${ic('plus')}<span>Nouvelle fiche de révision</span></button></div>`
      : `<div class="mini-empty">${ic('cards')}<p>${tr('quiz.mineEmpty')}</p></div>
      <div class="demo-preview dp-mini" aria-hidden="true"><span class="tag">Exemple</span><div class="dp-flash"><em>Question</em><b>Durée d'un cycle Pomodoro ?</b><em>Réponse</em><span>25 minutes, puis 5 minutes de pause.</span></div></div><div class="act-row"><button class="btn btn-primary" data-act="page-new" data-tpl="revision">${ic('plus')}<span>Créer une fiche de révision</span></button></div>`}</section>
    ${s.quiz.mine.length ? `<h2 class="sec-title">${tr('quiz.oldTitle')}</h2><section class="card rise"><ul class="rows">${s.quiz.mine.map((m) => `<li><a class="row" href="#/quiz/${m.id}?restart=1"><span class="menu-ic">${ic('edit')}</span><span class="row-b"><b>${esc(m.title)}</b><span>${m.questions.length} question${m.questions.length > 1 ? 's' : ''}${result(m.id) ? ` · meilleur score ${result(m.id).best} %` : ''}</span></span>${ic('chevR', 'chev')}</a></li>`).join('')}</ul></section>` : ''}
    <h2 class="sec-title">Tous les quiz</h2>
    <section class="qz-stats rise">
      <div><b>${passed}</b><span>quiz réussis sur ${list.length}</span>${bar(passed, list.length, 'olive')}</div>
      <div><b>${streak}</b><span>jour${streak > 1 ? 's' : ''} d'affilée</span><i class="qz-flame">${ic('flame')}</i></div>
    </section>
    <div class="qz-grid">${list.map(tile).join('')}</div>`;
  return { title: 'Quiz', tab: 'quiz', html };
}

// ---------- Partie en cours ----------
let run = null;
function start(src, only = null) {
  const idx = only || src.items.map((_, i) => i);
  run = { id: src.id, order: shuffle(idx), i: 0, picks: [], perms: {}, finished: false, saved: false, partial: !!only };
  run.order.forEach((k) => { run.perms[k] = shuffle(src.items[k].opts.map((_, j) => j)); });
}

export function quizPlay([id], q) {
  if (id === 'nouveau') return quizEdit(['nouveau']);
  const src = source(id);
  if (!src) return null;
  if (!run || run.id !== id || q.restart) {
    start(src, q.errors && result(id)?.wrong?.length ? result(id).wrong.filter((k) => k < src.items.length) : null);
    if (q.restart) history.replaceState(null, '', `#/quiz/${id}`);
  }
  const n = run.order.length;
  if (run.finished) return resultView(src);
  const k = run.order[run.i];
  const item = src.items[k];
  const pick = run.picks[run.i];
  const answered = pick !== undefined;
  const perm = run.perms[k];
  const good = answered && perm[pick] === item.ok;
  const html = `
    ${pageHead(T(src.title), { kicker: `Question ${run.i + 1} sur ${n}`, back: '#/quiz' })}
    <div class="qz-prog" aria-hidden="true">${run.order.map((_, j) => `<i class="${j < run.i || (j === run.i && answered) ? (src.items[run.order[j]].ok === run.perms[run.order[j]][run.picks[j]] ? 'ok' : 'ko') : j === run.i ? 'cur' : ''}"></i>`).join('')}</div>
    <section class="card qz-card rise">
      <p class="qz-q">${T(item.q)}</p>
      <div class="qz-opts" role="group" aria-label="Réponses">${perm.map((j, pos) => {
        const cls = !answered ? '' : j === item.ok ? 'is-ok' : pos === pick ? 'is-ko' : 'is-off';
        return `<button class="qz-opt ${cls}" data-act="qz-pick" data-pos="${pos}" ${answered ? 'disabled' : ''}><span class="qz-l">${LETTERS[pos]}</span><span>${T(item.opts[j])}</span>${answered && j === item.ok ? ic('check', 'qz-ck') : answered && pos === pick ? ic('x', 'qz-ck') : ''}</button>`;
      }).join('')}</div>
      ${answered ? `<div class="qz-why ${good ? 'ok' : 'ko'}" role="status"><p class="qz-why-k">${good ? 'Bonne réponse' : 'Pas tout à fait'}</p>${item.why ? `<p>${T(item.why)}</p>` : ''}</div>
        <button class="btn btn-primary btn-block btn-lg" data-act="qz-next" autofocus>${run.i + 1 < n ? 'Question suivante' : 'Voir le résultat'}${ic('arrowR')}</button>` : `<p class="hint">${tr('qz.hint', { keys: matchMedia('(pointer:fine)').matches ? tr('qz.hint.keys') : '' })}</p>`}
    </section>`;
  return {
    title: src.title, tab: 'quiz', html,
    after(root) {
      const onKey = (e) => {
        if (e.target.closest('input, textarea, select')) return;
        if (!answered && /^[1-5]$/.test(e.key)) { const b = root.querySelector(`.qz-opt[data-pos="${+e.key - 1}"]`); if (b) { e.preventDefault(); b.click(); } }
        else if (answered && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) { e.preventDefault(); root.querySelector('[data-act="qz-next"]')?.click(); }
      };
      document.addEventListener('keydown', onKey);
      if (answered) root.querySelector('[data-act="qz-next"]')?.focus({ preventScroll: true });
      return () => document.removeEventListener('keydown', onKey);
    },
  };
}

function resultView(src) {
  const n = run.order.length;
  const score = run.order.filter((k, j) => run.perms[k][run.picks[j]] === src.items[k].ok).length;
  const wrong = run.order.filter((k, j) => run.perms[k][run.picks[j]] !== src.items[k].ok);
  if (!run.saved) { run.saved = true; saveQuizResult(src.id, score, n, wrong, run.partial); }
  const pct = Math.round((score / n) * 100);
  const [head, text] = pct >= 80 ? ['Très bien', tr('qz.r.good')]
    : pct >= 50 ? ['Pas mal', tr('qz.r.mid')]
      : ['À revoir', tr('qz.r.low')];
  const best = result(src.id)?.best || pct;
  const html = `
    ${pageHead(T(src.title), { kicker: 'Résultat', back: '#/quiz' })}
    <section class="card qz-res rise">
      <div class="hero-ring">${ring(score, n, { size: 140, stroke: 11 })}<div class="hero-ring-v"><b>${score}<small>/${n}</small></b><span>${pct} %</span></div></div>
      <div><h2>${head}</h2><p>${text}</p><p class="muted-s">${run.partial ? `${tr('qz.errors')} · meilleur score sur le quiz complet : ${result(src.id)?.best ?? 0} %` : `Meilleur score : ${best} %`}</p></div>
    </section>
    <div class="act-row rise">
      ${wrong.length ? `<a class="btn btn-primary" href="#/quiz/${src.id}?restart=1&errors=1">${ic('repeat')}<span>Refaire mes ${wrong.length} erreur${wrong.length > 1 ? 's' : ''}</span></a>` : ''}
      <a class="btn ${wrong.length ? 'btn-ghost' : 'btn-primary'}" href="#/quiz/${src.id}?restart=1">${ic('repeat')}<span>Recommencer</span></a>
      <a class="btn btn-ghost" href="#/quiz">Autres quiz</a>
      ${src.mine ? `<a class="btn btn-ghost" href="#/quiz/edit/${src.id}">${ic('edit')}<span>Modifier</span></a>` : ''}
    </div>
    ${wrong.length ? `<h2 class="sec-title">À retenir</h2>${wrong.map((k) => { const it = src.items[k]; return `<section class="card qz-rev rise"><p class="qz-q sm">${T(it.q)}</p><p class="qz-good">${ic('check')}${T(it.opts[it.ok])}</p>${it.why ? `<p class="muted">${T(it.why)}</p>` : ''}</section>`; }).join('')}` : ''}`;
  return { title: src.title, tab: 'quiz', html };
}

// ---------- Cartes de révision (depuis une page) ----------
let deck = null;
export function quizCards([pid], q) {
  const p = getPage(pid);
  if (!p) return { title: 'Révision', tab: 'quiz', html: `${pageHead('Révision', { back: '#/quiz' })}<p class="muted">Cette page n'existe plus.</p>` };
  const cards = qaCards(p);
  if (!cards.length) return { title: 'Révision', tab: 'quiz', html: `${pageHead(esc(p.title || 'Révision'), { back: `#/note/${pid}` })}<div class="empty"><span class="empty-ic">${ic('cards')}</span><p class="empty-t">Aucune carte</p><p class="empty-p">Ajoutez des blocs « Question / réponse » remplis dans cette page.</p><a class="btn btn-primary" href="#/note/${pid}">Ouvrir la page</a></div>` };
  if (!deck || deck.pid !== pid || q.restart) {
    deck = { pid, queue: shuffle(cards.map((c) => c.id)), i: 0, shown: false, first: {}, done: 0, again: {} };
    if (q.restart) history.replaceState(null, '', `#/quiz/note/${pid}`);
  }
  const total = cards.length;
  if (deck.i >= deck.queue.length) {
    const known = Object.values(deck.first).filter(Boolean).length;
    if (!deck.saved) { deck.saved = true; saveQuizResult('note:' + pid, known, total, []); }
    return {
      title: 'Révision', tab: 'quiz', html: `${pageHead(esc(p.title || 'Révision'), { kicker: 'Révision terminée', back: `#/note/${pid}` })}
      <section class="card qz-res rise"><div class="hero-ring">${ring(known, total, { size: 140, stroke: 11 })}<div class="hero-ring-v"><b>${known}<small>/${total}</small></b><span>du premier coup</span></div></div>
        <div><h2>${known === total ? 'Tout est su' : 'Bien joué'}</h2><p>${known === total ? tr('qz.fc.all') : tr('qz.fc.some')}</p></div></section>
      <div class="act-row"><a class="btn btn-primary" href="#/quiz/note/${pid}?restart=1">${ic('repeat')}<span>Réviser encore</span></a><a class="btn btn-ghost" href="#/note/${pid}">Retour à la page</a></div>`,
    };
  }
  const c = cards.find((x) => x.id === deck.queue[deck.i]);
  const html = `
    ${pageHead(esc(p.title || 'Révision'), { kicker: `Carte ${Math.min(deck.done + 1, total)} sur ${total}${deck.queue.length > total ? ' · une carte revient' : ''}`, back: `#/note/${pid}` })}
    ${bar(deck.done, total, 'olive')}
    <section class="card fcard ${deck.shown ? 'is-flip' : ''} rise" aria-live="polite">
      <p class="fc-k">Question</p><p class="fc-q">${T(c.x)}</p>
      ${deck.shown ? `<p class="fc-k">Réponse</p><p class="fc-a">${T(c.a)}</p>` : ''}
    </section>
    ${deck.shown ? `<div class="fc-acts"><button class="btn btn-ghost btn-lg fc-ko" data-act="fc-rate" data-v="0">${ic('repeat')}<span>À revoir</span></button><button class="btn btn-olive btn-lg" data-act="fc-rate" data-v="1">${ic('check')}<span>Je savais</span></button></div>`
      : `<button class="btn btn-primary btn-lg btn-block" data-act="fc-show">Voir la réponse</button>`}`;
  return {
    title: 'Révision', tab: 'quiz', html,
    after(root) {
      const onKey = (e) => {
        if (e.target.closest('input, textarea, select')) return;
        if (!deck.shown && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); root.querySelector('[data-act="fc-show"]')?.click(); }
        else if (deck.shown && (e.key === '1' || e.key === 'ArrowLeft')) root.querySelector('[data-v="0"]')?.click();
        else if (deck.shown && (e.key === '2' || e.key === 'ArrowRight')) root.querySelector('[data-v="1"]')?.click();
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    },
  };
}

// ---------- Créer / modifier un quiz ----------
const qBlock = (q, i) => `<fieldset class="card form qb rise" data-i="${i}">
  <header class="card-h"><div><h2>Question ${i + 1}</h2></div><button type="button" class="icon-btn sm" data-act="qb-del" aria-label="Retirer la question">${ic('trash')}</button></header>
  ${field('Énoncé', `<textarea class="inp" name="q.${i}" rows="2" maxlength="300" placeholder="Votre question">${esc(q.q || '')}</textarea>`)}
  <div class="qb-ans"><span class="field-l">Réponses — cochez la bonne</span>${[0, 1, 2, 3].map((j) => `<label class="qb-a"><input type="radio" name="ok.${i}" value="${j}" ${(q.ok ?? 0) === j ? 'checked' : ''} aria-label="Bonne réponse ${LETTERS[j]}"><span class="qz-l">${LETTERS[j]}</span>${input(`a.${i}.${j}`, q.a?.[j] || '', `maxlength="160" placeholder="${j < 2 ? 'Réponse' : 'Réponse (facultative)'}"`)}</label>`).join('')}</div>
  ${field('Explication (facultative)', input(`why.${i}`, q.why || '', 'maxlength="300" placeholder="Pourquoi c\'est la bonne réponse"'))}
</fieldset>`;
export function quizEdit([id]) {
  if (!can('myQuiz')) return { title: 'Créer un quiz', tab: 'quiz', html: `${pageHead('Créer un quiz', { back: '#/quiz' })}${paywall('myQuiz')}` };
  const cur = id === 'nouveau' ? null : S().quiz.mine.find((x) => x.id === id);
  if (id !== 'nouveau' && !cur) return null;
  const qs = cur?.questions?.length ? cur.questions : [{ q: '', a: ['', '', '', ''], ok: 0, why: '' }];
  const html = `${pageHead(cur ? 'Modifier le quiz' : 'Créer un quiz', { back: cur ? `#/quiz/${cur.id}` : '#/quiz', kicker: 'Deux à quatre réponses par question, une seule bonne' })}
    <form class="form" data-form="my-quiz" data-id="${cur?.id || ''}" novalidate>
      <section class="card form rise">${field('Titre du quiz', input('title', cur?.title || '', 'required maxlength="80" placeholder="Nos tarifs, nos produits, la procédure d\'accueil…"'))}</section>
      <div class="qb-list">${qs.map(qBlock).join('')}</div>
      <button type="button" class="btn btn-ghost btn-block" data-act="qb-add">${ic('plus')}<span>Ajouter une question</span></button>
      <div class="act-row"><button class="btn btn-primary" type="submit">Enregistrer le quiz</button>${cur ? `<button type="button" class="btn btn-danger-ghost" data-act="mq-del" data-id="${cur.id}">${ic('trash')}<span>Supprimer</span></button>` : ''}</div>
    </form>`;
  return { title: 'Créer un quiz', tab: 'quiz', html };
}

register({
  // Copie les cartes (copie immédiate, dans le geste), puis ouvre Quizlet : « Importer » et coller
  'qz-pick': (b) => { if (!run || run.picks[run.i] !== undefined) return; run.picks[run.i] = +b.dataset.pos; if (navigator.userActivation?.isActive) navigator.vibrate?.(8); rr(); },
  'qz-next': () => { if (!run) return; if (run.i + 1 < run.order.length) run.i++; else run.finished = true; rr(); window.scrollTo(0, 0); },
  'fc-show': () => { if (deck) { deck.shown = true; rr(); } },
  'fc-rate': (b) => {
    if (!deck) return;
    const id = deck.queue[deck.i];
    const ok = b.dataset.v === '1';
    if (!(id in deck.first)) deck.first[id] = ok;
    if (ok) deck.done++;
    else if (!deck.again[id]) { deck.again[id] = 1; deck.queue.push(id); }
    else deck.done++;
    deck.i++; deck.shown = false; rr();
  },
  'qb-add': () => {
    const list = document.querySelector('.qb-list');
    const i = Math.max(-1, ...[...list.children].map((x) => +x.dataset.i)) + 1;
    if (list.children.length >= 40) { toast('Quarante questions au maximum par quiz.'); return; }
    list.insertAdjacentHTML('beforeend', qBlock({ q: '', a: ['', '', '', ''], ok: 0 }, i));
    renumber(list);
    list.lastElementChild.querySelector('textarea').focus();
  },
  'qb-del': (b) => {
    const list = b.closest('.qb-list');
    if (list.children.length <= 1) { toast('Un quiz a besoin d\'au moins une question.'); return; }
    b.closest('.qb').remove(); renumber(list);
  },
  'mq-del': async (b) => {
    if (!await confirmSheet({ title: 'Supprimer ce quiz ?', text: 'Ses questions et vos scores seront effacés.', ok: 'Supprimer', danger: true })) return;
    update((s) => { s.quiz.mine = s.quiz.mine.filter((x) => x.id !== b.dataset.id); delete s.quiz.results[b.dataset.id]; });
    location.hash = '#/quiz'; toast('Quiz supprimé');
  },
}, {
  'my-quiz': (d, f) => {
    const title = (d.title || '').trim();
    const blocks = [...f.querySelectorAll('.qb')];
    const questions = []; let bad = null;
    for (const fs of blocks) {
      const i = fs.dataset.i;
      const q = (d[`q.${i}`] || '').trim();
      const raw = [0, 1, 2, 3].map((j) => (d[`a.${i}.${j}`] || '').trim());
      const okRaw = Number(d[`ok.${i}`] || 0);
      if (!q && raw.every((x) => !x)) continue;
      const keep = raw.map((x, j) => [x, j]).filter(([x]) => x);
      const okIdx = keep.findIndex(([, j]) => j === okRaw);
      if (!q || keep.length < 2 || okIdx < 0) { bad = fs; break; }
      questions.push({ q, a: keep.map(([x]) => x), ok: okIdx, why: (d[`why.${i}`] || '').trim() });
    }
    if (!title) { toast('Donnez un titre au quiz.', { title: 'Titre manquant' }); f.elements.title.focus(); return; }
    if (bad) { bad.scrollIntoView({ block: 'center' }); bad.classList.add('is-err'); setTimeout(() => bad.classList.remove('is-err'), 1600); toast('Chaque question a besoin d\'un énoncé, d\'au moins deux réponses, et la bonne réponse doit être remplie.', { title: 'Question incomplète', ms: 4500 }); return; }
    if (!questions.length) { toast('Ajoutez au moins une question.', { title: 'Quiz vide' }); return; }
    const id = f.dataset.id || 'mq-' + uid();
    update((s) => { const i = s.quiz.mine.findIndex((x) => x.id === id); const m = { id, title, questions, updatedAt: Date.now() }; if (i >= 0) s.quiz.mine[i] = m; else s.quiz.mine.unshift(m); });
    run = null;
    toast(`${questions.length} question${questions.length > 1 ? 's' : ''}`, { title: 'Quiz enregistré' });
    location.hash = `#/quiz/${id}`;
  },
});
function renumber(list) { [...list.children].forEach((fs, k) => { fs.querySelector('h2').textContent = `Question ${k + 1}`; }); }
export { num };
