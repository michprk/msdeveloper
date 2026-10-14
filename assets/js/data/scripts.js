// Moteur de scripts : un script = un service vendu × un format × un secteur.
// Les textes utilisent des variables entre accolades, remplies à l'affichage
// avec le profil de l'utilisateur et la fiche du prospect choisi.
import { SECTORS } from './sectors.js';

export const SERVICES = {
  site: {
    id: 'site', label: 'Création de site web', short: 'Site web', icon: 'monitor',
    what: (p) => `on crée des sites internet pour les ${p} {de_ville}`,
    sujet: 'votre site internet', theme: 'leur site internet',
    emailSubjects: ['Une idée pour {entreprise}', '{entreprise} sur Google', 'Question rapide'],
  },
  auto: {
    id: 'auto', label: 'Automatisation', short: 'Automatisation', icon: 'bolt',
    what: (p) => `on aide les ${p} {de_ville} à gagner du temps en automatisant les rendez-vous, les rappels et les relances`,
    sujet: 'du temps que vous pourriez gagner chaque semaine', theme: 'l\'automatisation de leurs tâches répétitives',
    emailSubjects: ['Une idée pour gagner du temps chez {entreprise}', 'Question rapide sur vos rendez-vous', '{entreprise} : une heure de gagnée par jour ?'],
  },
  seo: {
    id: 'seo', label: 'Référencement', short: 'Référencement', icon: 'trend',
    what: (p) => `on aide les ${p} {de_ville} à sortir en premier sur Google et Google Maps`,
    sujet: 'votre visibilité sur Google', theme: 'leur visibilité sur Google',
    emailSubjects: ['{entreprise} sur Google Maps', 'Une idée pour {entreprise}', 'Question rapide'],
  },
};
export const SERVICE_IDS = ['site', 'auto', 'seo'];

export const CHANNELS = [
  { id: 'appel', label: 'Appel à froid', short: 'Appel', icon: 'phone', dur: '2 – 3 min', goal: 'Décrocher un rendez-vous de vingt minutes.' },
  { id: 'repondeur', label: 'Message sur répondeur', short: 'Répondeur', icon: 'voicemail', dur: '20 s', goal: 'Être rappelé, ou être reconnu au prochain appel.' },
  { id: 'visite', label: 'Visite sur place', short: 'Visite', icon: 'store', dur: '3 – 5 min', goal: 'Créer un lien et fixer un vrai rendez-vous.' },
  { id: 'email', label: 'E-mail de prospection', short: 'E-mail', icon: 'mail', dur: '1 min de lecture', goal: 'Obtenir une réponse ou un appel.' },
  { id: 'sms', label: 'SMS & WhatsApp', short: 'SMS', icon: 'message', dur: '4 modèles', goal: 'Confirmer, rappeler et relancer en douceur.' },
  { id: 'dm', label: 'Message Instagram', short: 'Instagram', icon: 'insta', dur: '3 messages', goal: 'Ouvrir une conversation sans être intrusif.' },
  { id: 'relance', label: 'Relances', short: 'Relances', icon: 'refresh', dur: '5 modèles', goal: 'Relancer sans harceler.' },
  { id: 'rdv', label: 'Le rendez-vous', short: 'Rendez-vous', icon: 'calendar', dur: '20 min', goal: 'Comprendre le besoin et présenter la solution.' },
  { id: 'objections', label: 'Objections', short: 'Objections', icon: 'shield', dur: '14 réponses', goal: 'Répondre calmement et garder la conversation ouverte.' },
  { id: 'closing', label: 'Prix & signature', short: 'Signature', icon: 'checkCircle', dur: '5 min', goal: 'Annoncer le prix et conclure.' },
];
export const CH = Object.fromEntries(CHANNELS.map((c) => [c.id, c]));
export const FREE_CHANNELS = ['appel'];

let custom = [];
export const setCustomSectors = (list) => { custom = list || []; };
export const allSectors = () => [...SECTORS, ...custom];
export const getSector = (id) => allSectors().find((s) => s.id === id);

const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const searchQ = (sec) => (sec.search ? `« ${sec.search} {ville} »` : 'votre métier et votre ville');

