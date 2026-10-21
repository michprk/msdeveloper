// Compte MindView (voir auth.js et cloud.js).
// - Mode en ligne : e-mail et mot de passe (ou Google / Apple), données synchronisées avec le compte,
//   abonnement payé et géré chez Stripe.
// - Mode local : pas de compte ; seul un mot de passe créé avec la 1.9 est encore montré (le retirer, se déconnecter).
import { S, update } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, confirmSheet, field, input, busy, ago } from '../ui.js';
import { hasLock, lockNow } from '../lock.js';
import { cloudReady, cloudUser, cloudMock, refreshSubscription, checkout, cloudMessage, providers, signInWithProvider, resendConfirmation } from '../cloud.js';
import { hasAccount, loggedIn, createAccount, login, logout, forgot, validEmail, passwordIssue, authMode, removePassword, changePassword } from '../auth.js';
import { syncStatus, syncNow } from '../sync.js';
import { t as tr, tv } from '../strings.js';

// Champ mot de passe avec « Afficher »
export const pwField = (label, name = 'password', attrs = '') => field(label, `<span class="pw">${input(name, '', `type="password" ${attrs}`)}<button type="button" class="pw-eye" data-act="pw-eye" aria-label="Afficher le mot de passe">${ic('eye')}</button></span>`);

// « Continuer avec Google / Apple » (seulement les fournisseurs ouverts dans config.js)
const LOGOS = {
  google: '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>',
  apple: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.1 2.5-1.8 3.1-.5 7.6 1.3 10.1.8 1.2 1.8 2.6 3.1 2.5 1.3-.1 1.7-.8 3.3-.8 1.5 0 1.9.8 3.3.8 1.4 0 2.2-1.2 3-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-3.9zM14 5.2c.7-.8 1.1-2 1-3.2-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3.1 1.1.1 2.2-.6 2.9-1.4z"/></svg>',
};
const PNAME = { google: 'Google', apple: 'Apple' };
export function providerButtons(cls = '') {
  const list = providers();
  if (!list.length) return '';
  return `<div class="oauth ${cls}">${list.map((p) => `<button type="button" class="btn btn-oauth" data-act="oauth" data-p="${p}">${LOGOS[p]}<span>Continuer avec ${PNAME[p]}</span></button>`).join('')}<p class="oauth-or"><span>ou avec ton e-mail</span></p></div>`;
}

let flow = { then: '', mode: 'new' };
export function accountSheet({ then = '', mode = '' } = {}) {
  flow = { then, mode: mode || (hasAccount() ? 'in' : 'new') };
  const isNew = flow.mode === 'new';
  const email = S().account?.email || S().profile.email || '';
  sheet(`${sheetHead(then ? (isNew ? tv('Crée ton compte pour continuer', 'Créez votre compte pour continuer') : tv('Connecte-toi pour continuer', 'Connectez-vous pour continuer')) : isNew ? 'Créer mon compte' : 'Se connecter', tv('Ton e-mail et un mot de passe', 'Votre e-mail et un mot de passe'))}
    <form class="sheet-body form" data-form="acc-pw" novalidate>
      <div class="seg acc-seg" role="tablist"><button type="button" class="seg-i ${isNew ? 'is-on' : ''}" data-act="acc-mode" data-m="new">Créer un compte</button><button type="button" class="seg-i ${isNew ? '' : 'is-on'}" data-act="acc-mode" data-m="in">Se connecter</button></div>
      ${providerButtons()}
      ${isNew && !S().profile.prenom ? field('Prénom', input('prenom', '', 'autocomplete="given-name" required')) : ''}
      ${field('Adresse e-mail', input('email', email, 'type="email" inputmode="email" autocomplete="email" required placeholder="prenom@exemple.be"'))}
      ${pwField('Mot de passe', 'password', `autocomplete="${isNew ? 'new-password' : 'current-password'}" required`)}
      ${isNew ? '<p class="field-h acc-pw-h">8 caractères minimum, avec un chiffre ou un signe.</p>' : '<button type="button" class="link acc-forgot" data-act="login-forgot">Mot de passe oublié ?</button>'}
      <p class="co-err" role="alert" hidden></p>
      <button class="btn btn-primary btn-block" type="submit">${isNew ? 'Créer mon compte' : 'Me connecter'}</button>
      <p class="sheet-note">${cloudReady() ? tr('acc.sheet.online') : 'Le compte est enregistré sur cet appareil. Le mot de passe n\'y est jamais gardé en clair : seulement une empreinte chiffrée.'}${isNew && cloudReady() ? ` ${tr('acc.age')}` : ''}</p>
    </form>`, { cls: 'sheet-sm' });
}
const showErr = (f, m) => { const box = f.querySelector('.co-err'); box.textContent = m; box.hidden = false; };

