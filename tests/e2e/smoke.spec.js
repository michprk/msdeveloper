// Chaque écran s'ouvre sans erreur, sur un compte vide et sur un compte rempli.
const { test, expect } = require('@playwright/test');
const { student, open, fill, go, noErrors } = require('./helpers');

const ROUTES = ['#/', '#/apercu', '#/notifications', '#/taches', '#/taches?v=board', '#/projets', '#/agenda?v=mois', '#/agenda?v=semaine', '#/notes', '#/tableaux',
  '#/etudes', '#/etudes/emploi', '#/etudes/examens', '#/etudes/moyennes', '#/etudes/revision', '#/concentration', '#/quiz', '#/connecteurs', '#/confidentialite', '#/reglages', '#/plus', '#/abonnement'];

for (const kind of ['vide', 'rempli']) {
  test(`tous les écrans s'ouvrent (compte ${kind})`, async ({ page }) => {
    const errors = await open(page, student({ sub: { plan: 'pro', status: 'active', periodStart: Date.now(), periodEnd: Date.now() + 20 * 864e5, history: [] } }));
    if (kind === 'rempli') await fill(page, 'school');
    for (const r of ROUTES) {
      await go(page, r);
      const html = await page.locator('#view').innerHTML();
      expect(html.length, `écran vide : ${r}`).toBeGreaterThan(300);
    }
    noErrors(errors);
  });
}

test('le mode sombre s\'applique', async ({ page }) => {
  const errors = await open(page, student({ prefs: { theme: 'dark' } }), '#/apercu');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  noErrors(errors);
});