// ---------- Objections ----------
const SVC_OBJ = {
  site: (sec) => [
    { q: 'J\'ai déjà un site.', a: 'Tant mieux ! Il vous amène combien de demandes par mois ? … Je vous propose un audit gratuit : si votre site fait déjà le travail, je vous le dirai franchement.' },
    { q: 'Instagram (ou Facebook) me suffit.', a: `Instagram montre votre travail, c'est parfait. Mais quand quelqu'un tape ${searchQ(sec)} sur Google, Instagram ne sort pas. Le site, c'est votre vitrine sur Google — les deux se complètent.` },
    { q: 'Je peux le faire moi-même.', a: 'Bien sûr, c\'est possible. La vraie question : combien d\'heures, et est-ce que ça vous amènera des clients ? Nous, on s\'occupe du design, des textes et du référencement — vous gardez votre temps pour votre métier.' },
  ],
  auto: () => [
    { q: 'Je préfère le contact humain.', a: 'Moi aussi ! L\'automatisation sert justement à libérer du temps pour ce contact : les rappels et les confirmations partent tout seuls, vous gardez les vraies conversations.' },
    { q: 'Je ne suis pas à l\'aise avec la technique.', a: 'Vous n\'avez rien de technique à faire : on installe, on teste et on vous forme en trente minutes. Vous continuez à utiliser votre téléphone comme d\'habitude.' },
    { q: 'Mes clients n\'utiliseront pas ça.', a: 'Pour eux, rien ne change : ils peuvent toujours appeler. Un SMS de rappel, en revanche, tout le monde le lit.' },
  ],
  seo: (sec) => [
    { q: 'Je suis déjà sur Google.', a: `Vous y êtes, oui. Mais à quelle place quand on cherche ${searchQ(sec)} ? La plupart des clics vont aux trois premiers résultats de la carte.` },
    { q: 'Le référencement, c\'est flou et ça prend trop de temps.', a: 'Je comprends la méfiance. C\'est pour ça qu\'on commence par le concret : votre fiche Google, vos avis, vos photos — des changements visibles rapidement, et un rapport clair chaque mois.' },
    { q: 'Je paie déjà de la publicité Google.', a: 'Très bien, ça marche tant que vous payez. Le référencement naturel, c\'est la visibilité qui reste quand vous coupez la publicité. Les deux se complètent.' },
  ],
};
const ROI = {
  site: 'Je comprends. Si le site vous amène deux nouveaux clients par mois, il faut combien de temps pour le rembourser ? On peut aussi commencer plus simple et le faire évoluer ensuite.',
  auto: 'Je comprends. Si on vous fait gagner trois heures par semaine, combien valent ces heures pour vous ? On peut aussi commencer par une seule automatisation.',
  seo: 'Je comprends. Combien vous rapporte un nouveau client ? Il en faut combien par mois pour que ce soit rentable ? On peut aussi commencer par la fiche Google seule.',
};
function objections(sec, svcId, d) {
  const common = [
    { q: 'Je n\'ai pas le temps.', a: 'Je comprends, vous êtes en plein travail. Quel est le meilleur moment pour deux minutes : demain matin ou en fin de journée ?' },
    { q: 'Envoyez-moi un e-mail.', a: `Avec plaisir. Pour vous envoyer quelque chose d'utile plutôt qu'une brochure, une seule question : ${lc(d.q[0])}` },
    { q: 'Combien ça coûte ?', a: 'Ça dépend de ce dont vous avez besoin : nos formules commencent à {prix}. Le plus simple, c\'est que je vous montre en vingt minutes ce qui a du sens pour vous — vous aurez un prix précis, sans engagement.' },
    { q: 'C\'est trop cher.', a: ROI[svcId] },
    { q: 'Ça ne m\'intéresse pas.', a: 'Je l\'entends. Juste pour ne pas vous rappeler pour rien : c\'est le sujet qui ne vous parle pas, ou le moment ?' },
    { q: 'Quelqu\'un s\'en occupe déjà.', a: 'Très bien, gardez-le ! Je peux vous faire un petit audit gratuit en cinq points : si tout est bon, vous aurez la confirmation que vous êtes entre de bonnes mains.' },
    { q: 'Je dois en parler à mon associé.', a: 'Bien sûr. À votre avis, qu\'est-ce qu\'il ou elle voudra savoir ? … On peut se voir à trois, vingt minutes : c\'est souvent plus simple.' },
    { q: 'Rappelez-moi plus tard.', a: 'Avec plaisir. Plutôt quel jour, et à quelle heure ? Je le note.' },
    { q: 'J\'ai déjà été déçu par une agence.', a: 'Malheureusement, ça arrive souvent. Qu\'est-ce qui s\'est mal passé ? … {promesse} Et on avance étape par étape : vous validez chaque étape avant la suivante.' },
    { q: 'Comment avez-vous eu mon numéro ?', a: `Il est affiché sur votre fiche Google : c'est en cherchant ${searchQ(sec)} que j'ai vu votre entreprise. Je suis {prenom}, de {societe}, on travaille avec des ${sec.plural} de la région.` },
  ];
  return [sec.obj, ...SVC_OBJ[svcId](sec), ...common];
}

