// Données d'exemple (entreprises fictives) pour découvrir l'application.
// Marquées demo: true — les numéros ne sont pas composables.
import { DAY, startOfDay, uid } from '../store.js';

const LIST = [
  ['Atelier Pivoine', 'fleuriste', 'Ixelles', 'Sophie', 'interesse', 'site', 1290, 'Instagram'],
  ['Maison Lemaire', 'boulangerie', 'Etterbeek', 'Marc', 'rdv', 'site', 1290, 'Appel'],
  ['Brasserie des Tilleuls', 'restaurant', 'Uccle', 'Karim', 'devis', 'auto', 790, 'Appel'],
  ['Salon Céleste', 'coiffeur', 'Saint-Gilles', 'Inès', 'signe', 'site', 1290, 'Visite'],
  ['Garage du Vieux Moulin', 'garage', 'Forest', 'Patrick', 'rappeler', 'seo', 490, 'Appel'],
  ['Cabinet Delvaux', 'avocat', 'Woluwe-Saint-Lambert', '', 'a_appeler', 'site', 0, 'Appel'],
  ['Fiduciaire Verbeke', 'comptable', 'Schaerbeek', 'An', 'a_appeler', 'auto', 0, 'Appel'],
  ['Studio Lumen', 'photographe', 'Molenbeek', 'Théo', 'a_appeler', 'site', 0, 'Instagram'],
  ['Kiné Flagey', 'sante', 'Ixelles', '', 'a_appeler', 'seo', 0, 'Appel'],
  ['Hôtel Les Glycines', 'hotel', 'Saint-Josse', 'Claire', 'perdu', 'site', 0, 'Appel'],
  ['Épicerie Odette', 'epicerie', 'Etterbeek', 'Odette', 'a_appeler', 'site', 0, 'Visite'],
  ['Club Atlas', 'sport', 'Auderghem', 'Yanis', 'rappeler', 'auto', 290, 'Appel'],
  ['La Petite Fabrique', 'traiteur', 'Anderlecht', 'Nadia', 'interesse', 'site', 750, 'Recommandation'],
  ['Boutique Indigo', 'mode', 'Ixelles', 'Léa', 'a_appeler', 'site', 0, 'Instagram'],
  ['Institut Camélia', 'beaute', 'Jette', 'Sarah', 'a_appeler', 'auto', 0, 'Appel'],
  ['Menuiserie Peeters', 'artisan', 'Evere', 'Johan', 'a_appeler', 'seo', 0, 'Appel'],
];

// Générateur pseudo-aléatoire stable (mêmes exemples à chaque installation).
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

