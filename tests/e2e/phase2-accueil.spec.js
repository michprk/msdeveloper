// Phase 2 (1.11) : accueil court, sans paiement ; prénom remis en forme ; essai proposé plus tard, en contexte.
const { test, expect } = require('@playwright/test');
const { student, open, noErrors } = require('./helpers');

test('accueil en trois écrans, sans mot de passe ni paiement', async ({ page }) => {
  const errors = await open(page, null, '#/');
  await expect(page).toHaveURL(/#\/bienvenue/);
  await page.getByRole('button', { name: 'Commencer' }).click();
  await expect(page.locator('input[name="password"]')).toHaveCount(0);
  await page.locator('input[name="prenom"]').fill('  adam ');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('.ob-h')).toContainText('Adam');
  await expect(page.locator('input[name="situation"][value="etudes"]')).toBeChecked();
  await expect(page.locator('.ob-chip.is-pro').first()).toBeHidden();
  // Le dernier champ reste visible au-dessus du bouton collant
  await page.locator('input[name="societe"]').scrollIntoViewIfNeeded();
  const field = await page.locator('input[name="societe"]').boundingBox();
  const foot = await page.locator('.ob-foot').boundingBox();
  expect(field.y + field.height).toBeLessThanOrEqual(foot.y + 1);
  await page.locator('.ob-chip', { hasText: 'Réviser mes cours' }).click();
  await page.getByRole('button', { name: 'C\'est parti' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator('.sheet')).toHaveCount(0);
  await expect(page.locator('#view')).toContainText('Bonjour Adam');
  noErrors(errors);
});

test('le prénom est remis en forme partout, même pour un ancien compte', async ({ page }) => {
  const errors = await open(page, student({ profile: { prenom: 'jean-pierre' } }), '#/');
  await expect(page.locator('#view')).toContainText('Bonjour Jean-Pierre');
  noErrors(errors);
});

test('essai proposé après quelques jours, avec un vrai bouton pour rester en gratuit', async ({ page }) => {
  const errors = await open(page, student({ createdAt: Date.now() - 4 * 864e5, sub: { plan: 'free', status: 'none', trialStart: null, history: [] } }), '#/');
  const nudge = page.locator('.nudge');
  await expect(nudge).toBeVisible();
  await nudge.getByRole('button', { name: 'Rester en gratuit' }).click();
  await expect(page.locator('.nudge')).toHaveCount(0);
  noErrors(errors);
});
