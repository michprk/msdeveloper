// Compte MindView : e-mail et mot de passe (voir auth.js).
// Il protège l'accès à l'application et, quand les comptes en ligne sont ouverts, sert à payer et gérer l'abonnement.
// Les tâches, notes et fiches restent sur l'appareil.
import { S, update } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, confirmSheet, field, input, busy } from '../ui.js';
import { hasLock, lockNow } from '../lock.js';
import { cloudReady, cloudUser, refreshSubscription, checkout, cloudMessage } from '../cloud.js';
import { hasAccount, loggedIn, createAccount, login, logout, forgot, validEmail, passwordIssue, authMode, removePassword } from '../auth.js';
import { t as tr } from '../strings.js';

// Champ mot de passe avec « Afficher »
export const pwField = (label, name = 'password', attrs = '') => field(label, `<span class="pw">${input(name, '', `type="password" ${attrs}`)}<button type="button" class="pw-eye" data-act="pw-eye" aria-label="Afficher le mot de passe">${ic('eye')}</button></span>`);

let flow = { then: '', mode: 'new' };
export function accountSheet({ then = '', mode = '' } = {}) {
  flow = { then, mode: mode || (hasAccount() ? 'in' : 'new') };
  const isNew = flow.mode === 'new';
  const email = S().account?.email || S().profile.email || '';
  sheet(`${sheetHead(then ? (isNew ? 'Créez votre compte pour continuer' : 'Connectez-vous pour continuer') : isNew ? 'Créer mon compte' : 'Se connecter', 'Votre e-mail et un mot de passe')}
    <form class="sheet-body form" data-form="acc-pw" novalidate>
      <div class="seg acc-seg" role="tablist"><button type="button" class="seg-i ${isNew ? 'is-on' : ''}" data-act="acc-mode" data-m="new">Créer un compte</button><button type="button" class="seg-i ${isNew ? '' : 'is-on'}" data-act="acc-mode" data-m="in">Se connecter</button></div>
      ${isNew && !S().profile.prenom ? field('Prénom', input('prenom', '', 'autocomplete="given-name" required')) : ''}
      ${field('Adresse e-mail', input('email', email, 'type="email" inputmode="email" autocomplete="email" required placeholder="vous@exemple.be"'))}
      ${pwField('Mot de passe', 'password', `autocomplete="${isNew ? 'new-password' : 'current-password'}" required`)}
      ${isNew ? '<p class="field-h acc-pw-h">8 caractères minimum, avec un chiffre ou un signe.</p>' : '<button type="button" class="link acc-forgot" data-act="login-forgot">Mot de passe oublié ?</button>'}
      <p class="co-err" role="alert" hidden></p>
      <button class="btn btn-primary btn-block" type="submit">${isNew ? 'Créer mon compte' : 'Me connecter'}</button>
      <p class="sheet-note">${cloudReady() ? 'Le mot de passe est vérifié par notre serveur et n\'est jamais enregistré en clair.' : 'Le compte est enregistré sur cet appareil. Le mot de passe n\'y est jamais gardé en clair : seulement une empreinte chiffrée.'} Vos tâches, notes et fiches restent sur cet appareil.</p>
    </form>`, { cls: 'sheet-sm' });
}
const showErr = (f, m) => { const box = f.querySelector('.co-err'); box.textContent = m; box.hidden = false; };