// Nouveau mot de passe : après un lien « mot de passe oublié » (recovery), ou depuis Compte
export function newPasswordSheet(recovery = false) {
  sheet(`${sheetHead(recovery ? tv('Choisis un nouveau mot de passe', 'Choisissez un nouveau mot de passe') : 'Changer mon mot de passe')}
    <form class="sheet-body form" data-form="acc-newpw" novalidate>
      ${recovery ? `<p class="sheet-p">${tv('Tu es connecté grâce au lien reçu par e-mail. Choisis maintenant ton nouveau mot de passe.', 'Vous êtes connecté grâce au lien reçu par e-mail. Choisissez maintenant votre nouveau mot de passe.')}</p>` : ''}
      <input type="email" name="username" autocomplete="username" value="${esc(S().account?.email || '')}" hidden>
      ${pwField('Nouveau mot de passe', 'password', 'autocomplete="new-password" required')}
      <p class="field-h">8 caractères minimum, avec un chiffre ou un signe.</p>
      <p class="co-err" role="alert" hidden></p>
      <button class="btn btn-primary btn-block" type="submit">Enregistrer le mot de passe</button>
    </form>`, { cls: 'sheet-sm' });
}

// Carte « Compte » de la page Compte et réglages
export function accountCard() {
  const acc = S().account;
  const on = hasAccount() && loggedIn();
  // Mode local (1.14) : pas de compte à créer. Seul un mot de passe créé avec la 1.9 est montré.
  if (authMode() === 'local') {
    if (!acc?.kdf) return '';
    return `<section class="card rise" id="compte-en-ligne">
      <header class="card-h"><div><h2>${tr('acc.pw.t')}</h2><p>${esc(acc.email)}</p></div><span class="chip t-olive">${ic('lock')}Protégé</span></header>
      <p class="field-h">${tr('acc.pw.p')}</p>
      <div class="act-row"><button class="btn btn-ghost" data-act="auth-out">${ic('logout')}<span>Me déconnecter</span></button><button class="btn btn-ghost" data-act="acc-pw-remove">${ic('x')}<span>Retirer le mot de passe</span></button></div>
    </section>`;
  }
  const share = `<div class="ios-list"><label class="ios-row"><span><b>Partager deux mesures d'usage</b><em>${tr('acc.share')}</em></span><input type="checkbox" class="switch" ${S().prefs.share !== false ? 'checked' : ''} data-act-change="acc-share"></label></div>`;
  // Adresse pas encore confirmée : on continue sur cet appareil en attendant le lien
  if (acc?.pending && !on) {
    return `<section class="card rise" id="compte-en-ligne">
      <header class="card-h"><div><h2>Mon compte</h2><p>${esc(acc.email)}</p></div><span class="chip t-sand">${ic('mail')}À confirmer</span></header>
      <p class="field-h">${tr('acc.pending', { email: esc(acc.email) })}</p>
      <div class="act-row"><button class="btn btn-primary" data-act="acc-resend">${ic('mail')}<span>Renvoyer l'e-mail</span></button><button class="btn btn-ghost" data-act="acc-open" data-m="in">${ic('user')}<span>J'ai confirmé · Me connecter</span></button></div>
    </section>`;
  }
  const via = acc?.provider && PNAME[acc.provider] ? ` · avec ${PNAME[acc.provider]}` : '';
  return `<section class="card rise" id="compte-en-ligne">
    <header class="card-h"><div><h2>Mon compte</h2><p>${on ? `Connecté : ${esc(acc.email)}${via}` : tr('acc.none')}</p></div><span class="chip ${on ? 't-olive' : ''}">${ic(on ? 'check' : 'user')}${on ? 'Connecté' : 'Pas de compte'}</span></header>
    ${on ? `<div class="act-row"><button class="btn btn-ghost" data-act="acc-refresh">${ic('refresh')}<span>Mettre à jour mon abonnement</span></button>${acc?.provider && acc.provider !== 'email' ? '' : `<button class="btn btn-ghost" data-act="acc-newpw">${ic('lock')}<span>Changer mon mot de passe</span></button>`}<button class="btn btn-ghost" data-act="auth-out">${ic('logout')}<span>Me déconnecter</span></button></div>`
      : `<div class="act-row"><button class="btn btn-primary" data-act="acc-open" data-m="new">${ic('user')}<span>Créer mon compte</span></button><button class="btn btn-ghost" data-act="acc-open" data-m="in">${ic('logout')}<span>Me connecter</span></button></div>`}
    ${share}
  </section>`;
}