// ---------- Formats ----------
// Lignes : ['v', texte] = vous ; ['p', …] = le prospect ; ['n', …] = indication ;
// ['m', …] = message à copier ; ['o', …] = objet d'e-mail.
const T = {
  appel: (sec, svc, d) => [
    { t: 'Ouverture', l: [['v', 'Bonjour, je suis bien chez {entreprise} ?'], ['p', 'Oui, c\'est pour quoi ?'], ['v', `Je suis {prenom}, de {societe} : ${svc.what(sec.plural)}. Je vous prends trente secondes, et si ça ne vous parle pas, je vous laisse travailler. Ça vous va ?`]], tip: 'Souriez avant de décrocher : ça s\'entend. Demander la permission fait tomber la garde.' },
    { t: 'Si ce n\'est pas le décideur', opt: true, l: [['v', 'Je souhaitais parler à la personne qui s\'occupe de {entreprise}. À quel moment est-ce le plus simple de la joindre ?'], ['v', 'C\'est de la part de {prenom}, de {societe}. Et vous êtes… ? Merci, je note.']], tip: 'Notez le prénom de votre interlocuteur et réutilisez-le en rappelant : vous passerez plus facilement.' },
    { t: 'Accroche', l: [['v', d.hook]], tip: 'Une remarque vraie et précise vaut mieux que dix compliments. Vérifiez-la sur Google juste avant l\'appel.' },
    { t: 'Découverte', l: [['v', d.q[0]], ['n', 'Laissez répondre. Relancez avec « C\'est-à-dire ? »'], ['v', d.q[1]]], tip: 'Écoutez sans interrompre et notez les mots exacts : vous les réutiliserez au rendez-vous.' },
    { t: 'Proposition', l: [['v', `C'est exactement ce qu'on fait : ${d.value}. {promesse}`], ['v', `Par exemple, ${d.ex}.`]], tip: 'Une phrase, un exemple. Le reste, ce sera pour le rendez-vous.' },
    { t: 'Rendez-vous', l: [['v', `Le plus simple, c'est que je passe vingt minutes ${sec.chez} pour vous montrer à quoi ça pourrait ressembler pour vous. Ça vous irait plutôt ${sec.creneau} ?`]], tip: 'Proposez toujours deux créneaux : on choisit entre deux options, on dit rarement non.' },
    { t: 'Conclusion', l: [['v', 'Parfait, je note {jour}. Je vous envoie un SMS de confirmation à ce numéro ?'], ['v', 'Merci {contact}, et belle journée !']], tip: 'Répétez le jour et l\'heure, et envoyez la confirmation dans les cinq minutes.' },
  ],
  repondeur: (sec, svc, d) => [
    { t: 'Le message — 20 secondes', l: [['m', `Bonjour, ici {prenom}, de {societe}. J'appelle {entreprise} au sujet de ${svc.sujet} : j'ai une idée simple pour vous — ${d.ex}. Je vous rappelle {jour}, ou rappelez-moi au {tel}. Je répète : {tel}. Belle journée !`]], tip: 'Un seul sujet, votre numéro deux fois, lentement. Pas plus de vingt secondes.' },
    { t: 'Le SMS, juste après', l: [['m', `Bonjour, c'est {prenom}, de {societe} — je viens de vous laisser un message. Une idée pour {entreprise} : ${d.ex}. Je vous rappelle {jour}, ou répondez ici si c'est plus simple.`]], tip: 'Le SMS donne un visage à votre appel : le suivant sera mieux accueilli.' },
    { t: 'Au rappel suivant', l: [['v', 'Bonjour, c\'est {prenom}, de {societe} — je vous ai laissé un message il y a quelques jours. Je vous prends trente secondes ?'], ['n', 'Enchaînez sur l\'accroche du script d\'appel.']] },
  ],
  visite: (sec, svc, d) => [
    { t: 'Avant d\'entrer', l: [['n', `Le bon moment : ${sec.horaire}. À éviter : ${sec.eviter}.`], ['n', 'Préparez deux exemples sur votre téléphone et une carte de visite. Regardez la vitrine, les avis Google et le compte Instagram.']] },
    { t: 'Entrée', l: [['v', 'Bonjour ! C\'est vous qui vous occupez de {entreprise} ?'], ['v', `Je suis {prenom}, de {societe} : ${svc.what(sec.plural)}. Je ne viens rien vous vendre aujourd'hui, j'ai juste une question rapide.`]], tip: 'Si c\'est le rush, ne vous imposez pas : laissez votre carte et demandez quand repasser.' },
    { t: 'Observation', l: [['v', d.hook]] },
    { t: 'Question', l: [['v', d.q[0]], ['n', 'Écoutez, acquiescez, notez après.']] },
    { t: 'Montrer', l: [['v', `Regardez, voilà à quoi ça pourrait ressembler pour vous : ${d.ex}.`], ['n', 'Trente secondes sur votre téléphone, pas plus.']] },
    { t: 'Rendez-vous', l: [['v', `Je ne veux pas vous prendre plus de temps maintenant. Je repasse ${sec.creneau} avec une proposition concrète pour {entreprise} — ça vous va ?`]], tip: 'Le but de la visite n\'est pas de vendre : c\'est d\'obtenir un vrai rendez-vous.' },
    { t: 'En sortant', l: [['v', 'Je vous laisse ma carte. Merci, et bonne journée !'], ['n', 'Notez tout de suite dans la fiche : prénom, ambiance, objection entendue.']] },
  ],
  email: (sec, svc, d) => [
    { t: 'Objet — au choix', l: svc.emailSubjects.map((s) => ['o', s]) },
    { t: 'Le message', l: [['m', `Bonjour {contact},\n\n${d.hook}\n\n${d.q[0]}\n\nC'est exactement ce que nous faisons chez {societe} : ${d.value}. Par exemple, ${d.ex}.\n\nAuriez-vous vingt minutes ${sec.creneau} pour que je vous montre ce que cela pourrait donner pour {entreprise} ?\n\nBelle journée,\n{prenom}\n{societe} · {tel}\n\nSi ce n'est pas le bon moment, dites-le-moi simplement et je ne vous écrirai plus.`]], tip: 'Moins de 120 mots, une seule question, pas de pièce jointe au premier envoi.' },
    { t: 'Relance à J+3', l: [['m', `Bonjour {contact},\n\nJe me permets de remonter mon message. L'idée que j'avais pour {entreprise} : ${d.ex}.\n\nUn simple « oui » ou « pas maintenant » me suffit.\n\n{prenom}`]], tip: 'Répondez dans le même fil : la personne retrouve le contexte.' },
    { t: 'Bon à savoir', l: [['n', 'En B2B, écrivez de préférence aux adresses génériques (info@, contact@) et proposez toujours de ne plus écrire. Voir le guide « Prospecter dans les règles ».']] },
  ],
  sms: (sec, svc, d) => [
    { t: 'Après un appel sans réponse', l: [['m', `Bonjour, c'est {prenom}, de {societe}. J'ai essayé de vous joindre au sujet de ${svc.sujet}. J'ai une idée simple pour {entreprise} : ${d.ex}. Quand puis-je vous rappeler ?`]], tip: 'WhatsApp seulement si le numéro est affiché pour les clients. Un message, jamais trois d\'affilée.' },
    { t: 'Après un bon appel', l: [['m', `Merci pour l'échange, {contact} ! Comme promis : ${d.value}. Je passe {jour} ${sec.chez}. À bientôt, {prenom}`]] },
    { t: 'Confirmation du rendez-vous', l: [['m', `Bonjour {contact}, je confirme notre rendez-vous {jour} ${sec.chez} — vingt minutes, promis. Un empêchement ? Répondez simplement à ce message. {prenom}, {societe}`]] },
    { t: 'La veille', l: [['m', 'Petit rappel : on se voit demain, {jour}. À demain ! {prenom}']] },
  ],
  dm: (sec, svc, d) => [
    { t: 'Premier message', l: [['m', `Bonjour ! J'aime beaucoup ${sec.compliment} — on sent le soin dans chaque publication. Petite question : ${lc(d.q[0])}`]], tip: 'Interagissez d\'abord : aimez deux ou trois publications, répondez à une story. Jamais de lien dans le premier message.' },
    { t: 'Après sa réponse', l: [['m', `Merci pour votre réponse ! Je vous demandais ça parce que je travaille avec des ${sec.plural} sur ${svc.theme}. J'ai une idée pour {entreprise} : ${d.ex}. Je vous l'explique en deux minutes en vocal, ou je passe ${sec.chez} ?`]] },
    { t: 'Relance à J+4', l: [['m', 'Je reviens vers vous, sans insister : si ce n\'est pas le moment, aucun souci. L\'idée tient en deux minutes, quand vous voulez.']] },
  ],
  relance: (sec, svc, d) => [
    { t: 'Le rappel promis', l: [['v', `Bonjour {contact}, c'est {prenom}, de {societe}. On s'était parlé au sujet de ${svc.sujet} — vous m'aviez dit de vous rappeler aujourd'hui. Vous avez deux minutes ?`]], tip: 'Rappelez exactement à l\'heure dite : c\'est la première preuve de sérieux.' },
    { t: '« Envoyez-moi un e-mail » — J+2', l: [['m', `Bonjour {contact},\n\nComme convenu au téléphone, voici l'essentiel : ${d.value}.\n\nPar exemple, ${d.ex}.\n\nJe vous propose vingt minutes ${sec.creneau} pour vous montrer ce que ça donnerait pour {entreprise}. Qu'en dites-vous ?\n\n{prenom}\n{societe} · {tel}`]] },
    { t: 'Après le rendez-vous — J+1', l: [['m', 'Bonjour {contact},\n\nMerci pour votre accueil. Comme promis, voici la proposition pour {entreprise}. Je reste disponible pour en parler — un appel de dix minutes suffit souvent.\n\n{prenom}']] },
    { t: 'Après le devis — J+3', l: [['m', 'Bonjour {contact}, avez-vous eu le temps de regarder la proposition ? Y a-t-il un point que je peux préciser ? Je peux aussi adapter la formule si besoin. {prenom}']] },
    { t: 'Dernière relance — J+10', l: [['m', 'Bonjour {contact},\n\nSans nouvelles de votre part, j\'en conclus que ce n\'est pas le moment — aucun souci. Je clôture le dossier de mon côté ; si le sujet revient, vous savez où me trouver.\n\nBelle continuation à {entreprise} !\n{prenom}']], tip: 'Ce message de clôture obtient souvent le plus de réponses : il retire toute pression.' },
  ],
  rdv: (sec, svc, d) => [
    { t: 'La veille', l: [['n', 'Relisez la fiche et vos notes d\'appel. Préparez deux exemples proches de {entreprise}. Faites l\'audit express (Outils) et notez trois points concrets.'], ['m', 'Petit rappel : on se voit demain, {jour}. À demain ! {prenom}']] },
    { t: 'Ouverture — 2 min', l: [['v', 'Merci de me recevoir. Je vous propose de procéder ainsi : je vous pose quelques questions, je vous montre deux exemples, et on voit ensemble si ça a du sens pour vous. Vingt minutes, ça vous va ?']], tip: 'Annoncer le déroulé rassure, et vous donne la main.' },
    { t: 'Diagnostic — 8 min', l: [['v', d.q[0]], ['v', d.q[1]], ['v', 'Si on se revoit dans un an et que ce projet est une réussite, qu\'est-ce qui aura changé pour vous ?'], ['v', 'Qui d\'autre décide avec vous ?'], ['v', 'Vous aviez un budget en tête ?']], tip: 'Parlez 30 % du temps, écoutez 70 %.' },
    { t: 'Démonstration — 5 min', l: [['v', `Voilà à quoi ça pourrait ressembler pour {entreprise} : ${d.ex}.`], ['n', 'Reprenez les mots exacts notés pendant l\'appel : « Vous m\'avez dit que… »']] },
    { t: 'Proposition — 3 min', l: [['v', `Pour vous, je recommande ceci : ${d.value}. Le tarif : {montant}. {promesse}`]], tip: 'Annoncez le prix calmement, puis taisez-vous. Laissez la personne réagir la première.' },
    { t: 'Engagement — 2 min', l: [['v', 'Qu\'est-ce qui vous empêcherait de démarrer cette semaine ?'], ['v', 'On démarre avec un acompte, et je vous montre une première version rapidement. On bloque votre place dans le planning ?']], tip: 'Terminez toujours sur une prochaine étape datée, même si la réponse est « pas encore ».' },
  ],
  objections: (sec, svc, d) => objections(sec, svc.id, d).map((o) => ({ t: o.q, l: [['v', o.a]] })),
  closing: (sec, svc, d) => [
    { t: 'Récapituler', l: [['v', 'Si je résume bien : aujourd\'hui, {probleme}. Et ce qui compte pour vous, c\'est {objectif}. C\'est bien ça ?']], tip: 'Utilisez ses mots, pas les vôtres. Un « oui » ici rend la suite naturelle.' },
    { t: 'Trois options', l: [['v', 'Je vous propose trois formules : une pour démarrer simplement, celle que je vous recommande, et une plus complète. Je vous conseille celle du milieu, parce qu\'elle répond exactement à ce que vous m\'avez dit.']], tip: 'Présentez trois prix : celui du milieu paraît naturellement raisonnable.' },
    { t: 'Annoncer le prix', l: [['v', `Pour {entreprise}, c'est {montant}, tout compris : ${d.value}.`], ['n', 'Puis silence. Ne justifiez pas, ne baissez pas le prix de vous-même.']] },
    { t: 'Conclure', l: [['v', 'On démarre ? Je vous envoie le devis aujourd\'hui ; dès réception de l\'acompte, on bloque votre place dans le planning.'], ['v', '{promesse}']] },
    { t: 'Si la personne hésite', l: [['v', 'Qu\'est-ce qui vous fait hésiter exactement : le prix, le moment, ou autre chose ?'], ['n', 'Traitez l\'objection, puis reposez la question.'], ['v', 'Si on règle ce point, on peut démarrer ?']] },
  ],
};