// Carte « Compte » de la page Compte et réglages
// Mode local (1.14) : pas de compte à créer. Seul un mot de passe créé avec une ancienne version (1.9) est montré,
// avec « Se déconnecter » et « Retirer le mot de passe ».
export function accountCard() {
  const acc = S().account;
  const on = hasAccount() && loggedIn();
  if (authMode() === 'local') {
    if (!acc?.kdf) return '';
    return `<section class="card rise" id="compte-en-ligne">
      <header class="card-h"><div><h2>${tr('acc.pw.t')}</h2><p>${esc(acc.email)}</p></div><span class="chip t-olive">${ic('lock')}Protégé</span></header>
      <p class="field-h">${tr('acc.pw.p')}</p>
      <div class="act-row"><button class="btn btn-ghost" data-act="auth-out">${ic('logout')}<span>Me déconnecter</span></button><button class="btn btn-ghost" data-act="acc-pw-remove">${ic('x')}<span>Retirer le mot de passe</span></button></div>
    </section>`;
  }
  return `<section class="card rise" id="compte-en-ligne">
    <header class="card-h"><div><h2>Mon compte</h2><p>${on ? `Connecté : ${esc(acc.email)}` : acc?.email ? `${esc(acc.email)} · ajoutez un mot de passe pour pouvoir vous connecter` : 'E-mail et mot de passe, pour vous connecter'}</p></div><span class="chip ${on ? 't-olive' : ''}">${ic(on ? 'check' : 'user')}${on ? 'Connecté' : 'Pas de mot de passe'}</span></header>
    ${on ? `<div class="act-row">${cloudUser() ? `<button class="btn btn-ghost" data-act="acc-refresh">${ic('refresh')}<span>Mettre à jour mon abonnement</span></button>` : ''}<button class="btn btn-ghost" data-act="auth-out">${ic('logout')}<span>Me déconnecter</span></button></div>`
      : `<button class="btn btn-primary" data-act="acc-open">${ic('user')}<span>${acc?.email ? 'Ajouter un mot de passe' : 'Créer mon compte'}</span></button>`}
    ${cloudReady() ? `<div class="ios-list"><label class="ios-row"><span><b>Partager deux mesures d'usage</b><em>« Ouvert aujourd'hui » et « première prise en main ». Jamais le contenu de vos tâches, notes ou fiches.</em></span><input type="checkbox" class="switch" ${S().prefs.share !== false ? 'checked' : ''} data-act-change="acc-share"></label></div>` : ''}
  </section>`;
}

register({
  'acc-open': () => accountSheet(),
  'acc-mode': (b) => accountSheet({ then: flow.then, mode: b.dataset.m }),
  'pw-eye': (b) => {
    const inp = b.parentElement.querySelector('input');
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    b.classList.toggle('is-on', show);
    b.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
  },
  'acc-refresh': async (b) => {
    try { await busy(b, 'Mise à jour…', () => refreshSubscription()); toast('Votre abonnement est à jour.'); }
    catch (e) { toast(cloudMessage(e), { title: 'Mise à jour impossible' }); }
  },
  'acc-pw-remove': () => {
    sheet(`${sheetHead('Retirer le mot de passe')}
      <form class="sheet-body form" data-form="acc-pw-remove" novalidate>
        <p class="sheet-p">${tr('acc.pw.removeP')}</p>
        ${pwField('Mot de passe actuel', 'password', 'autocomplete="current-password" required')}
        <p class="co-err" role="alert" hidden></p>
        <button class="btn btn-primary btn-block" type="submit">Retirer le mot de passe</button>
      </form>`, { cls: 'sheet-sm' });
  },
  'acc-share': (el) => { update((s) => { s.prefs.share = el.checked; }); toast(el.checked ? 'Merci : ces deux mesures nous aident à améliorer MindView.' : 'Aucune mesure ne sera envoyée.', { ms: 2200 }); },
}, {
  'acc-pw-remove': async (d, f) => {
    if (!d.password) { showErr(f, tr('login.err.pw')); return; }
    const ok = await busy(f.querySelector('[type=submit]'), 'Vérification…', () => removePassword(d.password));
    if (!ok) { showErr(f, 'Ce n\'est pas le bon mot de passe.'); return; }
    closeSheet();
    toast(tr('acc.pw.removed'), { title: 'Mot de passe retiré' });
  },
  'acc-pw': async (d, f) => {
    const email = (d.email || '').trim().toLowerCase();
    if (flow.mode === 'new' && f.elements.prenom && !d.prenom?.trim()) { showErr(f, 'Indiquez votre prénom.'); return; }
    if (!validEmail(email)) { showErr(f, 'Cette adresse e-mail ne semble pas complète (exemple : prenom@gmail.com).'); return; }
    if (flow.mode === 'new' && passwordIssue(d.password)) { showErr(f, `Mot de passe trop court ou trop simple : ${passwordIssue(d.password).toLowerCase()}`); return; }
    if (!d.password) { showErr(f, 'Entrez votre mot de passe.'); return; }
    const btn = f.querySelector('[type=submit]');
    try {
      if (flow.mode === 'new') await busy(btn, 'Création du compte…', () => createAccount({ email, password: d.password, prenom: d.prenom?.trim() }));
      else if (!await busy(btn, 'Connexion…', () => login(email, d.password))) { showErr(f, hasAccount() ? 'E-mail ou mot de passe incorrect.' : 'Aucun compte sur cet appareil avec cette adresse. Créez votre compte, ou restaurez une sauvegarde.'); return; }
      closeSheet();
      if (flow.then) { toast('Redirection vers le paiement sécurisé…', { title: 'Compte prêt' }); await checkout(flow.then); }
      else toast(flow.mode === 'new' ? `Vous vous connecterez avec ${esc(email)} et votre mot de passe.` : `Connecté avec ${esc(email)}.`, { title: flow.mode === 'new' ? 'Compte créé' : 'Bon retour' });
    } catch (e) { showErr(f, cloudMessage(e)); }
  },
});

