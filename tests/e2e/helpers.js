// Outils communs des tests de parcours : un état de départ dans localStorage, et le relevé des erreurs.
const { expect } = require('@playwright/test');

// Compte élève par défaut (déjà passé par l'accueil). Le reste vient des valeurs par défaut de l'application.
const student = (extra = {}) => ({ v: 4, onboarded: true, createdAt: Date.now(), profile: { prenom: 'Léa', situation: 'etudes', usages: ['organiser', 'etudes'], ...(extra.profile || {}) }, prefs: { theme: 'light', motion: 'reduce', ...(extra.prefs || {}) }, ...Object.fromEntries(Object.entries(extra).filter(([k]) => !['profile', 'prefs'].includes(k))) });

// Ouvre l'application avec cet état (écrit une seule fois, avant le premier chargement)
async function open(page, state, hash = '#/') {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript((s) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    localStorage.clear();
    if (s) localStorage.setItem('msdev:v1', JSON.stringify(s));
    sessionStorage.setItem('e2e-seeded', '1');
    sessionStorage.setItem('msdev:intro', '1');
  }, state);
  await page.goto(`/${hash}`);
  await page.waitForSelector('#view');
  return errors;
}

// Remplit le compte avec les données d'exemple de l'application, puis recharge
async function fill(page, kind = 'demo') {
  await page.evaluate(async (k) => {
    const m = await import('/assets/js/data/demo.js');
    const s = JSON.parse(localStorage.getItem('msdev:v1'));
    Object.assign(s, k === 'school' ? m.schoolDemo() : m.demoData());
    localStorage.setItem('msdev:v1', JSON.stringify(s));
  }, kind);
  await page.reload();
  await page.waitForSelector('#view');
}

const go = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(250); };
const noErrors = (errors) => expect(errors.filter((e) => !/favicon|manifest|serviceWorker/i.test(e))).toEqual([]);

module.exports = { student, open, fill, go, noErrors };
