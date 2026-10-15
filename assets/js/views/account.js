// Compte en ligne : connexion par e-mail et code à 6 chiffres (sans mot de passe).
// Il sert à payer et gérer l'abonnement ; les tâches, notes et fiches restent sur l'appareil.
import { S, update } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, confirmSheet, field, input, busy } from '../ui.js';
import { hasLock, lockNow } from '../lock.js';
import { cloudReady, cloudUser, sendCode, verifyCode, signOut, refreshSubscription, checkout, cloudMessage } from '../cloud.js';

let flow = { email: '', then: '' };
export function accountSheet({ then = '' } = {}) {
  flow = { email: flow.email, then };
  sheet(`${sheetHead(then ? 'Créez votre compte pour payer' : 'Votre compte MindView', 'Un code arrive par e-mail : pas de mot de passe à retenir')}
    <form class="sheet-body form" data-form="acc-email" data-validate novalidate>
      ${field('Adresse e-mail', input('email', flow.email || S().profile.email || '', 'type="email" inputmode="email" autocomplete="email" required autofocus placeholder="vous@exemple.be"'))}
      <p class="co-err" role="alert" hidden></p>
      <button class="btn btn-primary btn-block" type="submit" data-needs="email" ${flow.email || S().profile.email ? '' : 'disabled'}>Recevoir mon code</button>
      <p class="sheet-note">Le compte sert à payer et gérer votre abonnement. Vos tâches, notes et fiches restent sur cet appareil. Détails dans Compte → Confidentialité.</p>
    </form>`, { cls: 'sheet-sm' });
}
function codeSheet() {
  sheet(`${sheetHead('Entrez le code reçu', `Envoyé à ${esc(flow.email)}`)}
    <form class="sheet-body form" data-form="acc-code" data-validate novalidate>
      ${field('Code à 6 chiffres', '<input class="inp code-inp" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required autofocus>')}
      <p class="co-err" role="alert" hidden></p>
      <button class="btn btn-primary btn-block" type="submit" data-needs="code" disabled>Me connecter</button>
      <button type="button" class="link center" data-act="acc-resend">Renvoyer un code</button>
    </form>`, { cls: 'sheet-sm' });
}
const showErr = (f, e) => { const box = f.querySelector('.co-err'); box.textContent = cloudMessage(e); box.hidden = false; };

// Carte « Compte en ligne » de la page Compte (affichée quand les comptes sont ouverts)
export function accountCard() {
  if (!cloudReady()) return '';
  const u = cloudUser();
  return `<section class="card rise" id="compte-en-ligne">
    <header class="card-h"><div><h2>Compte en ligne</h2><p>${u ? `Connecté : ${esc(u.email || '')}` : 'Pour payer et gérer votre abonnement'}</p></div><span class="chip ${u ? 't-olive' : ''}">${ic(u ? 'check' : 'user')}${u ? 'Connecté' : 'Non connecté'}</span></header>
    ${u ? `<div class="act-row"><button class="btn btn-ghost" data-act="acc-refresh">${ic('refresh')}<span>Mettre à jour mon abonnement</span></button><button class="btn btn-ghost" data-act="acc-out">Me déconnecter</button></div>`
      : `<button class="btn btn-primary" data-act="acc-open">${ic('user')}<span>Créer mon compte ou me connecter</span></button>`}
    <div class="ios-list"><label class="ios-row"><span><b>Partager deux mesures d'usage</b><em>« Ouvert aujourd'hui » et « première prise en main ». Jamais le contenu de vos tâches, notes ou fiches.</em></span><input type="checkbox" class="switch" ${S().prefs.share !== false ? 'checked' : ''} data-act-change="acc-share"></label></div>
  </section>`;
}