// État de la synchronisation (Compte → Données), mis à jour sans redessiner la page
export function syncLine() {
  const st = syncStatus();
  if (!st.active) return '';
  const txt = st.busy ? 'Synchronisation…' : st.error ? esc(st.error) : st.pending ? tv('Changements en attente d\'envoi.', 'Changements en attente d\'envoi.') : st.at ? `Synchronisé ${esc(ago(st.at))}` : 'Pas encore synchronisé.';
  return `<span class="${st.error ? 'is-err' : st.busy ? 'is-busy' : 'is-ok'}">${ic(st.error ? 'x' : st.busy ? 'refresh' : 'checkCircle')}<span>${txt}</span></span>`;
}
window.addEventListener('ms:sync', () => { const el = document.getElementById('sync-st'); if (el) el.innerHTML = syncLine(); });

// Serveur factice : les e-mails (confirmation, mot de passe oublié) s'ouvrent depuis une notification
window.addEventListener('ms:mock-mail', (e) => {
  const { subject, link } = e.detail || {};
  toast(`E-mail factice : « ${esc(subject)} »`, { title: 'Boîte de réception', ms: 15000, action: 'Ouvrir le lien', onAction: () => { history.replaceState(null, '', link); location.reload(); } });
});

register({
  'acc-open': (b) => accountSheet({ mode: b?.dataset?.m || '' }),
  'acc-mode': (b) => accountSheet({ then: flow.then, mode: b.dataset.m }),
  oauth: async (b) => {
    try { await busy(b, 'Ouverture…', () => signInWithProvider(b.dataset.p)); }
    catch (e) { toast(cloudMessage(e), { title: 'Connexion impossible' }); }
  },
  'pw-eye': (b) => {
    const inp = b.parentElement.querySelector('input');
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    b.classList.toggle('is-on', show);
    b.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
  },
  'acc-refresh': async (b) => {
    try { await busy(b, 'Mise à jour…', () => refreshSubscription()); toast(tv('Ton abonnement est à jour.', 'Votre abonnement est à jour.')); }
    catch (e) { toast(cloudMessage(e), { title: 'Mise à jour impossible' }); }
  },
  'acc-newpw': () => newPasswordSheet(false),
  'acc-resend': async (b) => {
    try { await busy(b, 'Envoi…', () => resendConfirmation(S().account?.email || '')); toast(tr('acc.resent'), { title: 'E-mail envoyé', ms: 4000 }); }
    catch (e) { toast(cloudMessage(e), { title: 'Envoi impossible' }); }
  },
  'sync-now': async (b) => {
    try { await busy(b, 'Synchronisation…', () => syncNow()); toast(tv('Tout est à jour.', 'Tout est à jour.'), { ms: 1800 }); }
    catch (e) { toast(cloudMessage(e), { title: 'Synchronisation impossible', ms: 5000 }); }
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
  'acc-newpw': async (d, f) => {
    if (passwordIssue(d.password)) { showErr(f, `Mot de passe trop court ou trop simple : ${passwordIssue(d.password).toLowerCase()}`); return; }
    try {
      await busy(f.querySelector('[type=submit]'), 'Enregistrement…', () => changePassword(null, d.password));
      closeSheet();
      toast(tv('Ton nouveau mot de passe est enregistré.', 'Votre nouveau mot de passe est enregistré.'), { title: 'Mot de passe changé' });
    } catch (e) { showErr(f, cloudMessage(e)); }
  },
  'acc-pw': async (d, f) => {
    const email = (d.email || '').trim().toLowerCase();
    if (flow.mode === 'new' && f.elements.prenom && !d.prenom?.trim()) { showErr(f, tr('ob.err.name')); return; }
    if (!validEmail(email)) { showErr(f, tr('ob.err.email')); return; }
    if (flow.mode === 'new' && passwordIssue(d.password)) { showErr(f, `Mot de passe trop court ou trop simple : ${passwordIssue(d.password).toLowerCase()}`); return; }
    if (!d.password) { showErr(f, tr('login.err.pw')); return; }
    const btn = f.querySelector('[type=submit]');
    try {
      let pending = false;
      if (flow.mode === 'new') pending = (await busy(btn, 'Création du compte…', () => createAccount({ email, password: d.password, prenom: d.prenom?.trim() })))?.pending;
      else if (!await busy(btn, 'Connexion…', () => login(email, d.password))) { showErr(f, hasAccount() ? 'E-mail ou mot de passe incorrect.' : tr('login.err.none')); return; }
      closeSheet();
      if (pending) { toast(tr('acc.confirm', { email: esc(email) }), { title: 'Presque fini', ms: 6000 }); return; }
      if (flow.then) { toast('Redirection vers le paiement sécurisé…', { title: 'Compte prêt' }); await checkout(flow.then); }
      else toast(flow.mode === 'new' ? tr('acc.created') : `Connecté avec ${esc(email)}.`, { title: flow.mode === 'new' ? 'Compte créé' : 'Bon retour' });
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
  if (cloudReady() && !validEmail(email || S().account?.email)) { toast(tr('login.err.email'), { title: 'Mot de passe oublié' }); return; }
  let r;
  try { r = await busy(btn, 'Envoi…', () => forgot(email || S().account?.email || '')); }
  catch (e) { toast(cloudMessage(e), { title: 'Envoi impossible' }); return; }
  if (r === 'mail') { toast(tr('acc.forgotSent'), { title: 'E-mail envoyé', ms: 5000 }); return; }
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
    const online = !!cloudUser();
    if (!await confirmSheet({ title: 'Se déconnecter ?', text: tr(online ? 'acc.out.online' : 'acc.out'), ok: 'Se déconnecter' })) return;
    try { await logout(); }
    catch (e) {
      if (e.code !== 'unsynced') { toast(cloudMessage(e), { title: 'Déconnexion impossible' }); return; }
      if (!await confirmSheet({ title: 'Changements pas encore envoyés', text: tr('acc.out.unsynced'), ok: 'Me déconnecter quand même', danger: true })) return;
      await logout({ force: true });
    }
    location.hash = '#/connexion';
    toast('À bientôt.', { title: 'Déconnecté' });
  },
  'login-forgot': (b) => forgotFlow(b.closest('form')?.elements.email?.value?.trim(), b),
  'close-sheet-go': (b) => { closeSheet(); location.hash = b.dataset.h; },
});
export { cloudMock };