const WITH_OBJ = ['appel', 'visite', 'rdv', 'closing'];

export function buildScript(svcId, chId, secId) {
  const sec = getSector(secId), svc = SERVICES[svcId], ch = CH[chId];
  if (!sec || !svc || !ch) return null;
  const d = sec[svcId];
  return {
    id: `${svcId}.${chId}.${secId}`, service: svcId, channel: chId, sector: secId,
    title: ch.label, sub: `${sec.name} · ${svc.short}`, icon: ch.icon,
    dur: ch.dur, goal: ch.goal, timing: ['appel', 'repondeur', 'visite'].includes(chId),
    steps: T[chId](sec, svc, d),
    objections: WITH_OBJ.includes(chId) ? objections(sec, svcId, d) : [],
  };
}

export const scriptCount = () => SERVICE_IDS.length * CHANNELS.length * allSectors().length;

// ---------- Variables ----------
export const VAR_LABELS = {
  prenom: 'votre prénom', societe: 'votre société', ville: 'ville', entreprise: 'entreprise', contact: 'prénom du contact',
  tel: 'votre numéro', jour: 'jour et heure', prix: 'votre prix', montant: 'montant', probleme: 'son problème', objectif: 'son objectif',
};
const VOWEL = /^[aeiouyhéèêëàâîïôöûüœ]/i;
const escHTML = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const typo = (s) => s
  .replace(/ ([:;?!»])/g, ' $1').replace(/« /g, '« ')
  .replace(/(\d) (h|€|%|min)(?![A-Za-zÀ-ÿ])/g, '$1 $2');