register({
  'acc-open': () => accountSheet(),
  'acc-resend': async (b) => {
    try { await busy(b, 'Envoi…', () => sendCode(flow.email)); toast('Un nouveau code est parti.', { title: 'Code envoyé' }); }
    catch (e) { showErr(b.closest('form'), e); }
  },
  'acc-out': async (b) => { await busy(b, 'Déconnexion…', () => signOut()); toast('Votre abonnement reste actif ; reconnectez-vous pour le gérer.', { title: 'Déconnecté' }); },
  'acc-refresh': async (b) => {
    try { await busy(b, 'Mise à jour…', () => refreshSubscription()); toast('Votre abonnement est à jour.'); }
    catch (e) { toast(cloudMessage(e), { title: 'Mise à jour impossible' }); }
  },
  'acc-share': (el) => { update((s) => { s.prefs.share = el.checked; }); toast(el.checked ? 'Merci : ces deux mesures nous aident à améliorer MindView.' : 'Aucune mesure ne sera envoyée.', { ms: 2200 }); },
}, {
  'acc-email': async (d, f) => {
    const email = (d.email || '').trim().toLowerCase();
    if (!email) return;
    const btn = f.querySelector('[type=submit]');
    try { await busy(btn, 'Envoi du code…', () => sendCode(email)); flow.email = email; codeSheet(); }
    catch (e) { showErr(f, e); }
  },
  'acc-code': async (d, f) => {
    const code = (d.code || '').replace(/\D/g, '');
    if (code.length !== 6) return;
    const btn = f.querySelector('[type=submit]');
    try {
      await busy(btn, 'Connexion…', () => verifyCode(flow.email, code));
      closeSheet();
      if (flow.then) { toast('Redirection vers le paiement sécurisé…', { title: 'Compte créé' }); await checkout(flow.then); }
      else toast(`Connecté avec ${esc(flow.email)}.`, { title: 'Compte en ligne' });
    } catch (e) { showErr(f, e); }
  },
});

// Se connecter / se déconnecter, partout dans l'application (barre latérale, Compte)
export function authButton(cls = '') {
  const u = cloudUser();
  if (u) return `<button class="${cls}" data-act="auth-out">${ic('logout')}<span>Se déconnecter</span></button>`;
  if (!cloudReady() && hasLock()) return `<button class="${cls}" data-act="auth-lock">${ic('lock')}<span>Verrouiller la session</span></button>`;
  return `<button class="${cls}" data-act="auth-in">${ic('user')}<span>Se connecter</span></button>`;
}
function offlineSheet() {
  sheet(`${sheetHead('Se connecter', 'Votre compte MindView')}
    <div class="sheet-body">
      <p class="sheet-p">Les comptes en ligne ouvrent avec l'abonnement : ils servent à retrouver votre abonnement sur tous vos appareils. Aujourd'hui, vos tâches, notes et tableaux restent sur cet appareil, sans mot de passe à retenir.</p>
      <p class="sheet-p">Pour protéger l'application et pouvoir « fermer » votre session, activez un code à quatre chiffres : il sera demandé à chaque ouverture.</p>
      <div class="btn-list"><a class="btn btn-primary" href="#/reglages?s=securite" data-act="close-sheet-go" data-h="#/reglages?s=securite">${ic('lock')}<span>Activer un code de verrouillage</span></a>
      <button class="btn btn-ghost" data-act="backup">${ic('download')}<span>Télécharger une sauvegarde</span></button></div>
    </div>`, { cls: 'sheet-sm' });
}
register({
  'auth-in': () => (cloudReady() ? accountSheet() : offlineSheet()),
  'auth-lock': () => lockNow(),
  'auth-out': async () => {
    if (!await confirmSheet({ title: 'Se déconnecter ?', text: 'Votre abonnement reste actif. Vos données restent sur cet appareil ; reconnectez-vous pour gérer l\'abonnement.', ok: 'Se déconnecter' })) return;
    await signOut();
    toast('Vous êtes déconnecté.', { title: 'Compte en ligne' });
  },
  'close-sheet-go': (b) => { closeSheet(); location.hash = b.dataset.h; },
});