export function demoData(now = Date.now()) {
  const r = rng(42);
  const today = startOfDay(now);
  const prospects = LIST.map(([entreprise, secteur, ville, contact, stage, service, valeur, source], i) => ({
    id: uid() + i, demo: true, entreprise, secteur, ville, contact, stage, service, valeur, source,
    tel: `+32 2 000 00 ${String(i + 10)}`, email: '', adresse: '', site: '', instagram: '',
    notes: '', next: null, attempts: stage === 'a_appeler' ? 0 : 1 + Math.floor(r() * 3),
    createdAt: now - (12 - (i % 10)) * DAY, updatedAt: now - Math.floor(r() * 5) * DAY,
    lastContact: stage === 'a_appeler' ? null : now - Math.floor(1 + r() * 6) * DAY,
    signedAt: stage === 'signe' ? now - 5 * DAY : undefined, type: stage === 'signe' ? 'client' : 'prospect', tags: i === 1 ? ['boulangerie', 'vip'] : i === 0 ? ['fête des mères'] : [],
  }));
  const P = Object.fromEntries(prospects.map((p) => [p.entreprise, p]));

  // Historique d'appels sur 13 jours (la journée en cours comprise).
  const activities = [];
  const weights = [['nr', 0.44], ['rappeler', 0.16], ['refus', 0.22], ['interesse', 0.11], ['rdv', 0.07]];
  const pick = () => { let x = r(), acc = 0; for (const [k, w] of weights) { acc += w; if (x < acc) return k; } return 'nr'; };
  for (let d = 12; d >= 0; d--) {
    const date = new Date(today - d * DAY);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const n = d === 0 ? 14 : 16 + Math.floor(r() * 22);
    for (let k = 0; k < n; k++) {
      const at = today - d * DAY + (9.5 + r() * 7.5) * 3600e3;
      if (d === 0 && at > now) continue;
      activities.push({ id: uid() + d + '-' + k, demo: true, prospectId: null, type: 'appel', outcome: pick(), at });
    }
  }
  const add = (name, a) => activities.push({ id: uid() + name.length + a.type, demo: true, prospectId: P[name].id, ...a });
  add('Atelier Pivoine', { type: 'appel', outcome: 'interesse', note: 'Très intéressée par la commande en ligne pour la fête des mères. Envoyer deux exemples.', at: now - 2 * DAY });
  add('Maison Lemaire', { type: 'appel', outcome: 'rdv', note: 'Précommandes de Saint-Nicolas sur papier : gros point de douleur.', at: now - 3 * DAY });
  add('Brasserie des Tilleuls', { type: 'devis', note: 'Pack réservation + rappels SMS — 790 €', at: now - 1 * DAY });
  add('Salon Céleste', { type: 'etape', from: 'devis', to: 'signe', at: now - 5 * DAY });
  add('Garage du Vieux Moulin', { type: 'appel', outcome: 'rappeler', note: 'Patron sous une voiture, rappeler avant 8 h 30.', at: now - 1 * DAY });
  add('Club Atlas', { type: 'appel', outcome: 'rappeler', note: 'Rappeler après la rentrée des cours du soir.', at: now - 4 * DAY });
  add('Hôtel Les Glycines', { type: 'appel', outcome: 'refus', note: 'Contrat récent avec une autre agence.', at: now - 6 * DAY });
  add('La Petite Fabrique', { type: 'note', note: 'Recommandée par Inès (Salon Céleste).', at: now - 2 * DAY });
  activities.sort((a, b) => b.at - a.at);

  const H = (dayOffset, h, m = 0) => today + dayOffset * DAY + (h * 60 + m) * 60e3;
  const tasks = [
    { title: 'Rappeler Garage du Vieux Moulin', kind: 'appel', due: H(1, 8, 15), p: 'Garage du Vieux Moulin' },
    { title: 'Envoyer deux exemples à Atelier Pivoine', kind: 'tache', due: H(0, 17), p: 'Atelier Pivoine' },
    { title: 'Rendez-vous — Maison Lemaire', kind: 'rdv', due: H(2, 14, 30), p: 'Maison Lemaire' },
    { title: 'Relancer le devis — Brasserie des Tilleuls', kind: 'relance', due: H(2, 15, 30), p: 'Brasserie des Tilleuls' },
    { title: 'Envoyer l\'e-mail promis à Club Atlas', kind: 'tache', due: H(-1, 11), p: 'Club Atlas' },
    { title: 'Préparer la liste d\'appels de demain', kind: 'tache', due: H(0, 18) },
  ].map((t) => ({ id: uid() + t.title.length, demo: true, title: t.title, kind: t.kind, due: t.due, prospectId: t.p ? P[t.p].id : null, done: false, createdAt: now }));
  for (const t of tasks) {
    const p = prospects.find((x) => x.id === t.prospectId);
    if (p && (!p.next || p.next.due > t.due)) p.next = { taskId: t.id, label: t.title, due: t.due };
  }
  // Organisation : tâches personnelles et pages
  const own = [
    { title: 'Faire la déclaration TVA', due: today + 3 * DAY, list: 'travail', prio: 2 },
    { title: 'Mettre à jour le portfolio', due: today, list: 'travail', prio: 1, sub: [{ id: 's1', x: 'Choisir 6 projets', done: true }, { id: 's2', x: 'Écrire les légendes', done: false }] },
    { title: 'Réserver le train pour Gand', due: null, list: 'perso', prio: 0 },
    { title: 'Commander des cartes de visite', due: today + DAY, list: 'travail', prio: 0, done: true },
  ].map((t, i) => ({ id: uid() + 'o' + i, demo: true, kind: 'tache', prospectId: null, notes: '', sub: [], status: 'todo', done: false, createdAt: now - i * 3600e3, ...t, doneAt: t.done ? now - 3600e3 : null }));
  const b = (t, x, extra = {}) => ({ id: uid() + Math.random().toString(36).slice(2, 5), t, x, ...extra });
  const pages = [
    { id: 'pg-demo1', demo: true, title: 'Plan de la semaine', icon: 'calendar', fav: true, parent: null, prospectId: null, createdAt: now - 2 * DAY, updatedAt: now - 3600e3,
      blocks: [b('h2', 'Objectifs de la semaine'), b('todo', 'Deux rendez-vous signés', { c: true }), b('todo', 'Portfolio en ligne', { c: false }), b('todo', 'Déclaration TVA', { c: false }), b('h2', 'Idées'), b('ul', 'Proposer un forfait entretien mensuel'), b('ul', 'Partenariat avec le Salon Céleste')] },
    { id: 'pg-demo2', demo: true, title: 'Rendez-vous — Maison Lemaire', icon: 'briefcase', fav: false, parent: null, prospectId: P['Maison Lemaire'].id, createdAt: now - DAY, updatedAt: now - 5 * 3600e3,
      blocks: [b('h2', 'Contexte'), b('p', 'Boulangerie familiale, deux boutiques. Commandes de gâteaux notées sur papier.'), b('h2', 'Besoins exprimés'), b('ul', 'Précommandes en ligne pour les week-ends'), b('ul', 'Horaires toujours à jour sur Google'), b('h2', 'Prochaine étape'), b('todo', 'Envoyer la proposition avant jeudi', { c: false })] },
    { id: 'pg-demo3', demo: true, title: 'Révision — méthodes d\'organisation', icon: 'cards', fav: false, parent: 'pg-demo1', prospectId: null, createdAt: now - 3 * DAY, updatedAt: now - 2 * DAY,
      blocks: [b('callout', 'Bouton « Réviser » en haut de la page : chaque question devient une carte.'), b('qa', 'Durée d\'un cycle Pomodoro ?', { a: '25 minutes, puis 5 minutes de pause.' }), b('qa', 'La règle des deux minutes ?', { a: 'Si une tâche prend moins de deux minutes, la faire tout de suite.' }), b('qa', 'Les deux critères de la matrice d\'Eisenhower ?', { a: 'L\'urgence et l\'importance.' })] },
  ];
  // Deux projets : un client et un projet personnel, pour montrer que l'outil sert à tout
  const projects = [
    { id: 'pj-demo1', demo: true, prospectId: P['Salon Céleste'].id, name: 'Site du Salon Céleste', icon: 'briefcase', tone: 'olive', status: 'actif', due: today + 16 * DAY, desc: 'Site vitrine avec prise de rendez-vous.', links: [], createdAt: now - 5 * DAY },
    { id: 'pj-demo2', demo: true, prospectId: null, name: 'Réviser l\'examen d\'histoire', icon: 'book', tone: 'sky', status: 'actif', due: today + 9 * DAY, desc: 'Chapitres 3 à 6, examen le vendredi.', links: [], createdAt: now - 3 * DAY },
  ];
  const ptasks = [
    ['pj-demo1', 'Acompte reçu', true], ['pj-demo1', 'Brief et contenus reçus', true], ['pj-demo1', 'Première version', false, 'doing', today + 4 * DAY], ['pj-demo1', 'Retours du client', false, 'todo', today + 9 * DAY], ['pj-demo1', 'Livraison', false, 'todo', today + 16 * DAY],
    ['pj-demo2', 'Fiche : la Révolution française', true], ['pj-demo2', 'Fiche : l\'Empire', true], ['pj-demo2', 'Fiche : la révolution industrielle', false, 'doing', today + DAY], ['pj-demo2', 'Quiz : dates clés', false, 'todo', today + 2 * DAY + 18 * 3600e3], ['pj-demo2', 'Examen blanc', false, 'todo', today + 7 * DAY],
  ].map(([projectId, title, done, status = 'done', due = null], i) => ({ id: uid() + 'j' + i, demo: true, title, projectId, prospectId: projectId === 'pj-demo1' ? P['Salon Céleste'].id : null, done, doneAt: done ? now - (10 - i) * 3600e3 : null, status, due, kind: 'tache', list: null, prio: status === 'doing' ? 1 : 0, notes: '', sub: [], createdAt: now - 4 * DAY + i }));
  // Trois devis : accepté (le client du projet), envoyé et à relancer, brouillon
  const qt = (id, name, title, lines, status, sentDays, extra = {}) => ({ id, demo: true, num: `DEV-${new Date(now).getFullYear()}-0${id.slice(-2)}`, prospectId: P[name].id, client: name, contact: P[name].contact || '', email: '', adresse: P[name].ville || '', title, lines, remise: 0, tva: 21, acompte: 50, validite: 30, note: '', status, createdAt: now - (sentDays + 1) * DAY, updatedAt: now - sentDays * DAY, sentAt: status === 'brouillon' ? null : now - sentDays * DAY, decidedAt: status === 'accepte' ? now - (sentDays - 2) * DAY : null, ...extra });
  const quotes = [
    qt('qt-demo12', 'Maison Lemaire', 'Site vitrine et précommandes', [{ label: 'Site vitrine 5 pages', qty: 1, price: 990 }, { label: 'Module de précommande', qty: 1, price: 300 }], 'envoye', 4),
    qt('qt-demo11', 'Salon Céleste', 'Site avec prise de rendez-vous', [{ label: 'Site vitrine', qty: 1, price: 990 }, { label: 'Réservation en ligne', qty: 1, price: 300 }], 'accepte', 7),
    qt('qt-demo13', 'Atelier Pivoine', 'Fiche Google et avis', [{ label: 'Optimisation fiche Google', qty: 1, price: 290 }], 'brouillon', 0),
  ].filter((x) => x.prospectId);
  return { prospects, activities, tasks: [...tasks, ...own, ...ptasks], projects, pages, quotes };
}