export function fill(text, ctx, html = true) {
  const src = html ? escHTML(text) : text;
  const out = src.replace(/\{(\w+)\}/g, (m, k) => {
    let v = ctx[k];
    if (k === 'de_ville') {
      const vi = ctx.ville;
      if (!vi) return html ? 'de <mark class="v v-empty">ville</mark>' : 'de [ville]';
      v = VOWEL.test(vi) ? `d'${vi}` : `de ${vi}`;
    }
    if (v) return html ? `<mark class="v">${escHTML(v)}</mark>` : v;
    if (k === 'promesse') return '';
    const label = VAR_LABELS[k] || k;
    return html ? `<mark class="v v-empty">${label}</mark>` : `[${label}]`;
  });
  return typo(out).replace(/ +\n/g, '\n').trim();
}

export function scriptToText(sc, ctx) {
  const who = { v: 'Vous', p: 'Prospect', n: '→', m: '', o: 'Objet' };
  const parts = [`${sc.title} — ${sc.sub}`, ''];
  for (const st of sc.steps) {
    parts.push(st.t.toUpperCase());
    for (const [w, t] of st.l) parts.push((who[w] ? who[w] + ' : ' : '') + fill(t, ctx, false));
    parts.push('');
  }
  if (sc.objections.length) {
    parts.push('OBJECTIONS');
    for (const o of sc.objections) parts.push(`« ${o.q} »\n${fill(o.a, ctx, false)}\n`);
  }
  return parts.join('\n').trim();
}
