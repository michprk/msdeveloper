// Phase 3 (1.12) : connecteur Notion, avec le Notion factice (?notion=mock) : connexion OAuth simulée,
// import d'une page (tous les blocs), synchronisation des tâches, déconnexion.
const { test, expect } = require('@playwright/test');
const { student, noErrors } = require('./helpers');

test.setTimeout(90000);

test('connexion, import, synchronisation et déconnexion avec le Notion factice', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.addInitScript((s) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    localStorage.clear(); localStorage.setItem('msdev:v1', JSON.stringify(s));
    sessionStorage.setItem('e2e-seeded', '1'); sessionStorage.setItem('msdev:intro', '1');
  }, student({ sub: { plan: 'pro', status: 'active', periodStart: Date.now(), periodEnd: Date.now() + 20 * 864e5, history: [] } }));
  await page.goto('/?notion=mock#/connecteurs?c=notion');
  // Connexion : aller-retour OAuth (le Notion factice renvoie ?code=…&state=… sur l'application)
  await page.getByRole('button', { name: 'Connecter Notion' }).click();
  await expect(page.locator('#cx-notion')).toContainText('Connecté', { timeout: 15000 });
  await expect(page).not.toHaveURL(/code=/);
  // Import d'une page
  await page.getByRole('button', { name: 'Choisir dans Notion' }).click();
  await page.locator('.nx-res', { hasText: 'Cours — La cellule' }).locator('input').check();
  await page.locator('[data-act="nx-pick-go"]').click();
  await expect(page.locator('.toast').last()).toContainText('Import terminé', { timeout: 30000 });
  await page.evaluate(() => { location.hash = '#/notes'; });
  await page.locator('a', { hasText: 'Cours — La cellule' }).first().click();
  await expect(page.locator('.blk-table')).toBeVisible();
  await expect(page.locator('.blk-toggle')).toBeVisible();
  await expect(page.locator('.blk-src').first()).toBeAttached();
  // Synchronisation des tâches avec la base « Devoirs »
  await page.evaluate(() => { location.hash = '#/connecteurs?c=notion'; });
  await page.getByRole('button', { name: 'Choisir une base de tâches' }).click();
  await page.locator('.nx-res', { hasText: 'Devoirs' }).locator('input').check();
  await page.locator('[data-act="nx-pick-go"]').click();
  await page.getByRole('button', { name: 'Activer et synchroniser' }).click();
  await expect(page.locator('#cx-notion')).toContainText('Dernière synchronisation', { timeout: 30000 });
  const tasks = await page.evaluate(() => JSON.parse(localStorage.getItem('msdev:v1')).tasks.filter((t) => t.source === 'notion').length);
  expect(tasks).toBe(7);
  // Déconnexion
  await page.getByRole('button', { name: 'Se déconnecter de Notion' }).click();
  await page.locator('.sheet [data-r="1"]').click();
  await expect(page.locator('#cx-notion')).toContainText('Connecter Notion');
  noErrors(errors);
});

test('sans serveur ni mode factice, la carte Notion reste honnête', async ({ page }) => {
  await page.addInitScript((s) => { localStorage.setItem('msdev:v1', JSON.stringify(s)); sessionStorage.setItem('msdev:intro', '1'); }, student());
  await page.goto('/#/connecteurs');
  await expect(page.locator('#cx-notion')).toContainText('Bientôt');
  await expect(page.locator('#view')).toContainText('Liens et aperçus');
});