export function clearDemo(s) {
  s.prospects = s.prospects.filter((x) => !x.demo);
  s.activities = s.activities.filter((x) => !x.demo);
  s.tasks = s.tasks.filter((x) => !x.demo);
  s.projects = s.projects.filter((x) => !x.demo);
  s.pages = s.pages.filter((x) => !x.demo);
  s.quotes = (s.quotes || []).filter((x) => !x.demo);
  for (const k of ['subjects', 'courses', 'exams', 'grades', 'boards']) s[k] = (s[k] || []).filter((x) => !x.demo);
}

// Données d'exemple pour l'école : matières, emploi du temps, examens, notes, tâches et fiches de révision.
export function schoolDemo() {
  const now = Date.now(), today = startOfDay(now);
  const S = [['sj-d1', 'Histoire', 'sand', 2], ['sj-d2', 'Maths', 'blue', 3], ['sj-d3', 'Anglais', 'olive', 2], ['sj-d4', 'Biologie', 'sky', 2]].map(([id, name, tone, coef]) => ({ id, name, tone, coef, demo: true }));
  const C = [[0, 'sj-d2', '08:30', '10:10', 'B12', 'M. Dupont'], [0, 'sj-d1', '10:20', '12:00', 'A04', 'Mme Lambert'], [1, 'sj-d3', '13:00', '14:40', 'L2', 'Ms Carter'], [2, 'sj-d4', '08:30', '10:10', 'Labo 1', 'M. Haddad'], [3, 'sj-d2', '10:20', '12:00', 'B12', 'M. Dupont'], [4, 'sj-d1', '13:00', '14:40', 'A04', 'Mme Lambert'], [4, 'sj-d3', '14:50', '16:30', 'L2', 'Ms Carter']]
    .map(([day, subjectId, start, end, room, teacher], i) => ({ id: `co-d${i}`, demo: true, day, subjectId, start, end, room, teacher, title: '' }));
  const projects = [{ id: 'pj-dex1', demo: true, name: 'Examen d’histoire', icon: 'book', tone: 'sand', status: 'actif', due: today + 9 * DAY + 9 * 3600e3, desc: 'Matière : Histoire', links: [], createdAt: now - 4 * DAY }];
  const exams = [
    { id: 'ex-d1', demo: true, title: 'Examen d’histoire', subjectId: 'sj-d1', date: today + 9 * DAY + 9 * 3600e3, chapters: ['La Révolution française', 'L’Empire', 'La révolution industrielle', 'La colonisation'], projectId: 'pj-dex1', createdAt: now - 4 * DAY },
    { id: 'ex-d2', demo: true, title: 'Contrôle de maths', subjectId: 'sj-d2', date: today + 3 * DAY + 10 * 3600e3, chapters: ['Fonctions', 'Dérivées'], projectId: null, createdAt: now - 2 * DAY },
  ];
  const grades = [['sj-d1', 15, 20, 2, 'Interrogation ch. 1'], ['sj-d1', 13.5, 20, 1, 'Devoir maison'], ['sj-d2', 11, 20, 2, 'Contrôle fonctions'], ['sj-d2', 14, 20, 1, 'Exercices'], ['sj-d3', 16, 20, 1, 'Oral'], ['sj-d4', 12, 20, 2, 'TP cellule']]
    .map(([subjectId, value, max, coef, label], i) => ({ id: `gr-d${i}`, demo: true, subjectId, value, max, coef, label, date: now - (20 - i * 3) * DAY }));
  const T = (title, due, extra = {}) => ({ id: `t-ds${Math.random().toString(36).slice(2, 8)}`, demo: true, title, due, done: false, doneAt: null, status: 'todo', kind: 'tache', list: 'ecole', prio: 0, notes: '', sub: [], projectId: null, prospectId: null, createdAt: now - DAY, ...extra });
  const tasks = [
    T('Fiche : la Révolution française', today - DAY + 17 * 3600e3, { projectId: 'pj-dex1', done: true, doneAt: now - 20 * 3600e3, status: 'done' }),
    T('Fiche : l’Empire', today + 17 * 3600e3, { projectId: 'pj-dex1', status: 'doing', prio: 1 }),
    T('Fiche : la révolution industrielle', today + DAY + 17 * 3600e3, { projectId: 'pj-dex1' }),
    T('Réviser : la colonisation', today + 4 * DAY + 17 * 3600e3, { projectId: 'pj-dex1' }),
    T('Examen blanc d’histoire', today + 8 * DAY + 14 * 3600e3, { projectId: 'pj-dex1', prio: 2 }),
    T('Exercices de maths p. 42', today + 18 * 3600e3, { prio: 1 }),
    T('Rendre le devoir de français', today + 2 * DAY + 8 * 3600e3, { prio: 2 }),
    T('Apprendre le vocabulaire d’anglais', today - DAY, {}),
    T('Acheter un classeur', null, { list: 'perso' }),
  ];
  const b = (t, x, extra = {}) => ({ id: `b${Math.random().toString(36).slice(2, 9)}`, t, x, ...extra });
  const pages = [
    { id: 'pg-ds1', demo: true, title: 'Cours — la Révolution française', icon: 'cards', fav: true, parent: null, prospectId: null, projectId: 'pj-dex1', createdAt: now - 3 * DAY, updatedAt: now - 3600e3,
      blocks: [b('callout', 'Bouton « Réviser » en haut de la page : chaque question devient une carte.'), b('h1', 'L’essentiel'), b('ul', 'Crise financière et États généraux (mai 1789)', { h: 'Crise financière et <b>États généraux</b> (mai 1789)' }), b('ul', 'Prise de la Bastille : 14 juillet 1789', { h: '<span style="background-color:rgb(255, 224, 102)">Prise de la Bastille : 14 juillet 1789</span>' }), b('ul', 'Fin de la monarchie en 1792'), b('h1', 'Questions'), b('qa', 'Date de la prise de la Bastille ?', { a: '14 juillet 1789' }), b('qa', 'Que sont les États généraux ?', { a: 'Une assemblée des trois ordres : clergé, noblesse, tiers état.' }), b('qa', 'Quand la monarchie prend-elle fin ?', { a: 'En 1792, avec la proclamation de la République.' })] },
    { id: 'pg-ds2', demo: true, title: 'Planning de révision', icon: 'book', fav: false, parent: null, prospectId: null, createdAt: now - 4 * DAY, updatedAt: now - 5 * 3600e3,
      blocks: [b('callout', 'Une matière par ligne, une date par chapitre. La veille de l’examen, uniquement des quiz.'), b('h1', 'Histoire — examen dans 9 jours'), b('todo', 'Révolution française', { c: true }), b('todo', 'L’Empire', { c: false }), b('todo', 'Révolution industrielle', { c: false }), b('h1', 'Maths — contrôle dans 3 jours'), b('todo', 'Fonctions : exercices 1 à 12', { c: false }), b('todo', 'Dérivées : fiche de formules', { c: false })] },
  ];
  return { subjects: S, courses: C, exams, grades, tasks, projects, pages };
}
