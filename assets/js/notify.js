// Rappels : une notification avant chaque tâche datée, et un résumé chaque matin.
// Notifications système quand c'est permis, sinon bannière dans l'application.
// Limite actuelle : sans serveur d'envoi, les rappels partent quand l'application est ouverte
// (ou vient d'être ouverte) — l'iPhone exige en plus que l'app soit installée sur l'écran d'accueil.
import { S, update, dayKey, startOfDay, DAY } from './store.js';
import { toast } from './ui.js';
import { t as tr } from './strings.js';

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;

export function notifSupport() {
  if ('Notification' in window) return { ok: true, hint: '' };
  if (isIOS() && !standalone()) return { ok: false, hint: tr('nf.ios') };
  return { ok: false, hint: 'Ce navigateur ne permet pas les notifications. Les rappels s\'afficheront dans l\'application.' };
}

export async function askNotifications() {
  if (!('Notification' in window)) { update((s) => { s.prefs.notifs = true; }, { silent: true }); return 'unsupported'; }
  let r = Notification.permission;
  if (r === 'default') { try { r = await Notification.requestPermission(); } catch (e) { r = 'denied'; } }
  update((s) => { s.prefs.notifs = r === 'granted' || s.prefs.notifs; }, { silent: true });
  return r;
}

async function show(title, body, tag, url) {
  if (S().prefs.notifs !== false && 'Notification' in window && Notification.permission === 'granted') {
    const opts = { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url } };
    try {
      const reg = await navigator.serviceWorker?.getRegistration?.();
      if (reg) { await reg.showNotification(title, opts); return; }
      const n = new Notification(title, opts); n.onclick = () => { window.focus(); location.hash = url; };
      return;
    } catch (e) { /* bannière à la place */ }
  }
  toast(body, { title, action: 'Voir', onAction: () => { location.hash = url; }, ms: 5000 });
}

const LABEL = { appel: 'Rappel', relance: 'Relance', rdv: 'Rendez-vous', tache: 'À faire' };

function check() {
  const s = S();
  if (!s.onboarded || location.hash.includes('bienvenue') || document.body.classList.contains('is-locked')) return;
  const now = Date.now();
  const sent = s.notified || {};
  const timed = (t) => { const d = new Date(t.due); return d.getHours() || d.getMinutes(); };
  const due = s.prefs.notifs === false || s.prefs.notifCats?.rappels === false ? [] : s.tasks.filter((t) => !t.done && t.due && timed(t) && !sent[t.id] && t.due - now <= 10 * 60e3 && now - t.due < 60 * 60e3);
  if (due.length) {
    update((st) => { st.notified = { ...(st.notified || {}) }; due.forEach((t) => { st.notified[t.id] = now; }); }, { silent: true });
    due.slice(0, 3).forEach((t) => {
      const p = t.prospectId && s.prospects.find((x) => x.id === t.prospectId);
      const mins = Math.round((t.due - now) / 60e3);
      const when = mins > 0 ? `Dans ${mins} min` : mins === 0 ? 'Maintenant' : 'En retard';
      show(`${LABEL[t.kind] || 'Rappel'} · ${when}`, t.title + (p && t.kind === 'appel' ? ' — le script est prêt.' : '.'), t.id, p ? `#/fiche/${p.id}` : '#/agenda');
    });
  }
  // Résumé du matin, une fois par jour, à partir de 7 h
  const key = dayKey();
  if (s.prefs.digest !== false && s.lastDigest !== key && new Date().getHours() >= 7) {
    const t0 = startOfDay();
    const today = s.tasks.filter((t) => !t.done && t.due && t.due < t0 + DAY).length;
    update((st) => { st.lastDigest = key; }, { silent: true });
    if (today) show(tr('nf.day'), `${today} tâche${today > 1 ? 's' : ''} aujourd'hui${s.profile.usages?.includes('prospecter') ? ` · objectif ${s.goals.appelsJour} appels` : ''}.`, 'digest', '#/');
  }
}

export function startReminders() {
  setTimeout(check, 2500);
  setInterval(check, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
}

export function testNotification() {
  show('Rappel · dans 10 min', tr('nf.test'), 'test-' + Date.now(), '#/taches');
}
