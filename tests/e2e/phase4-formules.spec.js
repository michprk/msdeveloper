// Phase 4 (1.13) : formules lues dans plans.js, bascule mensuel / annuel, Premium réservé aux profils pro,
// outils de test des paiements seulement avec ?debug=1.
const { test, expect } = require('@playwright/test');
const { student, open, go, noErrors } = require('./helpers');

test('élève : Gratuit et Pro, prix mensuels puis annuels avec l\'économie', async ({ page }) => {
  const errors = await open(page, student(), '#/abonnement');
  await expect(page.locator('.plan')).toHaveCount(2);
  await expect(page.locator('.plans')).toContainText('4,99 €');
  await page.locator('[data-act="bill-iv"][data-iv="year"]').click();
  await expect(page.locator('.plans')).toContainText('39 €');
  await expect(page.locator('.bill-save')).toContainText('%');
  // Comparatif court, sans chiffres de remplissage
  expect(await page.locator('table.cmp tbody tr').count()).toBeLessThanOrEqual(9);
  await expect(page.locator('table.cmp')).not.toContainText('scripts');
  noErrors(errors);
});

test('profil pro : Premium Entrepreneur visible', async ({ page }) => {
  const errors = await open(page, student({ profile: { situation: 'agence', usages: ['organiser', 'entrepreneur'] } }), '#/abonnement');
  await expect(page.locator('.plan')).toHaveCount(3);
  await expect(page.locator('.plans')).toContainText('Premium Entrepreneur');
  await expect(page.locator('.plans')).toContainText('9,99 €');
  noErrors(errors);
});

test('sans ?debug=1 : aucune simulation de carte refusée ni de coupure', async ({ page }) => {
  const errors = await open(page, student(), '#/abonnement');
  await page.getByRole('button', { name: /Essayer Pro 7 jours gratuits/ }).click();
  await expect(page.locator('.sheet')).toBeVisible();
  await expect(page.locator('.sheet')).not.toContainText('Simuler');
  await expect(page.locator('.sheet').getByRole('button', { name: 'Rester en version gratuite' })).toBeVisible();
  await expect(page.locator('#view')).not.toContainText('Tester les paiements');
  noErrors(errors);
});

test('avec ?debug=1 : outils de test visibles', async ({ page }) => {
  await page.addInitScript((s) => { localStorage.setItem('msdev:v1', JSON.stringify(s)); sessionStorage.setItem('msdev:intro', '1'); }, student());
  await page.goto('/?debug=1#/abonnement');
  await expect(page.locator('#view')).toContainText('Vérifier les paiements');
  await page.getByRole('button', { name: /Essayer Pro 7 jours gratuits/ }).first().click();
  await expect(page.locator('.sheet')).toContainText('Simuler une carte refusée');
});
