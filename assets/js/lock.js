// Code de verrouillage (4 chiffres), façon iPhone.
// Il protège l'accès à l'écran sur cet appareil ; il ne chiffre pas les données
// et ne peut pas être récupéré (pas de compte en ligne pour l'instant).
import { S, update, resetState } from './store.js';
import { logoMark } from './icons.js';

const KEY = 'msdev:unlocked';
const enc = new TextEncoder();
async function hash(code, salt) {
  const b = await crypto.subtle.digest('SHA-256', enc.encode(`${salt}:${code}`));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export const hasLock = () => !!S().lock?.hash;
export const lockSupported = () => !!(window.crypto && crypto.subtle);
export async function setLock(code) {
  const salt = Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-');
  const h = await hash(code, salt);
  update((s) => { s.lock = { salt, hash: h, auto: s.lock?.auto ?? true }; }, { silent: true });
  unlockSession();
}
export async function checkCode(code) { const l = S().lock; return !!l && (await hash(code, l.salt)) === l.hash; }
export const clearLock = () => update((s) => { s.lock = null; }, { silent: true });
export const unlockSession = () => { try { sessionStorage.setItem(KEY, String(Date.now())); } catch (e) { /* rien */ } };
const isUnlocked = () => { try { return !!sessionStorage.getItem(KEY); } catch (e) { return false; } };

export function lockNow() { try { sessionStorage.removeItem(KEY); } catch (e) { /* rien */ } showLock(); }

function showLock() {
  if (document.querySelector('.lock')) return;
  const el = document.createElement('div');
  el.className = 'lock';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Application verrouillée');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  el.innerHTML = `<div class="lock-in">
      ${logoMark('lg')}
      <p class="lock-t">Entrez votre code</p>
      <div class="lock-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <p class="lock-msg" role="alert" aria-live="assertive"></p>
      <div class="lock-pad">${keys.map((k) => (k ? `<button class="lock-k ${k === 'del' ? 'is-del' : ''}" data-k="${k}" aria-label="${k === 'del' ? 'Effacer' : k}">${k === 'del' ? 'Effacer' : k}</button>` : '<span></span>')).join('')}</div>
      <button class="lock-forgot">Code oublié ?</button>
    </div>`;
  document.body.append(el);
  document.body.classList.add('is-locked');
  let code = '';
  const dots = el.querySelectorAll('.lock-dots i');
  const msg = el.querySelector('.lock-msg');
  const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < code.length));
  const done = () => { unlockSession(); el.classList.add('out'); document.removeEventListener('keydown', onKey); setTimeout(() => { el.remove(); document.body.classList.remove('is-locked'); }, 300); };
  const press = async (k) => {
    if (k === 'del') code = code.slice(0, -1); else if (code.length < 4) code += k;
    paint();
    if (code.length === 4) {
      if (await checkCode(code)) done();
      else { el.classList.add('shake'); msg.textContent = 'Code incorrect. Réessayez.'; setTimeout(() => { el.classList.remove('shake'); code = ''; paint(); }, 450); }
    }
  };
  el.querySelectorAll('.lock-k').forEach((b) => b.addEventListener('click', () => press(b.dataset.k)));
  const onKey = (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); };
  document.addEventListener('keydown', onKey);
  el.querySelector('.lock-forgot').addEventListener('click', () => {
    msg.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'lock-reset';
    box.innerHTML = `<p>Sans compte en ligne, ce code ne peut pas être récupéré. Pour continuer, il faut effacer toutes les données de cet appareil (une sauvegarde peut ensuite être restaurée).</p>
      <label><span>Tapez SUPPRIMER pour confirmer</span><input autocomplete="off" autocapitalize="characters"></label>
      <button disabled>Effacer les données de cet appareil</button>`;
    el.querySelector('.lock-in').append(box);
    const inp = box.querySelector('input'), btn = box.querySelector('button');
    inp.addEventListener('input', () => { btn.disabled = inp.value.trim().toUpperCase() !== 'SUPPRIMER'; });
    btn.addEventListener('click', () => { resetState(); try { sessionStorage.clear(); } catch (e) { /* rien */ } location.replace(location.pathname + '#/bienvenue'); location.reload(); });
    inp.focus();
  });
}

let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (!hasLock() || S().lock?.auto === false) return;
  if (document.hidden) hiddenAt = Date.now();
  else if (hiddenAt && Date.now() - hiddenAt > 5 * 60e3) lockNow();
});
export function bootLock() { if (hasLock() && !isUnlocked()) showLock(); }