// Se connecter / se déconnecter, partout dans l'application (barre latérale, Compte)
export function authButton(cls = '') {
  if ((hasAccount() && loggedIn()) || cloudUser()) return `<button class="${cls}" data-act="auth-out">${ic('logout')}<span>Se déconnecter</span></button>`;
  if (hasLock()) return `<button class="${cls}" data-act="auth-lock">${ic('lock')}<span>Verrouiller la session</span></button>`;
  // Mode local : pas de compte à créer ; le geste utile est la sauvegarde
  if (authMode() === 'local') return `<button class="${cls}" data-act="backup">${ic('download')}<span>Sauvegarder mes données</span></button>`;
  return `<button class="${cls}" data-act="auth-in">${ic('user')}<span>${S().account?.email ? 'Me connecter' : 'Créer mon compte'}</span></button>`;
}
// Mot de passe oublié : par e-mail pour un compte en ligne ; sur l'appareil, il ne peut pas être retrouvé.
export async function forgotFlow(email, btn) {
  const r = await busy(btn, 'Envoi…', () => forgot(email || S().account?.email || ''));
  if (r === 'mail') { toast('Un lien pour choisir un nouveau mot de passe arrive par e-mail.', { title: 'E-mail envoyé', ms: 4000 }); return; }
  sheet(`${sheetHead('Mot de passe oublié')}<div class="sheet-body">
    <p class="sheet-p">Le mot de passe d'un compte enregistré sur cet appareil n'est gardé nulle part : personne ne peut le retrouver, pas même M&amp;S Design.</p>
    <p class="sheet-p">Deux solutions : restaurer une sauvegarde (votre mot de passe sera celui de la sauvegarde), ou effacer cet appareil et recommencer.</p>
    <div class="btn-list"><label class="btn btn-primary">${ic('upload')}<span>Restaurer une sauvegarde</span><input type="file" accept="application/json,.json" hidden data-act-change="restore"></label>
    <button class="btn btn-ghost" data-act="login-wipe">${ic('trash')}<span>Effacer les données de cet appareil</span></button></div>
  </div>`, { cls: 'sheet-sm' });
}
register({
  'auth-in': () => accountSheet(),
  'auth-lock': () => lockNow(),
  'auth-out': async () => {
    if (!await confirmSheet({ title: 'Se déconnecter ?', text: tr('acc.out'), ok: 'Se déconnecter' })) return;
    await logout();
    location.hash = '#/connexion';
    toast('À bientôt.', { title: 'Déconnecté' });
  },
  'login-forgot': (b) => forgotFlow(b.closest('form')?.elements.email?.value?.trim(), b),
  'close-sheet-go': (b) => { closeSheet(); location.hash = b.dataset.h; },
});
